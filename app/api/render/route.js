import { ImageResponse } from 'next/og';
import { buildArt } from '@/lib/ai/art/pipeline';
import { artFonts } from '@/lib/ai/art/fonts';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Rasteriza UMA arte (PNG) pelo pipeline real (§13-19), para preview.
//
// Usa o mesmo buildArt da produção de propósito: um preview que renderiza por
// outro caminho mostra uma peça que o usuário nunca vai receber.
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const art = buildArt({
    content: body.content || {},
    kit: body.kit || null,
    brandColor: body.brandColor || '',
    niche: body.niche || '',
    size: body.size || 'square',
    recentLayouts: body.recentLayouts || [],
    seed: Number(body.seed) || 0
  });

  return new ImageResponse(art.node, { width: art.size.width, height: art.size.height, fonts: artFonts() });
}
