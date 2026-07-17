import { describe, expect, it, vi } from 'vitest';
import { buildCronRequest, runCron } from '@/lib/railway-cron.cjs';

describe('Railway cron runner', () => {
  it('monta uma chamada autenticada para o endpoint de publicacao', () => {
    expect(buildCronRequest({ appUrl: 'https://socialhub.up.railway.app/', secret: 'segredo' })).toEqual({
      url: 'https://socialhub.up.railway.app/api/cron/publish-due',
      options: { headers: { authorization: 'Bearer segredo' } }
    });
  });

  it('falha quando o Railway nao recebe as variaveis obrigatorias', async () => {
    await expect(runCron({}, vi.fn())).rejects.toThrow('APP_URL e CRON_SECRET');
  });
});
