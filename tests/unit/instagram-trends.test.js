import { describe, expect, it } from 'vitest';
import {
  buildTrendCarouselPrompt,
  filterTrends,
  hasMetricClaim,
  normalizeTrends,
  selectTopTrends
} from '@/lib/instagram-trends';

const source = { id: 'source-1', url: 'https://example.com/original' };
const base = {
  title: 'Bastidor com decisão explicada',
  summary: 'Mostra o raciocínio por trás de uma escolha profissional.',
  category: 'bastidores',
  profession: 'servicos',
  format: 'carrossel',
  status: 'emergente',
  priority: 'adaptar',
  mechanic: 'Abre com o dilema e revela os critérios usados na decisão.',
  howTo: 'Escolha uma decisão real, retire dados sensíveis e explique os critérios.',
  carouselTheme: 'Como decidimos entre duas abordagens',
  carouselPrompt: 'Construa uma narrativa que começa no dilema e termina no aprendizado.',
  sourceIds: ['source-1']
};

describe('contrato de tendências do Instagram', () => {
  it('mantém somente itens ligados a fontes permitidas', () => {
    expect(normalizeTrends([base], [source])).toHaveLength(1);
    expect(normalizeTrends([{ ...base, sourceIds: ['source-x'] }], [source])).toEqual([]);
  });

  it('descarta alegações métricas em vez de exibi-las como tendência', () => {
    expect(hasMetricClaim('cresceu 45% em uma semana')).toBe(true);
    expect(normalizeTrends([{ ...base, summary: 'Gera 3x mais visualizações.' }], [source])).toEqual([]);
    expect(hasMetricClaim('use um formato vertical e uma abertura clara')).toBe(false);
  });

  it('descarta métricas também no tema e no prompt de carrossel', () => {
    expect(normalizeTrends([{ ...base, carouselTheme: 'Formato com 45% mais alcance' }], [source])).toEqual([]);
    expect(normalizeTrends([{ ...base, carouselPrompt: 'Prometa 3x mais visualizações' }], [source])).toEqual([]);
  });

  it('seleciona o Top 3 por prioridade e depois por maturidade', () => {
    const trends = [
      { ...base, id: 'observar', priority: 'observar', status: 'consolidando' },
      { ...base, id: 'adaptar', priority: 'adaptar', status: 'consolidando' },
      { ...base, id: 'agora-emergente', priority: 'aplicar-agora', status: 'emergente' },
      { ...base, id: 'agora-consolidando', priority: 'aplicar-agora', status: 'consolidando' }
    ];

    expect(selectTopTrends(trends).map((trend) => trend.id)).toEqual([
      'agora-consolidando',
      'agora-emergente',
      'adaptar'
    ]);
    expect(trends.map((trend) => trend.id)).toEqual(['observar', 'adaptar', 'agora-emergente', 'agora-consolidando']);
  });

  it('filtra por busca, categoria, profissão, formato, status, salvos e curtidos', () => {
    const trends = normalizeTrends([
      base,
      { ...base, title: 'Pergunta da comunidade', category: 'comunidade', profession: 'criadores', format: 'stories', status: 'acompanhar' }
    ], [source]);
    expect(filterTrends(trends, { query: 'dilema', category: 'bastidores', profession: 'servicos', format: 'carrossel', status: 'emergente' })).toHaveLength(1);
    expect(filterTrends(trends, { savedOnly: true, savedIds: new Set([trends[1].id]) })).toEqual([trends[1]]);
    expect(filterTrends(trends, { likedOnly: true, likedIds: new Set([trends[0].id]) })).toEqual([trends[0]]);
  });

  it('monta prompt original com tema e marca, sem prometer métricas', () => {
    const prompt = buildTrendCarouselPrompt(base, 'Clínica Exemplo');
    expect(prompt).toContain('Tema: Como decidimos entre duas abordagens');
    expect(prompt).toContain('Marca: Clínica Exemplo');
    expect(prompt).toContain('Não invente métricas');
  });
});
