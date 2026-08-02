import { describe, expect, it } from 'vitest';
import {
  instagramTrendsSkill,
  instagramTrendsOutputSchema,
  trendSourceIdsAreAllowed
} from '@/lib/ai/skills/instagram-trends';

const trend = (index, sourceIds = ['source-1']) => ({
  title: `Padrão editorial ${index}`,
  summary: 'Leitura qualitativa apoiada na pesquisa fornecida.',
  category: 'educacao',
  profession: 'geral',
  format: 'carrossel',
  status: 'acompanhar',
  priority: 'adaptar',
  mechanic: 'Explica uma decisão por etapas sem reproduzir a fonte.',
  howTo: 'Escolha um caso da marca e transforme o raciocínio em uma sequência original.',
  carouselTheme: 'Uma decisão explicada por etapas',
  carouselPrompt: 'Crie uma sequência didática baseada no contexto real da marca.',
  sourceIds
});

const input = {
  brandName: 'Marca Exemplo',
  niche: 'serviços profissionais',
  audience: 'gestores',
  research: {
    summary: 'Resumo verificável da pesquisa.',
    sources: [{ id: 'source-1', title: 'Relatório original', url: 'https://example.com/report', publisher: 'Exemplo', publishedAt: '2026-08-01' }]
  }
};

describe('skill de tendências do Instagram', () => {
  it('exige ao menos três tendências qualitativas com fonte', () => {
    expect(instagramTrendsOutputSchema.safeParse({ trends: [trend(1), trend(2), trend(3)] }).success).toBe(true);
    expect(instagramTrendsOutputSchema.safeParse({ trends: [trend(1), trend(2)] }).success).toBe(false);
  });

  it('limita campos a taxonomias conhecidas', () => {
    expect(instagramTrendsOutputSchema.safeParse({ trends: [trend(1), trend(2), { ...trend(3), format: 'podcast' }] }).success).toBe(false);
  });

  it('aceita fontes verificadas mesmo quando o site não informa autor ou data', () => {
    const withoutOptionalMetadata = {
      ...input,
      research: {
        ...input.research,
        sources: [{ id: 'source-1', title: 'Página original', url: 'https://example.com/original' }]
      }
    };
    expect(instagramTrendsSkill.inputSchema.safeParse(withoutOptionalMetadata).success).toBe(true);
  });

  it('injeta fontes e proíbe cópia, métricas e estimativas no prompt', () => {
    const prompt = instagramTrendsSkill.buildPrompt(input);
    expect(prompt.system).toContain('Não copie nomes, frameworks');
    expect(prompt.system).toContain('Não inclua métricas');
    expect(prompt.system).toContain('Não preencha lacunas');
    expect(prompt.user).toContain('source-1');
  });

  it('usa no prompt um exemplo que satisfaz o próprio schema de saída', () => {
    const prompt = instagramTrendsSkill.buildPrompt(input);
    const exampleText = prompt.system.match(/Exemplo do formato obrigatório:\n(.+)$/s)?.[1];
    expect(exampleText).toBeTruthy();
    expect(instagramTrendsOutputSchema.safeParse(JSON.parse(exampleText)).success).toBe(true);
  });

  it('aceita wrappers seguros e rejeita IDs de fonte desconhecidos', () => {
    const trends = [trend(1), trend(2), trend(3)];
    expect(instagramTrendsOutputSchema.safeParse(instagramTrendsSkill.normalizeOutput({ result: { trends } })).success).toBe(true);
    expect(trendSourceIdsAreAllowed(trends, ['source-1'])).toBe(true);
    expect(trendSourceIdsAreAllowed([trend(1, ['source-x'])], ['source-1'])).toBe(false);
  });
});
