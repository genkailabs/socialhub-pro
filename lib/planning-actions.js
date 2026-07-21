'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { runSkill } from '@/lib/ai/skills/run';
import { editorialPlannerSkill } from '@/lib/ai/skills/editorial-planner';
import { activeStrategy, planningWindowStart, emptyWindowDates, itemWithinWeek, describeSignals, remainingPlanSlots } from '@/lib/strategy-plan';
import { summarizeDnaSignals } from '@/lib/dna-signals';
import { normalizeSuggestedTime, planningSlotsFromAudit, planningSlotsLabel, suggestedTimeForDate } from '@/lib/planning-times';
import { normalizePlanningItemStatus } from '@/lib/planning-status';

const MANUAL_ITEM_FIELDS = ['topic', 'title', 'format', 'objective', 'pillar', 'summary', 'hook', 'cta', 'target_audience', 'estimated_duration', 'date', 'suggested_time'];

function manualItemFields(values) {
  const row = {};
  for (const field of MANUAL_ITEM_FIELDS) if (values?.[field] !== undefined) row[field] = values[field];
  return row;
}

async function latestInstagramAudit(supabase, brandId) {
  try {
    const { data } = await supabase
      .from('instagram_audits')
      .select('calculated_metrics')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

// Gera o plano da semana (PRD Etapa 9 / RF-06). Só temas — nenhuma legenda ou
// imagem é produzida aqui (§8-E9): planejar é barato, produzir é caro.
export async function generateWeekPlan({ brandId, weekStart }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: brand } = await supabase.from('brands').select('id, name').eq('id', brandId).maybeSingle();
  if (!brand) return { error: 'Marca inválida.' };

  const { data: strategies } = await supabase
    .from('content_strategies')
    .select('id, objectives, pillars, formats, frequency, status')
    .eq('brand_id', brandId);

  const strategy = activeStrategy(strategies || []);
  // RF-05: estratégia antes do planejamento. Sem ela o plano não tem norte.
  if (!strategy) return { error: 'Aprove uma estratégia antes de planejar a semana.' };

  const { data: kit } = await supabase
    .from('brand_kits')
    .select('tone, donts')
    .eq('brand_id', brandId)
    .maybeSingle();

  const semana = weekStart || planningWindowStart();

  // Não repetir o que acabou de sair.
  const { data: recentes } = await supabase
    .from('posts')
    .select('title')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Sinais entram como contexto (§8-E16), nunca como regra automática.
  // summarizeDnaSignals devolve contagens ({approve, reject, edit}) ou null.
  const contagem = await summarizeDnaSignals(brandId);
  const signals = describeSignals(contagem);
  const latestAudit = await latestInstagramAudit(supabase, brandId);
  const posting = planningSlotsFromAudit(latestAudit);
  const timeSignal = `Horarios de postagem para o planejamento: ${planningSlotsLabel(posting)}.`;

  // Antes de gastar IA, contamos o que a pessoa já decidiu preservar. Assim uma
  // nova sugestão completa só preenche as vagas, sem apagar aprovações/removidos.
  const { data: existingPlan, error: existingPlanError } = await supabase
    .from('editorial_plans')
    .select('id')
    .eq('brand_id', brandId)
    .eq('week_start', semana)
    .maybeSingle();
  if (existingPlanError) return { error: `Não foi possível consultar o plano atual: ${existingPlanError.message}` };

  let preservedItems = [];
  let previousIdeas = [];
  if (existingPlan) {
    const { data, error } = await supabase
      .from('editorial_plan_items')
      .select('id, title, status, date')
      .eq('plan_id', existingPlan.id)
      .neq('status', 'idea');
    if (error) return { error: `Não foi possível consultar os temas preservados: ${error.message}` };
    const legacyProposals = (data || []).filter((item) => item.status === 'proposed');
    // A migração cobre a base como um todo, mas um plano antigo pode chegar
    // antes dela (ou por uma réplica/cache). Convertemos antes de decidir o que
    // preservar: proposta antiga é ideia substituível, não conteúdo decidido.
    if (legacyProposals.length) {
      const { error: legacyStatusError } = await supabase
        .from('editorial_plan_items')
        .update({ status: 'idea' })
        .eq('plan_id', existingPlan.id)
        .eq('status', 'proposed');
      if (legacyStatusError) return { error: `Não foi possível atualizar as ideias antigas: ${legacyStatusError.message}` };
    }
    preservedItems = (data || []).filter((item) => item.status !== 'proposed');

    const { data: ideas, error: ideasError } = await supabase
      .from('editorial_plan_items')
      .select('date, suggested_time, format, topic, title, objective, pillar, stage, summary, hook, cta, target_audience, estimated_duration, rationale, status, regeneration_count, production_error, position')
      .eq('plan_id', existingPlan.id)
      .eq('status', 'idea');
    if (ideasError) return { error: `Não foi possível guardar os temas atuais: ${ideasError.message}` };
    previousIdeas = ideas || [];
  }

  // §4: dia que já tem conteúdo decidido está ocupado — a IA só recebe os dias
  // vazios da janela e nunca sobrescreve o que a pessoa já aprovou/produziu.
  const occupiedDates = preservedItems.map((item) => item.date).filter(Boolean);
  const availableDates = emptyWindowDates(semana, occupiedDates);
  if (!availableDates.length) {
    revalidatePath('/planning');
    return { ok: true, planId: existingPlan?.id, count: 0, preserved: preservedItems.length, cost: 0 };
  }

  const requestedPosts = strategy.frequency?.postsPerWeek || 3;
  // Só itens decididos (aprovado/em producao/pronto) ocupam vaga. Removidos não
  // contam, senão remover itens deixaria de liberar vagas para novas sugestões.
  const remainingSlots = remainingPlanSlots(requestedPosts, preservedItems);
  if (remainingSlots === 0) {
    const { error: deleteError } = await supabase.from('editorial_plan_items').delete().eq('plan_id', existingPlan.id).eq('status', 'idea');
    if (deleteError) return { error: `Não foi possível limpar os temas anteriores: ${deleteError.message}` };
    revalidatePath('/planning');
    return { ok: true, planId: existingPlan?.id, count: 0, preserved: preservedItems.length, cost: 0 };
  }

  try {
    const preservedTitles = preservedItems.map((item) => item.title).filter(Boolean);
    const preservedContext = preservedTitles.length
      ? `Temas já preservados nesta semana (não repetir): ${preservedTitles.join('; ')}`
      : null;
    const { data: plano, cost } = await runSkill({
      skill: editorialPlannerSkill,
      input: {
        brandName: brand.name,
        weekStart: semana,
        strategy: {
          mainObjective: strategy.objectives?.main || 'Crescer no Instagram',
          pillars: (strategy.pillars || []).map((p) => ({ name: p.name, share: p.share })),
          formats: strategy.formats || [],
          postsPerWeek: remainingSlots
        },
        tone: kit?.tone || '',
        donts: kit?.donts || [],
        signals: [...signals.slice(0, preservedContext ? 3 : 4), timeSignal, ...(preservedContext ? [preservedContext] : [])],
        postingSlots: posting.slots,
        hasMetricSignal: posting.hasMetricSignal,
        // §1/§4: janela móvel de 7 dias a partir de hoje, já sem os dias ocupados.
        availableDates,
        windowStart: semana,
        recentTopics: [...preservedTitles, ...(recentes || []).map((p) => p.title).filter(Boolean)].slice(0, 10)
      },
      supabase,
      brandId,
      userId: user.id
    });

    // A IA às vezes devolve data fora da janela pedida — ou em cima de um dia
    // que já tem conteúdo decidido. O banco aceitaria e o calendário do usuário
    // ficaria errado, então descartamos aqui (§1/§4).
    const disponiveis = new Set(availableDates);
    const vistos = new Set();
    const validItems = plano.items.filter((i) => {
      const dia = String(i.date || '').slice(0, 10);
      if (!itemWithinWeek(dia, semana) || !disponiveis.has(dia)) return false;
      // Um dia recebe no máximo um item: dois posts no mesmo dia reocupariam
      // uma data que a janela considera preenchida.
      if (vistos.has(dia)) return false;
      vistos.add(dia);
      return true;
    });
    const itens = validItems.slice(0, remainingSlots);
    if (!itens.length) return { error: 'O planejamento veio com datas fora da janela de 7 dias. Tente gerar novamente.' };

    // Em um plano existente, a atualização do resumo só acontece depois que os
    // itens novos entraram. Isso evita trocar o plano pela metade em erro de BD.
    let planRow = existingPlan;
    let createdPlan = false;
    if (!planRow) {
      const { data, error: planErr } = await supabase.from('editorial_plans').upsert({
        brand_id: brandId,
        strategy_id: strategy.id,
        week_start: semana,
        status: 'proposed',
        weekly_summary: plano.weeklySummary
      }, { onConflict: 'brand_id,week_start' }).select('id').maybeSingle();
      if (planErr) return { error: `Não foi possível salvar o plano: ${planErr.message}` };
      planRow = data;
      createdPlan = true;
    }

    const restorePreviousIdeas = async () => {
      // Mesmo sem ideias antigas, as ideias novas precisam sair antes de
      // devolvemos o erro; do contrário o plano ficaria parcialmente trocado.
      const { error: clearError } = await supabase.from('editorial_plan_items').delete().eq('plan_id', planRow.id).eq('status', 'idea');
      if (clearError) return `não foi possível remover as novas ideias: ${clearError.message}`;
      if (!previousIdeas.length) return null;

      const { error: restoreError } = await supabase
        .from('editorial_plan_items')
        .insert(previousIdeas.map((idea) => ({ ...idea, plan_id: planRow.id })));
      if (restoreError) return `não foi possível restaurar as ideias anteriores: ${restoreError.message}`;
      return null;
    };

    if (!createdPlan) {
      const { error: deleteError } = await supabase.from('editorial_plan_items').delete().eq('plan_id', planRow.id).eq('status', 'idea');
      if (deleteError) return { error: `Não foi possível limpar os temas anteriores: ${deleteError.message}` };
    }

    const newItems = itens.map((i, idx) => ({
        plan_id: planRow.id,
        date: i.date,
        suggested_time: normalizeSuggestedTime(i.suggestedTime) || suggestedTimeForDate(i.date, posting.slots, idx),
        format: i.format,
        topic: i.topic,
        title: i.title,
        objective: i.objective,
        pillar: i.pillar,
        stage: i.stage,
        summary: i.summary,
        hook: i.hook,
        cta: i.cta,
        target_audience: i.targetAudience,
        estimated_duration: i.estimatedDuration,
        rationale: i.rationale,
        status: 'idea',
        regeneration_count: 0,
        production_error: null,
        position: idx
      }));
    const { error: itemErr } = await supabase.from('editorial_plan_items').insert(newItems);
    if (itemErr) {
      let compensationError = null;
      if (createdPlan) {
        const { error } = await supabase.from('editorial_plans').delete().eq('id', planRow.id);
        if (error) compensationError = `não foi possível remover o plano recém-criado: ${error.message}`;
      } else {
        compensationError = await restorePreviousIdeas();
      }
      const message = `Não foi possível salvar os temas: ${itemErr.message}`;
      return { error: compensationError ? `${message}. A reversão falhou: ${compensationError}` : message };
    }

    if (!createdPlan) {
      const { error: updatePlanError } = await supabase.from('editorial_plans')
        .update({ strategy_id: strategy.id, weekly_summary: plano.weeklySummary })
        .eq('id', planRow.id);
      if (updatePlanError) {
        const compensationError = await restorePreviousIdeas();
        const message = `Não foi possível atualizar o plano: ${updatePlanError.message}`;
        return { error: compensationError ? `${message}. A reversão falhou: ${compensationError}` : message };
      }
    }

    revalidatePath('/planning');
    return { ok: true, planId: planRow.id, count: itens.length, discarded: plano.items.length - itens.length, cost };
  } catch (e) {
    return { error: e.message };
  }
}

// Aprovar/remover tema não chama IA e não custa nada (§12.4).
export async function setPlanItemStatus({ itemId, status }) {
  if (!itemId) return { error: 'Tema não informado.' };
  if (!['idea', 'approved', 'rejected'].includes(status)) return { error: 'Estado inválido.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  // RLS garante que só o dono da marca altera o item.
  const { error } = await supabase.from('editorial_plan_items').update({ status }).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true };
}

// Uma ideia manual também começa como rascunho: nenhuma ação manual gasta IA.
export async function createPlanItem({ planId, values }) {
  if (!planId) return { error: 'Plano não informado.' };

  const row = manualItemFields(values);
  if (!row.date || !row.title || !row.format) return { error: 'Preencha data, título e formato.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data, error } = await supabase.from('editorial_plan_items').insert({
    ...row,
    plan_id: planId,
    topic: row.topic || row.title,
    status: 'idea',
    regeneration_count: 0
  }).select('id').maybeSingle();
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true, itemId: data?.id };
}

