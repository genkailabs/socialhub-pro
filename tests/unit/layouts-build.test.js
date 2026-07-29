import { describe, expect, it } from 'vitest';
import { buildLayoutSurface, fitMediaToRect, fitTextSize, estimateLines } from '@/lib/layouts/build';
import { structureById } from '@/lib/layouts/structures';
import { styleById } from '@/lib/layouts/styles';
import { contrastRatio } from '@/lib/ai/art/quality';
import { composeSmartPost, composeSmartCarousel } from '@/lib/layouts/index';

const media = { url: 'https://exemplo.test/foto.jpg', kind: 'image', width: 1600, height: 900, name: 'foto' };
const kit = { palette: { accent: '#0F766E', bg: '#FFFFFF', ink: '#111111' } };

describe('medição de texto', () => {
  it('reduz o corpo até o texto caber na caixa', () => {
    const grande = fitTextSize('Um titulo bem comprido que nao cabe de jeito nenhum', {
      fontSize: 60, boxWidth: 200, boxHeight: 60, lineHeight: 1.05, weight: 800, floor: 10
    });
    expect(grande).toBeLessThan(60);
    expect(estimateLines('Um titulo bem comprido que nao cabe de jeito nenhum', {
      fontSize: grande, boxWidth: 200, weight: 800
    }) * grande * 1.05).toBeLessThanOrEqual(61);
  });

  it('não reduz o que já cabe', () => {
    expect(fitTextSize('Curto', { fontSize: 20, boxWidth: 300, boxHeight: 60, weight: 400 })).toBe(20);
  });
});

describe('enquadramento da imagem', () => {
  it('preserva a proporção original em cover e em contain', () => {
    const rect = { x: 0, y: 0, w: 430, h: 430 };
    for (const mode of ['cover', 'contain']) {
      const t = fitMediaToRect(media, rect, mode);
      expect(Math.abs((t.w / t.h) - (media.width / media.height))).toBeLessThan
        ? expect(Math.abs((t.w / t.h) - (media.width / media.height))).toBeLessThan(0.02)
        : null;
    }
  });

  it('cover cobre o retângulo inteiro e contain cabe dentro', () => {
    const rect = { x: 10, y: 20, w: 200, h: 300 };
    const cover = fitMediaToRect(media, rect, 'cover');
    const contain = fitMediaToRect(media, rect, 'contain');
    expect(cover.w).toBeGreaterThanOrEqual(rect.w);
    expect(cover.h).toBeGreaterThanOrEqual(rect.h);
    expect(contain.w).toBeLessThanOrEqual(rect.w + 1);
    expect(contain.h).toBeLessThanOrEqual(rect.h + 1);
  });
});

