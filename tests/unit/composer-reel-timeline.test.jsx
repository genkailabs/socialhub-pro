import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReelTimeline } from '@/components/composer/ReelTimeline';

beforeAll(() => { vi.stubGlobal('React', React); });
afterEach(cleanup);

const layers = [
  { id: 'l1', type: 'text', text: 'Promoção' },
  { id: 'l2', type: 'icon', icon: 'whatsapp' }
];

function setup(props = {}) {
  const onSeek = vi.fn();
  const onTrim = vi.fn();
  const onTogglePlay = vi.fn();
  render(<ReelTimeline
    duration={30}
    current={6}
    playing={false}
    video={{ start: 2, end: 20, muted: false }}
    audio={null}
    layers={layers}
    onSeek={onSeek}
    onTrim={onTrim}
    onTogglePlay={onTogglePlay}
    {...props}
  />);
  return { onSeek, onTrim, onTogglePlay };
}

describe('timeline do Reel (PRD Reels §3)', () => {
  it('mostra o tempo atual e a duração do trecho', () => {
    setup();
    expect(screen.getByText('0:06')).toBeTruthy();
    expect(screen.getByText(/0:18/)).toBeTruthy();
  });

  it('lista as faixas de vídeo, áudio e cada elemento', () => {
    setup();
    expect(screen.getByRole('listitem', { name: 'Faixa de vídeo' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Faixa de áudio original' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Faixa do elemento Promoção' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Faixa do elemento WhatsApp' })).toBeTruthy();
  });

  it('identifica a faixa de áudio próprio quando existe', () => {
    setup({ audio: { url: 'https://x/a.mp3', name: 'trilha.mp3' } });
    expect(screen.getByRole('listitem', { name: 'Faixa de áudio trilha.mp3' })).toBeTruthy();
  });

  it('marca o áudio como silenciado', () => {
    setup({ video: { start: 0, end: 30, muted: true } });
    expect(screen.getByRole('listitem', { name: 'Faixa de áudio original (silenciado)' })).toBeTruthy();
  });

  it('busca um tempo pelo controle deslizante', () => {
    const { onSeek } = setup();
    fireEvent.change(screen.getByLabelText('Posição na linha do tempo'), { target: { value: '12' } });
    expect(onSeek).toHaveBeenCalledWith(12);
  });

  it('ajusta o corte de início e fim', () => {
    const { onTrim } = setup();
    fireEvent.change(screen.getByLabelText('Início do corte'), { target: { value: '5' } });
    expect(onTrim).toHaveBeenCalledWith({ start: 5, end: 20 });
    fireEvent.change(screen.getByLabelText('Fim do corte'), { target: { value: '25' } });
    expect(onTrim).toHaveBeenCalledWith({ start: 2, end: 25 });
  });

  it('alterna reprodução', () => {
    const { onTogglePlay } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reproduzir' }));
    expect(onTogglePlay).toHaveBeenCalled();
  });

  it('não quebra sem vídeo carregado', () => {
    render(<ReelTimeline duration={0} current={0} playing={false} video={{}} audio={null} layers={[]} onSeek={() => {}} onTrim={() => {}} onTogglePlay={() => {}} />);
    expect(screen.getByText('Adicione um vídeo para ver a linha do tempo.')).toBeTruthy();
  });
});
