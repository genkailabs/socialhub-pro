import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn(), saveDraft: vi.fn() }));

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } }) }));
vi.mock('@/lib/posts-media', async (importOriginal) => ({
  ...(await importOriginal()), uploadTempMedia: mocks.uploadTempMedia, removeTempMedia: mocks.removeTempMedia
}));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: mocks.saveDraft, schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';

beforeAll(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
  mocks.uploadTempMedia.mockReset().mockResolvedValue({ path: 'temp/brand-1/reel.mp4', publicUrl: 'https://storage.test/reel.mp4' });
  mocks.removeTempMedia.mockReset().mockResolvedValue({ ok: true, paths: [] });
  mocks.saveDraft.mockReset().mockResolvedValue({ id: 'draft-1' });
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:reel'),
    revokeObjectURL: vi.fn()
  }));
  // jsdom não carrega mídia: sem isto o <video> nunca emite loadedmetadata e o
  // upload do Composer fica esperando as dimensões para sempre.
  Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
    configurable: true,
    get() { return this.getAttribute('src'); },
    set(value) {
      this.setAttribute('src', value);
      Object.defineProperty(this, 'videoWidth', { configurable: true, value: 1080 });
      Object.defineProperty(this, 'videoHeight', { configurable: true, value: 1920 });
      Object.defineProperty(this, 'duration', { configurable: true, value: 30 });
      setTimeout(() => this.dispatchEvent(new Event('loadedmetadata')), 0);
    }
  });
});

afterEach(() => { cleanup(); localStorage.clear(); });

async function renderReelWithVideo() {
  render(<VisualComposer brandId="brand-1" brandName="Marca" />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Reel' })[0]);
  // Importação mora no painel Mídia; o canvas vazio não abre mais o seletor.
  fireEvent.click(within(screen.getByLabelText('Ferramentas do Composer')).getByRole('button', { name: /Mídia|Midia/ }));
  const input = screen.getByLabelText('Importar mídia').querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [new File(['v'], 'reel.mp4', { type: 'video/mp4' })] } });
  const box = await screen.findByTestId('canvas-media');
  const element = box.querySelector('video');
  Object.defineProperty(element, 'duration', { configurable: true, value: 30 });
  Object.defineProperty(element, 'videoWidth', { configurable: true, value: 1080 });
  Object.defineProperty(element, 'videoHeight', { configurable: true, value: 1920 });
  fireEvent.loadedMetadata(element);
  // Fecha o painel para o teste seguir do mesmo estado de antes (rail sem painel).
  fireEvent.click(within(screen.getByLabelText('Ferramentas do Composer')).getByRole('button', { name: /Mídia|Midia/ }));
  return element;
}

describe('editor de Reel (PRD Reels §3, §4, §6, §7)', () => {
  it('mostra a linha do tempo com a duração real do vídeo', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Posição na linha do tempo')).toBeTruthy());
    expect(screen.getByLabelText('Posição na linha do tempo').max).toBe('30');
    expect(screen.queryByText('0:00 / 0:23')).toBeNull();
  });

  it('lista o vídeo como camada e mantém a seleção sincronizada', async () => {
    await renderReelWithVideo();
    const videoLayer = await screen.findByRole('button', { name: 'Selecionar camada Vídeo' });
    fireEvent.click(videoLayer);
    await waitFor(() => expect(screen.getByTestId('canvas-media').className).toContain('selectedMedia'));
  });

  it('aplica o corte pela timeline e reflete no trecho', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Fim do corte')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Fim do corte'), { target: { value: '12' } });
    await waitFor(() => expect(screen.getByText('Trecho 0:12')).toBeTruthy());
  });

  it('bloqueia publicação de trecho menor que 3 segundos', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Início do corte')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Início do corte'), { target: { value: '29' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Publicar' })[0]);
    await waitFor(() => expect(screen.getByText(/3 segundos/)).toBeTruthy());
  });

  it('silencia o áudio original pelo painel de mídia', async () => {
    await renderReelWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Mídia/ }));
    fireEvent.click(await screen.findByLabelText('Remover áudio original'));
    await waitFor(() => expect(screen.getByTestId('canvas-media').querySelector('video').muted).toBe(true));
  });

  it('salva trim, áudio e capa no rascunho', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Fim do corte')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Fim do corte'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalled());
    const payload = mocks.saveDraft.mock.calls.at(-1)[0];
    expect(payload.editorState.doc.reel.video.end).toBe(15);
    expect(payload.format).toBe('reel');
  });
});
