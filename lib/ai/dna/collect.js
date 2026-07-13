import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { fetchInstagramProfile, fetchInstagramMedia } from '@/lib/meta/graph';
import { pickRelevantCaptions } from '@/lib/ai/dna/captions';
import { htmlToText } from '@/lib/ai/dna/website';

// Coleta bio + 12 legendas relevantes do IG próprio (ou null se sem token/erro).
async function collectInstagram(brandId, supabase) {
  const { data: token } = await supabase.from('social_tokens')
    .select('access_token, platform_user_id')
    .eq('brand_id', brandId).eq('platform', 'instagram').eq('is_active', true).maybeSingle();
  if (!token) return null;
  try {
    const profile = await fetchInstagramProfile(token.platform_user_id, token.access_token);
    const media = await fetchInstagramMedia(token.platform_user_id, token.access_token, 15);
    return { bio: profile.biography || '', captions: pickRelevantCaptions(media, 12) };
  } catch { return null; }
}

async function collectWebsite(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) return null;
    return htmlToText(await res.text(), 8000);
  } catch { return null; }
}

// Monta o objeto `sources` p/ buildDnaPrompt.
export async function collectSources({ brandId, wantIg, websiteUrl, pastedText, manual }) {
  const supabase = await createClient();
  const [ig, website] = await Promise.all([
    wantIg ? collectInstagram(brandId, supabase) : Promise.resolve(null),
    collectWebsite(websiteUrl)
  ]);
  return {
    sources: { manual: manual || {}, ig, website, pasted: (pastedText || '').slice(0, 8000) || null },
    meta: { hasIg: !!ig, hasWebsite: !!website, hasPasted: !!pastedText }
  };
}
