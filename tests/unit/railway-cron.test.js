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

  // O cron do youtube-sync vivia so no vercel.json; ao sair da Vercel, o worker
  // do Railway precisa alcancar as duas rotas, senao a sincronizacao some.
  it('monta a chamada para a sincronizacao do youtube', () => {
    expect(buildCronRequest({ appUrl: 'https://socialhub.up.railway.app', secret: 'segredo', task: 'youtube-sync' })).toEqual({
      url: 'https://socialhub.up.railway.app/api/cron/youtube-sync',
      options: { headers: { authorization: 'Bearer segredo' } }
    });
  });

  it('recusa tarefa desconhecida em vez de montar uma URL qualquer', () => {
    expect(() => buildCronRequest({ appUrl: 'https://x.up.railway.app', secret: 's', task: '../../admin' }))
      .toThrow('Tarefa de cron desconhecida');
  });

  it('usa a tarefa recebida no ambiente', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => 'ok' });
    await runCron({ APP_URL: 'https://x.up.railway.app', CRON_SECRET: 's', CRON_TASK: 'youtube-sync' }, fetcher);
    expect(fetcher).toHaveBeenCalledWith('https://x.up.railway.app/api/cron/youtube-sync', expect.anything());
  });
});
