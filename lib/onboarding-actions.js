'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Progresso do wizard (RF-01). Salva a cada passo em vez de só no fim: fechar a
// aba no meio da entrevista não pode custar tudo o que a pessoa já respondeu.
//
// Sem revalidatePath: isto roda a cada avanço e é gravação de rascunho — não há
// tela para reconstruir, e revalidar aqui recarregaria o wizard embaixo do
// usuário no meio do preenchimento.
export async function saveOnboardingProgress({ brandId, step, answers, status = 'in_progress' } = {}) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {
    brand_id: brandId,
    onboarding_status: status,
    updated_at: new Date().toISOString()
  };
  if (Number.isInteger(step)) row.onboarding_step = step;
  // Só grava quando vier: as respostas são a matéria-prima do Brand DNA, então
  // uma chamada sem elas não pode zerar a entrevista.
  if (answers && typeof answers === 'object') row.onboarding_answers = answers;

  const { error } = await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });

  if (error) return { error: error.message };
  return { ok: true };
}

// Marca a entrevista como concluída preservando as respostas.
export async function completeOnboarding({ brandId } = {}) {
  const res = await saveOnboardingProgress({ brandId, status: 'completed' });
  if (res?.ok) {
    revalidatePath('/brand-kit');
    revalidatePath('/dashboard');
    revalidatePath('/onboarding');
  }
  return res;
}

// Reinicia o onboarding para not_started e step 0.
export async function resetOnboarding({ brandId } = {}) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {
    brand_id: brandId,
    onboarding_status: 'not_started',
    onboarding_step: 0,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });
  if (error) return { error: error.message };

  revalidatePath('/onboarding');
  revalidatePath('/brand-kit');
  revalidatePath('/dashboard');
  return { ok: true };
}
