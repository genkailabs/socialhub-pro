import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { researchContext, ResearchUnavailableError } from '@/lib/ai/research';
import { runSkill } from '@/lib/ai/skills/run';
import { assuntoSourceIdsAreAllowed, carouselAssuntosSkill } from '@/lib/ai/skills/carousel-assuntos';
import { consultaDeAssuntos, normalizeAssuntos } from '@/lib/carrossel-assuntos';
import { createTrendsResearchCacheClient } from '@/lib/instagram-trends-cache';
import { tipoPorId } from '@/lib/carrossel-tipos';

// Pesquisa (até 60s) + skill (duas tentativas de ~30s). O teto acompanha o
// mesmo raciocínio da rota do briefing.
export const maxDuration = 120;

// Menos que isso não é material: é um assunto escrito com pressa, e para esse
// caminho existe a opção "escrever o assunto", que não gasta pesquisa.
const MIN_MATERIAL = 40;
const MAX_MATERIAL = 6000;

// Duas com fonte já dão escolha real. Exigir três fazia a tela falhar por causa
// de uma notícia a menos, e o remédio virava pior que a doença.
const MINIMO_COM_FONTE = 2;

function erro(message, status = 400) {
  return NextResponse.json({ state: 'unavailable', error: message }, { status });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const brandId = typeof body?.brandId === 'string' ? body.brandId : '';
  const tipo = tipoPorId(body?.contentType);
  const material = typeof body?.material === 'string' ? body.material.trim() : '';

  if (!brandId) return erro('Marca inválida.');
  if (!tipo?.exigePesquisa) return erro('Este tipo de carrossel não pesquisa assunto.');
  if (material && (material.length < MIN_MATERIAL || material.length > MAX_MATERIAL)) {
    return erro(`O material precisa ter entre ${MIN_MATERIAL} e ${MAX_MATERIAL} caracteres.`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

  // `brands` guarda o segmento em `category`; o nicho fino vem do Brand Kit.
  const [{ data: brand }, { data: kit }] = await Promise.all([
    supabase.from('brands').select('id, name, category').eq('id', brandId).maybeSingle(),
    supabase.from('brand_kits').select('niche, audience').eq('brand_id', brandId).maybeSingle()
  ]);
  if (!brand) return erro('Marca inválida.', 403);

  const niche = String(kit?.niche || brand.category || '').trim();
  const audience = String(kit?.audience || '').trim();
  // Link colado ainda é pesquisa: quem manda um endereço quer o que está lá
  // dentro, com fonte e data — e isso o material colado sozinho não tem.
  const linkSozinho = /^https?:\/\/\S+$/i.test(material);
  const origem = material && !linkSozinho ? 'material' : 'busca';

  try {
    const pesquisa = origem === 'material'
      ? { summary: material, sources: [], model: null, cached: false }
      : await researchContext({
        // `research_cache` tem RLS sem policy para sessão de usuário: com o
        // client autenticado o cache nunca escreve, e toda busca pagaria a
        // pesquisa de novo. O service role fica dentro desta rota.
        supabase: createTrendsResearchCacheClient(),
        brief: {
          topic: linkSozinho
            ? `${material} — o que esta publicação diz, com veículo e data`
            : consultaDeAssuntos({ tipo: tipo.id, niche, audience }),
          format: 'news',
          research: true
        },
        kit: { niche }
      });

    if (origem === 'busca' && !pesquisa.sources?.length) {
      return erro('A pesquisa não encontrou fontes verificáveis agora. Nenhum assunto foi inventado.', 503);
    }

    const sources = (pesquisa.sources || []).map((source, index) => ({ ...source, id: `source-${index + 1}` }));
    const { data } = await runSkill({
      skill: carouselAssuntosSkill,
      input: {
        brandName: brand.name,
        niche,
        audience,
        tipo: tipo.id,
        origem,
        research: { summary: pesquisa.summary, sources }
      },
      supabase,
      brandId,
      userId: user.id
    });

    if (!assuntoSourceIdsAreAllowed(data.assuntos, sources.map((source) => source.id))) {
      return erro('A pesquisa citou uma fonte que não existe e foi descartada.', 502);
    }

    const assuntos = normalizeAssuntos(data.assuntos, sources, { exigeFonte: origem === 'busca' });
    const minimo = origem === 'busca' ? MINIMO_COM_FONTE : 1;
    if (assuntos.length < minimo) {
      return erro(origem === 'busca'
        ? 'A pesquisa não produziu assuntos com fonte e data. Tente de novo ou cole você mesmo o material.'
        : 'Não consegui tirar um assunto de carrossel desse material. Tente um trecho mais específico.', 502);
    }

    return NextResponse.json({
      state: 'ready',
      origem,
      contentType: tipo.id,
      pesquisadoEm: new Date().toISOString(),
      assuntos,
      sources,
      research: { model: pesquisa.model, cached: pesquisa.cached }
    });
  } catch (error) {
    if (error instanceof ResearchUnavailableError) {
      return erro(`${error.message} Nenhum assunto foi inventado.`, 503);
    }
    return erro('Não foi possível pesquisar assuntos agora. Nenhum assunto foi inventado.', 502);
  }
}