// A aprovação só muda ideias atuais ou propostas legadas. A produção é separada.
export async function approveAllPlanItems({ planId }) {
  if (!planId) return { error: 'Plano não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data, error } = await supabase
    .from('editorial_plan_items')
    .update({ status: 'approved' })
    .eq('plan_id', planId)
    .in('status', ['idea', 'proposed'])
    .select('id');
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true, count: data?.length || 0 };
}

// Remover preserva o registro e a decisao do usuario para o resumo da semana.
// Devolve o status anterior para o "Desfazer" (§7) recolocar o item exatamente
// onde ele estava — desfazer a remocao de um item aprovado nao pode rebaixa-lo
// para ideia.
export async function removePlanItem({ itemId }) {
  if (!itemId) return { error: 'Tema não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: atual } = await supabase
    .from('editorial_plan_items')
    .select('status')
    .eq('id', itemId)
    .maybeSingle();

  const { error } = await supabase.from('editorial_plan_items').update({ status: 'rejected' }).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true, previousStatus: normalizePlanningItemStatus(atual?.status) || 'idea' };
}

// §7: desfazer a remocao. So devolve para um estado valido de planejamento —
// um status inesperado vira "ideia" em vez de gravar lixo no banco.
const RESTORABLE_STATUSES = ['idea', 'approved', 'in_production', 'ready'];

