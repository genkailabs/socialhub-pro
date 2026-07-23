import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeComposerDocument } from '@/lib/composer-editor';

const mocks = vi.hoisted(() => ({
  uploadTempMedia: vi.fn(),
  removeTempMedia: vi.fn(),
  publishNow: vi.fn(),
  saveDraft: vi.fn(),
  schedulePost: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({
  uploadTempMedia: mocks.uploadTempMedia,
  removeTempMedia: mocks.removeTempMedia
}));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: mocks.publishNow,
  saveDraft: mocks.saveDraft,
  schedulePost: mocks.schedulePost,
  deleteComposerDraft: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';

beforeAll(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
});

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  mocks.uploadTempMedia.mockReset().mockResolvedValue({
    path: 'temp/brand-1/upload.png',
    publicUrl: 'https://storage.test/upload.png'
  });
  mocks.removeTempMedia.mockReset().mockResolvedValue({ ok: true, paths: [] });
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
    width: 1200,
    height: 800,
    close: vi.fn()
  }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('manipulacao de midia no canvas', () => {
  it('abre o upload pelo canvas e adiciona a midia inteira', async () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" />);

    const uploadControl = screen.getByLabelText('Importar midia pelo canvas');
    const input = uploadControl.matches('input') ? uploadControl : uploadControl.querySelector('input');
    const file = new File(['png'], 'campanha.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.uploadTempMedia).toHaveBeenCalledWith(expect.anything(), 'brand-1', file);
    });
    const media = await screen.findByTestId('canvas-media');
    expect(media.style.left).toBe('0px');
    expect(media.style.top).toBe('71.5px');
    expect(media.style.width).toBe('430px');
    expect(media.style.height).toBe('287px');

    fireEvent.click(screen.getAllByRole('button', { name: '4:5' })[0]);
    expect(media.style.left).toBe('0px');
    expect(media.style.top).toBe('112px');
    expect(media.style.width).toBe('384px');
    expect(media.style.height).toBe('256px');
  });

  it('seleciona a midia, mostra alcas e sincroniza o zoom no cursor com a previa', () => {
    const doc = makeComposerDocument();
    doc.post.media = {
      url: 'https://storage.test/campanha.png',
      kind: 'image',
      width: 1200,
      height: 800
    };
    doc.post.bg = { x: 0, y: 71.5, w: 430, h: 287, scale: 1, rot: 0 };

    render(
      <VisualComposer
        brandId="brand-1"
        initialDraft={{ id: 'draft-1', editor_state: { format: 'post', ratio: '1:1', doc } }}
      />
    );

    const canvasMedia = screen.getByTestId('canvas-media');
    fireEvent.pointerDown(canvasMedia, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(window);

    expect(screen.getAllByLabelText(/redimensionar midia/i)).toHaveLength(4);
    expect(screen.queryByText(/100%/)).toBeNull();

    fireEvent.wheel(canvasMedia, { clientX: 100, clientY: 100, deltaY: -120 });

    const previewMedia = screen.getByTestId('preview-media');
    expect(canvasMedia.style.transform).toBe(previewMedia.style.transform);
    expect(canvasMedia.style.left).toBe(previewMedia.style.left);
    expect(canvasMedia.style.top).toBe(previewMedia.style.top);

    const beforeKeyboardMove = Number.parseFloat(canvasMedia.style.left);
    fireEvent.keyDown(canvasMedia, { key: 'ArrowRight' });
    expect(Number.parseFloat(canvasMedia.style.left)).toBeCloseTo(beforeKeyboardMove + 8);
    expect(previewMedia.style.left).toBe(canvasMedia.style.left);
  });

  it('mantém o upload no formato em que ele foi iniciado', async () => {
    let finishUpload;
    mocks.uploadTempMedia.mockReturnValueOnce(new Promise((resolve) => {
      finishUpload = resolve;
    }));
    render(<VisualComposer brandId="brand-1" brandName="socialhub" />);

    const uploadControl = screen.getByLabelText('Importar midia pelo canvas');
    const input = uploadControl.matches('input') ? uploadControl : uploadControl.querySelector('input');
    fireEvent.change(input, {
      target: { files: [new File(['png'], 'campanha.png', { type: 'image/png' })] }
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Story' })[0]);
    finishUpload({
      path: 'temp/brand-1/upload.png',
      publicUrl: 'https://storage.test/upload.png'
    });

    await waitFor(() => expect(mocks.uploadTempMedia).toHaveBeenCalled());
    expect(screen.queryByTestId('canvas-media')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Post' })[0]);
    expect(await screen.findByTestId('canvas-media')).toBeTruthy();
  });

  it('usa a proporção mais recente quando o upload termina', async () => {
    let finishUpload;
    mocks.uploadTempMedia.mockReturnValueOnce(new Promise((resolve) => {
      finishUpload = resolve;
    }));
    render(<VisualComposer brandId="brand-1" brandName="socialhub" />);

    const uploadControl = screen.getByLabelText('Importar midia pelo canvas');
    const input = uploadControl.matches('input') ? uploadControl : uploadControl.querySelector('input');
    fireEvent.change(input, {
      target: { files: [new File(['png'], 'campanha.png', { type: 'image/png' })] }
    });
    fireEvent.click(screen.getAllByRole('button', { name: '4:5' })[0]);
    finishUpload({
      path: 'temp/brand-1/upload.png',
      publicUrl: 'https://storage.test/upload.png'
    });

    const media = await screen.findByTestId('canvas-media');
    expect(media.style.width).toBe('384px');
    expect(media.style.top).toBe('112px');
  });

  it('impede que um upload antigo sobrescreva o mais recente', async () => {
    const pending = [];
    mocks.uploadTempMedia.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    render(<VisualComposer brandId="brand-1" brandName="socialhub" />);

    const uploadControl = screen.getByLabelText('Importar midia pelo canvas');
    const input = uploadControl.matches('input') ? uploadControl : uploadControl.querySelector('input');
    fireEvent.change(input, { target: { files: [new File(['one'], 'one.png', { type: 'image/png' })] } });
    fireEvent.change(input, { target: { files: [new File(['two'], 'two.png', { type: 'image/png' })] } });
    await waitFor(() => expect(pending).toHaveLength(2));

    pending[1]({ path: 'temp/brand-1/two.png', publicUrl: 'https://storage.test/two.png' });
    const media = await screen.findByTestId('canvas-media');
    expect(media.querySelector('img')?.getAttribute('src')).toBe('https://storage.test/two.png');

    pending[0]({ path: 'temp/brand-1/one.png', publicUrl: 'https://storage.test/one.png' });
    await waitFor(() => expect(mocks.removeTempMedia).toHaveBeenCalledWith(
      expect.anything(),
      ['temp/brand-1/one.png']
    ));
    expect(media.querySelector('img')?.getAttribute('src')).toBe('https://storage.test/two.png');
  });
});
