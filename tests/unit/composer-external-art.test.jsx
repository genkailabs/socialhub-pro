import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  uploadTempMedia: vi.fn(),
  removeTempMedia: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({
  uploadTempMedia: mocks.uploadTempMedia,
  removeTempMedia: mocks.removeTempMedia
}));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(),
  saveDraft: vi.fn(),
  schedulePost: vi.fn(),
  deleteComposerDraft: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';

const brandKit = {
  niche: 'Desenvolvimento de software',
  audience: 'Pequenas empresas',
  tone: 'Direto e confiante',
  visual_style: 'Moderno e tecnológico',
  palette: { accent: '#0A84FF', bg: '#000000', surface: '#FFFFFF', ink: '#111111' },
  donts: ['promessa de resultado garantido']
};

let clipboard;
let opened;

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
});

beforeEach(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
  clipboard = [];
  opened = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async (text) => { clipboard.push(text); }) }
  });
  vi.stubGlobal('open', vi.fn((...args) => { opened.push(args); return null; }));
  mocks.uploadTempMedia.mockReset().mockResolvedValue({
    path: 'temp/brand-1/gemini.png',
    publicUrl: 'https://storage.test/gemini.png'
  });
  mocks.removeTempMedia.mockReset().mockResolvedValue({ ok: true, paths: [] });
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
    width: 1080,
    height: 1080,
    close: vi.fn()
  }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function openExternalArt() {
  fireEvent.click(screen.getByRole('button', { name: /Mídia|Midia/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Criar com IA externa' }));
}

function promptBox() {
  return screen.getByRole('textbox', { name: 'Prompt para o Gemini' });
}

describe('arte com IA externa no Composer', () => {
  it('monta o prompt com os dados do Brand Kit e o formato ativo', () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" brandLabel="Genkai Labs" brandKit={brandKit} />);
    openExternalArt();

    fireEvent.change(screen.getByLabelText('Assunto da publicação *'), {
      target: { value: 'Divulgação de sistemas personalizados' }
    });
    fireEvent.change(screen.getByLabelText('Chamada para ação'), {
      target: { value: 'Solicite um orçamento' }
    });

    const prompt = promptBox().value;
    expect(prompt).toContain('Formato: Post 1:1.');
    expect(prompt).toContain('Marca: Genkai Labs.');
    expect(prompt).toContain('Segmento: Desenvolvimento de software.');
    expect(prompt).toContain('Cores: #0A84FF');
    expect(prompt).toContain('Assunto:\nDivulgação de sistemas personalizados');
    expect(prompt).toContain('Chamada para ação:\nSolicite um orçamento');
    expect(prompt).toContain('- evitar: promessa de resultado garantido.');
  });

  it('mantém o prompt editado pelo usuário e permite restaurar o gerado', () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" brandKit={brandKit} />);
    openExternalArt();

    fireEvent.change(screen.getByLabelText('Assunto da publicação *'), { target: { value: 'Lançamento' } });
    fireEvent.change(promptBox(), { target: { value: 'Prompt escrito à mão' } });
    expect(promptBox().value).toBe('Prompt escrito à mão');

    fireEvent.change(screen.getByLabelText('Texto principal'), { target: { value: 'Novidade' } });
    expect(promptBox().value).toBe('Prompt escrito à mão');

    fireEvent.click(screen.getByRole('button', { name: /Restaurar/ }));
    expect(promptBox().value).toContain('Assunto:\nLançamento');
  });

  it('exige o assunto antes de liberar copiar e abrir o Gemini', () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" brandKit={brandKit} />);
    openExternalArt();

    expect(screen.getByRole('button', { name: /Copiar prompt/ }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Abrir Gemini/ }).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Assunto da publicação *'), { target: { value: 'Promoção' } });
    expect(screen.getByRole('button', { name: /Copiar prompt/ }).disabled).toBe(false);
  });

  it('copia o prompt e abre o Gemini em outra aba, mostrando o retorno', async () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" brandKit={brandKit} />);
    openExternalArt();
    fireEvent.change(screen.getByLabelText('Assunto da publicação *'), { target: { value: 'Promoção' } });

    fireEvent.click(screen.getByRole('button', { name: /Copiar prompt/ }));
    await screen.findByRole('button', { name: /Prompt copiado/ });
    expect(clipboard.at(-1)).toContain('Assunto:\nPromoção');

    fireEvent.click(screen.getByRole('button', { name: /Abrir Gemini/ }));
    await waitFor(() => expect(opened.length).toBe(1));
    expect(opened[0][0]).toBe('https://gemini.google.com/app');
    expect(opened[0][1]).toBe('_blank');
    expect(opened[0][2]).toContain('noopener');

    expect(await screen.findByText('Gere a imagem no Gemini, faça o download e volte aqui.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Abrir Gemini novamente/ })).toBeTruthy();
  });

  it('envia a imagem baixada para o canvas com nome próprio', async () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" brandKit={brandKit} />);
    openExternalArt();
    fireEvent.change(screen.getByLabelText('Assunto da publicação *'), { target: { value: 'Promoção' } });
    fireEvent.click(screen.getByRole('button', { name: /Abrir Gemini/ }));
    await screen.findByText('Gere a imagem no Gemini, faça o download e volte aqui.');

    const file = new File(['png'], 'gemini-arte.png', { type: 'image/png' });
    const input = screen.getByText(/Enviar imagem gerada/).closest('label').querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.uploadTempMedia).toHaveBeenCalledWith(expect.anything(), 'brand-1', file);
    });
    expect(await screen.findByTestId('canvas-media')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
    expect((await screen.findAllByText('Imagem gerada externamente')).length).toBeGreaterThan(0);
  });

  it('recusa arquivo fora do formato aceito sem subir nada', async () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" brandKit={brandKit} />);
    openExternalArt();
    fireEvent.change(screen.getByLabelText('Assunto da publicação *'), { target: { value: 'Promoção' } });
    fireEvent.click(screen.getByRole('button', { name: /Abrir Gemini/ }));
    await screen.findByText('Gere a imagem no Gemini, faça o download e volte aqui.');

    const input = screen.getByText(/Enviar imagem gerada/).closest('label').querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['gif'], 'arte.gif', { type: 'image/gif' })] } });

    expect(await screen.findByText(/Envie PNG, JPG, JPEG ou WEBP/)).toBeTruthy();
    expect(mocks.uploadTempMedia).not.toHaveBeenCalled();
  });

  it('avisa quando a proporção enviada nao bate com o formato, sem bloquear', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1080, height: 1080, close: vi.fn() }));
    render(<VisualComposer brandId="brand-1" brandName="socialhub" brandKit={brandKit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Formato' }));
    fireEvent.click(screen.getByRole('button', { name: /Story/ }));
    openExternalArt();
    fireEvent.change(screen.getByLabelText('Assunto da publicação *'), { target: { value: 'Promoção' } });
    fireEvent.click(screen.getByRole('button', { name: /Abrir Gemini/ }));
    await screen.findByText('Gere a imagem no Gemini, faça o download e volte aqui.');

    const input = screen.getByText(/Enviar imagem gerada/).closest('label').querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['png'], 'quadrada.png', { type: 'image/png' })] } });

    await waitFor(() => expect(mocks.uploadTempMedia).toHaveBeenCalled());
    expect(await screen.findByText(/não está em 9:16/)).toBeTruthy();
    expect(await screen.findByTestId('canvas-media')).toBeTruthy();
  });
});
