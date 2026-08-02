import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';

const short = (max) => z.string().trim().min(1).max(max);
const sourceSchema = z.object({
  id: z.string().trim().min(1).max(40),
  title: short(300),
  url: z.string().url().max(2000),
  publisher: z.string().trim().max(180).optional().default(''),
  publishedAt: z.string().trim().max(80).optional().default('')
});

const baseInputSchema = z.object({
  brandName: short(160),
  brandContext: z.string().trim().max(3000).optional().default(''),
  topic: z.string().trim().min(1),
  sourceMaterial: z.string().trim().max(6000).optional().default(''),
  research: z.object({
    summary: z.string().trim().max(6000).default(''),
    sources: z.array(sourceSchema).max(5).default([])
  }).optional().default({ summary: '', sources: [] })
});

// Ideias de capa não são o roteiro final: elas podem ser criadas a partir do
// contexto da marca. A pesquisa obrigatória entra antes da copy, quando um
// fato poderá chegar ao leitor e precisará estar ligado a uma fonte.
const directionsInputSchema = baseInputSchema.omit({ research: true });

const sourceIds = z.array(z.string().trim().min(1).max(40)).max(3).default([]);
const narrativeRole = z.enum(['cover', 'traction', 'context', 'teach', 'apply', 'recap', 'cta']);
const headlineAngles = ['erro', 'processo', 'contraste-real', 'diagnostico', 'principio'];
const headlineOptionSchema = z.object({
  id: z.string().trim().regex(/^headline-[1-5]$/),
  headline: short(110),
  subheadline: z.string().trim().max(190).default(''),
  angle: z.enum(headlineAngles),
  rationale: short(280),
  specificityAnchor: short(240),
  sourceIds
});

const narrativeSlideSchema = z.object({
  order: z.number().int().min(1).max(8),
  role: narrativeRole,
  readerQuestion: short(180),
  purpose: short(240),
  keyPoint: short(300),
  sourceIds
});

function unique(values) {
  return new Set(values).size === values.length;
}

export const directionsSchema = z.object({
  version: z.literal(2),
  flow: z.literal('educar-meio-funil'),
  audience: z.object({ segment: short(180), situation: short(220), awareness: short(120) }),
  problem: short(280),
  learningOutcome: short(280),
  thesis: short(280),
  promiseBoundary: short(220),
  headlineOptions: z.array(headlineOptionSchema).length(5),
  narrative: z.array(narrativeSlideSchema).min(5).max(8),
  assumptions: z.array(short(220)).max(4).default([]),
  approval: z.object({ status: z.literal('requires-directions-approval') })
}).superRefine((value, context) => {
  if (!unique(value.headlineOptions.map((item) => item.id))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['headlineOptions'], message: 'IDs de headline devem ser únicos.' });
  }
  if (!unique(value.headlineOptions.map((item) => item.angle))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['headlineOptions'], message: 'Cada headline deve explorar um ângulo editorial diferente.' });
  }
  const ordered = value.narrative.map((slide) => slide.order);
  if (!unique(ordered) || ordered.some((order, index) => order !== index + 1)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['narrative'], message: 'A narrativa precisa ter ordem sequencial.' });
  }
  if (value.narrative[0]?.role !== 'cover' || value.narrative.at(-1)?.role !== 'cta') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['narrative'], message: 'A narrativa deve começar na capa e terminar no CTA.' });
  }
});

// Que foto procurar para este slide. Opcional de propósito: roteiro salvo
// antes deste campo continua válido, e um modelo que economize e omita a dica
// não derruba o roteiro inteiro — `lib/carrossel-image-hint` monta a reserva.
const imageIdeaSchema = z.object({
  scene: short(180),
  searchTerms: z.array(short(40)).min(2).max(4),
  avoid: z.string().trim().max(120).default('')
});

const copySlideSchema = z.object({
  order: z.number().int().min(1).max(8),
  role: narrativeRole,
  headline: short(120),
  body: z.string().trim().max(460).default(''),
  claimType: z.enum(['verified_fact', 'interpretation', 'practical_guidance']),
  sourceIds,
  readerTakeaway: short(240),
  imageIdea: imageIdeaSchema.optional()
}).superRefine((value, context) => {
  if (value.claimType === 'verified_fact' && value.sourceIds.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceIds'], message: 'Fato verificável exige fonte.' });
  }
});

