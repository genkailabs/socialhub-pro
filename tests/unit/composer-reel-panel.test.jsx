import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReelVideoPanel } from '@/components/composer/ReelVideoPanel';

beforeAll(() => { vi.stubGlobal('React', React); });
afterEach(cleanup);

function setup(props = {}) {
  const handlers = {
    onVideo: vi.fn(),
    onAudio: vi.fn(),
    onCover: vi.fn(),
    onAudioFile: vi.fn(),
    onCoverFile: vi.fn(),
    onFitCanvas: vi.fn()
  };
  render(<ReelVideoPanel
    duration={30}
    current={8}
    video={{ start: 0, end: 30, volume: 1, muted: false }}
    audio={null}
    cover={{ mode: 'frame', timeMs: 0, url: null, name: '' }}
    {...handlers}
    {...props}
  />);
  return handlers;
}

describe('painel de vídeo do Reel (PRD Reels §1, §2, §5)', () => {
  it('ajusta o volume do áudio original', () => {
    const { onVideo } = setup();
    fireEvent.change(screen.getByLabelText('Volume do vídeo'), { target: { value: '0.5' } });
    expect(onVideo).toHaveBeenCalledWith({ volume: 0.5 });
  });

  it('silencia e volta a ativar o áudio original', () => {
    const { onVideo } = setup();
    fireEvent.click(screen.getByLabelText('Remover áudio original'));
    expect(onVideo).toHaveBeenCalledWith({ muted: true });
  });

  it('ajusta o enquadramento 9:16', () => {
    const { onFitCanvas } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar enquadramento 9:16' }));
    expect(onFitCanvas).toHaveBeenCalled();
  });

  it('envia áudio próprio e permite removê-lo', () => {
    const { onAudioFile, onAudio } = setup({ audio: { url: 'https://x/a.mp3', name: 'trilha.mp3', start: 0, volume: 1 } });
    expect(screen.getByText('trilha.mp3')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Volume do áudio'), { target: { value: '0.3' } });
    expect(onAudio).toHaveBeenCalledWith({ volume: 0.3 });
    fireEvent.click(screen.getByRole('button', { name: 'Remover áudio próprio' }));
    expect(onAudio).toHaveBeenCalledWith(null);
    expect(onAudioFile).not.toHaveBeenCalled();
  });

  it('corta o início do áudio próprio', () => {
    const { onAudio } = setup({ audio: { url: 'https://x/a.mp3', name: 'trilha.mp3', start: 0, volume: 1 } });
    fireEvent.change(screen.getByLabelText('Início do áudio'), { target: { value: '4' } });
    expect(onAudio).toHaveBeenCalledWith({ start: 4 });
  });

  it('usa o frame atual como capa', () => {
    const { onCover } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Usar este frame como capa' }));
    expect(onCover).toHaveBeenCalledWith({ mode: 'frame', timeMs: 8000 });
  });

  it('mostra a capa enviada e permite voltar para o frame', () => {
    const { onCover } = setup({ cover: { mode: 'upload', url: 'https://x/c.jpg', name: 'capa.jpg', timeMs: 0 } });
    expect(screen.getByAltText('Capa personalizada do Reel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Usar frame do vídeo' }));
    expect(onCover).toHaveBeenCalledWith({ mode: 'frame' });
  });
});
