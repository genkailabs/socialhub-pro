import { describe, expect, it } from 'vitest';
import {
  META_SCOPES, REQUIRED_SCOPES, OPTIONAL_SCOPES, OPTIONAL_SCOPE_LIST,
  enabledOptionalScopes, requestedScopes, scopeString, missingScopes
} from '@/lib/meta/scopes';

describe('REQUIRED_SCOPES', () => {
  it('pede o basico para ler e publicar no Instagram', () => {
    expect(REQUIRED_SCOPES).toContain('instagram_basic');
    expect(REQUIRED_SCOPES).toContain('instagram_content_publish');
  });

  it('pede o basico das Paginas', () => {
    expect(REQUIRED_SCOPES).toContain('pages_show_list');
    expect(REQUIRED_SCOPES).toContain('pages_read_engagement');
  });

  it('nao repete permissao', () => {
    expect(new Set(META_SCOPES).size).toBe(META_SCOPES.length);
  });
});

describe('requestedScopes', () => {
  // Regressao: pedir permissao que o app da Meta nao declarou derruba o dialogo
  // inteiro com "Invalid Scopes: pages_manage_posts, instagram_manage_insights"
  // e ninguem consegue conectar conta nenhuma.
  it('sem env, pede so o que o app da Meta ja tem', () => {
    expect(requestedScopes({})).toEqual(REQUIRED_SCOPES);
    expect(requestedScopes({})).not.toContain('instagram_manage_insights');
    expect(requestedScopes({})).not.toContain('pages_manage_posts');
  });

  it('inclui a opcional liberada no painel', () => {
    const scopes = requestedScopes({ META_OPTIONAL_SCOPES: 'instagram_manage_insights' });

    expect(scopes).toContain('instagram_manage_insights');
    expect(scopes).not.toContain('pages_manage_posts');
  });

  it('aceita a lista inteira separada por virgula', () => {
    const scopes = requestedScopes({ META_OPTIONAL_SCOPES: 'instagram_manage_insights, pages_manage_posts' });

    expect(scopes).toEqual(META_SCOPES);
  });

  it('ignora nome desconhecido: typo no env nao pode quebrar o login', () => {
    expect(requestedScopes({ META_OPTIONAL_SCOPES: 'instagram_manage_insigths' })).toEqual(REQUIRED_SCOPES);
  });

  it('nao deixa o env promover permissao obrigatoria duplicada', () => {
    const scopes = requestedScopes({ META_OPTIONAL_SCOPES: 'instagram_basic' });

    expect(new Set(scopes).size).toBe(scopes.length);
  });
});

describe('enabledOptionalScopes', () => {
  it('vazio quando o env nao existe', () => {
    expect(enabledOptionalScopes({})).toEqual([]);
  });

  it('so devolve o que esta no catalogo de opcionais', () => {
    expect(enabledOptionalScopes({ META_OPTIONAL_SCOPES: 'pages_manage_posts,qualquer_coisa' }))
      .toEqual(['pages_manage_posts']);
  });
});

describe('scopeString', () => {
  it('junta com virgula, como a Meta espera', () => {
    expect(scopeString(['a', 'b'])).toBe('a,b');
  });

  it('usa o pedido padrao quando nao recebe nada', () => {
    expect(scopeString()).toContain('instagram_content_publish');
  });
});

describe('missingScopes', () => {
  it('aponta o que foi pedido mas nao concedido', () => {
    const granted = ['public_profile', 'instagram_basic'];

    expect(missingScopes(granted, META_SCOPES)).toContain('instagram_manage_insights');
    expect(missingScopes(granted, META_SCOPES)).not.toContain('instagram_basic');
  });

  it('lista vazia quando tudo foi concedido', () => {
    expect(missingScopes(META_SCOPES, META_SCOPES)).toEqual([]);
  });

  it('sem nada concedido, tudo que foi pedido esta faltando', () => {
    expect(missingScopes([], REQUIRED_SCOPES)).toEqual(REQUIRED_SCOPES);
  });

  it('nao cobra opcional que nem foi pedida', () => {
    expect(missingScopes(REQUIRED_SCOPES, requestedScopes({}))).toEqual([]);
  });
});

describe('OPTIONAL_SCOPES', () => {
  // Faltar insights degrada o diagnostico, mas nao derruba o produto.
  it('insights e opcional: o produto segue sem ela', () => {
    expect(OPTIONAL_SCOPES.has('instagram_manage_insights')).toBe(true);
    expect(OPTIONAL_SCOPE_LIST).toContain('instagram_manage_insights');
  });

  it('publicar no Instagram nao e opcional', () => {
    expect(OPTIONAL_SCOPES.has('instagram_content_publish')).toBe(false);
  });
});
