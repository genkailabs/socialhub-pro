import { describe, expect, it } from 'vitest';
import { buildArt, applyFix, MAX_ART_ATTEMPTS } from '@/lib/ai/art/pipeline';
import { layoutById } from '@/lib/ai/art/layouts';
import { resolveArtPalette } from '@/lib/ai/art/palette';
import { contrastRatio, MAX_TITLE_CHARS, MIN_CONTRAST_BODY } from '@/lib/ai/art/quality';

const base = {
  content: {
    title: 'Como economizar na conta de luz',
    subtitle: 'Tres ajustes simples que reduzem o consumo.',
    bullets: [],
    cta: 'Salve este post',
    brand: 'marcateste',
    imageUrl: 'https://exemplo.test/foto.jpg'
  },
  kit: { palette: { accent: '#4F46E5' } },
  niche: 'geral'
};

describe('buildArt (§19)', () => {
  it('entrega arte aprovada quando o conteudo esta bom', () => {
    const r = buildArt(base);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.node).toBeTruthy();
    expect(r.report).toContain('aprovada');
  });

  // O usuario so recebe depois de passar pela validacao: se entrou torto, o
  // pipeline conserta antes de entregar.
  it('encurta titulo longo sozinho e entrega aprovado', () => {
    const r = buildArt({ ...base, content: { ...base.content, title: 'a'.repeat(200) } });
    expect(r.content.title.length).toBeLessThanOrEqual(MAX_TITLE_CHARS);
    expect(r.ok).toBe(true);
  });

  it('corrige contraste ruim vindo do Brand Kit', () => {
    const r = buildArt({ ...base, kit: { palette: { bg: '#FFFFFF', ink: '#EFEFEF', accent: '#4F46E5' } } });
    expect(contrastRatio(r.palette.ink, r.palette.bg)).toBeGreaterThanOrEqual(MIN_CONTRAST_BODY);
    expect(r.ok).toBe(true);
  });

  it('troca para layout sem imagem quando a imagem falta', () => {
    const r = buildArt({ ...base, content: { ...base.content, imageUrl: null, bullets: ['um', 'dois', 'tres'] } });
    expect(r.layout.requires.image).toBe(false);
    expect(r.ok).toBe(true);
  });

  it('nao repete o layout usado no post anterior (§15)', () => {
    const r = buildArt({ ...base, recentLayouts: ['hero'] });
    expect(r.layout.id).not.toBe('hero');
  });

  it('story passa pelo mesmo pipeline, so muda o tamanho', () => {
    const r = buildArt({ ...base, size: 'story' });
    expect(r.size).toMatchObject({ width: 1080, height: 1920 });
    expect(r.ok).toBe(true);
    expect(r.node.props.style.height).toBe(1920);
  });

  it('para de tentar quando nada e corrigivel, sem laco infinito', () => {
    // Sem titulo nao ha conserto honesto: nao se inventa texto para a marca.
    const r = buildArt({ ...base, content: { ...base.content, title: '' } });
    expect(r.ok).toBe(false);
    expect(r.attempts).toBeLessThanOrEqual(MAX_ART_ATTEMPTS);
    expect(r.issues.map((i) => i.id)).toContain('titulo_ausente');
    // Mesmo reprovada, devolve o no: quem chama decide se usa ou volta para a IA.
    expect(r.node).toBeTruthy();
    expect(r.report).not.toContain('aprovada');
  });

  it('relata o motivo em linguagem util', () => {
    const r = buildArt({ ...base, content: { ...base.content, title: '' } });
    expect(r.report.length).toBeGreaterThan(10);
  });
});

describe('applyFix', () => {
  const palette = resolveArtPalette({ kit: { palette: { accent: '#4F46E5' } } });

  it('titulo longo vira titulo cortado em palavra inteira', () => {
    const fix = applyFix({
      issue: { id: 'titulo_longo' },
      content: { title: 'palavra '.repeat(40), subtitle: '', bullets: [] },
      palette, layout: layoutById('hero')
    });
    expect(fix.content.title.length).toBeLessThanOrEqual(MAX_TITLE_CHARS);
    expect(fix.content.title.endsWith('…')).toBe(true);
  });

  it('acento invisivel deixa de ser destaque em vez de virar ilegivel', () => {
    const fix = applyFix({
      issue: { id: 'acento_invisivel' },
      content: { title: 'x', bullets: [] },
      palette: { ...palette, accent: '#FEFEFE', bg: '#FFFFFF' },
      layout: layoutById('hero')
    });
    expect(fix.palette.accent).toBe(palette.ink);
  });

  it('devolve null quando nao ha conserto automatico', () => {
    for (const id of ['titulo_ausente', 'sem_hierarquia', 'fora_do_brand_kit', 'paleta_invalida']) {
      const fix = applyFix({ issue: { id }, content: { title: 'x', bullets: [] }, palette, layout: layoutById('hero') });
      expect(fix, id).toBeNull();
    }
  });
});
