import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { studioInitMessage, studioThemeMessage, isStudioMessage, safeStudioTheme } from '@/lib/carrossel-studio-contract';

// Caminho a partir da raiz do projeto: o vitest resolve o teste por alias, e
// `import.meta.url` aqui não é um file:// utilizável.
const frame = readFileSync(path.join(process.cwd(), 'components/carrossel/CarouselStudioFrame.jsx'), 'utf8');

describe('tema pela ponte', () => {
  it('viaja no init e na troca depois dele', () => {
    expect(studioInitMessage({ channelId: 'cs-abcdefgh', theme: 'light' }).theme).toBe('light');
    expect(studioThemeMessage({ channelId: 'cs-abcdefgh', theme: 'light' }).theme).toBe('light');
  });

  it('valor estranho vira escuro, que e o tema de origem do Studio', () => {
    expect(safeStudioTheme('roxo')).toBe('dark');
    expect(safeStudioTheme(undefined)).toBe('dark');
    expect(studioInitMessage({ channelId: 'cs-abcdefgh' }).theme).toBe('dark');
  });
});

describe('handshake do iframe', () => {
  // O `cs:ready` chegava uma vez só: se o host ainda não escutava, a tela do
  // Studio ficava em "Aguardando o post…" para sempre. O onLoad é a segunda
  // chance — e o Studio ignora o init repetido depois de carregar o documento.
  it('o host manda o init tambem quando o iframe termina de carregar', () => {
    expect(frame).toMatch(/onLoad=\{enviarInit\}/);
    expect(frame).toMatch(/function enviarInit|const enviarInit/);
  });

  it('a troca de tema do Hub chega ao iframe sem recarregar', () => {
    expect(frame).toMatch(/MutationObserver/);
    expect(frame).toMatch(/attributeFilter: \['class'\]/);
  });
});

describe('mensagens do Studio para o host', () => {
  it('continuam validadas por canal e versao', () => {
    const valida = { type: 'cs:close', version: 1, channelId: 'cs-abcdefgh' };
    expect(isStudioMessage(valida, 'cs-abcdefgh')).toBe(true);
    expect(isStudioMessage(valida, 'cs-outrocanal')).toBe(false);
    expect(isStudioMessage({ ...valida, version: 2 }, 'cs-abcdefgh')).toBe(false);
  });
});
