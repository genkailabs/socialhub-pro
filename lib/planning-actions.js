'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { runSkill } from '@/lib/ai/skills/run';
import { editorialPlannerSkill } from '@/lib/ai/skills/editorial-planner';
import { activeStrategy, nextWeekStart, itemWithinWeek, describeSignals } from '@/lib/strategy-plan';
import { summarizeDnaSignals } from '@/lib/dna-signals';

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

  const semana = weekStart || nextWeekStart();

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

  try {
    const { data: plano, cost } = await runSkill({
      skill: editorialPlannerSkill,
      input: {
        brandName: brand.name,
        weekStart: semana,
        strategy: {
          mainObjective: strategy.objectives?.main || 'Crescer no Instagram',
          pillars: (strategy.pillars || []).map((p) => ({ name: p.name, share: p.share })),
          formats: strategy.formats || [],
          postsPerWeek: strategy.frequency?.postsPerWeek || 3
        },
        tone: kit?.tone || '',
        donts: kit?.donts || [],
        signals,
        recentTopics: (recentes || []).map((p) => p.title).filter(Boolean)
      },
      supabase,
      brandId,
      userId: user.id
    });

    // A IA às vezes devolve data fora da semana pedida. O banco aceitaria e o
    // calendário do usuário ficaria errado, então descartamos aqui.
    const itens = plano.items.filter((i) => itemWithinWeek(i.date, semana));
    if (!itens.length) return { error: 'O planejamento veio com datas fora da semana. Tente gerar novamente.' };

    const { data: planRow, error: planErr } = await supabase.from('editorial_plans').upsert({
      brand_id: brandId,
      strategy_id: strategy.id,
      week_start: semana,
      status: 'proposed'
    }, { onConflict: 'brand_id,week_start' }).select('id').maybeSingle();
    if (planErr) return { error: `Não foi possível salvar o plano: ${planErr.message}` };

    // Regenerar substitui a sugestão anterior da mesma semana, mas preserva o
    // que a pessoa já aprovou — perder decisão do usuário é pior que regerar.
    await supabase.from('editorial_plan_items').delete().eq('plan_id', planRow.id).eq('status', 'proposed');

    const { error: itemErr } = await supabase.from('editorial_plan_items').insert(
      itens.map((i, idx) => ({
        plan_id: planRow.id,
        date: i.date,
        format: i.format,
        topic: i.topic,
        title: i.title,
        objective: i.objective,
        pillar: i.pillar,
        stage: i.stage,
        cta: i.cta,
        rationale: i.rationale,
        status: 'proposed',
        position: idx
      }))
    );
    if (itemErr) return { error: `Não foi possível salvar os temas: ${itemErr.message}` };

    revalidatePath('/planning');
    return { ok: true, planId: planRow.id, count: itens.length, discarded: plano.items.length - itens.length, cost };
  } catch (e) {
    return { error: e.message };
  }
}

// Aprovar/remover tema não chama IA e não custa nada (§12.4).
export async function setPlanItemStatus({ itemId, status }) {
  if (!itemId) return { error: 'Tema não informado.' };
  if (!['proposed', 'approved', 'rejected'].includes(status)) return { error: 'Estado inválido.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  // RLS garante que só o dono da marca altera o item.
  const { error } = await supabase.from('editorial_plan_items').update({ status }).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true };
}

// Editar manualmente também é de graça (RF-08).
export async function updatePlanItem({ itemId, patch }) {
  if (!itemId) return { error: 'Tema não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const campos = ['topic', 'title', 'format', 'objective', 'pillar', 'cta', 'date'];
  const row = {};
  for (const c of campos) if (patch?.[c] !== undefined) row[c] = patch[c];
  if (!Object.keys(row).length) return { error: 'Nada para atualizar.' };

  const { error } = await supabase.from('editorial_plan_items').update(row).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/planning');
  return { ok: true };
}