export async function restorePlanItem({ itemId, status = 'idea' }) {
  if (!itemId) return { error: 'Tema não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const alvo = RESTORABLE_STATUSES.includes(status) ? status : 'idea';
  const { error } = await supabase
    .from('editorial_plan_items')
    .update({ status: alvo })
    .eq('id', itemId)
    .eq('status', 'rejected');
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true };
}

export async function restorePlanItemVersion({ itemId, versionId }) {
  if (!itemId || !versionId) return { error: 'Versão não informada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: version, error: versionError } = await supabase
    .from('editorial_plan_item_versions')
    .select('date, suggested_time, topic, title, format, pillar, stage, objective, summary, hook, cta, target_audience, estimated_duration, rationale')
    .eq('id', versionId)
    .eq('planning_item_id', itemId)
    .maybeSingle();
  if (versionError) return { error: versionError.message };
  if (!version) return { error: 'Versão não encontrada.' };

  const { error } = await supabase.from('editorial_plan_items').update(version).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true };
}

const MAX_IDEA_REGENERATIONS_PER_ITEM = 3;

export async function replacePlanItem({ itemId, instruction }) {
  if (!itemId) return { error: 'Tema não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: item, error: itemError } = await supabase
    .from('editorial_plan_items')
    .select('id, plan_id, date, suggested_time, format, topic, title, objective, pillar, stage, summary, hook, cta, target_audience, estimated_duration, rationale, status, regeneration_count')
    .eq('id', itemId)
    .maybeSingle();
  if (itemError) return { error: itemError.message };
  if (!item) return { error: 'Tema não encontrado.' };
  if ((item.regeneration_count || 0) >= MAX_IDEA_REGENERATIONS_PER_ITEM) {
    return { error: 'Esta ideia já foi trocada 3 vezes. Você ainda pode editar o conteúdo manualmente ou manter uma das versões anteriores.' };
  }

  const { data: plan, error: planError } = await supabase
    .from('editorial_plans')
    .select('brand_id, week_start')
    .eq('id', item.plan_id)
    .maybeSingle();
  if (planError) return { error: planError.message };
  if (!plan) return { error: 'Plano não encontrado.' };

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('name')
    .eq('id', plan.brand_id)
    .maybeSingle();
  if (brandError) return { error: brandError.message };
  if (!brand) return { error: 'Marca não encontrada.' };

  const { data: kit, error: kitError } = await supabase
    .from('brand_kits')
    .select('tone, donts')
    .eq('brand_id', plan.brand_id)
    .maybeSingle();
  if (kitError) return { error: kitError.message };

  const versionNumber = (item.regeneration_count || 0) + 1;
  const versionPayload = {
    planning_item_id: item.id,
    version_number: versionNumber,
    date: item.date,
    suggested_time: item.suggested_time,
    topic: item.topic,
    title: item.title || '',
    format: item.format || '',
    pillar: item.pillar,
    stage: item.stage,
    objective: item.objective,
    summary: item.summary || '',
    hook: item.hook || '',
    cta: item.cta,
    target_audience: item.target_audience,
    estimated_duration: item.estimated_duration,
    rationale: item.rationale,
    change_reason: instruction?.trim() || null
  };

  try {
    const itemContext = [
      `Item atual: título ${item.title || ''}; tema ${item.topic || ''}; resumo ${item.summary || ''}; gancho ${item.hook || ''}; CTA ${item.cta || ''}; público ${item.target_audience || ''}.`,
      instruction?.trim() ? `Instrução da pessoa para esta troca: ${instruction.trim()}` : ''
    ].filter(Boolean);
    const { data: suggestion, cost } = await runSkill({
      skill: editorialPlannerSkill,
      input: {
        brandName: brand.name,
        weekStart: plan.week_start,
        strategy: {
          mainObjective: item.objective || 'Criar conteúdo relevante',
          pillars: [{ name: item.pillar || 'Conteúdo', share: 100 }],
          formats: item.format ? [item.format] : [],
          postsPerWeek: 1
        },
        tone: kit?.tone || '',
        donts: kit?.donts || [],
        signals: itemContext,
        recentTopics: []
      },
      supabase,
      brandId: plan.brand_id,
      userId: user.id
    });
    const next = suggestion.items[0];
    const { data: version, error: versionError } = await supabase
      .from('editorial_plan_item_versions')
      .insert(versionPayload)
      .select('id')
      .maybeSingle();
    if (versionError) return { error: versionError.message };

    const { error: updateError } = await supabase.from('editorial_plan_items').update({
      date: item.date,
      suggested_time: normalizeSuggestedTime(next.suggestedTime) || item.suggested_time,
      format: next.format,
      topic: next.topic,
      title: next.title,
      objective: next.objective,
      pillar: next.pillar,
      stage: next.stage,
      summary: next.summary,
      hook: next.hook,
      cta: next.cta,
      target_audience: next.targetAudience,
      estimated_duration: next.estimatedDuration,
      rationale: next.rationale,
      regeneration_count: versionNumber,
      // Uma troca bem-sucedida também conclui a compatibilidade do item legado.
      ...(item.status === 'proposed' ? { status: 'idea' } : {})
    }).eq('id', itemId);
    if (updateError) {
      // A versao so faz sentido quando a troca realmente entrou no item. Se a
      // atualizacao falhar, removemos o registro novo para a proxima tentativa
      // nao criar historico duplicado.
      let cleanupError = null;
      if (version?.id) {
        const { error } = await supabase.from('editorial_plan_item_versions').delete().eq('id', version.id);
        cleanupError = error;
      }
      return { error: cleanupError
        ? `${updateError.message}. A reversão falhou: não foi possível remover a versão: ${cleanupError.message}`
        : updateError.message };
    }

    revalidatePath('/planning');
    return { ok: true, itemId, cost };
  } catch (e) {
    return { error: e.message };
  }
}

// Editar manualmente também é de graça (RF-08).
export async function updatePlanItem({ itemId, patch }) {
  if (!itemId) return { error: 'Tema não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = manualItemFields(patch);
  if (!Object.keys(row).length) return { error: 'Nada para atualizar.' };

  const { error } = await supabase.from('editorial_plan_items').update(row).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true };
}
