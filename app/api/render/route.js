import { ImageResponse } from 'next/og';
import { renderNode } from '@/lib/ai/render';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Rasteriza um slide da spec p/ preview no AI Studio (PNG).
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { template, spec, palette, slideIndex = 0, size = 'square' } = await req.json().catch(() => ({}));
  const dim = size === 'story' ? { w: 1080, h: 1920 } : { w: 1080, h: 1080 };
  return new ImageResponse(
    renderNode({ template: template || spec?.template, spec: spec || {}, palette, slideIndex, size }),
    { width: dim.w, height: dim.h }
  );
}
