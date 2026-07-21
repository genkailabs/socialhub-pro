// As fontes que o rasterizador usa. Único módulo de arte que toca disco.
//
// Por que existe: o next/og só embarca a Noto Sans **regular**. Sem passar
// fontes, todo `fontWeight: 800` das composições vira enfeite — o PNG sai com
// título e corpo no mesmo traço, que é o sinal mais direto de arte amadora.
// Isso não aparece em teste nenhum: só olhando o PNG.
//
// Outfit é a mesma família da interface (DESIGN.md), então a arte publicada e o
// produto falam a mesma língua.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ART_FONT_FAMILY } from '@/lib/ai/art/style';

const ARQUIVOS = [
  { file: 'Outfit-Regular.ttf', weight: 400 },
  { file: 'Outfit-SemiBold.ttf', weight: 600 },
  { file: 'Outfit-ExtraBold.ttf', weight: 800 }
];

// process.cwd() é a raiz do projeto tanto em dev quanto no servidor standalone
// (scripts/start-server.cjs roda da raiz).
export const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');

let cache = null;

/** Fontes no formato que o `ImageResponse` espera. Lidas uma vez por processo. */
export function artFonts() {
  if (cache) return cache;
  cache = ARQUIVOS.map(({ file, weight }) => ({
    name: ART_FONT_FAMILY,
    data: readFileSync(path.join(FONT_DIR, file)),
    weight,
    style: 'normal'
  }));
  return cache;
}
