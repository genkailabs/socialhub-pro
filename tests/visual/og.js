// Acesso ao rasterizador do next/og fora do servidor Next.
//
// Por que não dá para `import { ImageResponse } from 'next/og'` aqui: o bundle
// do @vercel/og localiza os próprios assets (fonte e wasm) com
// `fileURLToPath(join(import.meta.url, "../arquivo"))`. Dentro do Next o
// webpack troca `import.meta.url` por um caminho comum e a conta fecha; fora
// dele, no Windows, `path.join` transforma a file:// URL em "file:\H:\..." e o
// módulo morre com "Invalid URL" antes de rasterizar qualquer coisa.
//
// Então esta função escreve uma cópia do bundle com os três caminhos já
// resolvidos e importa essa cópia. O código que desenha a arte é o mesmo — o
// que muda é só como o arquivo da fonte é encontrado.
//
// Vale para o harness de amostras. Em produção (Linux, bundle do Next) quem
// roda é o caminho original.
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const OG_DIR = fileURLToPath(new URL('../../node_modules/next/dist/compiled/@vercel/og/', import.meta.url));

let cache = null;

export async function loadImageResponse() {
  if (cache) return cache;

  const bundle = await readFile(path.join(OG_DIR, 'index.node.js'), 'utf8');
  const corrigido = bundle.replace(
    /fileURLToPath\(join\(import\.meta\.url,\s*"\.\.\/([^"]+)"\)\)/g,
    (_, arquivo) => JSON.stringify(path.join(OG_DIR, arquivo))
  );

  const dir = await mkdtemp(path.join(tmpdir(), 'og-amostras-'));
  const destino = path.join(dir, 'og.node.mjs');
  await writeFile(destino, corrigido);

  cache = (await import(pathToFileURL(destino).href)).ImageResponse;
  return cache;
}

