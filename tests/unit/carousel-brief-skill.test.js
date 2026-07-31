import { describe, expect, it } from 'vitest';
import {
  carouselDirectionsSkill,
  carouselFullBriefSkill,
  directionsSchema,
  fullBriefSchema,
  fullBriefMatchesSelection,
  sourceIdsAreAllowed
} from '@/lib/ai/skills/carousel-brief';

const directions = {
  version: 2,
  flow: 'educar-meio-funil',
  audience: { segment: 'Gestores', situation: 'Organizando processos', awareness: 'consideração' },
  problem: 'A equipe perde tempo com retrabalho.',
  learningOutcome: 'Identificar um primeiro ajuste de processo.',
  thesis: 'Mapear o gargalo antes de automatizar evita retrabalho.',
  promiseBoundary: 'Mostra um diagnóstico inicial, não garante resultado.',
  headlineOptions: [
    ['headline-1', 'erro'], ['headline-2', 'processo'], ['headline-3', 'contraste-real'], ['headline-4', 'diagnostico'], ['headline-5', 'principio']
  ].map(([id, angle]) => ({ id, angle, headline: `Capa ${angle}`, subheadline: 'Contexto claro', rationale: 'Explica a escolha', specificityAnchor: 'Gargalo de processo', sourceIds: ['source-1'] })),
  narrative: [
    ['cover', 'O que vou aprender'], ['traction', 'Por que importa'], ['context', 'Qual o cenário'], ['teach', 'Qual o mecanismo'], ['apply', 'Como aplicar'], ['cta', 'Qual o próximo passo']
  ].map(([role, readerQuestion], index) => ({ order: index + 1, role, readerQuestion, purpose: 'Avançar uma ideia', keyPoint: 'Ponto específico', sourceIds: ['source-1'] })),
  assumptions: [],
  approval: { status: 'requires-directions-approval' }
};

const brief = {
  version: 2,
  flow: 'educar-meio-funil',
  selectedHeadlineId: 'headline-2',
  slides: directions.narrative.map((item, index) => ({
    order: index + 1,
    role: item.role,
    headline: index === 0 ? 'Capa processo' : `Slide ${index + 1}`,
    body: 'Explicação prática e delimitada.',
    claimType: index === 0 ? 'interpretation' : 'practical_guidance',
    sourceIds: [],
    readerTakeaway: 'Um passo claro.'
  })),
  caption: { hook: 'Gancho claro.', takeaway: 'Resumo do aprendizado.', cta: 'Salve para revisar.' },
  reviewChecklist: { newFollowerClear: true, oneIdeaPerSlide: true, claimsSourced: true, promiseProportional: true, ctaMatchesEducationalIntent: true },
  approval: { status: 'requires-copy-approval' }
};

describe('motor editorial próprio de carrossel', () => {
  it('usa DeepSeek Pro somente nas duas skills do fluxo de carrossel', () => {
    expect(carouselDirectionsSkill.model).toBe('deepseek-v4-pro');
    expect(carouselFullBriefSkill.model).toBe('deepseek-v4-pro');
  });

  it('cria ideias de capa sem exigir uma pesquisa antes do primeiro passo', () => {
    expect(carouselDirectionsSkill.inputSchema.safeParse({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      topic: 'Como organizar processos antes de usar IA'
    }).success).toBe(true);
  });

  it('aceita roteiro prático atemporal sem fonte', () => {
    const practicalDirections = {
      ...directions,
      headlineOptions: directions.headlineOptions.map((item) => ({ ...item, sourceIds: [] })),
      narrative: directions.narrative.map((item) => ({ ...item, sourceIds: [] }))
    };
    expect(carouselFullBriefSkill.inputSchema.safeParse({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      topic: 'Como reduzir tarefas repetitivas',
      directions: practicalDirections,
      selectedHeadlineId: 'headline-2'
    }).success).toBe(true);
  });

  it('mostra ao modelo o contrato JSON completo e aceita wrapper conhecido', () => {
    const prompt = carouselDirectionsSkill.buildPrompt({
      brandName: 'GenkaiLabs',
      brandContext: 'Consultoria de IA',
      topic: 'Como organizar processos antes de usar IA',
      sourceMaterial: ''
    });
    expect(prompt.system).toContain('"headlineOptions"');
    expect(prompt.system).toContain('"approval"');
    expect(prompt.system).toContain('sem wrapper');
    expect(directionsSchema.safeParse(carouselDirectionsSkill.normalizeOutput({ directions })).success).toBe(true);
  });

  it('exige cinco headlines com ângulos diferentes e narrativa capa → CTA', () => {
    expect(directionsSchema.safeParse(directions).success).toBe(true);
    const repeated = structuredClone(directions);
    repeated.headlineOptions[4].angle = 'erro';
    expect(directionsSchema.safeParse(repeated).success).toBe(false);
  });

  it('exige checklist de qualidade e seleciona a mesma capa no roteiro', () => {
    expect(fullBriefSchema.safeParse(brief).success).toBe(true);
    expect(fullBriefMatchesSelection(brief, directions, 'headline-2')).toBe(true);
    expect(fullBriefMatchesSelection(brief, directions, 'headline-1')).toBe(false);
  });

  it('rejeita fonte inexistente antes de o roteiro chegar ao Studio', () => {
    expect(sourceIdsAreAllowed({ slides: [{ sourceIds: ['source-x'] }] }, ['source-1'])).toBe(false);
    expect(sourceIdsAreAllowed(directions, ['source-1'])).toBe(true);
  });
});
