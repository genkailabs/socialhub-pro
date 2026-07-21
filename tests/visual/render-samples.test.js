// Amostras reais das artes, rasterizadas com next/og — o mesmo caminho da
// produção. Roda com `npm run art:samples` e escreve os PNGs em
// tests/visual/output/ para inspeção humana.
//
// Não afirma que a arte está bonita: nenhuma asserção sabe disso. O que ele
// garante é que existe o arquivo para alguém olhar antes de dar o bloco por
// pronto.
import { describe, expect, it, beforeAll } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildArt } from '@/lib/ai/art/pipeline';
import { artContentFor, artworkCount, artSizeForFormat } from '@/lib/content-production';
import { artFonts } from '@/lib/ai/art/fonts';
import { loadImageResponse } from './og';

const OUT = fileURLToPath(new URL('./output/', import.meta.url));

let ImageResponse;
let fonts;

// Marca de mentira, conteúdo de verdade: é assim que a skill escreve.
const MARCA = { handle: 'clinicaraiz', color: '#2F6F4E', niche: 'saude' };
const KIT = { palette: { accent: '#2F6F4E', bg: '#FBFAF7', ink: '#1B211D' } };

// Com acentuação de verdade: fonte com subconjunto errado só se denuncia aqui,
// quando "ã" e "ç" viram retângulo no PNG.
const POST = {
  hook: 'Dormir mal não é falta de força de vontade',
  caption: 'O sono tem quatro fases e cada uma cuida de uma parte do corpo. Quando uma some, o dia seguinte cobra.',
  cta: 'Salve para ler depois',
  slides: [
    { title: 'Luz azul atrasa o sono', body: 'Tela até tarde adia o sinal de dormir.' },
    { title: 'Café depois das 16h', body: 'A cafeína ainda está no corpo na hora de deitar.' },
    { title: 'Horário que muda todo dia', body: 'O corpo aprende por repetição.' }
  ]
};

const STORY = {
  objective: 'Explicar por que o sono ruim não é preguiça',
  cards: [
    { order: 1, type: 'abertura', title: 'Você acorda cansado mesmo dormindo 8 horas?', support: '', cta: null },
    { order: 2, type: 'educativo', title: 'Dormir muito não é o mesmo que dormir bem', support: 'O que conta é completar as fases do sono, não o número de horas na cama.', cta: null },
    { order: 3, type: 'prova_social', title: 'É a queixa que mais aparece na consulta', support: 'Quase sempre vem junto de tela até tarde e horário que muda todo dia.', cta: null },
    { order: 4, type: 'cta_final', title: 'Dá para ajustar sem remédio', support: 'A primeira conversa serve para entender a sua rotina.', cta: 'Chame no direct' }
  ]
};

// Uma "foto" 3:2 desenhada aqui mesmo: sem rede, e com proporção diferente de
// toda caixa dos layouts — que é justamente o que revela corte errado.
async function fotoFalsa() {
  const faixas = [0, 1, 2, 3, 4, 5].map((i) => ({
    type: 'div',
    props: { style: { display: 'flex', flex: 1, background: i % 2 ? '#1B4D3E' : '#C9A227' } }
  }));
  const png = Buffer.from(await new ImageResponse({
    type: 'div',
    props: {
      style: { display: 'flex', width: '100%', height: '100%', background: '#0E1A16' },
      children: faixas
    }
  }, { width: 1200, height: 800, fonts }).arrayBuffer());
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function render(nome, { format, production, index, imageUrl = null }) {
  const content = artContentFor(format, production, index, MARCA.handle);
  const art = buildArt({
    content: imageUrl ? { ...content, imageUrl } : content,
    kit: KIT,
    brandColor: MARCA.color,
    niche: MARCA.niche,
    size: artSizeForFormat(format),
    seed: index
  });

  const png = Buffer.from(await new ImageResponse(art.node, {
    width: art.size.width,
    height: art.size.height,
    fonts
  }).arrayBuffer());

  await writeFile(`${OUT}${nome}.png`, png);
  return { art, png };
}

describe('amostras de arte para inspecao visual', () => {
  beforeAll(async () => {
    await mkdir(OUT, { recursive: true });
    ImageResponse = await loadImageResponse();
    // As MESMAS fontes da produção: renderizar com outra mostraria uma peça que
    // o usuário nunca vai receber.
    fonts = artFonts();
  });

  it('Post 1080x1080', async () => {
    const { art, png } = await render('post-1080x1080', { format: 'image', production: POST, index: 0 });

    expect(art.size).toMatchObject({ width: 1080, height: 1080 });
    expect(png.length).toBeGreaterThan(1000);
  });

  it('Story 1080x1920 (sequencia completa)', async () => {
    const total = artworkCount('stories', STORY);
    expect(total).toBe(4);

    for (let i = 0; i < total; i++) {
      const { art, png } = await render(`story-1080x1920-${i + 1}`, { format: 'stories', production: STORY, index: i });

      expect(art.size).toMatchObject({ width: 1080, height: 1920 });
      expect(png.length).toBeGreaterThan(1000);
    }
  });

  // Corte de imagem só se vê renderizado: a caixa e a foto quase nunca têm a
  // mesma proporção.
  it('Post e Story com foto', async () => {
    const foto = await fotoFalsa();

    const quadrado = await render('post-com-foto-1080x1080', { format: 'image', production: POST, index: 0, imageUrl: foto });
    expect(quadrado.art.layout.uses.image).toBe(true);

    const vertical = await render('story-com-foto-1080x1920', { format: 'stories', production: STORY, index: 1, imageUrl: foto });
    expect(vertical.art.size.height).toBe(1920);
  });

  it('Carrossel 1080x1080 (uma tela)', async () => {
    const { art } = await render('carrossel-1080x1080-2', { format: 'carousel', production: POST, index: 1 });

    expect(art.size).toMatchObject({ width: 1080, height: 1080 });
  });
});
