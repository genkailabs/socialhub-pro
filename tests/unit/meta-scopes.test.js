import { describe, expect, it } from 'vitest';
import { META_SCOPES, OPTIONAL_SCOPES, scopeString, missingScopes } from '@/lib/meta/scopes';

describe('META_SCOPES', () => {
  // Regressao: instagram_manage_insights ficou de fora da lista e o diagnostico
  // nunca teve alcance/salvamentos. A Graph API respondia erro 10 e nada na tela
  // explicava o motivo.
  it('pede a permissao de insights', () => {
    expect(META_SCOPES).toContain('instagram_manage_insights');
  });

  it('pede o basico para ler e publicar no Instagram', () => {
    expect(META_SCOPES).toContain('instagram_basic');
    expect(META_SCOPES).toContain('instagram_content_publish');
  });

  it('pede o necessario para publicar na Pagina do Facebook', () => {
    expect(META_SCOPES).toContain('pages_show_list');
    expect(META_SCOPES).toContain('pages_manage_posts');
  });

  it('nao repete permissao', () => {
    expect(new Set(META_SCOPES).size).toBe(META_SCOPES.length);
  });
});

describe('scopeString', () => {
  it('junta com virgula, como a Meta espera', () => {
    expect(scopeString(['a', 'b'])).toBe('a,b');
  });

  it('usa a lista padrao quando nao recebe nada', () => {
    expect(scopeString()).toContain('instagram_manage_insights');
  });
});

describe('missingScopes', () => {
  it('aponta o que foi pedido mas nao concedido', () => {
    const granted = ['public_profile', 'instagram_basic'];

    expect(missingScopes(granted)).toContain('instagram_manage_insights');
    expect(missingScopes(granted)).not.toContain('instagram_basic');
  });

  it('lista vazia quando tudo foi concedido', () => {
    expect(missingScopes(META_SCOPES)).toEqual([]);
  });

  it('sem nada concedido, tudo esta faltando', () => {
    expect(missingScopes([])).toEqual(META_SCOPES);
  });
});

describe('OPTIONAL_SCOPES', () => {
  // Faltar insights degrada o diagnostico, mas nao derruba o produto.
  it('insights e opcional: o produto segue sem ela', () => {
    expect(OPTIONAL_SCOPES.has('instagram_manage_insights')).toBe(true);
  });

  it('publicar no Instagram nao e opcional', () => {
    expect(OPTIONAL_SCOPES.has('instagram_content_publish')).toBe(false);
  });
});
