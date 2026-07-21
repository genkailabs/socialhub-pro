import { describe, expect, it } from 'vitest';
import { tokenStatus, needsReconnect, EXPIRING_SOON_DAYS } from '@/lib/social-tokens';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const emDias = (n) => new Date(NOW.getTime() + n * 24 * 3600 * 1000).toISOString();

describe('tokenStatus', () => {
  it('sem token e "nao conectado"', () => {
    expect(tokenStatus(null, NOW)).toBe('disconnected');
  });

  it('token desativado pede reconexao', () => {
    expect(tokenStatus({ is_active: false, token_expires_at: emDias(30) }, NOW)).toBe('revoked');
  });

  it('token com validade no futuro esta ativo', () => {
    expect(tokenStatus({ is_active: true, token_expires_at: emDias(30) }, NOW)).toBe('active');
  });

  // Page tokens derivados de user token long-lived nao expiram: null e valido.
  it('token sem validade definida esta ativo', () => {
    expect(tokenStatus({ is_active: true, token_expires_at: null }, NOW)).toBe('active');
  });

  it('token vencido esta expirado', () => {
    expect(tokenStatus({ is_active: true, token_expires_at: emDias(-1) }, NOW)).toBe('expired');
  });

  // Avisar antes de quebrar: o usuario reconecta na hora que quiser, nao quando
  // a publicacao ja falhou.
  it('token perto do fim avisa antes de quebrar', () => {
    expect(tokenStatus({ is_active: true, token_expires_at: emDias(EXPIRING_SOON_DAYS - 1) }, NOW)).toBe('expiring');
  });

  it('token longe do fim nao avisa', () => {
    expect(tokenStatus({ is_active: true, token_expires_at: emDias(EXPIRING_SOON_DAYS + 1) }, NOW)).toBe('active');
  });

  it('vencido no limite exato conta como expirado', () => {
    expect(tokenStatus({ is_active: true, token_expires_at: NOW.toISOString() }, NOW)).toBe('expired');
  });

  it('data invalida nao vira "ativo" por acidente', () => {
    expect(tokenStatus({ is_active: true, token_expires_at: 'qualquer coisa' }, NOW)).toBe('active');
  });
});

describe('needsReconnect', () => {
  it('expirado e revogado exigem reconexao', () => {
    expect(needsReconnect('expired')).toBe(true);
    expect(needsReconnect('revoked')).toBe(true);
  });

  it('ativo e expirando ainda publicam', () => {
    expect(needsReconnect('active')).toBe(false);
    expect(needsReconnect('expiring')).toBe(false);
  });
});
