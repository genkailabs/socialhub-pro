import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('upload delegado do Carrossel Studio', () => {
  it('liga o pedido binario do iframe ao upload temporario do host', () => {
    const frame = readFileSync('components/carrossel/CarouselStudioFrame.jsx', 'utf8');
    const client = readFileSync('components/carrossel/CarouselStudioClient.jsx', 'utf8');

    expect(frame).toContain("data.type === 'cs:media-request'");
    expect(frame).toContain('onMediaUpload');
    expect(frame).toContain('studioMediaMessage');
    expect(client).toContain('onMediaUpload={handleMediaUpload}');
    expect(client).toContain('uploadTempMedia');
  });

  it('mantem a imagem IA opcional e envia apenas a selecao aprovada ao iframe', () => {
    const frame = readFileSync('components/carrossel/CarouselStudioFrame.jsx', 'utf8');
    const client = readFileSync('components/carrossel/CarouselStudioClient.jsx', 'utf8');

    expect(client).toContain("fetch('/api/carrossel/image'");
    expect(client).toContain('Gerar imagem de exemplo');
    expect(client).toContain('Gerar novamente');
    expect(client).toContain('removeSlideImage');
    expect(client).toContain("if (!slide?.headline || imageBusyOrder !== null) return");
    expect(client).not.toContain('!slide?.body');
    expect(client).toMatch(/media:\s*briefMedia\.map/);
    expect(client).toContain('initialMedia={approvedEditorial?.media || []}');
    expect(frame).toContain('initialMedia = []');
    expect(frame).toContain('initialMedia');
    expect(client).not.toMatch(/useEffect\([\s\S]{0,300}\/api\/carrossel\/image/);
  });

  it('remove o artefato Motion temporario somente a pedido do Studio autenticado', () => {
    const frame = readFileSync('components/carrossel/CarouselStudioFrame.jsx', 'utf8');
    const client = readFileSync('components/carrossel/CarouselStudioClient.jsx', 'utf8');

    expect(frame).toContain("data.type === 'cs:media-delete-request'");
    expect(frame).toContain('data.path.startsWith(`temp/${brandId}/`)');
    expect(frame).toContain('studioMediaDeleteAckMessage');
    expect(client).toContain('onMediaDelete={handleMediaDelete}');
    expect(client).toContain('return removeTempMedia(createClient(), [path])');
  });
});
