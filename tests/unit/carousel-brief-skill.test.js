import { describe, expect, it } from 'vitest';
import {
  carouselDirectionsSkill,
  carouselFullBriefSkill,
  directionsSchema,
  fullBriefSchema,
  fullBriefMatchesSelection,
  sourceIdsAreAllowed
} from '@/lib/ai/skills/carousel-brief';
import { tipoPorId } from '@/lib/carrossel-tipos';

const educativo = tipoPorId('educativo');
const tendencia = tipoPorId('analise-tendencia');

function direcoesDe(tipo, { comFonte = true } = {}) {
  const fontes = comFonte ? ['source-1'] : [];
  return {
    version: 2,
    flow: tipo.id,
    audience: { segment: 'Gestores', situation: 'Organizando processos', awareness: 'consideração' },
    problem: 'A equipe perde tempo com retrabalho.',
    learningOutcome: 'Identificar um primeiro ajuste de processo.',
    thesis: 'Mapear o gargalo antes de automatizar evita retrabalho.',
    promiseBoundary: 'Mostra um diagnóstico inicial, não garante resultado.',
    headlineOptions: [
      ['headline-1', 'erro'], ['headline-2', 'processo'], ['headline-3', 'contraste-real'],
      ['headline-4', 'diagnostico'], ['headline-5', 'principio']
    ].map(([id, angle]) => ({
      id, angle, headline: `Capa ${angle}`, subheadline: 'Contexto claro',
      rationale: 'Explica a escolha', specificityAnchor: 'Gargalo de processo', sourceIds: fontes
    })),
    narrative: tipo.roteiro.map((role, index) => ({
      order: index + 1, role, readerQuestion: 'O que esta página responde',
      purpose: 'Avançar uma ideia', keyPoint: 'Ponto específico', sourceIds: fontes
    })),
    assumptions: [],
    approval: { status: 'requires-directions-approval' }
  };
}

function roteiroDe(tipo, { selectedHeadlineId = 'headline-2' } = {}) {
  return {
    version: 2,
    flow: tipo.id,
    selectedHeadlineId,
    slides: tipo.roteiro.map((role, index) => ({
      order: index + 1,
      role,
      headline: index === 0 ? 'Capa processo' : `Slide ${index + 1}`,
      body: 'Explicação prática e delimitada.',
      claimType: index === 0 ? 'interpretation' : 'practical_guidance',
      sourceIds: [],
      readerTakeaway: 'Um passo claro.'
    })),
    caption: { hook: 'Gancho claro.', takeaway: 'Resumo do aprendizado.', cta: 'Salve para revisar.' },
    pillarsCovered: Object.fromEntries(tipo.pilares.map((pilar, index) => [
      pilar.id,
      { slideOrder: Math.min(index + 2, tipo.roteiro.length), evidence: 'Onde o pilar aparece.' }
    ])),
    approval: { status: 'requires-copy-approval' }
  };
}

const directions = direcoesDe(educativo);
const brief = roteiroDe(educativo);

