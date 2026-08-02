import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { researchContext, ResearchUnavailableError } from '@/lib/ai/research';
import { runSkill } from '@/lib/ai/skills/run';
import { instagramTrendsSkill, trendSourceIdsAreAllowed } from '@/lib/ai/skills/instagram-trends';
import { normalizeTrends } from '@/lib/instagram-trends';
import { createTrendsResearchCacheClient } from '@/lib/instagram-trends-cache';

export const maxDuration = 120;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const brandId = typeof body?.brandId === 'string' ? body.brandId : '';
  if (!brandId) return NextResponse.json({ error: 'Marca inválida.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

  const [{ data: brand }, { data: kit }] = await Promise.all([
    supabase.from('brands').select('id, name, niche, description').eq('id', brandId).maybeSingle(),
    supabase.from('brand_kits').select('niche, audience').eq('brand_id', brandId).maybeSingle()
  ]);
  if (!brand) return NextResponse.json({ error: 'Marca inválida.' }, { status: 403 });

  const niche = String(kit?.niche || brand.niche || '').trim();
  const query = [
    'tendências atuais de formatos, narrativas e mecânicas de conteúdo no Instagram no Brasil',
    niche && `para profissionais de ${niche}`,
    'fontes originais e publicadas; sem estimar métricas'
  ].filter(Boolean).join(' — ');

  try {
    const research = await researchContext({
      supabase: createTrendsResearchCacheClient(),
      brief: { topic: query, format: 'news', research: true },
      kit: { niche }
    });
    if (!research.sources?.length) {
      return NextResponse.json({
        state: 'unavailable',
        error: 'A pesquisa não encontrou fontes verificáveis suficientes. Nenhuma tendência foi inventada.'
      }, { status: 503 });
    }

    const sources = research.sources.map((source, index) => ({ ...source, id: `source-${index + 1}` }));
    const { data } = await runSkill({
      skill: instagramTrendsSkill,
      input: {
        brandName: brand.name,
        niche,
        audience: kit?.audience || brand.description || '',
        research: { summary: research.summary, sources }
      },
      supabase,
      brandId,
      userId: user.id
    });

    const allowedIds = sources.map((source) => source.id);
    if (!trendSourceIdsAreAllowed(data.trends, allowedIds)) {
      return NextResponse.json({ state: 'unavailable', error: 'A curadoria citou uma fonte inválida e foi descartada.' }, { status: 502 });
    }
    const trends = normalizeTrends(data.trends, sources);
    if (trends.length < 3) {
      return NextResponse.json({ state: 'unavailable', error: 'A pesquisa não produziu três tendências verificáveis sem métricas não confirmadas.' }, { status: 502 });
    }

    return NextResponse.json({
      state: 'ready',
      researchedAt: new Date().toISOString(),
      trends,
      sources,
      research: { model: research.model, cached: research.cached }
    });
  } catch (error) {
    if (error instanceof ResearchUnavailableError) {
      return NextResponse.json({ state: 'unavailable', error: `${error.message} Nenhuma tendência foi inventada.` }, { status: 503 });
    }
    return NextResponse.json({
      state: 'unavailable',
      error: 'Não foi possível organizar a pesquisa agora. Nenhuma tendência foi inventada.'
    }, { status: 502 });
  }
}
