'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function toArr(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

export async function saveBrandKit(input) {
  const {
    brandId, niche, audience, tone, pillars, dos, donts, palette, logoUrl,
    personality, emotions, formality, emojiUsage, ctaPolicy, storytelling, visualStyle, captionLength, objective
  } = input || {};
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {
    brand_id: brandId,
    niche: niche || null,
    audience: audience || null,
    tone: tone || null,
    pillars: toArr(pillars),
    dos: toArr(dos),
    donts: toArr(donts),
    palette: palette && typeof palette === 'object' ? palette : {},
    logo_url: logoUrl || null,
    updated_at: new Date().toISOString()
  };

  // Campos do Brand DNA: só grava a coluna quando o campo vier definido, p/ não
  // sobrescrever DNA gerado pela IA com vazio quando o editor manda parcial.
  if (personality !== undefined) row.personality = toArr(personality);
  if (emotions !== undefined) row.emotions = toArr(emotions);
  if (formality !== undefined) row.formality = formality || null;
  if (emojiUsage !== undefined) row.emoji_usage = emojiUsage || null;
  if (ctaPolicy !== undefined) row.cta_policy = ctaPolicy || null;
  if (storytelling !== undefined) row.storytelling = Boolean(storytelling);
  if (visualStyle !== undefined) row.visual_style = visualStyle || null;
  if (captionLength !== undefined) row.caption_length = captionLength || null;
  if (objective !== undefined) row.objective = objective || null;

  const { error } = await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });
  if (error) return { error: error.message };

  revalidatePath('/brand-kit');
  return { ok: true };
}
