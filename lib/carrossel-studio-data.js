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

const isHex = (value) => typeof value === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(value);

// Papel no Brand Kit → papel no Studio. Os dois lados já falam de papéis; só
// os nomes diferem.
const PAPEL_NO_STUDIO = {
  accent: 'brand-accent',
  bg: 'brand-bg',
  ink: 'brand-ink',
  surface: 'surface-card',
  muted: 'brand-muted'
};

// Brand Kit do gerenciador → tokens de cor do Studio.
//
// A leitura era por POSIÇÃO (`Object.values`), e a paleta do Kit é
// `{ accent, bg, surface, ink }`: a terceira cor é a superfície, não a tinta.
// O Studio recebia a superfície como cor do texto e a legenda nascia quase
// invisível sobre o fundo. Agora casa papel com papel; a ordem das chaves no
// banco deixa de importar. Paleta antiga salva como lista continua caindo na
// ordem em que foi gravada, que é tudo que se sabe sobre ela.
export function brandKitToStudioBrand(kit, fallbackName, handle) {
  const palette = kit?.palette && typeof kit.palette === 'object' ? kit.palette : {};
  const tokens = {};

  if (Array.isArray(palette)) {
    const hex = palette.filter(isHex);
    if (hex[0]) tokens['brand-accent'] = hex[0];
    if (hex[1]) tokens['brand-bg'] = hex[1];
    if (hex[2]) tokens['brand-ink'] = hex[2];
    if (hex[3]) tokens['brand-muted'] = hex[3];
  } else {
    for (const [papel, token] of Object.entries(PAPEL_NO_STUDIO)) {
      if (isHex(palette[papel])) tokens[token] = palette[papel];
    }
  }

  return {
    handle: handle ? (handle.startsWith('@') ? handle : `@${handle}`) : undefined,
    name: fallbackName,
    copyright: fallbackName ? `© ${new Date().getFullYear()} ${fallbackName}` : undefined,
    verified: true,
    tokens
  };
}