export const fullBriefSchema = z.object({
  version: z.literal(2),
  flow: z.literal('educar-meio-funil'),
  selectedHeadlineId: z.string().trim().regex(/^headline-[1-5]$/),
  slides: z.array(copySlideSchema).min(5).max(8),
  caption: z.object({ hook: short(500), takeaway: short(1200), cta: short(260) }),
  reviewChecklist: z.object({
    newFollowerClear: z.literal(true),
    oneIdeaPerSlide: z.literal(true),
    claimsSourced: z.literal(true),
    promiseProportional: z.literal(true),
    ctaMatchesEducationalIntent: z.literal(true)
  }),
  approval: z.object({ status: z.literal('requires-copy-approval') })
}).superRefine((value, context) => {
  const ordered = value.slides.map((slide) => slide.order);
  if (!unique(ordered) || ordered.some((order, index) => order !== index + 1)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['slides'], message: 'Os slides precisam ter ordem sequencial.' });
  }
  if (value.slides[0]?.role !== 'cover' || value.slides.at(-1)?.role !== 'cta') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['slides'], message: 'O roteiro deve começar na capa e terminar no CTA.' });
  }
});

export const fullBriefInputSchema = baseInputSchema.extend({
  directions: directionsSchema,
  selectedHeadlineId: z.string().trim().regex(/^headline-[1-5]$/)
}).superRefine((value, context) => {
  if (!value.directions.headlineOptions.some((item) => item.id === value.selectedHeadlineId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['selectedHeadlineId'], message: 'A headline escolhida não pertence às direções aprovadas.' });
  }
});

function sourcesForPrompt(input) {
  return input.research.sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    publishedAt: source.publishedAt
  }));
}

const DIRECTIONS_SYSTEM = `Você é o estrategista editorial do SocialHub para carrosséis brasileiros que ensinam algo útil.
Crie ideias de capa originais e uma estrutura de aprendizado. Nesta etapa ainda não há pesquisa: não afirme números, datas, resultados, leis, fontes ou promessas factuais. Material da marca pode dar contexto, mas não é evidência factual. Deixe sourceIds vazio em todas as opções e páginas.
Identifique uma tensão concreta, uma aprendizagem útil e uma promessa proporcional. Crie exatamente cinco capas, cada uma em um ângulo distinto: erro, processo, contraste-real, diagnostico e principio. Não use clichês, superlativos vazios, motivação genérica, emojis ou linguagem de ferramenta.
Desenhe uma progressão que funcione para quem não segue a marca: capa, tração, contexto, ensino prático, aplicação e CTA leve. A resposta deve ser JSON válido no schema.`;

const COPY_SYSTEM = `Você é o redator editorial do SocialHub para carrosséis educativos brasileiros de meio de funil.
Escreva somente o roteiro original para a direção e headline aprovadas. Preserve exatamente selectedHeadlineId e use a headline/subheadline escolhidas no slide cover.
Quando houver fontes, use exclusivamente os fatos da pesquisa fornecida. Toda afirmação verificável precisa de sourceIds válidos. Quando não houver fontes, escreva somente interpretações e orientações práticas atemporais: não invente dados, datas, resultados, estudos, leis ou promessas factuais. Uma ideia por slide, linguagem natural em PT-BR, sem clichês, promessas infladas ou CTA comercial agressivo.
Em cada slide, preencha imageIdea dizendo que foto a pessoa deve procurar: scene descreve em português uma cena concreta e fotografável (lugar, pessoas, objeto, ação) ligada ao texto daquele slide; searchTerms traz de 2 a 4 termos de busca em inglês, porque o banco de imagens é indexado em inglês; avoid diz em uma linha o que não serve. Nunca peça foto com texto, número, logo, gráfico ou interface dentro da imagem — o texto do slide entra por cima. Na capa, peça uma cena com espaço vazio para a manchete.
O roteiro deve começar na capa e terminar no CTA. Não descreva layout, não cite ferramentas e não publique nada. Responda JSON válido no schema.`;

function basePrompt(input) {
  return {
    brand: { name: input.brandName, context: input.brandContext },
    topic: input.topic,
    sourceMaterial: input.sourceMaterial || undefined,
    verifiedResearch: { summary: input.research.summary, sources: sourcesForPrompt(input) },
    writingMode: input.research.sources.length ? 'sourced' : 'practical-guidance-only'
  };
}

function directionsPrompt(input) {
  return {
    brand: { name: input.brandName, context: input.brandContext },
    topic: input.topic,
    sourceMaterial: input.sourceMaterial || undefined
  };
}

function unwrapKnownOutput(raw, keys) {
  let current = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) break;
    const key = keys.find((candidate) => current[candidate] && typeof current[candidate] === 'object');
    if (!key) break;
    current = current[key];
  }
  return current;
}

const DIRECTIONS_JSON_EXAMPLE = JSON.stringify({
  version: 2,
  flow: 'educar-meio-funil',
  audience: { segment: 'segmento específico', situation: 'situação concreta', awareness: 'nível de consciência' },
  problem: 'problema central',
  learningOutcome: 'aprendizado prático',
  thesis: 'tese editorial',
  promiseBoundary: 'limite claro da promessa',
  headlineOptions: ['erro', 'processo', 'contraste-real', 'diagnostico', 'principio'].map((angle, index) => ({
    id: `headline-${index + 1}`,
    headline: `headline específica ${index + 1}`,
    subheadline: 'linha de apoio opcional',
    angle,
    rationale: 'por que este ângulo funciona',
    specificityAnchor: 'detalhe concreto do tema',
    sourceIds: []
  })),
  narrative: ['cover', 'traction', 'context', 'teach', 'apply', 'cta'].map((role, index) => ({
    order: index + 1,
    role,
    readerQuestion: 'pergunta respondida nesta página',
    purpose: 'função desta página',
    keyPoint: 'ponto principal',
    sourceIds: []
  })),
  assumptions: [],
  approval: { status: 'requires-directions-approval' }
});