describe('montagem da peça (§3)', () => {
  const content = {
    title: 'Nova regra muda o calculo do imposto',
    subtitle: 'A mudanca vale a partir do proximo mes para todas as empresas.',
    eyebrow: 'Noticia',
    cta: 'Fale com a gente',
    brand: 'genkailabs'
  };

  it('produz camadas editáveis, não uma imagem pronta (§4)', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('manchete'), style: styleById('jornalistico'),
      content, kit, canvas: [430, 430]
    });
    expect(Array.isArray(surface.layers)).toBe(true);
    expect(surface.layers.length).toBeGreaterThan(2);
    for (const layer of surface.layers) {
      expect(['text', 'button', 'shape', 'line', 'icon', 'sticker']).toContain(layer.type);
      expect(Number.isFinite(layer.x) && Number.isFinite(layer.y)).toBe(true);
    }
  });

  // O canvas do Composer é cinza escuro. Sem fundo próprio, uma peça de paleta
  // clara saía com texto escuro sobre o cinza do editor — invisível. Só apareceu
  // na inspeção do render.
  it('pinta o fundo da peça, atrás de todas as camadas', () => {
    const { surface, palette } = buildLayoutSurface({
      structure: structureById('conteudo-limpo'), style: styleById('corporativo'),
      content, kit, canvas: [430, 430]
    });
    const primeira = surface.layers[0];
    expect(primeira.componentId).toBe('painel');
    expect(primeira.fill).toBe(palette.bg);
    expect([primeira.x, primeira.y, primeira.w, primeira.h]).toEqual([0, 0, 430, 430]);
  });

  it('desenha o fundo ao redor da foto, nunca por cima dela', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('titulo-imagem-texto'), style: styleById('editorial'),
      content, kit, canvas: [430, 430], media
    });
    const fundos = surface.layers.filter((l) => l.id.includes('-fundo-'));
    const foto = surface.bg;
    expect(fundos.length).toBeGreaterThan(0);
    for (const fundo of fundos) {
      const overlapW = Math.min(fundo.x + fundo.w, foto.x + foto.w) - Math.max(fundo.x, foto.x);
      const overlapH = Math.min(fundo.y + fundo.h, foto.y + foto.h) - Math.max(fundo.y, foto.y);
      expect(Math.max(0, overlapW) * Math.max(0, overlapH)).toBe(0);
    }
  });

  it('não pinta fundo em cima de foto que sangra a peça inteira', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('imagem-titulo'), style: styleById('jornalistico'),
      content, kit, canvas: [430, 430], media
    });
    expect(surface.layers.filter((l) => l.id.includes('-fundo-'))).toHaveLength(0);
  });

  it('dá margem interna ao texto dentro de bloco de cor', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('comparativo'), style: styleById('tecnologia'),
      content: { ...content, bullets: ['Revisado a mao todo mes', 'Fechamento em dois cliques'] },
      kit, canvas: [430, 430]
    });
    const texto = surface.layers.find((l) => l.componentId === 'comparacao');
    const bloco = surface.layers.find((l) => l.id.endsWith('-fundo'));
    expect(bloco).toBeTruthy();
    expect(texto.bgMode).toBe('none');
    expect(texto.x).toBeGreaterThan(bloco.x);
    expect(texto.y).toBeGreaterThan(bloco.y);
    expect(texto.x + texto.w).toBeLessThan(bloco.x + bloco.w);
  });

  it('marca cada camada com o componente de origem (§11)', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('manchete'), style: styleById('editorial'),
      content, kit, canvas: [430, 430]
    });
    expect(surface.layers.map((l) => l.componentId)).toContain('titulo');
    expect(surface.layers.map((l) => l.componentId)).toContain('logo');
  });

  it('descarta slot sem conteúdo em vez de deixar caixa fantasma', () => {
    const { surface, skipped } = buildLayoutSurface({
      structure: structureById('conteudo-limpo'), style: styleById('minimalista'),
      content: { title: 'So o titulo', brand: 'marca' }, kit, canvas: [430, 430]
    });
    expect(skipped).toContain('cta');
    expect(surface.layers.every((l) => String(l.text || '').trim() || l.type === 'shape' || l.type === 'line')).toBe(true);
  });

  it('não coloca o véu quando não há foto para proteger', () => {
    const { surface, skipped } = buildLayoutSurface({
      structure: structureById('capa-carrossel'), style: styleById('comercial'),
      content, kit, canvas: [430, 430], media: null
    });
    expect(skipped).toContain('sobreposicao');
    expect(surface.layers.some((l) => l.componentId === 'sobreposicao')).toBe(false);
  });

  it('usa texto claro com sombra sobre a foto', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('imagem-titulo'), style: styleById('jornalistico'),
      content, kit, canvas: [430, 430], media
    });
    const titulo = surface.layers.find((l) => l.componentId === 'titulo');
    expect(titulo.color).toBe('#FFFFFF');
    expect(titulo.shOn).toBe(true);
    expect(surface.layers.some((l) => l.componentId === 'sobreposicao')).toBe(true);
  });

  it('aplica o Brand Kit na peça (§7)', () => {
    const { surface, palette } = buildLayoutSurface({
      structure: structureById('conteudo-limpo'), style: styleById('corporativo'),
      content, kit, canvas: [430, 430]
    });
    expect(palette.accent).toBe('#0F766E');
    expect(palette.followsBrandKit).toBe(true);
    expect(surface.layers.find((l) => l.componentId === 'cta').fill).toBe('#0F766E');
  });

  it('a mesma estrutura muda de cara com estilos diferentes (§6)', () => {
    const base = { structure: structureById('manchete'), content, kit, canvas: [430, 430] };
    const a = buildLayoutSurface({ ...base, style: styleById('premium') });
    const b = buildLayoutSurface({ ...base, style: styleById('comercial') });
    const tituloA = a.surface.layers.find((l) => l.componentId === 'titulo');
    const tituloB = b.surface.layers.find((l) => l.componentId === 'titulo');
    expect(tituloA.font).not.toBe(tituloB.font);
  });

  it('numera os itens da lista dentro do próprio texto editável', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('lista'), style: styleById('editorial'),
      content: { ...content, bullets: ['Revise o contrato', 'Guarde os recibos', 'Marque o prazo'] },
      kit, canvas: [430, 430]
    });
    const itens = surface.layers.filter((l) => l.componentId === 'lista');
    expect(itens).toHaveLength(3);
    expect(itens[0].text).toBe('1. Revise o contrato');
    expect(itens[2].text).toBe('3. Marque o prazo');
  });

  // O mesmo componente serve papéis diferentes conforme a estrutura: o destaque
  // é o "VS" centralizado no comparativo e um rótulo alinhado à esquerda no
  // texto-destaque. Sem ajuste por slot, seria preciso duplicar o componente.
  it('deixa a estrutura ajustar o padrao do componente no slot', () => {
    const comparativo = buildLayoutSurface({
      structure: structureById('comparativo'), style: styleById('minimalista'),
      content: { ...content, bullets: ['Antes era manual', 'Agora e automatico'], highlight: 'VS' },
      kit, canvas: [430, 430]
    });
    const destaque = buildLayoutSurface({
      structure: structureById('texto-destaque'), style: styleById('minimalista'),
      content: { ...content, highlight: 'Mito', info: 'Texto de fecho da peca.' },
      kit, canvas: [430, 430]
    });
    const alvo = (r) => r.surface.layers.find((l) => l.componentId === 'destaque-palavra');
    expect(alvo(comparativo).align).toBe('center');
    expect(alvo(destaque).align).toBe('left');
  });

  // Componentes que moram dentro de um bloco de cor (`PANELLED`) tinham a tinta
  // calculada contra o fundo da PÁGINA, não contra o painel. Numa paleta em que
  // os dois são escuros, o texto sumia — o render do box-informativo mostrou.
  it('garante leitura do texto que mora dentro de um bloco de cor', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('aviso'), style: styleById('tecnologia'),
      content: { ...content, warning: 'A partir de segunda o horario muda.' },
      // Paleta hostil de propósito: tinta e painel quase da mesma cor.
      kit: { palette: { accent: '#1B2A4A', bg: '#101828', ink: '#16233D' } },
      canvas: [430, 430]
    });
    const texto = surface.layers.find((l) => l.componentId === 'aviso');
    const painel = surface.layers.find((l) => l.componentId === 'painel');
    expect(painel).toBeTruthy();
    expect(contrastRatio(texto.color, painel.fill)).toBeGreaterThanOrEqual(4.5);
  });

  // Sombra em texto existe para descolar a letra da FOTO. Sobre fundo chapado
  // ela só borra — e o render mostrou isso no título do estilo tecnologia, que
  // declara `shadow: true`. O subtítulo já seguia esta regra; o título não.
  it('so poe sombra no titulo quando ele esta sobre foto', () => {
    const tech = styleById('tecnologia');
    expect(tech.shadow, 'o estilo precisa declarar sombra para o teste valer').toBe(true);

    const semFoto = buildLayoutSurface({
      structure: structureById('capa-carrossel'), style: tech, content, kit, canvas: [430, 430]
    });
    const comFoto = buildLayoutSurface({
      structure: structureById('capa-carrossel'), style: tech, content, kit, media, canvas: [430, 430]
    });
    const titulo = (r) => r.surface.layers.find((l) => l.componentId === 'titulo');
    expect(titulo(semFoto).shOn).toBeFalsy();
    expect(titulo(comFoto).shOn).toBe(true);
  });

  // A capa é o que decide se alguém para o dedo. Mesmo título, mesmo estilo: na
  // capa ele tem de sair maior que numa peça que divide espaço com o resto.
  it('o titulo da capa sai maior que o de uma peca comum', () => {
    const curto = { ...content, title: 'A conta que ninguem faz' };
    const capa = buildLayoutSurface({
      structure: structureById('capa-carrossel'), style: styleById('jornalistico'),
      content: curto, kit, canvas: [430, 430]
    });
    const comum = buildLayoutSurface({
      structure: structureById('conteudo-limpo'), style: styleById('jornalistico'),
      content: curto, kit, canvas: [430, 430]
    });
    const tituloCapa = capa.surface.layers.find((l) => l.componentId === 'titulo');
    const tituloComum = comum.surface.layers.find((l) => l.componentId === 'titulo');
    expect(tituloCapa.fs).toBeGreaterThan(tituloComum.fs);
  });

  // A escala de capa é ponto de PARTIDA, não imposição: quem não couber encolhe.
  // Sem esta guarda o boost viraria texto vazando na peça mais visível de todas.
  it('a capa encolhe o titulo longo e deixa o curto grande', () => {
    const capa = (title) => {
      const { surface } = buildLayoutSurface({
        structure: structureById('capa-carrossel'), style: styleById('jornalistico'),
        content: { ...content, title }, kit, canvas: [430, 430]
      });
      return surface.layers.find((l) => l.componentId === 'titulo');
    };
    const curto = capa('A conta que ninguem faz');
    const longo = capa('Por que o preco do servico subiu neste ano e o que muda para quem ja e cliente da casa desde o comeco');
    expect(longo.fs).toBeLessThan(curto.fs);
    // O encolhimento é real, não cosmético: o título longo cabe no slot.
    expect(longo.fs).toBeLessThan(longo.h);
  });

  // O item chega marcado quando a IA escreve "• item" ou o usuário cola de uma
  // lista pronta. Somar o número do slot em cima do marcador produzia "1. • item"
  // na peça — o número é do layout, o marcador digitado é ruído.
  it('nao duplica marcador quando o item ja vem com bullet ou numero', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('lista'), style: styleById('editorial'),
      content: {
        ...content,
        bullets: ['• Organiza compromissos', '2) Faz pesquisas mais profundas', '- Cria resumos']
      },
      kit, canvas: [430, 430]
    });
    const itens = surface.layers.filter((l) => l.componentId === 'lista');
    expect(itens[0].text).toBe('1. Organiza compromissos');
    expect(itens[1].text).toBe('2. Faz pesquisas mais profundas');
    expect(itens[2].text).toBe('3. Cria resumos');
  });

  // Sem esta guarda o texto some: "10 motivos para revisar" viraria "motivos
  // para revisar", porque o número faz parte da frase, não é marcador.
  it('preserva numero que faz parte da frase', () => {
    const { surface } = buildLayoutSurface({
      structure: structureById('lista'), style: styleById('editorial'),
      content: { ...content, bullets: ['10 motivos para revisar', '3x mais rapido', '2026 muda tudo'] },
      kit, canvas: [430, 430]
    });
    const itens = surface.layers.filter((l) => l.componentId === 'lista');
    expect(itens[0].text).toBe('1. 10 motivos para revisar');
    expect(itens[1].text).toBe('2. 3x mais rapido');
    expect(itens[2].text).toBe('3. 2026 muda tudo');
  });
});

