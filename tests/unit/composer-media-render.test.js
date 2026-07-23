import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import {
  assertAllowedMediaUrl,
  buildComposerVideoFilter,
  composerOutputSize,
  renderComposerImage,
  renderComposerVideo
} from '@/lib/composer-media-render';

const tempRoots = [];
afterAll(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
});

describe('renderizacao final da midia do Composer', () => {
  it('usa as dimensoes finais oficiais de cada formato', () => {
    expect(composerOutputSize('post', '1:1')).toEqual([1080, 1080]);
    expect(composerOutputSize('post', '4:5')).toEqual([1080, 1350]);
    expect(composerOutputSize('story', '9:16')).toEqual([1080, 1920]);
    expect(composerOutputSize('reel', '9:16')).toEqual([1080, 1920]);
  });

  it('rasteriza o enquadramento da imagem no arquivo que sera publicado', async () => {
    const source = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#ff0000' }
    }).png().toBuffer();
    const output = await renderComposerImage({
      source,
      contentType: 'image/png',
      transform: { x: 0, y: 162, w: 292, h: 195, scale: 1, rot: 0 },
      canvas: [292, 519],
      output: [1080, 1920]
    });
    const metadata = await sharp(output).metadata();
    expect([metadata.width, metadata.height, metadata.format]).toEqual([1080, 1920, 'jpeg']);

    const topPixel = await sharp(output).extract({ left: 10, top: 10, width: 1, height: 1 }).raw().toBuffer();
    const centerPixel = await sharp(output).extract({ left: 540, top: 960, width: 1, height: 1 }).raw().toBuffer();
    expect([...topPixel].slice(0, 3)).toEqual(expect.arrayContaining([32, 32, 36]));
    expect(centerPixel[0]).toBeGreaterThan(240);
    expect(centerPixel[1]).toBeLessThan(20);
  });

  it('inclui formas e textos visíveis no arquivo final', async () => {
    const source = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#ff0000' }
    }).png().toBuffer();
    const output = await renderComposerImage({
      source,
      contentType: 'image/png',
      transform: { x: 0, y: 0, w: 100, h: 100, scale: 1, rot: 0 },
      canvas: [100, 100],
      output: [200, 200],
      layers: [
        { type: 'shape', x: 0, y: 0, w: 30, h: 30, fill: '#007aff', op: 1, rot: 0 },
        { type: 'text', text: 'OK', x: 35, y: 35, w: 30, h: 30, fs: 12, weight: 700, color: '#ffffff', op: 1, rot: 0 }
      ]
    });
    const shapePixel = await sharp(output).extract({ left: 20, top: 20, width: 1, height: 1 }).raw().toBuffer();
    expect(shapePixel[2]).toBeGreaterThan(200);
    expect(shapePixel[0]).toBeLessThan(30);
  });

  it('aceita somente URLs do bucket público de mídia configurado', () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    try {
      expect(assertAllowedMediaUrl('https://project.supabase.co/storage/v1/object/public/media/temp/brand/file.jpg'))
        .toContain('/storage/v1/object/public/media/');
      expect(() => assertAllowedMediaUrl('http://127.0.0.1:3000/admin')).toThrow(/armazenamento seguro/i);
      expect(() => assertAllowedMediaUrl('https://evil.example/file.jpg')).toThrow(/armazenamento seguro/i);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it('gera o filtro de video com a mesma posicao, escala e rotacao do canvas', () => {
    const filter = buildComposerVideoFilter({
      transform: { x: 10, y: 20, w: 200, h: 100, scale: 1.5, rot: 30 },
      canvas: [430, 430],
      output: [1080, 1080]
    });
    expect(filter).toContain('scale=754:376');
    expect(filter).toContain('rotate=0.523598');
    expect(filter).toContain("overlay=x='401.860");
  });

  it('codifica um video real com o enquadramento do canvas', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'composer-video-test-'));
    tempRoots.push(root);
    const sourcePath = path.join(root, 'source.mp4');
    const generated = spawnSync(ffmpegPath, [
      '-y',
      '-f', 'lavfi',
      '-i', 'color=c=red:s=320x180:d=0.25',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      sourcePath
    ], { windowsHide: true });
    expect(generated.status).toBe(0);

    const output = await renderComposerVideo({
      source: await readFile(sourcePath),
      extension: 'mp4',
      transform: { x: 0, y: 162, w: 292, h: 195, scale: 1, rot: 0 },
      canvas: [292, 519],
      output: [320, 568],
      layers: [{ type: 'shape', x: 0, y: 0, w: 40, h: 40, fill: '#007aff', op: 1, rot: 0 }]
    });
    expect(output.length).toBeGreaterThan(1000);
    expect(output.subarray(4, 8).toString()).toBe('ftyp');
  });
});
