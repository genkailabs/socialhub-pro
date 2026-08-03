import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';
import { TIPOS, TIPO_IDS, TODOS_OS_PAPEIS, tipoPorId } from '@/lib/carrossel-tipos';

const short = (max) => z.string().trim().min(1).max(max);
const sourceSchema = z.object({
  id: z.string().trim().min(1).max(40),
  title: short(300),
  url: z.string().url().max(2000),
  publisher: z.string().trim().max(180).optional().default(''),
  publishedAt: z.string().trim().max(80).optional().default('')
});

const contentTypeSchema = z.enum(TIPO_IDS);

const baseInputSchema = z.object({
  brandName: short(160),
  brandContext: z.string().trim().max(3000).optional().default(''),
  // Qual dos 8 tipos de carrossel (lib/carrossel-tipos) o roteiro deve seguir.
  // Sem isto o gerador não sabe qual receita cumprir nem quais papéis de slide
  // são válidos — cada tipo tem os seus.
  contentType: contentTypeSchema,
  // O teto de 280 caía numa seleção inteira colada pelo usuário, e por isso
  // subiu. Sem teto nenhum, porém, o prompt aceita qualquer coisa: 2000 cabe
  // um briefing colado e ainda cabe no orçamento de tokens da chamada.
  topic: z.string().trim().min(1).max(2000),
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
// União de todos os papéis de slide de todos os tipos. A validação de QUAIS
// papéis valem para um tipo específico acontece no superRefine, comparando
// contra `papéis` do catálogo — o enum aqui só barra papel que não existe em
// tipo nenhum.
const narrativeRole = z.enum(TODOS_OS_PAPEIS);
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

// Confere que a narrativa/roteiro usa só papéis do tipo pedido, começa na
// capa e termina no CTA, com ordem sequencial sem furo.
function checkSequenciaEPapeis(items, contentType, context, path) {
  const tipo = tipoPorId(contentType);
  const ordered = items.map((item) => item.order);
  if (!unique(ordered) || ordered.some((order, index) => order !== index + 1)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path, message: 'Os slides precisam ter ordem sequencial, sem furo.' });
  }
  if (items[0]?.role !== 'cover' || items.at(-1)?.role !== 'cta') {
    context.addIssue({ code: z.ZodIssueCode.custom, path, message: 'O roteiro deve começar na capa e terminar no CTA.' });
  }
  if (tipo) {
    const foraDoTipo = items.filter((item) => !tipo.papeis.includes(item.role));
    if (foraDoTipo.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Papel de slide fora da receita de "${tipo.label}": ${[...new Set(foraDoTipo.map((i) => i.role))].join(', ')}.`
      });
    }
  }
}

export const directionsSchema = z.object({
  version: z.literal(2),
  // Antes fixo em 'educar-meio-funil'. Agora é o id do tipo de carrossel
  // escolhido (lib/carrossel-tipos) — o modelo ecoa o mesmo tipo do pedido.
  flow: contentTypeSchema,
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
  checkSequenciaEPapeis(value.narrative, value.flow, context, ['narrative']);
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

// Onde e como o roteiro cumpriu cada pilar da receita do tipo (§ analise
// pilares em lib/carrossel-tipos). Substitui o antigo checklist fixo de
// educativo — cada tipo tem pilares próprios, então o formato tem de ser
// aberto, e a validação real acontece no superRefine, contra o catálogo.
const pillarEvidenceSchema = z.object({
  slideOrder: z.number().int().min(1).max(8),
  evidence: short(240)
});

export const fullBriefSchema = z.object({
  version: z.literal(2),
  flow: contentTypeSchema,
  selectedHeadlineId: z.string().trim().regex(/^headline-[1-5]$/),
  slides: z.array(copySlideSchema).min(5).max(8),
  // A legenda vira o texto do post no feed. `hashtags` entrou depois e por isso
  // tem default: roteiro salvo antes disso continua válido e publica sem tag,
  // que é o comportamento honesto — melhor nenhuma do que inventada. O teto de
  // 12 é o mesmo do post-producer.
  caption: z.object({
    hook: short(500),
    takeaway: short(1200),
    cta: short(260),
    hashtags: z.array(short(40)).max(12).default([])
  }),
  pillarsCovered: z.record(z.string(), pillarEvidenceSchema).default({}),
  approval: z.object({ status: z.literal('requires-copy-approval') })
}).superRefine((value, context) => {
  checkSequenciaEPapeis(value.slides, value.flow, context, ['slides']);

  const tipo = tipoPorId(value.flow);
  if (!tipo) return;

  const ordensValidas = new Set(value.slides.map((slide) => slide.order));
  for (const pilar of tipo.pilares) {
    const coberto = value.pillarsCovered[pilar.id];
    if (!coberto) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pillarsCovered', pilar.id],
        message: `Falta cumprir o pilar "${pilar.label}" (${pilar.pergunta})`
      });
      continue;
    }
    if (!ordensValidas.has(coberto.slideOrder)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pillarsCovered', pilar.id, 'slideOrder'],
        message: `O pilar "${pilar.label}" aponta para um slide que não existe no roteiro.`
      });
    }
  }
});

export const fullBriefInputSchema = baseInputSchema.extend({
  directions: directionsSchema,
  selectedHeadlineId: z.string().trim().regex(/^headline-[1-5]$/)
}).superRefine((value, context) => {
  if (!value.directions.headlineOptions.some((item) => item.id === value.selectedHeadlineId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['selectedHeadlineId'], message: 'A headline escolhida não pertence às direções aprovadas.' });
  }
  if (value.directions.flow !== value.contentType) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['contentType'], message: 'O roteiro precisa ser do mesmo tipo das direções aprovadas.' });
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
    contentType: input.contentType,
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

function pilaresParaPrompt(tipo) {
  return tipo.pilares.map((p) => `- ${p.label} (id "${p.id}"): ${p.pergunta}`).join('\n');
}

function directionsSystemFor(tipo) {
  const limite = tipo.limite ? `\nLimite honesto deste tipo: ${tipo.limite}` : '';
  return `Você é o estrategista editorial do SocialHub para carrosséis do tipo "${tipo.label}" (objetivo: ${tipo.objetivo}).
${tipo.promessa}${limite}
Nesta etapa ainda não há pesquisa: não afirme números, datas, resultados, leis, fontes ou promessas factuais. Material da marca pode dar contexto, mas não é evidência factual. Deixe sourceIds vazio em todas as opções e páginas.
A receita deste tipo exige que a narrativa prepare o cumprimento de cada um destes pilares (eles serão cobrados de verdade só na etapa de copy):
${pilaresParaPrompt(tipo)}
Identifique uma tensão concreta e uma promessa proporcional. Crie exatamente cinco capas, cada uma em um ângulo distinto: erro, processo, contraste-real, diagnostico e principio. Não use clichês, superlativos vazios, motivação genérica, emojis ou linguagem de ferramenta.
Monte a narrativa na sequência de papéis: ${tipo.roteiro.join(' → ')}. Use exatamente esses papéis, na mesma quantidade de páginas. A resposta deve ser JSON válido no schema, com "flow" igual a "${tipo.id}".`;
}

function copySystemFor(tipo) {
  return `Você é o redator editorial do SocialHub para carrosséis do tipo "${tipo.label}" (objetivo: ${tipo.objetivo}).
Escreva somente o roteiro original para a direção e headline aprovadas. Preserve exatamente selectedHeadlineId e use a headline/subheadline escolhidas no slide cover.
Quando houver fontes, use exclusivamente os fatos da pesquisa fornecida. Toda afirmação verificável precisa de sourceIds válidos. Quando não houver fontes, escreva somente interpretações e orientações práticas atemporais: não invente dados, datas, resultados, estudos, leis ou promessas factuais. Uma ideia por slide, linguagem natural em PT-BR, sem clichês, promessas infladas ou CTA comercial agressivo.
O roteiro só é aceito se cumprir de verdade cada pilar da receita, e você precisa apontar em pillarsCovered ONDE (slideOrder) e COMO (evidence, uma frase) cada um foi cumprido:
${pilaresParaPrompt(tipo)}
Em cada slide, preencha imageIdea dizendo que foto a pessoa deve procurar: scene descreve em português uma cena concreta e fotografável (lugar, pessoas, objeto, ação) ligada ao texto daquele slide; searchTerms traz de 2 a 4 termos de busca em inglês, porque o banco de imagens é indexado em inglês; avoid diz em uma linha o que não serve. Nunca peça foto com texto, número, logo, gráfico ou interface dentro da imagem — o texto do slide entra por cima. Na capa, peça uma cena com espaço vazio para a manchete.
Em caption, escreva a legenda do post: hook prende, takeaway entrega o aprendizado e cta pede o próximo passo. Em caption.hashtags devolva de 3 a 8 hashtags em português, cada uma começando por "#", sem espaço e sem acento — do assunto e do nicho da marca, nunca genéricas de engajamento (#viral, #explore, #followme).
Use exatamente a sequência de papéis: ${tipo.roteiro.join(' → ')}. Não descreva layout, não cite ferramentas e não publique nada. Responda JSON válido no schema, com "flow" igual a "${tipo.id}".`;
}

function directionsJsonExampleFor(tipo) {
  return JSON.stringify({
    version: 2,
    flow: tipo.id,
    audience: { segment: 'segmento específico', situation: 'situação concreta', awareness: 'nível de consciência' },
    problem: 'problema central',
    learningOutcome: 'aprendizado prático',
    thesis: 'tese editorial',
    promiseBoundary: 'limite claro da promessa',
    headlineOptions: headlineAngles.map((angle, index) => ({
      id: `headline-${index + 1}`,
      headline: `headline específica ${index + 1}`,
      subheadline: 'linha de apoio opcional',
      angle,
      rationale: 'por que este ângulo funciona',
      specificityAnchor: 'detalhe concreto do tema',
      sourceIds: []
    })),
    narrative: tipo.roteiro.map((role, index) => ({
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
}

function fullBriefJsonExampleFor(tipo) {
  const pillarsCovered = Object.fromEntries(tipo.pilares.map((pilar, index) => [
    pilar.id,
    { slideOrder: Math.min(index + 1, tipo.roteiro.length), evidence: 'frase que mostra onde e como o pilar aparece' }
  ]));
  return JSON.stringify({
    version: 2,
    flow: tipo.id,
    selectedHeadlineId: 'headline-1',
    slides: tipo.roteiro.map((role, index) => ({
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
    caption: { hook: 'gancho', takeaway: 'aprendizado', cta: 'próximo passo', hashtags: ['#tema', '#nicho'] },
    pillarsCovered,
    approval: { status: 'requires-copy-approval' }
  });
}

export const carouselDirectionsSkill = defineSkill({
  id: 'carousel-directions',
  version: 3,
  description: 'Planeja direções e capas para o tipo de carrossel escolhido, com pesquisa validada antes da copy quando o tipo exige.',
  inputSchema: directionsInputSchema,
  outputSchema: directionsSchema,
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.5,
  maxTokens: 2600,
  buildPrompt: (input) => {
    const tipo = tipoPorId(input.contentType) || TIPOS[0];
    return {
      system: `${directionsSystemFor(tipo)}\nRetorne somente o objeto JSON raiz, sem wrapper. Exemplo completo do formato obrigatório:\n${directionsJsonExampleFor(tipo)}`,
      user: JSON.stringify({ task: `Criar ideias de capa e uma estrutura de carrossel do tipo "${tipo.label}".`, ...directionsPrompt(input) })
    };
  },
  normalizeOutput: (raw) => unwrapKnownOutput(raw, ['directions', 'carouselDirections', 'result', 'data'])
});

export const carouselFullBriefSkill = defineSkill({
  id: 'carousel-full-brief',
  version: 3,
  description: 'Escreve a copy completa do tipo de carrossel escolhido, somente após a direção e a headline aprovadas pelo humano.',
  inputSchema: fullBriefInputSchema,
  outputSchema: fullBriefSchema,
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.45,
  // 2800 cabia no roteiro sem dica de imagem. Oito slides × imageIdea passam
  // do teto, e teto estourado devolve JSON cortado — não erro de conteúdo.
  maxTokens: 3600,
  buildPrompt: (input) => {
    const tipo = tipoPorId(input.contentType) || tipoPorId(input.directions?.flow) || TIPOS[0];
    const selectedHeadline = input.directions.headlineOptions.find((item) => item.id === input.selectedHeadlineId);
    return {
      system: `${copySystemFor(tipo)}\nRetorne somente o objeto JSON raiz, sem wrapper. Exemplo completo do formato obrigatório:\n${fullBriefJsonExampleFor(tipo)}`,
      user: JSON.stringify({
        task: `Criar o roteiro completo do tipo "${tipo.label}".`,
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
