import { afterEach, describe, expect, it, vi, beforeAll } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlanningBoard } from '@/components/planning/PlanningBoard';

// Sem `globals: true` no vitest, o cleanup automático do testing-library não roda
// e um render vaza para o teste seguinte.
afterEach(cleanup);

// jsdom não implementa PointerEvent nem elementFromPoint: os dois são a base do
// arrasto, então o teste os fornece em vez de desviar do caminho real do código.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = class PointerEvent extends MouseEvent {
      constructor(type, params = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 1;
        this.pointerType = params.pointerType ?? 'mouse';
      }
    };
  }
});

const ITEMS = [
  { id: 'idea-1', status: 'idea', format: 'image', date: '2026-07-29', title: 'ML vs DL', pillar: 'IA' },
  { id: 'approved-1', status: 'approved', format: 'reel', date: '2026-07-30', title: 'Erros de startup', pillar: 'Inovação' },
  { id: 'ready-1', status: 'ready', post_id: 'p1', format: 'carousel', date: '2026-07-28', title: 'Clean Code', pillar: 'Dev' }
];

function renderBoard(onDropAction = vi.fn()) {
  const noop = () => {};
  render(<PlanningBoard items={ITEMS} busy="" onApprove={noop} onEdit={noop} onProduce={noop} onReplace={noop} onRemove={noop} onDropAction={onDropAction} />);
  return onDropAction;
}

function cardOf(id) {
  return document.querySelector(`[data-card-id="${id}"]`);
}

function pointer(type, x, y, extra = {}) {
  return new window.PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1, pointerType: 'mouse', ...extra });
}

// O alvo do drop é lido com elementFromPoint; aqui ele é apontado direto para a
// coluna que o teste quer simular sob o cursor.
function pointAt(columnKey) {
  document.elementFromPoint = () => (columnKey ? document.querySelector(`[data-column-key="${columnKey}"]`) : document.body);
}

function drag(cardId, columnKey) {
  const card = cardOf(cardId);
  pointAt(columnKey);
  fireEvent(card, pointer('pointerdown', 10, 10));
  fireEvent(window, pointer('pointermove', 40, 40));
  fireEvent(window, pointer('pointerup', 40, 40));
}

describe('PlanningBoard — arrastar entre colunas', () => {
  it('aprova ao soltar uma ideia em Aprovados', () => {
    const onDropAction = renderBoard();
    drag('idea-1', 'approved');
    expect(onDropAction).toHaveBeenCalledTimes(1);
    expect(onDropAction.mock.calls[0][0].id).toBe('idea-1');
    expect(onDropAction.mock.calls[0][1]).toMatchObject({ kind: 'approve', status: 'approved' });
  });

  it('pede confirmação com o custo ao mandar produzir', () => {
    const onDropAction = renderBoard();
    drag('approved-1', 'creating');
    expect(onDropAction.mock.calls[0][1]).toMatchObject({ kind: 'produce', cost: 1 });
    expect(onDropAction.mock.calls[0][1].confirm).toContain('1 crédito');
  });

  it('não faz nada ao soltar numa coluna que o usuário não controla', () => {
    const onDropAction = renderBoard();
    drag('approved-1', 'published');
    expect(onDropAction).not.toHaveBeenCalled();
  });

  it('não move o que já está pronto', () => {
    const onDropAction = renderBoard();
    drag('ready-1', 'ideas');
    expect(onDropAction).not.toHaveBeenCalled();
  });

  it('mostra o card fantasma e a dica de destino durante o arrasto', () => {
    renderBoard();
    pointAt('approved');
    fireEvent(cardOf('idea-1'), pointer('pointerdown', 10, 10));
    fireEvent(window, pointer('pointermove', 40, 40));
    expect(screen.getByText(/Soltar aqui/).textContent).toContain('Aprovar');
    expect(document.body.querySelector('.fixed.z-50')).not.toBeNull();
    fireEvent(window, pointer('pointerup', 40, 40));
    expect(document.body.querySelector('.fixed.z-50')).toBeNull();
  });

  it('Escape cancela o arrasto sem mover nada', () => {
    const onDropAction = renderBoard();
    pointAt('approved');
    fireEvent(cardOf('idea-1'), pointer('pointerdown', 10, 10));
    fireEvent(window, pointer('pointermove', 40, 40));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent(window, pointer('pointerup', 40, 40));
    expect(onDropAction).not.toHaveBeenCalled();
    expect(document.body.querySelector('.fixed.z-50')).toBeNull();
  });

  it('clicar num botão do card não vira arrasto', () => {
    const onDropAction = renderBoard();
    pointAt('approved');
    const botao = cardOf('idea-1').querySelector('button');
    fireEvent(botao, pointer('pointerdown', 10, 10));
    fireEvent(window, pointer('pointermove', 40, 40));
    fireEvent(window, pointer('pointerup', 40, 40));
    expect(onDropAction).not.toHaveBeenCalled();
  });

  it('Ctrl + seta move o card em foco para a coluna vizinha permitida', () => {
    const onDropAction = renderBoard();
    fireEvent.keyDown(cardOf('idea-1'), { key: 'ArrowRight', ctrlKey: true });
    expect(onDropAction.mock.calls[0][1]).toMatchObject({ kind: 'approve' });

    onDropAction.mockClear();
    fireEvent.keyDown(cardOf('approved-1'), { key: 'ArrowLeft', ctrlKey: true });
    expect(onDropAction.mock.calls[0][1]).toMatchObject({ kind: 'unapprove' });
  });
});
