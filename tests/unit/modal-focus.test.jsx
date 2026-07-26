import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

afterEach(cleanup);

function abrir(onClose = () => {}) {
  return render(
    <Modal open onClose={onClose} labelledBy="t">
      <h2 id="t">Editar ideia</h2>
      <input type="date" aria-label="Data" defaultValue="2026-07-27" />
      <input type="time" aria-label="Horário" defaultValue="12:00" />
      <button type="button">Salvar</button>
    </Modal>
  );
}

describe('Modal', () => {
  // O bug real: o diálogo focava o primeiro campo, que é a data. Uma rolagem de
  // mouse com esse campo em foco fazia o Chrome mudar o dia do item — o usuário
  // salvava e a data voltava um dia sem ele ter pedido.
  it('foca o próprio diálogo, nunca o primeiro campo', async () => {
    vi.useFakeTimers();
    abrir();
    await act(async () => { vi.runAllTimers(); });
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    vi.useRealTimers();
  });

  it('tira o foco de campos que a roda do mouse incrementa', () => {
    abrir();
    const data = screen.getByLabelText('Data');
    data.focus();
    expect(document.activeElement).toBe(data);

    fireEvent.wheel(screen.getByRole('dialog'), { deltaY: 120 });
    expect(document.activeElement).not.toBe(data);
  });

  it('Esc fecha', () => {
    const onClose = vi.fn();
    abrir(onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('trava a rolagem da página atrás', () => {
    abrir();
    expect(document.body.style.overflow).toBe('hidden');
  });
});
