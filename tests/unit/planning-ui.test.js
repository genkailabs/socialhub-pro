import { describe, expect, it } from 'vitest';
import {
  availablePlanningItemActions,
  itemDetails,
  progressBarProps,
  summarizePlanning
} from '@/components/planning/PlanningSummary';
import { attachPlanningItemVersions } from '@/lib/planning-data';
import { normalizePlanningItemStatus } from '@/lib/planning-status';

const items = [
  { id: 'idea-1', status: 'idea', format: 'reel', objective: 'Alcance', title: 'Tema 1', summary: 'Resumo', hook: 'Gancho', cta: 'Comente', target_audience: 'Donos de negócio', estimated_duration: '30s' },
  { id: 'approved-1', status: 'approved', format: 'carousel', objective: 'Educar' },
  { id: 'production-1', status: 'in_production', format: 'carousel', objective: 'Educar' },
  { id: 'ready-1', status: 'ready', format: 'image', objective: 'Conversão' },
  { id: 'removed-1', status: 'rejected', format: 'image', objective: 'Conversão' }
];

describe('resumo do planejamento', () => {
  it('calcula estados, distribuicoes estrategicas e progresso pronto/total', () => {
    expect(summarizePlanning(items)).toMatchObject({
      total: 5,
      ready: 1,
      progress: 20,
      states: { idea: 1, approved: 1, in_production: 1, ready: 1, rejected: 1 },
      formats: { reel: 1, carousel: 2, image: 2 },
      objectives: { Alcance: 1, Educar: 2, 'Conversão': 2 }
    });
  });

  it('mantem o resumo seguro quando nao ha itens', () => {
    expect(summarizePlanning([])).toMatchObject({ total: 0, ready: 0, progress: 0 });
  });

  it('gera a semantica do progresso para leitores de tela', () => {
    expect(progressBarProps(summarizePlanning(items))).toEqual({
      role: 'progressbar', 'aria-label': 'Conteúdos prontos para publicar',
      'aria-valuemin': 0, 'aria-valuemax': 5, 'aria-valuenow': 1
    });
  });
});

describe('cartao de planejamento', () => {
  it('disponibiliza apenas acoes compativeis com o estado, sem produzir ao aprovar', () => {
    expect(availablePlanningItemActions({ status: 'idea' })).toEqual(['edit', 'replace', 'remove', 'approve']);
    expect(availablePlanningItemActions({ status: 'approved' })).toEqual(['edit', 'produce']);
    expect(availablePlanningItemActions({ status: 'ready', post_id: 'post-1' })).toEqual(['viewContent']);
  });

  it('entrega todos os detalhes que aparecem ao expandir o card', () => {
    expect(itemDetails(items[0])).toEqual({
      objective: 'Alcance', summary: 'Resumo', hook: 'Gancho', cta: 'Comente',
      audience: 'Donos de negócio', duration: '30s'
    });
  });
});

describe('versoes carregadas no planejamento', () => {
  it('anexa ao item as versoes reais retornadas pelo relacionamento do banco', () => {
    expect(attachPlanningItemVersions([{
      id: 'idea-1',
      editorial_plan_item_versions: [{ id: 'version-2', version_number: 2 }]
    }])).toEqual([{
      id: 'idea-1',
      versions: [{ id: 'version-2', version_number: 2 }]
    }]);
  });

  it('apresenta registros legados nas colunas equivalentes do novo fluxo', () => {
    expect(normalizePlanningItemStatus('proposed')).toBe('idea');
    expect(normalizePlanningItemStatus('produced')).toBe('ready');
    expect(attachPlanningItemVersions([
      { id: 'legacy-idea', status: 'proposed' },
      { id: 'legacy-ready', status: 'produced' }
    ])).toEqual([
      { id: 'legacy-idea', status: 'idea', versions: [] },
      { id: 'legacy-ready', status: 'ready', versions: [] }
    ]);
  });
});
