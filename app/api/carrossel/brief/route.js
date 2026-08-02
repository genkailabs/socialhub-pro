import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { needsResearch, researchContext, ResearchUnavailableError } from '@/lib/ai/research';
import {
  carouselDirectionsSkill,
  carouselFullBriefSkill,
  fullBriefMatchesSelection,
  sourceIdsAreAllowed
} from '@/lib/ai/skills/carousel-brief';
import { runSkill } from '@/lib/ai/skills/run';

// `runSkill` tenta duas vezes, e uma tentativa custa 25–31s medidos. O teto de
// 60s cortava a requisição no meio da segunda tentativa em toda plataforma que
// respeita este limite. Acompanha o abort do cliente (120s).
export const maxDuration = 120;

function cleanContext(value) {
  if (typeof value === 'string') return value.slice(0, 3000);
  if (!value || typeof value !== 'object') return '';
  try {
    return JSON.stringify(value).slice(0, 3000);
  } catch {
    return '';
  }
}

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const stage = body?.stage === 'full-brief' ? 'full-brief' : body?.stage === 'directions' || !body?.stage ? 'directions' : null;
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';
  const sourceMaterial = typeof body?.sourceMaterial === 'string' ? body.sourceMaterial.trim() : '';
  const brandId = typeof body?.brandId === 'string' ? body.brandId : '';
  if (!stage) return badRequest('Etapa editorial inválida.');
  if (!brandId || !topic || sourceMaterial.length > 6000) {
    return badRequest('Tema, contexto ou marca inválidos.');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: 'Marca inválida.' }, { status: 403 });

  const [{ data: kit }, { data: dna }] = await Promise.all([
    supabase.from('brand_kits').select('*').eq('brand_id', brandId).maybeSingle(),
    supabase.from('brand_dna_versions').select('report, content').eq('brand_id', brandId).eq('status', 'approved').order('version', { ascending: false }).limit(1).maybeSingle()
  ]);

  try {
    const baseInput = {
      brandName: brand.name,
      brandContext: cleanContext({ description: brand.description, kit, dna: dna?.report || dna?.content || null }),
      topic,
      sourceMaterial
    };

    if (stage === 'directions') {
      const { data: directions } = await runSkill({
        skill: carouselDirectionsSkill,
        input: baseInput,
        supabase,
        brandId,
        userId: user.id
      });
      if (!sourceIdsAreAllowed(directions, [])) {
        return NextResponse.json({ error: 'As ideias precisam ficar sem fontes até a etapa do roteiro. Tente novamente.' }, { status: 502 });
      }
      return NextResponse.json({ stage, directions, sources: [] });
    }

    // Temas atuais exigem pesquisa verificável. Em temas atemporais, o roteiro
    // continua possível, mas limitado a orientação prática sem alegações factuais.
    const researchRequired = needsResearch({ topic, format: 'carousel' });
    const research = researchRequired
      ? await researchContext({
        supabase,
        brief: { topic, format: 'carousel', research: true },
        kit: { niche: brand.niche || kit?.niche || '' }
      })
      : { summary: '', sources: [], model: null, cached: false };
    if (researchRequired && !research.sources?.length) {
      return NextResponse.json({ error: 'Não foi possível validar fontes suficientes para este roteiro atual. Tente um tema mais específico ou volte mais tarde.' }, { status: 502 });
    }
    const sources = (research.sources || []).map((source, index) => ({ ...source, id: `source-${index + 1}` }));

    const directions = body?.directions;
    const selectedHeadlineId = typeof body?.selectedHeadlineId === 'string' ? body.selectedHeadlineId : '';
    const { data: brief } = await runSkill({
      skill: carouselFullBriefSkill,
      input: { ...baseInput, research: { summary: research.summary, sources }, directions, selectedHeadlineId },
      supabase,
      brandId,
      userId: user.id
    });
    if (!sourceIdsAreAllowed(brief, sources.map((source) => source.id)) || !fullBriefMatchesSelection(brief, directions, selectedHeadlineId)) {
      return NextResponse.json({ error: 'O roteiro não corresponde à direção aprovada. Tente novamente.' }, { status: 502 });
    }
    return NextResponse.json({ stage, brief, sources, research: { required: researchRequired, model: research.model, cached: research.cached } });
  } catch (error) {
    if (error instanceof ResearchUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : '';
    if (/nao devolveu um resultado valido|saída invalida|saida invalida/i.test(message)) {
      return NextResponse.json({ error: 'A IA não conseguiu organizar as ideias desta vez. Tente novamente.' }, { status: 502 });
    }
    return NextResponse.json({ error: message || 'Não foi possível criar o roteiro.' }, { status: 502 });
  }
}
