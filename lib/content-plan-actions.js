'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function toArr(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

export async function saveContentPlan(input) {
  const { brandId, active, postsPerDay, format, pillars, preferredTimes } = input || {};
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {
    brand_id: brandId,
    active: !!active,
    posts_per_day: Math.max(1, Math.min(5, Number(postsPerDay) || 1)),
    format: format || 'quote',
    pillars: toArr(pillars),
    preferred_times: toArr(preferredTimes),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('content_plans').upsert(row, { onConflict: 'brand_id' });
  if (error) return { error: error.message };

  revalidatePath('/autopilot');
  return { ok: true };
}

// Liga/desliga o Piloto em 1 clique, persistindo na hora (sem depender do "Salvar").
// Preserva as demais colunas do plano — o upsert só toca `active`/`updated_at`.
export async function setAutopilotActive({ brandId, active }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('content_plans')
    .upsert({ brand_id: brandId, active: !!active, updated_at: new Date().toISOString() }, { onConflict: 'brand_id' });
  if (error) return { error: error.message };

  revalidatePath('/autopilot');
  revalidatePath('/dashboard');
  revalidatePath('/approvals');
  return { ok: true };
}