describe('composeSmartPost (§3 ponta a ponta)', () => {
  const content = {
    title: 'Nova regra muda o calculo do imposto',
    subtitle: 'A mudanca vale a partir do proximo mes.',
    eyebrow: 'Noticia',
    cta: 'Fale com a gente',
    brand: 'genkailabs'
  };

  it('entrega peça validada, plano e fala do mascote', () => {
    const result = composeSmartPost({ content, brand: { name: 'Genkai', niche: 'contabilidade' }, kit, media });
    expect(result.surface.layers.length).toBeGreaterThan(0);
    expect(result.plan.structure.id).toBeTruthy();
    expect(result.plan.style.id).toBeTruthy();
    expect(result.mascot.length).toBeGreaterThanOrEqual(3);
    expect(result.ok).toBe(true);
  });

  it('respeita a escolha manual de estrutura e estilo', () => {
    const result = composeSmartPost({
      content, brand: {}, kit, structureId: 'citacao', styleId: 'premium'
    });
    expect(result.plan.style.id).toBe('premium');
  });

  it('monta o Story com o canvas alto', () => {
    const result = composeSmartPost({ content, brand: {}, kit, format: 'story' });
    expect(result.canvas[1]).toBeGreaterThan(result.canvas[0]);
    for (const layer of result.surface.layers) {
      expect(layer.y + layer.h).toBeLessThanOrEqual(result.canvas[1] + 1);
    }
  });

  it('carrossel mantém a mesma cara entre os slides (§14)', () => {
    const result = composeSmartCarousel({
      content: { ...content, bullets: ['Revise o contrato', 'Guarde os recibos', 'Marque o prazo'] },
      brand: { name: 'Genkai' }, kit, media
    });
    expect(result.slides.length).toBe(4);
    const estilos = new Set(result.slides.map((s) => s.plan.style.id));
    expect(estilos.size).toBe(1);
    expect(result.issues.some((i) => i.id === 'slides_inconsistentes')).toBe(false);
  });
});
