import { describe, expect, it } from 'vitest';
import {
  EXTERNAL_ART_MAX_BYTES, GEMINI_URL, artFormatLabel, artRatio, aspectWarning,
  buildExternalArtPrompt, validateExternalArtFile
} from '@/lib/composer-ai-prompt';

const kit = {
  niche: 'Desenvolvimento de software',
  audience: 'Pequenas empresas',
  tone: 'Direto e confiante',
  visual_style: 'Moderno, tecnológico e profissional',
  palette: { accent: '#0A84FF', bg: '#000000', surface: '#FFFFFF', ink: '#111111' },
  donts: ['promessa de resultado garantido']
};

describe('prompt de arte externa', () => {
  it('monta o prompt com formato, marca e campos preenchidos', () => {
    const prompt = buildExternalArtPrompt({
      fields: {
        subject: 'Divulgação de sistemas personalizados',
        headline: 'Transforme sua ideia em um sistema profissional',
        cta: 'Solicite um orçamento'
      },
      format: 'post',
      ratio: '1:1',
      brandKit: kit,
      brandName: 'Genkai Labs'
    });

    expect(prompt).toContain('Crie uma arte profissional para Instagram.');
    expect(prompt).toContain('Formato: Post 1:1.');
    expect(prompt).toContain('Marca: Genkai Labs.');
    expect(prompt).toContain('Segmento: Desenvolvimento de software.');
    expect(prompt).toContain('Público: Pequenas empresas.');
    expect(prompt).toContain('Estilo: Moderno, tecnológico e profissional.');
    expect(prompt).toContain('Cores: #0A84FF, #000000, #FFFFFF, #111111.');
    expect(prompt).toContain('Assunto:\nDivulgação de sistemas personalizados');
    expect(prompt).toContain('Chamada para ação:\nSolicite um orçamento');
    // Blocos sempre separados por uma linha em branco, com ou sem campos vazios.
    expect(prompt).toContain(
      'Assunto:\nDivulgação de sistemas personalizados\n\nTexto principal:\nTransforme sua ideia em um sistema profissional\n\nChamada para ação:\nSolicite um orçamento\n\nRegras:'
    );
    expect(prompt).not.toMatch(/\n{3}/);
    expect(prompt).toContain('- não inventar logotipo;');
    expect(prompt).toContain('- evitar: promessa de resultado garantido.');
  });

  it('não inventa dados ausentes do Brand Kit nem campos vazios', () => {
    const prompt = buildExternalArtPrompt({
      fields: { subject: 'Vaga aberta' },
      format: 'post',
      ratio: '4:5',
      brandKit: null,
      brandName: ''
    });

    expect(prompt).not.toContain('Marca:');
    expect(prompt).not.toContain('Segmento:');
    expect(prompt).not.toContain('Cores:');
    expect(prompt).not.toContain('Texto principal:');
    expect(prompt).not.toContain('Chamada para ação:');
    expect(prompt).toContain('Formato: Post 4:5.');
    expect(prompt).toContain('Assunto:\nVaga aberta');
    expect(prompt).not.toMatch(/\n{3}/);
  });

  it('usa a proporção do Composer e força 9:16 em Story e Reel', () => {
    expect(artFormatLabel('post', '1.91:1')).toBe('Post 1.91:1');
    expect(artFormatLabel('carrossel', '4:5')).toBe('Carrossel 4:5');
    expect(artFormatLabel('story', '1:1')).toBe('Story 9:16');
    expect(artFormatLabel('reel', '1:1')).toBe('Reel 9:16');
    expect(artRatio('story', '4:5')).toBe('9:16');
    expect(artRatio('carrossel', '4:5')).toBe('4:5');
  });

  it('aponta o Gemini para a interface pública, sem automação', () => {
    expect(GEMINI_URL).toBe('https://gemini.google.com/app');
  });
});

describe('upload da arte gerada', () => {
  it('aceita PNG, JPG e WEBP dentro de 15 MB', () => {
    expect(validateExternalArtFile({ type: 'image/png', size: 1024 })).toEqual({ ok: true });
    expect(validateExternalArtFile({ type: 'image/jpeg', size: EXTERNAL_ART_MAX_BYTES })).toEqual({ ok: true });
    expect(validateExternalArtFile({ type: 'image/webp', size: 2048 })).toEqual({ ok: true });
  });

  it('recusa tipo não suportado e arquivo acima do limite', () => {
    expect(validateExternalArtFile({ type: 'image/gif', size: 10 }).ok).toBe(false);
    expect(validateExternalArtFile({ type: 'video/mp4', size: 10 }).ok).toBe(false);
    const big = validateExternalArtFile({ type: 'image/png', size: EXTERNAL_ART_MAX_BYTES + 1 });
    expect(big.ok).toBe(false);
    expect(big.error).toContain('15 MB');
    expect(validateExternalArtFile(null).ok).toBe(false);
  });

  it('avisa sobre proporção diferente sem bloquear o envio', () => {
    expect(aspectWarning({ width: 1080, height: 1080 }, 'post', '1:1')).toBe('');
    expect(aspectWarning({ width: 1080, height: 1350 }, 'post', '4:5')).toBe('');
    expect(aspectWarning({ width: 1080, height: 1920 }, 'story', '9:16')).toBe('');
    expect(aspectWarning({ width: 1080, height: 1080 }, 'story', '9:16')).toContain('9:16');
    expect(aspectWarning({ width: 0, height: 0 }, 'post', '1:1')).toBe('');
  });
});
