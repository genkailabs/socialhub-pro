// Contact sheet em PNG das peças montadas pelo motor de layouts.
//
// Existe porque o HTML de prévia (layout-samples) depende do navegador e das
// fontes remotas, e porque teste automático não aprova arte: o veredito é
// humano, olhando o pixel. Roda com `npm run art:samples`.
//
// A rasterização é a MESMA da publicação (buildComposerLayersSvg + sharp), então
// o que aparece aqui é o que sai no arquivo entregue — e não uma segunda
// aproximação que ninguém vai receber.
import '@/lib/composer-render-fonts';
import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { composeSmartPost, composeSmartCarousel } from '@/lib/layouts/index';
import { buildComposerLayersSvg } from '@/lib/composer-media-render';

const OUT = fileURLToPath(new URL('./output/', import.meta.url));
const kit = { palette: { accent: '#0F766E', bg: '#FFFFFF', ink: '#111111' } };

// "Foto" desenhada aqui: sem rede, e com faixas fortes — corte errado e véu
// fraco aparecem na hora contra um fundo assim.
const FOTO = { url: 'data:foto', kind: 'image', width: 1600, height: 900, name: 'foto' };

function fotoSvg(rect) {
  if (!rect) return '';
  const faixas = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${rect.x}" y="${rect.y + (rect.h / 6) * i}" width="${rect.w}" height="${rect.h / 6}" fill="${i % 2 ? '#1B4D3E' : '#C9A227'}"/>`).join('');
  return faixas;
}

