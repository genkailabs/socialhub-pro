import { describe, expect, it } from 'vitest';
import { planningDropAction, planningDropTargets, planningColumnDragState } from '@/lib/planning-board';

const ideia = { id: 'i1', status: 'idea', title: 'ML vs DL' };
const aprovado = { id: 'i2', status: 'approved', title: 'Clean Code' };
const emProducao = { id: 'i3', status: 'in_production', title: 'Startups' };
const pronto = { id: 'i4', status: 'ready', post_id: 'p4', title: 'Reels' };
const publicado = { id: 'i5', status: 'ready', post_id: 'p5', post_status: 'published', title: 'Post' };

describe('planningDropAction', () => {
  it('aprova ao arrastar uma ideia para Aprovados', () => {
    expect(planningDropAction(ideia, 'approved')).toMatchObject({ kind: 'approve', status: 'approved' });
  });

  it('devolve um aprovado para Ideias', () => {
    expect(planningDropAction(aprovado, 'ideas')).toMatchObject({ kind: 'unapprove', status: 'idea' });
  });

  it('gera conteudo ao arrastar um aprovado para Conteudo em criacao, avisando do custo', () => {
    const action = planningDropAction(aprovado, 'creating');
    expect(action.kind).toBe('produce');
    expect(action.cost).toBe(1);
    expect(action.confirm).toContain('Clean Code');
  });

  it('nao aceita soltar na propria coluna', () => {
    expect(planningDropAction(ideia, 'ideas')).toBeNull();
    expect(planningDropAction(aprovado, 'approved')).toBeNull();
  });

  it('nao deixa pular a aprovacao: ideia nao vai direto para producao', () => {
    expect(planningDropAction(ideia, 'creating')).toBeNull();
  });

  it('nao deixa arrastar para Agendados nem Publicados: quem decide isso e o post', () => {
    expect(planningDropAction(aprovado, 'scheduled')).toBeNull();
    expect(planningDropAction(aprovado, 'published')).toBeNull();
    expect(planningDropAction(ideia, 'published')).toBeNull();
  });

  it('nao move o que ja saiu das maos do usuario', () => {
    expect(planningDropTargets(emProducao)).toEqual([]);
    expect(planningDropTargets(pronto)).toEqual([]);
    expect(planningDropTargets(publicado)).toEqual([]);
  });

  it('ignora item invalido', () => {
    expect(planningDropAction(null, 'approved')).toBeNull();
    expect(planningDropTargets(null)).toEqual([]);
  });
});

describe('planningDropTargets', () => {
  it('lista os destinos na ordem do quadro', () => {
    expect(planningDropTargets(ideia)).toEqual(['approved']);
    expect(planningDropTargets(aprovado)).toEqual(['ideas', 'creating']);
  });
});

describe('planningColumnDragState', () => {
  it('marca a coluna de origem, os destinos validos e os bloqueados', () => {
    expect(planningColumnDragState('ideas', aprovado)).toBe('target');
    expect(planningColumnDragState('creating', aprovado)).toBe('target');
    expect(planningColumnDragState('approved', aprovado)).toBe('source');
    expect(planningColumnDragState('scheduled', aprovado)).toBe('blocked');
    expect(planningColumnDragState('published', aprovado)).toBe('blocked');
  });

  it('sem arrasto em andamento, nenhuma coluna muda de aparencia', () => {
    expect(planningColumnDragState('ideas', null)).toBe('idle');
    expect(planningColumnDragState('scheduled', null)).toBe('idle');
  });
});
