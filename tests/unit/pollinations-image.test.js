import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pollinationsImage, hasPollinationsKey, POLLINATIONS_IMAGE_MODEL } from '@/lib/ai/pollinations-image';

function imageResponse({ type = 'image/jpeg', bytes = 16 } = {}) {
  return {
    ok: true,
    headers: { get: (h) => (h === 'content-type' ? type : null) },
    arrayBuffer: async () => new ArrayBuffer(bytes)
  };
}

describe('pollinationsImage', () => {
  beforeEach(() => {
    process.env.POLLINATIONS_SECRET_KEY = 'sk_test';
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('gera imagem e devolve bytes + contentType + model', async () => {
    fetch.mockResolvedValue(imageResponse({ type: 'image/jpeg', bytes: 32 }));

    const out = await pollinationsImage({ prompt: 'cozy cafe, warm light' });

    expect(Buffer.isBuffer(out.bytes)).toBe(true);
    expect(out.bytes.length).toBe(32);
    expect(out.contentType).toBe('image/jpeg');
    expect(out.model).toBe(POLLINATIONS_IMAGE_MODEL);
  });

  it('monta URL com prompt encodado, dimensões 1080 e nologo', async () => {
    fetch.mockResolvedValue(imageResponse());

    await pollinationsImage({ prompt: 'café & pão' });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('gen.pollinations.ai/image/');
    expect(url).toContain(encodeURIComponent('café & pão'));
    expect(url).toContain('width=1080');
    expect(url).toContain('height=1080');
    expect(url).toContain('nologo=true');
    expect(opts.headers.Authorization).toContain('sk_test');
  });

  it('erro HTTP lança com prefixo Pollinations', async () => {
    fetch.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests', headers: { get: () => 'text/plain' }, arrayBuffer: async () => new ArrayBuffer(0) });

    await expect(pollinationsImage({ prompt: 'x' })).rejects.toThrow(/Pollinations.*429/);
  });

  it('prompt vazio lança', async () => {
    await expect(pollinationsImage({ prompt: '  ' })).rejects.toThrow(/prompt/i);
  });

  it('sem chave lança; hasPollinationsKey reflete', async () => {
    delete process.env.POLLINATIONS_SECRET_KEY;
    expect(hasPollinationsKey()).toBe(false);
    await expect(pollinationsImage({ prompt: 'x' })).rejects.toThrow(/POLLINATIONS_SECRET_KEY/);
    process.env.POLLINATIONS_SECRET_KEY = 'sk_x';
    expect(hasPollinationsKey()).toBe(true);
  });
});
