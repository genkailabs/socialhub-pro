import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Colunas reais da tabela `brands` em produção (sondadas no banco, não nas
// migrations locais — elas divergem). Pedir coluna inexistente não devolve
// erro na tela: o Supabase falha a query, `data` vem nulo e o produto conclui
// que a marca não existe. Foi assim que a tela de Tendências passou a dizer
// "Marca inválida" para uma marca perfeitamente válida.
const COLUNAS = new Set([
  'id', 'user_id', 'name', 'logo_url', 'handle', 'category', 'color',
  'followers', 'engagement', 'connected_networks', 'networks_metadata',
  'created_at', 'updated_at'
]);

const RAIZES = ['lib', 'app', 'components'];
const EXTENSOES = /\.(js|jsx)$/;

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return EXTENSOES.test(nome) ? [caminho] : [];
  });
}

// `.from('brands').select('a, b')` — pega o select colado ao from, que é o
// padrão do projeto inteiro.
const SELECT_DE_BRANDS = /\.from\(\s*['"]brands['"]\s*\)\s*\.\s*select\(\s*['"]([^'"]+)['"]/g;

describe('consultas à tabela brands', () => {
  it('só pedem colunas que existem no banco', () => {
    const erros = [];

    for (const raiz of RAIZES) {
      for (const caminho of arquivos(raiz)) {
        const fonte = readFileSync(caminho, 'utf8');
        for (const [, lista] of fonte.matchAll(SELECT_DE_BRANDS)) {
          if (lista.trim() === '*') continue;
          for (const bruta of lista.split(',')) {
            // Ignora relacionamento aninhado (`brand_kits(...)`): outra tabela.
            const coluna = bruta.trim().split('(')[0].trim();
            if (!coluna || bruta.includes('(')) continue;
            if (!COLUNAS.has(coluna)) erros.push(`${caminho}: ${coluna}`);
          }
        }
      }
    }

    expect(erros).toEqual([]);
  });
});