describe('motor editorial próprio de carrossel', () => {
  it('nao fixa provider/model proprio: usa o padrao do produto (OpenRouter)', () => {
    expect(carouselDirectionsSkill.provider).toBeUndefined();
    expect(carouselDirectionsSkill.model).toBeUndefined();
    expect(carouselFullBriefSkill.provider).toBeUndefined();
    expect(carouselFullBriefSkill.model).toBeUndefined();
  });

  it('cria ideias de capa sem exigir uma pesquisa antes do primeiro passo', () => {
    expect(carouselDirectionsSkill.inputSchema.safeParse({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      contentType: 'educativo',
      topic: 'Como organizar processos antes de usar IA'
    }).success).toBe(true);
  });

  // O tipo é a receita inteira: sem ele o gerador não sabe quais pilares cobrar
  // nem quais papéis de slide aceitar.
  it('recusa pedido sem tipo de carrossel ou com tipo inventado', () => {
    const base = { brandName: 'GenkaiLabs', topic: 'Assunto' };

    expect(carouselDirectionsSkill.inputSchema.safeParse(base).success).toBe(false);
    expect(carouselDirectionsSkill.inputSchema.safeParse({ ...base, contentType: 'carrossel-magico' }).success).toBe(false);
    expect(carouselDirectionsSkill.inputSchema.safeParse({ ...base, contentType: 'analise-tendencia' }).success).toBe(true);
  });

  it('aceita integralmente um assunto longo colado pelo usuário', () => {
    const topic = Array.from({ length: 10 }, (_, index) => (
      `${index + 1}. Ângulo editorial detalhado com headline, apoio e contexto para orientar o carrossel.`
    )).join('\n');
    const parsed = carouselDirectionsSkill.inputSchema.safeParse({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      contentType: 'educativo',
      topic
    });

    expect(topic.length).toBeGreaterThan(280);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.topic).toBe(topic);
  });

  it('recusa assunto sem fim, que só queimaria token no prompt', () => {
    expect(carouselDirectionsSkill.inputSchema.safeParse({
      brandName: 'GenkaiLabs',
      contentType: 'educativo',
      topic: 'a'.repeat(2001)
    }).success).toBe(false);
  });

  it('aceita roteiro prático atemporal sem fonte', () => {
    expect(carouselFullBriefSkill.inputSchema.safeParse({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      contentType: 'educativo',
      topic: 'Como reduzir tarefas repetitivas',
      directions: direcoesDe(educativo, { comFonte: false }),
      selectedHeadlineId: 'headline-2'
    }).success).toBe(true);
  });

  // Trocar o tipo entre as duas etapas deixaria a copy seguir uma receita e as
  // direções, outra: o roteiro sairia sem os pilares que serão cobrados.
  it('recusa roteiro de um tipo em cima de direções de outro', () => {
    expect(carouselFullBriefSkill.inputSchema.safeParse({
      brandName: 'GenkaiLabs',
      contentType: 'case-sucesso',
      topic: 'Assunto',
      directions: direcoesDe(educativo, { comFonte: false }),
      selectedHeadlineId: 'headline-2'
    }).success).toBe(false);
  });

  it('mostra ao modelo o contrato JSON completo e aceita wrapper conhecido', () => {
    const prompt = carouselDirectionsSkill.buildPrompt({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      contentType: 'educativo',
      topic: 'Como organizar processos antes de usar IA',
      sourceMaterial: ''
    });
    expect(prompt.system).toContain('"headlineOptions"');
    expect(prompt.system).toContain('"approval"');
    expect(prompt.system).toContain('sem wrapper');
    expect(directionsSchema.safeParse(carouselDirectionsSkill.normalizeOutput({ directions })).success).toBe(true);
  });

  // Cada tipo tem promessa, pilares e sequência próprios; o prompt tem de dizer
  // isso, senão o modelo cai no carrossel educativo de sempre.
  it('ensina ao modelo a receita do tipo pedido, não uma receita fixa', () => {
    const prompt = carouselFullBriefSkill.buildPrompt({
      brandName: 'GenkaiLabs',
      contentType: 'analise-tendencia',
      topic: 'WhatsApp no computador',
      sourceMaterial: '',
      research: { summary: '', sources: [] },
      directions: direcoesDe(tendencia, { comFonte: false }),
      selectedHeadlineId: 'headline-2'
    });

    expect(prompt.system).toContain('Análise de tendência');
    expect(prompt.system).toContain('implicacao');
    expect(prompt.system).toContain('pillarsCovered');
    expect(prompt.system).toContain(tendencia.roteiro.join(' → '));
  });

  it('exige cinco headlines com ângulos diferentes e narrativa capa → CTA', () => {
    expect(directionsSchema.safeParse(directions).success).toBe(true);
    const repeated = structuredClone(directions);
    repeated.headlineOptions[4].angle = 'erro';
    expect(directionsSchema.safeParse(repeated).success).toBe(false);
  });

  // O papel de slide pertence à receita: "numeros" é do case, não do educativo.
  it('recusa papel de slide que não pertence ao tipo', () => {
    const foraDoTipo = structuredClone(directions);
    foraDoTipo.narrative[2].role = 'numeros';

    expect(directionsSchema.safeParse(foraDoTipo).success).toBe(false);
  });

  it('seleciona a mesma capa no roteiro', () => {
    expect(fullBriefSchema.safeParse(brief).success).toBe(true);
    expect(fullBriefMatchesSelection(brief, directions, 'headline-2')).toBe(true);
    expect(fullBriefMatchesSelection(brief, directions, 'headline-1')).toBe(false);
  });

  // O bloqueio pedido: roteiro que não cumpre a receita não é entregue. Uma
  // tendência sem dado é opinião com cara de análise.
  it('bloqueia roteiro que deixou um pilar da receita de fora', () => {
    const completo = roteiroDe(tendencia);
    expect(fullBriefSchema.safeParse(completo).success).toBe(true);

    const semEvidencia = structuredClone(completo);
    delete semEvidencia.pillarsCovered.evidencia;
    const parsed = fullBriefSchema.safeParse(semEvidencia);

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error.issues)).toContain('Exemplo ou dado');
  });

  it('bloqueia pilar que aponta para um slide inexistente', () => {
    const fantasma = roteiroDe(tendencia);
    fantasma.pillarsCovered.porque = { slideOrder: 8, evidence: 'Slide que não existe.' };

    expect(fullBriefSchema.safeParse(fantasma).success).toBe(false);
  });

  it('aceita o roteiro com e sem a dica de imagem', () => {
    const comDica = structuredClone(brief);
    comDica.slides[0].imageIdea = { scene: 'mesa de trabalho vazia com café', searchTerms: ['empty desk', 'morning coffee'], avoid: 'foto com texto na tela' };

    expect(fullBriefSchema.safeParse(comDica).success).toBe(true);
    expect(fullBriefSchema.safeParse(brief).success).toBe(true);
  });

  it('recusa dica de imagem sem termos de busca suficientes', () => {
    const poucosTermos = structuredClone(brief);
    poucosTermos.slides[0].imageIdea = { scene: 'mesa de trabalho', searchTerms: ['desk'] };
    const termosDemais = structuredClone(brief);
    termosDemais.slides[0].imageIdea = { scene: 'mesa', searchTerms: ['a', 'b', 'c', 'd', 'e'] };

    expect(fullBriefSchema.safeParse(poucosTermos).success).toBe(false);
    expect(fullBriefSchema.safeParse(termosDemais).success).toBe(false);
  });

  it('ensina ao modelo o formato da dica de imagem', () => {
    const prompt = carouselFullBriefSkill.buildPrompt({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      contentType: 'educativo',
      topic: 'Como reduzir tarefas repetitivas',
      sourceMaterial: '',
      research: { summary: '', sources: [] },
      directions,
      selectedHeadlineId: 'headline-2'
    });

    expect(prompt.system).toContain('"imageIdea"');
    expect(prompt.system).toContain('"searchTerms"');
    expect(prompt.system).toContain('termos de busca em inglês');
  });

  // A legenda sai do roteiro direto para o post. Sem hashtag no schema, o
  // carrossel nascia sem nenhuma e alguém tinha de escrever à mão.
  it('aceita hashtags na legenda do roteiro', () => {
    const comHashtags = structuredClone(brief);
    comHashtags.caption.hashtags = ['#processos', '#gestao'];

    const parsed = fullBriefSchema.safeParse(comHashtags);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.caption.hashtags).toEqual(['#processos', '#gestao']);
  });

  it('trata roteiro sem hashtag como lista vazia, e não como erro', () => {
    const parsed = fullBriefSchema.safeParse(brief);

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.caption.hashtags).toEqual([]);
  });

  // Doze é o teto que o post-producer já usa; muro de hashtag não é legenda.
  it('recusa parede de hashtags', () => {
    const demais = structuredClone(brief);
    demais.caption.hashtags = Array.from({ length: 13 }, (_, index) => `#tag${index}`);

    expect(fullBriefSchema.safeParse(demais).success).toBe(false);
  });

  it('ensina ao modelo que a legenda leva hashtags', () => {
    const prompt = carouselFullBriefSkill.buildPrompt({
      brandName: 'GenkaiLabs',
      contentType: 'educativo',
      topic: 'Como reduzir tarefas repetitivas',
      sourceMaterial: '',
      research: { summary: '', sources: [] },
      directions,
      selectedHeadlineId: 'headline-2'
    });

    expect(prompt.system).toContain('"hashtags"');
    expect(prompt.system).toContain('hashtags');
  });

  it('rejeita fonte inexistente antes de o roteiro chegar ao Studio', () => {
    expect(sourceIdsAreAllowed({ slides: [{ sourceIds: ['source-x'] }] }, ['source-1'])).toBe(false);
    expect(sourceIdsAreAllowed(directions, ['source-1'])).toBe(true);
  });
});
