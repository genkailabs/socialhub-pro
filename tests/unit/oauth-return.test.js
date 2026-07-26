import { describe, it, expect } from 'vitest';
import { safeReturnTo, OAUTH_RETURN_DEFAULT } from '@/lib/oauth-return';

describe('safeReturnTo', () => {
  it('aceita as telas para as quais o fluxo pode devolver', () => {
    expect(safeReturnTo('/connections')).toBe('/connections');
    expect(safeReturnTo('/instagram/diagnostico')).toBe('/instagram/diagnostico');
    expect(safeReturnTo('/brand-kit')).toBe('/brand-kit');
    expect(safeReturnTo('/paid-traffic')).toBe('/paid-traffic');
  });

  it('recusa destino externo disfarcado de caminho interno', () => {
    // O caso que uma regex de "comeca com barra" deixaria passar: o navegador
    // le //evil.com como host externo.
    expect(safeReturnTo('//evil.com')).toBeNull();
    expect(safeReturnTo('http://evil.com')).toBeNull();
    expect(safeReturnTo('https://evil.com/connections')).toBeNull();
    expect(safeReturnTo('/connections@evil.com')).toBeNull();
  });

  it('recusa rota interna que nao esta na lista', () => {
    expect(safeReturnTo('/calendar')).toBeNull();
    expect(safeReturnTo('/api/meta/oauth')).toBeNull();
  });

  it('recusa entrada vazia ou de outro tipo', () => {
    expect(safeReturnTo('')).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
    expect(safeReturnTo(['/connections'])).toBeNull();
  });

  it('o destino padrao continua sendo a tela de conexoes', () => {
    expect(OAUTH_RETURN_DEFAULT).toBe('/connections');
  });
});
