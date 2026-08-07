import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// O núcleo de revisão vive aqui e é ESPELHADO no Carrossel Studio, que é outro
// repo com outro deploy. O risco desse arranjo é um só e é grande: alguém muda
// uma regra aqui, esquece de rodar o espelho, e a mesma arte passa na geração e
// reprova na edição — ou pior, o contrário.
//
// Este teste é o alarme. Ele só roda quando o Studio está no disco ao lado; em
// CI, onde só existe este repo, ele se declara pulado em vez de mentir que
// passou.

const origem = resolve(process.cwd(), 'lib', 'layout-review');
const studio = resolve(process.cwd(), '..', 'criador de carrossel', 'carrossel-studio');
const espelho = join(studio, 'src', 'lib', 'layout-review');

function impressaoDaOrigem() {
  const arquivos = readdirSync(origem).filter((n) => n.endsWith('.js')).sort();
  const resumo = createHash('sha256');
  for (const nome of arquivos) {
    resumo.update(nome);
    resumo.update(readFileSync(join(origem, nome), 'utf8'));
  }
  return { arquivos, impressao: resumo.digest('hex').slice(0, 16) };
}

describe('espelho do núcleo no Carrossel Studio', () => {
  const temEspelho = existsSync(join(espelho, 'ESPELHO.json'));

  it.skipIf(!temEspelho)('está em dia com este repo', () => {
    const gravado = JSON.parse(readFileSync(join(espelho, 'ESPELHO.json'), 'utf8'));
    const atual = impressaoDaOrigem();
    expect(
      gravado.impressao,
      'O núcleo mudou e o espelho não. Rode: node scripts/espelhar-layout-review.mjs',
    ).toBe(atual.impressao);
    expect(gravado.arquivos).toEqual(atual.arquivos);
  });

  it.skipIf(!temEspelho)('todo arquivo espelhado avisa que é gerado', () => {
    for (const nome of readdirSync(espelho).filter((n) => n.endsWith('.js'))) {
      const codigo = readFileSync(join(espelho, nome), 'utf8');
      expect(codigo.startsWith('/* ARQUIVO GERADO'), `${nome} sem o aviso`).toBe(true);
    }
  });

  it('as regras que o motor produz têm todas categoria na nota', async () => {
    // Vale mesmo sem o Studio: é o contrato que sustenta a nota nos dois lados.
    const { CATEGORIA } = await import('@/lib/layout-review/nota');
    const fontes = readdirSync(origem).filter((n) => n.endsWith('.js') && n !== 'nota.js');
    const declarados = new Set(Object.keys(CATEGORIA));
    const usados = new Set();
    for (const nome of fontes) {
      const codigo = readFileSync(join(origem, nome), 'utf8');
      // `problema("id", SEVERIDADE...` é a única forma de nascer um problema.
      for (const [, id] of codigo.matchAll(/problema\(\s*"([a-z_]+)"/g)) usados.add(id);
    }
    expect(usados.size).toBeGreaterThan(10);
    for (const id of usados) {
      expect(declarados.has(id), `"${id}" não tem categoria em nota.js e não afetaria a nota`).toBe(true);
    }
  });
});
