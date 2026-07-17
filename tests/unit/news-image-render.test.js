import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('server-only', () => ({}));

import { applyNewsTitleOverlay } from '@/lib/ai/news-image-render';

describe('applyNewsTitleOverlay', () => {
  it('cria um PNG válido com o título sobre a imagem escolhida', async () => {
    const source = await sharp({
      create: { width: 32, height: 32, channels: 4, background: '#27215c' }
    }).png().toBuffer();

    const result = await applyNewsTitleOverlay({ source, title: 'Vibe Coding', position: 'bottom' });

    expect(result.contentType).toBe('image/png');
    expect(result.bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(result.bytes.length).toBeGreaterThan(source.length);
  });
});