const FULL_BRIEF_JSON_EXAMPLE = JSON.stringify({
  version: 2,
  flow: 'educar-meio-funil',
  selectedHeadlineId: 'headline-1',
  slides: ['cover', 'traction', 'context', 'teach', 'apply', 'cta'].map((role, index) => ({
    order: index + 1,
    role,
    headline: 'headline da página',
    body: 'texto da página',
    claimType: 'practical_guidance',
    sourceIds: [],
    readerTakeaway: 'o que o leitor leva desta página',
    imageIdea: {
      scene: 'cena concreta que a pessoa pode procurar no banco de imagens',
      searchTerms: ['english search term', 'second english term'],
      avoid: 'o que não serve nesta foto'
    }
  })),
  caption: { hook: 'gancho', takeaway: 'aprendizado', cta: 'próximo passo' },
  reviewChecklist: {
    newFollowerClear: true,
    oneIdeaPerSlide: true,
    claimsSourced: true,
    promiseProportional: true,
    ctaMatchesEducationalIntent: true
  },
  approval: { status: 'requires-copy-approval' }
});

export const carouselDirectionsSkill = defineSkill({
  id: 'carousel-directions',
  version: 2,
  description: 'Planeja direções e capas educativas originais com pesquisa validada antes da copy.',
  inputSchema: directionsInputSchema,
  outputSchema: directionsSchema,
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.5,
  maxTokens: 2600,
  buildPrompt: (input) => ({
    system: `${DIRECTIONS_SYSTEM}\nRetorne somente o objeto JSON raiz, sem wrapper. Exemplo completo do formato obrigatório:\n${DIRECTIONS_JSON_EXAMPLE}`,
    user: JSON.stringify({ task: 'Criar ideias de capa e uma estrutura de carrossel.', ...directionsPrompt(input) })
  }),
  normalizeOutput: (raw) => unwrapKnownOutput(raw, ['directions', 'carouselDirections', 'result', 'data'])
});

export const carouselFullBriefSkill = defineSkill({
  id: 'carousel-full-brief',
  version: 2,
  description: 'Escreve a copy completa somente após a escolha humana da direção editorial.',
  inputSchema: fullBriefInputSchema,
  outputSchema: fullBriefSchema,
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.45,
  // 2800 cabia no roteiro sem dica de imagem. Oito slides × imageIdea passam
  // do teto, e teto estourado devolve JSON cortado — não erro de conteúdo.
  maxTokens: 3600,
  buildPrompt: (input) => {
    const selectedHeadline = input.directions.headlineOptions.find((item) => item.id === input.selectedHeadlineId);
    return {
      system: `${COPY_SYSTEM}\nRetorne somente o objeto JSON raiz, sem wrapper. Exemplo completo do formato obrigatório:\n${FULL_BRIEF_JSON_EXAMPLE}`,
      user: JSON.stringify({
        task: 'Criar um CarouselFullBrief para Educar / meio de funil.',
        ...basePrompt(input),
        approvedPlan: {
          audience: input.directions.audience,
          problem: input.directions.problem,
          learningOutcome: input.directions.learningOutcome,
          thesis: input.directions.thesis,
          promiseBoundary: input.directions.promiseBoundary,
          narrative: input.directions.narrative,
          selectedHeadline
        },
        required: { selectedHeadlineId: input.selectedHeadlineId, approval: 'O resultado ainda exige aprovação humana antes de entrar no Studio.' }
      })
    };
  },
  normalizeOutput: (raw) => unwrapKnownOutput(raw, ['brief', 'carouselBrief', 'result', 'data'])
});

export function sourceIdsAreAllowed(value, allowedSourceIds) {
  const ids = new Set(allowedSourceIds);
  const groups = [
    ...(value.headlineOptions || []),
    ...(value.narrative || []),
    ...(value.slides || [])
  ];
  return groups.every((item) => (item.sourceIds || []).every((id) => ids.has(id)));
}

export function fullBriefMatchesSelection(brief, directions, selectedHeadlineId) {
  const selected = directions.headlineOptions.find((item) => item.id === selectedHeadlineId);
  const cover = brief.slides.find((slide) => slide.role === 'cover');
  return brief.selectedHeadlineId === selectedHeadlineId && Boolean(selected) && cover?.headline === selected.headline;
}
