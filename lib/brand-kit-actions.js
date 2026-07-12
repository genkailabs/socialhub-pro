'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function toArr(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

export async function saveBrandKit(input) {
  const { brandId, niche, audience, tone, pillars, dos, donts, palette, logoUrl } = input || {};
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

  const { error } = await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });
  if (error) return { error: error.message };

  revalidatePath('/brand-kit');
  return { ok: true };
}
