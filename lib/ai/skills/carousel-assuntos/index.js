import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';

// Skill do ASSUNTO — não do roteiro, não da capa.
//
// Ela lê pesquisa verificável (ou o material que a pessoa colou) e devolve
// acontecimentos que podem virar carrossel. O trabalho difícil aqui é negativo:
// impedir que "conteúdo humanizado", "aposte em Reels" ou "prova social" voltem
// disfarçados de tendência. Isso não é acontecimento, é conselho de marketing —
// e conselho não tem data nem fonte.

const short = (max) => z.string().trim().min(1).max(max);

const sourceSchema = z.object({
  id: short(40),
  title: short(300),
  url: z.string().url().max(2000),
  publisher: z.string().trim().max(180).optional().default(''),
  publishedAt: z.string().trim().max(80).optional().default('')
});

export const carouselAssuntosInputSchema = z.object({
  brandName: short(160),
  niche: z.string().trim().max(240).default(''),
  audience: z.string().trim().max(500).default(''),
  // Só os dois carros-chefe pesquisam assunto; o campo existe porque a receita
  // do case é diferente da receita da tendência.
  tipo: z.enum(['analise-tendencia', 'case-sucesso']),
  origem: z.enum(['busca', 'material']).default('busca'),
  research: z.object({
    summary: short(9000),
    sources: z.array(sourceSchema).max(6).default([])
  })
});

const assuntoSchema = z.object({
  titulo: short(120),
  resumo: short(320),
  angulo: short(280),
  relacaoComNicho: z.string().trim().max(240).optional().default(''),
  // O modelo declara o que a fonte sustenta. Rumor entra como rumor: some da
  // tela, não. Some a licença de afirmar que aconteceu.
  confirmado: z.boolean().default(true),
  sourceIds: z.array(short(40)).max(3).default([])
});

export const carouselAssuntosOutputSchema = z.object({
  assuntos: z.array(assuntoSchema).min(1).max(8)
});

const EXAMPLE = JSON.stringify({
  assuntos: [{
    titulo: 'Acontecimento concreto, com quem e o quê',
    resumo: 'O que aconteceu, em duas frases, do jeito que a fonte contou.',
    angulo: 'A leitura que o carrossel vai defender sobre esse acontecimento.',
    relacaoComNicho: 'Por que o público desta marca se importa com isso.',
    confirmado: true,
    sourceIds: ['source-1']
  }]
});

const REGRA_COMUM = `Você separa ASSUNTO de ESTRATÉGIA. Assunto é algo que aconteceu, com protagonista, data e fonte. Estratégia é conselho de marketing.
PROIBIDO devolver como assunto: "conteúdo humanizado", "educação e valor", "usar Reels", "interação nos Stories", "prova social", "constância", "storytelling" ou qualquer variação de dica de conteúdo. Se um item puder ser dito sobre qualquer marca em qualquer semana, ele não é assunto — descarte.
Use exclusivamente o material fornecido. Não complete lacuna com conhecimento próprio, não estime números e não repita boato como fato: quando a fonte trata como rumor, especulação ou "segundo pessoas próximas", devolva confirmado=false.
Cada item cita apenas sourceIds que existem no material. Escreva em PT-BR. Retorne somente o objeto JSON raiz, sem wrapper ou Markdown. Formato obrigatório:\n${EXAMPLE}`;

const RECEITA = {
  'analise-tendencia': 'Procure acontecimentos, lançamentos e movimentos recentes que ganharam atenção do público. O ângulo deve explicar por que aquilo aconteceu ou o que ele revela — não "como usar isso no seu Instagram".',
  'case-sucesso': 'Procure histórias reais de empresas, pessoas, campanhas, produtos ou estratégias. O resumo precisa deixar claro o contexto e o que foi feito; o ângulo, por que funcionou e o que dá para aprender. Não invente resultado, número ou prêmio que a fonte não citou.'
};

function unwrap(raw) {
  if (raw?.assuntos) return raw;
  if (raw?.result?.assuntos) return raw.result;
  if (raw?.data?.assuntos) return raw.data;
  // Modelo teimoso devolve a lista solta ou com o nome da etapa anterior.
  if (Array.isArray(raw)) return { assuntos: raw };
  if (Array.isArray(raw?.trends)) return { assuntos: raw.trends };
  return raw;
}

export const carouselAssuntosSkill = defineSkill({
  id: 'carousel-assuntos',
  version: 1,
  description: 'Transforma pesquisa verificável (ou material do usuário) em assuntos de carrossel com fonte, data e ângulo.',
  inputSchema: carouselAssuntosInputSchema,
  outputSchema: carouselAssuntosOutputSchema,
  temperature: 0.4,
  maxTokens: 3000,
  buildPrompt: (input) => ({
    system: `Você é o pesquisador de pauta do SocialHub. ${REGRA_COMUM}\n${RECEITA[input.tipo]}`,
    user: JSON.stringify({
      task: input.tipo === 'case-sucesso'
        ? 'Encontrar cases reais que possam virar carrossel para esta marca.'
        : 'Encontrar acontecimentos recentes que possam virar carrossel para esta marca.',
      brand: { name: input.brandName, niche: input.niche, audience: input.audience },
      origem: input.origem === 'material'
        ? 'O material abaixo foi enviado pelo usuário. Ele é a única fonte; não há pesquisa web.'
        : 'Pesquisa web verificável, com fontes datadas.',
      material: input.research
    })
  }),
  normalizeOutput: unwrap
});

// A citação precisa apontar para fonte que existe. Fonte inventada é o mesmo
// que fonte nenhuma, mas parece verificada — pior que não ter.
export function assuntoSourceIdsAreAllowed(assuntos, allowedSourceIds) {
  const permitidas = new Set(allowedSourceIds);
  return (Array.isArray(assuntos) ? assuntos : [])
    .every((assunto) => (assunto.sourceIds || []).every((id) => permitidas.has(id)));
}