function pieceSvg(result, { label }) {
  const [w, h] = result.canvas;
  const clip = result.surface.bgClip;
  // Mesmo recorte da publicação: sem ele a foto que PREENCHE a moldura aparece
  // transbordando aqui e certa no arquivo, ou o contrário.
  const foto = result.surface.media
    ? `<defs><clipPath id="c"><rect x="${clip?.x ?? 0}" y="${clip?.y ?? 0}" width="${clip?.w ?? w}" height="${clip?.h ?? h}"/></clipPath></defs>
       <g clip-path="url(#c)">${fotoSvg(result.surface.bg)}</g>`
    : '';
  return {
    width: w,
    height: h,
    label,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#202024"/>
      ${foto}
      ${buildComposerLayersSvg(result.surface.layers)}
    </svg>`
  };
}

async function contactSheet(name, pieces, columns = 4) {
  const gap = 28;
  const labelH = 26;
  const cellW = Math.max(...pieces.map((p) => p.width));
  const cellH = Math.max(...pieces.map((p) => p.height)) + labelH;
  const rows = Math.ceil(pieces.length / columns);
  const sheetW = columns * cellW + (columns + 1) * gap;
  const sheetH = rows * cellH + (rows + 1) * gap;

  const rendered = await Promise.all(pieces.map(async (piece) => ({
    piece,
    buffer: await sharp(Buffer.from(piece.svg)).png().toBuffer()
  })));

  const legendas = rendered.map(({ piece }, index) => {
    const left = gap + (index % columns) * (cellW + gap);
    const top = gap + Math.floor(index / columns) * (cellH + gap);
    return `<text x="${left}" y="${top + piece.height + 18}" font-family="sans-serif" font-size="15" fill="#e8e8e8">${piece.label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  }).join('');

  const base = await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}">
      <rect width="${sheetW}" height="${sheetH}" fill="#101012"/>${legendas}
    </svg>`
  )).png().toBuffer();

  const composed = await sharp(base).composite(rendered.map(({ buffer }, index) => ({
    input: buffer,
    left: gap + (index % columns) * (cellW + gap),
    top: gap + Math.floor(index / columns) * (cellH + gap)
  }))).png().toBuffer();

  await writeFile(`${OUT}${name}.png`, composed);
  return composed;
}

const MARCA = { niche: 'contabilidade', name: 'Genkai' };

describe('contact sheet PNG do motor de layouts (§10)', () => {
  it('Cenário 1 e 3 · notícia e dado em 4:5', async () => {
    await mkdir(OUT, { recursive: true });

    const casos = [
      ['C1 notícia com foto', composeSmartPost({
        content: {
          title: 'Nova regra do split payment entra em vigor em janeiro',
          subtitle: 'A retencao passa a ser feita direto na maquininha.',
          highlight: 'janeiro', source: 'Agência Brasil', date: '29 jul 2026',
          eyebrow: 'Notícia', brand: 'genkailabs'
        },
        brand: MARCA, kit, media: FOTO, ratio: '4:5', structureId: 'noticia-premium'
      })],
      ['C1 notícia sem foto', composeSmartPost({
        content: {
          title: 'Governo antecipa o calendario do imposto de renda',
          subtitle: 'O prazo de entrega encurta em duas semanas.',
          source: 'Receita Federal', date: '29 jul 2026', eyebrow: 'Notícia', brand: 'genkailabs'
        },
        brand: MARCA, kit, ratio: '4:5'
      })],
      ['C1 hero editorial', composeSmartPost({
        content: {
          title: 'A regra mudou e ninguem avisou o comercio',
          subtitle: 'O que muda na maquininha a partir de janeiro.',
          source: 'Agência Brasil', eyebrow: 'Notícia', brand: 'genkailabs'
        },
        brand: MARCA, kit, media: FOTO, ratio: '4:5', structureId: 'hero-editorial'
      })],
      ['C3 dado dominante', composeSmartPost({
        content: {
          title: '68% das empresas ainda calculam o imposto a mao',
          subtitle: 'Levantamento com 1.200 empresas de pequeno porte.',
          source: 'Sebrae 2026', cta: 'Ver o estudo', eyebrow: 'Números', brand: 'genkailabs'
        },
        brand: MARCA, kit, ratio: '4:5', structureId: 'estatistica'
      })],
      ['Lista visual', composeSmartPost({
        content: {
          title: 'Quatro erros que travam o seu fechamento',
          bullets: ['Nota lancada fora do mes', 'Extrato conciliado a mao', 'Pro-labore sem registro', 'Estoque sem contagem'],
          eyebrow: 'Dica', brand: 'genkailabs'
        },
        brand: MARCA, kit, ratio: '4:5', structureId: 'lista-visual'
      })],
      ['Lista com foto', composeSmartPost({
        content: {
          title: 'Dois ajustes que mudam o seu mes',
          bullets: ['Concilie o extrato toda sexta', 'Separe pessoa fisica de juridica'],
          eyebrow: 'Dica', brand: 'genkailabs'
        },
        brand: MARCA, kit, media: FOTO, ratio: '4:5', structureId: 'lista-foto'
      })],
      ['Conclusão', composeSmartPost({
        content: {
          title: 'O erro nao esta na conta, esta no processo',
          highlight: 'processo', subtitle: 'Arrumar a rotina resolve o que a planilha nunca resolveu.',
          eyebrow: 'Resumindo', slideNumber: '6/7', brand: 'genkailabs'
        },
        brand: MARCA, kit, ratio: '4:5', structureId: 'slide-conclusao'
      })],
      ['Chamada', composeSmartPost({
        content: { title: 'Quer o diagnostico do seu fechamento', cta: 'Chame no direct', eyebrow: 'Agora', slideNumber: '7/7', brand: 'genkailabs' },
        brand: MARCA, kit, ratio: '4:5', structureId: 'slide-cta'
      })]
    ];

    // 4:5 é 1080x1350 no arquivo e 384x480 no canvas de edição: é o canvas que
    // se confere, porque é dele que a superfície sai.
    for (const [, result] of casos) expect(result.canvas).toEqual([384, 480]);

    const png = await contactSheet('motor-4x5', casos.map(([label, result]) => pieceSvg(result, { label })));
    expect(png.length).toBeGreaterThan(5000);
  });

  it('Cenário 2 · carrossel tutorial 4:5, slide a slide', async () => {
    await mkdir(OUT, { recursive: true });

    const carrossel = composeSmartCarousel({
      content: {
        title: 'Como fechar o mes sem retrabalho',
        subtitle: 'O fechamento trava sempre nos mesmos quatro pontos, e todos eles sao de rotina, nao de calculo.',
        bullets: [
          'Lance a nota no dia em que ela sai',
          'Concilie o extrato toda sexta',
          'Registre o pro-labore antes do dia 20',
          'Conte o estoque no ultimo dia util'
        ],
        cta: 'Salve para o proximo mes',
        brand: 'genkailabs'
      },
      brand: MARCA, kit, ratio: '4:5', media: FOTO
    });

    const png = await contactSheet(
      'motor-carrossel-4x5',
      carrossel.slides.map((slide, index) => pieceSvg(slide, {
        label: `${index + 1}. ${slide.plan.structure.label}`
      })),
      4
    );

    // O ritmo é o ponto: sequência inteira na mesma estrutura era o defeito.
    const estruturas = carrossel.slides.map((s) => s.plan.structure.id);
    expect(new Set(estruturas).size).toBeGreaterThan(2);
    expect(new Set(carrossel.slides.map((s) => s.plan.style.id)).size).toBe(1);
    expect(png.length).toBeGreaterThan(5000);
  });
});
