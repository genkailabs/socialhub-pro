import { describe, it } from 'vitest';
import { composeSmartPost } from '@/lib/layouts/index';
import { layerBoxStyle, layerLineBgStyle, GRAPHIC_TYPES } from '@/lib/composer-layer-style';
import { layerDisplayText } from '@/lib/composer-editor';

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Mesma ideia das amostras de arte (render-samples): o veredito é humano.
// Aqui a peça é HTML/CSS porque é assim que o canvas do Composer desenha —
// rasterizar com satori mediria outro renderizador, não o que o usuário vê.
const OUT = fileURLToPath(new URL('./output/layouts-preview.html', import.meta.url));

const kit = { palette: { accent: '#0F766E', bg: '#FFFFFF', ink: '#111111' } };
const media = { url: 'https://picsum.photos/id/1015/1600/900', kind: 'image', width: 1600, height: 900, name: 'foto' };

const CASES = [
  ['Notícia com foto', { title: 'Nova regra muda o calculo do imposto das empresas', subtitle: 'A mudanca vale a partir do proximo mes.', cta: 'Fale com a gente', brand: 'genkailabs' }, media, { niche: 'contabilidade', name: 'Genkai' }, {}],
  ['Manchete sem foto', { title: 'Governo anunciou a nova faixa do simples nacional', subtitle: 'Entenda em uma frase o que muda para o seu negocio.', brand: 'genkailabs' }, null, { niche: 'contabilidade' }, {}],
  ['Lista educativa', { title: 'Tres ajustes que reduzem sua conta de luz', bullets: ['Troque as lampadas por LED', 'Desligue o standby dos aparelhos', 'Use a maquina de lavar cheia'], cta: 'Salve este post', brand: 'genkailabs' }, null, { niche: 'geral' }, {}],
  ['Citação premium', { title: 'Detalhe e projeto', quote: 'O detalhe nao e o detalhe: o detalhe e o projeto', subtitle: 'Charles Eames', brand: 'estudio' }, null, { niche: 'advocacia' }, {}],
  ['Estatística', { title: '72% das empresas erram o calculo', subtitle: 'Levantamento com 400 empresas do setor.', cta: 'Ver o estudo', brand: 'genkailabs' }, null, { niche: 'contabilidade' }, {}],
  ['Comparativo', { title: 'Antes e depois do ajuste', bullets: ['Faturamento revisado a mao todo mes', 'Fechamento automatico em dois cliques'], highlight: 'VS', brand: 'genkailabs' }, null, { niche: 'tecnologia' }, {}],
  ['Pergunta', { title: 'Voce ja revisou seu contrato este ano', subtitle: 'Conta pra gente nos comentarios.', cta: 'Responder', brand: 'escritorio' }, null, { niche: 'advocacia' }, {}],
  ['Story com foto', { title: 'A promocao de inverno comeca hoje', subtitle: 'Ate 40% de desconto em toda a loja.', cta: 'Aproveitar', brand: 'loja' }, media, { niche: 'restaurante' }, { format: 'story' }],
  ['Aviso de serviço', { title: 'Atendimento em novo horario', warning: 'A partir de segunda atendemos das 9h as 18h, sem fechar para o almoco.', subtitle: 'Agende pelo WhatsApp.', cta: 'Agendar', brand: 'clinica' }, null, { niche: 'clinica' }, {}],
  ['Capa de carrossel', { title: 'O guia rapido do fechamento contabil', subtitle: 'Quatro passos para nao errar.', brand: 'genkailabs' }, media, { niche: 'tecnologia' }, { structureId: 'capa-carrossel' }]
];

function css(style) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${typeof value === 'number' && !['opacity', 'fontWeight', 'lineHeight', 'zIndex'].includes(key) ? `${value}px` : value}`)
    .join(';');
}

function renderLayer(layer) {
  const style = css({ position: 'absolute', display: 'flex', alignItems: 'center', overflow: 'hidden', ...layerBoxStyle(layer) });
  if (GRAPHIC_TYPES.has(layer.type)) {
    return `<div style="${style};background:${layer.fill};border-radius:${layer.type === 'line' ? 99 : layer.radius}px"></div>`;
  }
  const lineBg = layerLineBgStyle(layer);
  const text = layerDisplayText(layer);
  const inner = lineBg ? `<span style="${css(lineBg)}">${text}</span>` : text;
  return `<div style="${style}"><span style="width:100%">${inner}</span></div>`;
}

describe('prévia visual do motor de layouts', () => {
  it('escreve um HTML com as peças montadas', () => {
    const blocks = CASES.map(([label, content, mediaItem, brand, options]) => {
      const result = composeSmartPost({ content, brand, kit, media: mediaItem, ...options });
      const [w, h] = result.canvas;
      const layers = result.surface.layers.map(renderLayer).join('');
      const bg = result.surface.media
        ? `<img src="${result.surface.media.url}" style="position:absolute;left:${result.surface.bg.x}px;top:${result.surface.bg.y}px;width:${result.surface.bg.w}px;height:${result.surface.bg.h}px;object-fit:cover" />`
        : '';
      return `<figure><figcaption>${label} — ${result.plan.structure.label} / ${result.plan.style.label}${result.ok ? '' : ' ⚠'}</figcaption>
        <div class="canvas" style="width:${w}px;height:${h}px">${bg}${layers}</div>
        <ul>${result.mascot.map((line) => `<li>${line}</li>`).join('')}</ul></figure>`;
    }).join('');

    mkdirSync(fileURLToPath(new URL('./output/', import.meta.url)), { recursive: true });
    writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>Prévia do motor de layouts</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Baloo+2:wght@400;700&family=Caveat:wght@400;700&family=Cormorant+Garamond:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Lora:wght@400;700&family=Marcellus&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;700&display=swap" rel="stylesheet">
<style>body{background:#111;color:#eee;font:13px system-ui;padding:24px;display:flex;flex-wrap:wrap;gap:28px}
figure{margin:0;max-width:440px}figcaption{margin-bottom:8px;font-weight:600}
.canvas{position:relative;background:#202024;overflow:hidden;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
ul{padding-left:16px;color:#9aa;font-size:11px;margin-top:8px}</style>
${blocks}`, 'utf8');
  });
});
