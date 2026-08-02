import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';
import { TREND_TAXONOMY } from '@/lib/instagram-trends';

const short = (max) => z.string().trim().min(1).max(max);
const sourceSchema = z.object({
  id: short(40),
  title: short(300),
  url: z.string().url().max(2000),
  publisher: z.string().trim().max(180).optional().default(''),
  publishedAt: z.string().trim().max(80).optional().default('')
});

export const instagramTrendsInputSchema = z.object({
  brandName: short(160),
  niche: z.string().trim().max(240).default(''),
  audience: z.string().trim().max(500).default(''),
  research: z.object({
    summary: short(7000),
    sources: z.array(sourceSchema).min(1).max(5)
  })
});

const trendSchema = z.object({
  title: short(100),
  summary: short(280),
  category: z.enum(TREND_TAXONOMY.category),
  profession: z.enum(TREND_TAXONOMY.profession),
  format: z.enum(TREND_TAXONOMY.format),
  status: z.enum(TREND_TAXONOMY.status),
  priority: z.enum(TREND_TAXONOMY.priority),
  mechanic: short(500),
  howTo: short(700),
  carouselTheme: short(180),
  carouselPrompt: short(900),
  sourceIds: z.array(short(40)).min(1).max(3)
});

export const instagramTrendsOutputSchema = z.object({
  trends: z.array(trendSchema).min(3).max(12)
});

const EXAMPLE = JSON.stringify({
  trends: [1, 2, 3].map((index) => ({
    title: `Nome descritivo do padrão ${index}`,
    summary: 'Por que esse padrão merece atenção editorial.',
    category: 'educacao',
    profession: 'geral',
    format: 'carrossel',
    status: 'acompanhar',
    priority: 'adaptar',
    mechanic: 'Como o conteúdo prende atenção e entrega valor.',
    howTo: 'Uma execução simples e original, ajustada ao contexto da marca.',
    carouselTheme: 'Tema específico para desenvolver',
    carouselPrompt: 'Orientação editorial para criar o roteiro sem copiar a fonte.',
    sourceIds: ['source-1']
  }))
});

function unwrap(raw) {
  if (raw?.trends) return raw;
  if (raw?.result?.trends) return raw.result;
  if (raw?.data?.trends) return raw.data;
  return raw;
}

export const instagramTrendsSkill = defineSkill({
  id: 'instagram-trends',
  version: 1,
  description: 'Transforma pesquisa web verificável em oportunidades qualitativas e executáveis de conteúdo para Instagram.',
  inputSchema: instagramTrendsInputSchema,
  outputSchema: instagramTrendsOutputSchema,
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.35,
  maxTokens: 3600,
  buildPrompt: (input) => ({
    system: `Você é o curador editorial do SocialHub. Identifique padrões de conteúdo para Instagram usando exclusivamente a pesquisa e as fontes fornecidas.
Não copie nomes, frameworks, redação, identidade visual ou branding de terceiros. Sintetize mecanicamente o padrão e proponha uma execução original para a marca.
Não inclua métricas, percentuais, contagens, rankings numéricos ou projeções. Não preencha lacunas com conhecimento próprio. Cada tendência precisa citar pelo menos um sourceId válido que realmente a sustente.
"status" e "priority" são julgamentos qualitativos, não medições. Use linguagem proporcional e admita incerteza com status "acompanhar". Produza de 3 a 12 tendências distintas em PT-BR.
Retorne somente o objeto JSON raiz, sem wrapper ou Markdown. Exemplo do formato obrigatório:\n${EXAMPLE}`,
    user: JSON.stringify({
      task: 'Curar tendências qualitativas de conteúdo para Instagram.',
      brand: { name: input.brandName, niche: input.niche, audience: input.audience },
      verifiedResearch: input.research,
      taxonomy: TREND_TAXONOMY
    })
  }),
  normalizeOutput: unwrap
});

export function trendSourceIdsAreAllowed(trends, allowedSourceIds) {
  const allowed = new Set(allowedSourceIds);
  return trends.every((trend) => trend.sourceIds.length > 0 && trend.sourceIds.every((id) => allowed.has(id)));
}
