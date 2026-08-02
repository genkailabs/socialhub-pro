import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkLimit } from '@/lib/ai/limits';
import { CarouselImageError, generateCarouselImage } from '@/lib/carrossel-image';

export const runtime = 'nodejs';
export const maxDuration = 120;

const IMAGE_SKILL_ID = 'carousel-image';

async function logImageJob(supabase, row) {
  try {
    await supabase.from('generation_jobs').insert({
      kind: 'image',
      skill_id: IMAGE_SKILL_ID,
      skill_version: 1,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      image_count: 0,
      research_performed: false,
      charged: false,
      ...row
    });
  } catch {
    // O histórico é best-effort e nunca pode esconder o resultado da geração.
  }
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const limit = await checkLimit({
    supabase,
    brandId: body?.brandId,
    skillId: IMAGE_SKILL_ID
  });
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.reason }, { status: 429 });
  }

  try {
    const image = await generateCarouselImage({ supabase, userId: user.id, input: body });
    await logImageJob(supabase, {
      brand_id: body?.brandId,
      user_id: user.id,
      provider: 'pollinations',
      model: image.model,
      image_count: 1,
      status: 'success'
    });
    return NextResponse.json(image);
  } catch (error) {
    await logImageJob(supabase, {
      brand_id: body?.brandId,
      user_id: user.id,
      provider: null,
      model: null,
      status: 'error',
      error: error instanceof Error ? error.message : 'Falha desconhecida'
    });
    if (error instanceof CarouselImageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Falha inesperada ao gerar imagem do carrossel:', error);
    return NextResponse.json({ error: 'Não foi possível gerar a imagem agora. Tente novamente.' }, { status: 500 });
  }
}
