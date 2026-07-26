'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_COOKIE, validateBrandName, slugHandle } from '@/lib/brands';

const COOKIE_OPTS = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' };

// Ações da jornada guiada. Só o que o agente precisa e as telas não oferecem.
// Tudo o que já existe (diagnóstico, DNA, estratégia, plano) é chamado pelas
// actions originais — o agente não tem uma segunda implementação de nada.

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// Cria a marca JÁ marcada como em jornada. É o único jeito de a pessoa entrar
// conduzida sem depender da heurística de "marca vazia" — e conserta de quebra
// o fato de createBrand não criar linha em brand_kits.
export async function startJourney({ name } = {}) {
  let brandName;
  try {
    brandName = validateBrandName(name);
  } catch (e) {
    return { error: e.message };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };

  const { data, error } = await supabase
    .from('brands')
    .insert({ user_id: user.id, name: brandName, handle: slugHandle(brandName), category: 'Geral', color: '#007AFF' })
    .select('id')
    .single();

  if (error) return { error: `Não foi possível criar a marca: ${error.message}` };

  const { error: kitError } = await supabase
    .from('brand_kits')
    .upsert(
      { brand_id: data.id, onboarding_status: 'in_progress', onboarding_step: 1, updated_at: new Date().toISOString() },
      { onConflict: 'brand_id' }
    );
  // Se o kit falhar, a marca continua vazia e a regra de "marca vazia" conduz
  // do mesmo jeito. Vale seguir em vez de abortar a criação da marca.
  if (kitError) console.error('journey: kit inicial não gravado', kitError.message);

  const store = await cookies();
  store.set(ACTIVE_COOKIE, data.id, COOKIE_OPTS);
  revalidatePath('/', 'layout');
  return { ok: true, id: data.id };
}

// Respostas da entrevista (segmento, objetivo, ...). Ao contrário do wizard
// antigo, o erro sobe: perder a entrevista em silêncio só aparece no suporte.
export async function saveJourneyAnswers({ brandId, answers, step } = {}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {
    brand_id: brandId,
    onboarding_status: 'in_progress',
    updated_at: new Date().toISOString()
  };
  if (answers && typeof answers === 'object') row.onboarding_answers = answers;
  // Espelho do índice derivado — telemetria de onde as pessoas param, nunca a
  // autoridade sobre a etapa.
  if (Number.isInteger(step)) row.onboarding_step = step;

  const { error } = await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });
  if (error) return { error: error.message };
  return { ok: true };
}

// A frequência da entrevista é SEMANAL (3x, 5x, diário) e content_plans só tem
// posts_per_day, inteiro — 3x por semana não cabe lá. Por isso a escolha do
// wizard nunca chegava na estratégia: ela morria em onboarding_answers e a
// estratégia saía sempre com 7 posts.
//
// Quem manda no ritmo da estratégia é o postsPerWeek passado a generateStrategy.
// Aqui só mantemos posts_per_day coerente para o Piloto diário, que raciocina
// por dia.
//
// Upsert de duas colunas em vez de saveContentPlan, que sobrescreveria format,
// pillars e preferred_times com vazio.
export async function setJourneyFrequency({ brandId, postsPerWeek } = {}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Sessão expirada.' };

  const perWeek = Math.max(1, Math.min(21, Number(postsPerWeek) || 7));
  const { error } = await supabase
    .from('content_plans')
    .upsert(
      { brand_id: brandId, posts_per_day: Math.max(1, Math.min(5, Math.round(perWeek / 7))) },
      { onConflict: 'brand_id' }
    );
  if (error) return { error: error.message };
  return { ok: true };
}

// Fim da jornada: o menu destrava. revalidatePath no layout inteiro porque o
// gate mora lá — destravar tem de ser global e imediato.
export async function finishJourney({ brandId } = {}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('brand_kits')
    .upsert(
      { brand_id: brandId, onboarding_status: 'completed', updated_at: new Date().toISOString() },
      { onConflict: 'brand_id' }
    );
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}

// A válvula de escape. Sem ela, qualquer defeito no gate vira chamado de
// suporte com a pessoa presa numa tela. Preserva as respostas — sair não é
// recomeçar.
export async function leaveJourney({ brandId } = {}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('brand_kits')
    .upsert(
      { brand_id: brandId, onboarding_status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'brand_id' }
    );
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}
