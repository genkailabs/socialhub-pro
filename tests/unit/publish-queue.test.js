import { describe, it, expect, vi } from 'vitest';
import { runPublishQueue, staleLeaseBefore, DEFAULT_LEASE_MS } from '@/lib/publish-queue';

// Publicar e irreversivel. Estes testes existem para provar que a fila erra do
// lado de NAO publicar — nunca do lado de publicar duas vezes.

const AGORA = new Date('2026-07-29T02:45:00.000Z');

function fakeDb({ due = [], claimOk = () => true } = {}) {
  const chamadas = { claim: [], published: [], errors: [] };
  return {
    chamadas,
    listDue: async () => due,
    claim: async (args) => {
      chamadas.claim.push(args);
      return claimOk(args);
    },
    markPublished: async (args) => { chamadas.published.push(args); },
    markError: async (args) => { chamadas.errors.push(args); }
  };
}

const post = (over = {}) => ({ id: 'p1', brand_id: 'b1', content: 'legenda', media_url: 'http://x/1.jpg', networks: ['instagram'], scheduled_at: '2026-07-29T02:45:00+00:00', ...over });

describe('runPublishQueue', () => {
  it('publica o post vencido e so marca publicado depois que a plataforma confirma', async () => {
    const db = fakeDb({ due: [post()] });
    const ordem = [];
    const publish = vi.fn(async () => { ordem.push('publicou'); return { externalId: 'ig-1', network: 'instagram' }; });
    db.markPublished = async () => { ordem.push('gravou'); };

    const res = await runPublishQueue({ db, publish, now: AGORA });

    expect(res.published).toBe(1);
    expect(res.failed).toBe(0);
    expect(ordem).toEqual(['publicou', 'gravou']);
  });

  it('reivindica antes de publicar', async () => {
    const db = fakeDb({ due: [post()] });
    const ordem = [];
    const claimOriginal = db.claim;
    db.claim = async (a) => { ordem.push('claim'); return claimOriginal(a); };
    const publish = vi.fn(async () => { ordem.push('publish'); return { externalId: 'ig-1' }; });

    await runPublishQueue({ db, publish, now: AGORA });
    expect(ordem).toEqual(['claim', 'publish']);
  });

  // O teste que importa: duas execucoes simultaneas do cron.
  it('nao publica quando outra execucao ja reivindicou o post', async () => {
    const db = fakeDb({ due: [post()], claimOk: () => false });
    const publish = vi.fn();

    const res = await runPublishQueue({ db, publish, now: AGORA });

    expect(publish).not.toHaveBeenCalled();
    expect(res.skipped).toBe(1);
    expect(res.published).toBe(0);
    expect(db.chamadas.published).toHaveLength(0);
  });

  it('marca erro sem marcar publicado quando a plataforma recusa', async () => {
    const db = fakeDb({ due: [post()] });
    const publish = vi.fn(async () => { throw new Error('midia invalida'); });

    const res = await runPublishQueue({ db, publish, now: AGORA });

    expect(res.failed).toBe(1);
    expect(db.chamadas.published).toHaveLength(0);
    expect(db.chamadas.errors[0].message).toContain('midia invalida');
  });

  it('um post com problema nao impede os outros da fila', async () => {
    const db = fakeDb({ due: [post({ id: 'ruim' }), post({ id: 'bom' })] });
    const publish = vi.fn(async (p) => {
      if (p.id === 'ruim') throw new Error('sem token');
      return { externalId: 'ig-2', network: 'instagram' };
    });

    const res = await runPublishQueue({ db, publish, now: AGORA });

    expect(res.examined).toBe(2);
    expect(res.published).toBe(1);
    expect(res.failed).toBe(1);
  });

  it('fila vazia nao chama a plataforma', async () => {
    const db = fakeDb({ due: [] });
    const publish = vi.fn();
    const res = await runPublishQueue({ db, publish, now: AGORA });
    expect(publish).not.toHaveBeenCalled();
    expect(res).toMatchObject({ examined: 0, published: 0, failed: 0, skipped: 0 });
  });
});

describe('staleLeaseBefore', () => {
  it('considera abandonado um lease mais velho que a duracao configurada', () => {
    const limite = staleLeaseBefore(AGORA, DEFAULT_LEASE_MS);
    expect(new Date(limite).getTime()).toBe(AGORA.getTime() - DEFAULT_LEASE_MS);
  });

  // Sem isto, um processo morto no meio da publicacao prenderia o post para
  // sempre e ele nunca mais seria tentado.
  it('devolve o post a fila depois do lease vencer', () => {
    const limite = new Date(staleLeaseBefore(AGORA));
    const leaseAntigo = new Date(AGORA.getTime() - 11 * 60 * 1000);
    const leaseRecente = new Date(AGORA.getTime() - 2 * 60 * 1000);
    expect(leaseAntigo < limite).toBe(true);
    expect(leaseRecente < limite).toBe(false);
  });
});
