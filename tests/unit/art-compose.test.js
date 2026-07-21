import { describe, expect, it } from 'vitest';
import { composeArt, composableLayoutIds } from '@/lib/ai/art/compose';
import { layoutById, layoutIds } from '@/lib/ai/art/layouts';
import { resolveArtPalette, ART_SIZES } from '@/lib/ai/art/palette';
import { estimateLines } from '@/lib/ai/art/primitives';

const palette = resolveArtPalette({ kit: { palette: { accent: '#4F46E5' } }, niche: 'geral' });

const content = {
  title: 'Como economizar na conta de luz',
  subtitle: 'Tres ajustes simples que reduzem o consumo todo mes.',
  eyebrow: 'DICA',
  bullets: ['Trocar lampadas', 'Desligar standby', 'Usar timer'],
  cta: 'Salve este post',
  brand: 'marcateste',
  imageUrl: 'https://exemplo.test/foto.jpg'
};

// Percorre a arvore de nos procurando alguma coisa.
function walk(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, visit)); return; }
  if (typeof node !== 'object') { visit(node); return; }
  visit(node);
  walk(node.props?.children, visit);
}

function collectText(node) {
  const out = [];
  walk(node, (n) => { if (typeof n === 'string') out.push(n); });
  return out.join(' | ');
}

function findStyles(node, pred) {
  const out = [];
  walk(node, (n) => { if (n && typeof n === 'object' && n.props?.style && pred(n.props.style, n)) out.push(n.props.style); });
  return out;
}

describe('composeArt (§13/§15)', () => {
  it('todo layout da biblioteca tem composicao real', () => {
    expect(composableLayoutIds().sort()).toEqual(layoutIds().sort());
  });

  it('cada layout renderiza sem quebrar e mostra o titulo', () => {
    for (const id of layoutIds()) {
      const node = composeArt({ layout: layoutById(id), content, palette });
      expect(node, id).toBeTruthy();
      expect(collectText(node), id).toContain('Como economizar');
    }
  });

  it('usa a imagem na composicao, nao so como fundo chapado', () => {
    const node = composeArt({ layout: layoutById('editorial'), content, palette });
    const imgs = [];
    walk(node, (n) => { if (n && typeof n === 'object' && n.type === 'img') imgs.push(n.props.src); });
    expect(imgs).toContain(content.imageUrl);
  });

  it('layout sem imagem nao quebra quando a imagem falta', () => {
    const node = composeArt({ layout: layoutById('hero'), content: { ...content, imageUrl: null }, palette });
    expect(collectText(node)).toContain('Como economizar');
  });

  it('comparativo mostra os dois lados e o VS', () => {
    const node = composeArt({ layout: layoutById('comparativo'), content: { ...content, bullets: ['Antes disso', 'Depois disso'] }, palette });
    const texto = collectText(node);
    expect(texto).toContain('Antes disso');
    expect(texto).toContain('Depois disso');
    expect(texto).toContain('VS');
  });

  it('cards numera os itens', () => {
    const node = composeArt({ layout: layoutById('cards'), content, palette });
    const texto = collectText(node);
    expect(texto).toContain('Trocar lampadas');
    expect(texto).toContain('1');
  });

  // §16: hierarquia precisa existir no no renderizado, nao so na escala.
  it('o titulo e renderizado maior que o corpo', () => {
    const node = composeArt({ layout: layoutById('editorial'), content, palette });
    const tamanhos = findStyles(node, (s) => typeof s.fontSize === 'number').map((s) => s.fontSize);
    expect(Math.max(...tamanhos) / Math.min(...tamanhos)).toBeGreaterThan(1.8);
  });

  // §17: a peca ocupa a area — nada de conteudo flutuando no centro.
  it('preenche a area da arte', () => {
    const node = composeArt({ layout: layoutById('magazine'), content, palette, size: 'square' });
    expect(node.props.style.width).toBe(ART_SIZES.square.width);
    expect(node.props.style.height).toBe(ART_SIZES.square.height);
  });

  // Item 4: story usa exatamente o mesmo caminho, sem renderizador paralelo.
  it('story usa o mesmo compositor em 1080x1920', () => {
    const node = composeArt({ layout: layoutById('hero'), content, palette, size: 'story' });
    expect(node.props.style.width).toBe(1080);
    expect(node.props.style.height).toBe(1920);
    expect(collectText(node)).toContain('Como economizar');
  });

  it('feed e story compartilham a escala tipografica', () => {
    const feed = composeArt({ layout: layoutById('cards'), content, palette, size: 'square' });
    const story = composeArt({ layout: layoutById('cards'), content, palette, size: 'story' });
    const maior = (n) => Math.max(...findStyles(n, (s) => typeof s.fontSize === 'number').map((s) => s.fontSize));
    expect(maior(story)).toBe(maior(feed));
  });

  it('layout desconhecido cai em composicao valida em vez de quebrar', () => {
    const node = composeArt({ layout: { id: 'inexistente' }, content, palette });
    expect(collectText(node)).toContain('Como economizar');
  });
});

describe('estimateLines', () => {
  it('estima quebra de linha para caber o texto', () => {
    expect(estimateLines('a'.repeat(100), { fontSize: 50, boxWidth: 900 })).toBeGreaterThan(1);
    expect(estimateLines('curto', { fontSize: 50, boxWidth: 900 })).toBe(1);
    expect(estimateLines('', { fontSize: 50, boxWidth: 900 })).toBe(0);
  });
});
