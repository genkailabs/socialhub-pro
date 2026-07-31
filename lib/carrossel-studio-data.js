import { createClient } from '@/lib/supabase/server';

export const STUDIO_SOURCE = 'carrossel-studio';

// Rascunho mais recente feito no Studio. Fica separado do rascunho do
// Composer (`visual-composer`) de propósito: são dois editores, dois estados.
export async function getLatestStudioDraft(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, production, media_urls')
    .eq('brand_id', brandId)
    .eq('status', 'draft')
    .contains('production', { source: STUDIO_SOURCE })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    doc: data.production?.editorState?.doc || null,
    mediaUrls: Array.isArray(data.media_urls) ? data.media_urls.filter(Boolean) : [],
    ...(data.production?.editorState?.editorial ? { editorial: data.production.editorState.editorial } : {})
  };
}

// Brand Kit do gerenciador → tokens de cor do Studio. A paleta lá é livre
// ({ primary, secondary, ... } ou lista); aqui viram os nomes que o Studio usa.
export function brandKitToStudioBrand(kit, fallbackName, handle) {
  const palette = kit?.palette && typeof kit.palette === 'object' ? kit.palette : {};
  const values = Array.isArray(palette) ? palette : Object.values(palette);
  const hex = values.filter((value) => typeof value === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(value));

  const tokens = {};
  if (hex[0]) tokens['brand-accent'] = hex[0];
  if (hex[1]) tokens['brand-bg'] = hex[1];
  if (hex[2]) tokens['brand-ink'] = hex[2];
  if (hex[3]) tokens['brand-muted'] = hex[3];

  return {
    handle: handle ? (handle.startsWith('@') ? handle : `@${handle}`) : undefined,
    name: fallbackName,
    copyright: fallbackName ? `© ${new Date().getFullYear()} ${fallbackName}` : undefined,
    verified: true,
    tokens
  };
}
