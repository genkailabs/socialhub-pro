import { beforeEach, describe, expect, it, vi } from 'vitest';

// Em produção TODA geração de arte falhava com "Marca inválida.". A causa não
// era a marca: `brandContext` pedia `niche` no select, `brands` não tem essa
// coluna, o PostgREST devolvia 42703, `data` vinha null e o código traduzia a
// ausência de dado como marca inexistente. O erro do banco era descartado no
// destructure, então nada apontava para o schema.
//
// Estes testes prendem as duas lições: só pedir coluna que existe, e nunca
// confundir erro de banco com dado ausente.

const COLUNAS_REAIS_DE_BRANDS = new Set([
  'id', 'user_id', 'name', 'logo_url', 'handle', 'category', 'color',
  'followers', 'engagement', 'connected_networks', 'networks_metadata',
  'created_at', 'updated_at'
]);

const state = vi.hoisted(() => ({ selects: [], brandResult: null }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table) => ({
      select: (cols) => {
        state.selects.push({ table, cols });
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: async () => ({ data: [], error: null }),
          maybeSingle: async () => (table === 'brands' ? state.brandResult : { data: null, error: null })
        };
        return chain;
      },
      insert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
    })
  })
}));

vi.mock('@/lib/brand-kit-data', () => ({ getBrandKit: async () => ({ niche: 'psicologia', tone: 'acolhedor' }) }));
vi.mock('@/lib/layouts-data', () => ({
  getRecentLayoutUsage: async () => ({ recentStructures: [], recentStyles: [] }),
  listLayoutTemplates: async () => []
}));
vi.mock('@/lib/ai-actions', () => ({ generatePost: vi.fn() }));

import { buildLayoutForContent } from '@/lib/layout-actions';

const conteudo = { title: 'Um título', subtitle: '', bullets: [], cta: '', brand: 'marca', caption: '' };

beforeEach(() => {
  state.selects = [];
  state.brandResult = { data: { id: 'b1', name: 'Marca', color: '#000' }, error: null };
});

describe('brandContext: o select da marca', () => {
  it('só pede colunas que existem em brands', async () => {
    await buildLayoutForContent({ brandId: 'b1', content: conteudo });

    const brands = state.selects.find((s) => s.table === 'brands');
    expect(brands, 'a marca precisa ser consultada').toBeTruthy();

    const pedidas = brands.cols.split(',').map((c) => c.trim());
    const inexistentes = pedidas.filter((c) => !COLUNAS_REAIS_DE_BRANDS.has(c));
    expect(inexistentes, `colunas que brands não tem: ${inexistentes.join(', ')}`).toEqual([]);
  });

  it('o nicho vem do Brand Kit, que é onde ele mora', async () => {
    const result = await buildLayoutForContent({ brandId: 'b1', content: conteudo });
    expect(result.ok).toBe(true);
  });
});

describe('brandContext: erro de banco não é marca inválida', () => {
  it('erro do PostgREST vira mensagem própria, com o detalhe técnico', async () => {
    state.brandResult = { data: null, error: { message: 'column brands.niche does not exist', code: '42703' } };

    const result = await buildLayoutForContent({ brandId: 'b1', content: conteudo });

    expect(result.error).toBe('Não foi possível ler a marca.');
    expect(result.detail).toContain('42703');
    // O diagnóstico errado é justamente o que escondeu o bug por semanas.
    expect(result.error).not.toBe('Marca inválida.');
  });

  it('marca que realmente não existe continua sendo marca inválida', async () => {
    state.brandResult = { data: null, error: null };

    const result = await buildLayoutForContent({ brandId: 'b1', content: conteudo });

    expect(result.error).toBe('Marca inválida.');
  });
});
