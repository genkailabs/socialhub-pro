import { describe, it } from 'vitest';
import { composeSmartPost, composeSmartCarousel } from '@/lib/layouts/index';
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
  ['Capa de carrossel', { title: 'O guia rapido do fechamento contabil', subtitle: 'Quatro passos para nao errar.', brand: 'genkailabs' }, media, { niche: 'tecnologia' }, { structureId: 'capa-carrossel' }],
  // A peça que motivou a Etapa A, com o conteúdo real que a expôs: itens já
  // marcados com bullet (o "1. •" duplicado) e estilo tecnologia (mono no
  // corpo). Fica como amostra fixa — é o antes/depois que se olha.
  ['Lista tech com item ja marcado', {
    title: 'Meta transforma sua IA em um verdadeiro assistente pessoal',
    subtitle: 'Meta transforma assistente em parceiro de rotina.',
    eyebrow: 'Dica',
    bullets: ['• Organiza compromissos', '• Faz pesquisas mais profundas', '• Cria resumos inteligentes', '• Ajuda na produtividade'],
    cta: 'Compartilhe com quem precisa saber disso!',
    brand: 'genkailabs'
  }, null, { niche: 'tecnologia' }, { structureId: 'lista' }],
  // Capa curta: é onde a escala de capa aparece. Título longo encolhe sozinho —
  // o que se confere aqui é o curto ocupando o quadro.
  ['Capa com titulo curto', { title: 'A conta que ninguem faz', subtitle: 'E o quanto ela custa no fim do ano.', brand: 'genkailabs' }, null, { niche: 'contabilidade' }, { structureId: 'capa-carrossel' }],
  // Estrutura extraída das referências: moldura em cima e embaixo, título
  // dominante, palavra destacada e dois blocos de texto.
  ['Texto com destaque', {
    title: 'Pra viralizar tem que postar muitos Reels',
    highlight: 'Mito',
    subtitle: 'Voce ja deve ter ouvido isso antes. O problema e que hoje essa nao e a melhor forma de construir audiencia.',
    info: '95% do nosso publico nao veio de Reels. A maioria fica refem do formato porque nao entende o carrossel.',
    footer: 'Feito com SocialHub',
    date: 'Julho 2026',
    slideNumber: '2/10',
    brand: 'genkailabs'
  }, null, { niche: 'marketing digital' }, { structureId: 'texto-destaque' }],

  // Templates de alto impacto (PRD 02 §5). Quase todos pedem foto: é o ponto
  // deles. Renderizados com a mesma foto para comparar composição, não imagem.
  ['Hero editorial', { title: 'A cidade que decidiu andar a pe', subtitle: 'O que muda quando o carro deixa de ser o centro.', eyebrow: 'Editorial', brand: 'genkailabs' }, media, { niche: 'arquitetura' }, { structureId: 'hero-editorial' }],
  ['Manchete com pessoa', { title: 'Ela recusou a promocao e explica por que', highlight: 'Escolha', brand: 'genkailabs' }, media, { niche: 'carreira' }, { structureId: 'manchete-pessoa' }],
  ['Capa de autoridade', { title: 'Dra. Helena Ribeiro', subtitle: 'Nutricionista clinica · 12 anos de consultorio', brand: 'clinica' }, media, { niche: 'clinica' }, { structureId: 'capa-autoridade' }],
  ['Notícia premium', { title: 'Nova regra do simples nacional entra em vigor', subtitle: 'A mudanca vale a partir do proximo mes.', eyebrow: 'Notícia', date: '28 jul', brand: 'genkailabs' }, media, { niche: 'contabilidade' }, { structureId: 'noticia-premium' }],
  ['Trend alert', { title: 'O feed mudou e ninguem avisou', highlight: 'Agora', eyebrow: 'Alerta', brand: 'genkailabs' }, media, { niche: 'marketing digital' }, { structureId: 'trend-alert' }],
  ['Anúncio publicitário', { title: 'Combo de inverno na padaria', highlight: '30% OFF', cta: 'Peca pelo WhatsApp', brand: 'padaria' }, media, { niche: 'restaurante' }, { structureId: 'anuncio-foto' }],
  ['Retrato corporativo', { title: 'Marcos Alves', quote: 'A gente parou de vender hora e comecou a vender resultado', subtitle: 'Socio-fundador', brand: 'consultoria' }, media, { niche: 'advocacia' }, { structureId: 'retrato-corporativo' }],
  ['Editorial minimalista', { title: 'Menos, porem melhor', subtitle: 'O que sobra quando se tira tudo que nao era necessario.', brand: 'estudio' }, media, { niche: 'design' }, { structureId: 'editorial-minimalista' }],

  // ---------------------------------------------------------------------
  // Cenários obrigatórios da correção do motor (§10). Todos em 4:5, que é o
  // formato do feed hoje e o que estava recebendo regra de Story.

  // Cenário 1 — Divulgar notícia · Notícia · 4:5. O que se confere: manchete
  // dominante, palavra destacada, crédito visível e nenhum campo de lista.
  ['C1 · Notícia 4:5 com fonte', {
    title: 'Nova regra do split payment entra em vigor em janeiro',
    subtitle: 'A retencao passa a ser feita direto na maquininha.',
    highlight: 'janeiro',
    source: 'Agência Brasil',
    date: '29 jul 2026',
    eyebrow: 'Notícia',
    brand: 'genkailabs'
  }, media, { niche: 'contabilidade' }, { ratio: '4:5', structureId: 'noticia-premium' }],
  ['C1b · Notícia 4:5 sem foto', {
    title: 'Governo antecipa o calendario do imposto de renda',
    subtitle: 'O prazo de entrega encurta em duas semanas.',
    source: 'Receita Federal',
    date: '29 jul 2026',
    eyebrow: 'Notícia',
    brand: 'genkailabs'
  }, null, { niche: 'contabilidade' }, { ratio: '4:5' }],

  // Cenário 3 — Autoridade · Dado ou estudo · 4:5. Número dominante, contexto
  // legível, fonte e hierarquia.
  ['C3 · Dado 4:5', {
    title: '68% das empresas ainda calculam o imposto a mao',
    subtitle: 'Levantamento com 1.200 empresas de pequeno porte.',
    source: 'Sebrae 2026',
    cta: 'Ver o estudo',
    eyebrow: 'Números',
    brand: 'genkailabs'
  }, null, { niche: 'contabilidade' }, { ratio: '4:5', structureId: 'estatistica' }],

  // Estruturas novas (§6), fora do carrossel: é onde se vê o cartão por item.
  ['Lista visual', {
    title: 'Quatro erros que travam o seu fechamento',
    bullets: ['Nota lancada fora do mes', 'Extrato conciliado a mao', 'Pro-labore sem registro', 'Estoque sem contagem'],
    eyebrow: 'Dica',
    brand: 'genkailabs'
  }, null, { niche: 'contabilidade' }, { ratio: '4:5', structureId: 'lista-visual' }],
  ['Lista com foto', {
    title: 'Dois ajustes que mudam o seu mes',
    bullets: ['Concilie o extrato toda sexta', 'Separe pessoa fisica de juridica'],
    eyebrow: 'Dica',
    brand: 'genkailabs'
  }, media, { niche: 'contabilidade' }, { ratio: '4:5', structureId: 'lista-foto' }],
  ['Slide de prova', {
    title: 'O antes e o depois no relatorio',
    subtitle: 'A mesma empresa, tres meses depois do ajuste no processo.',
    eyebrow: 'Na prática',
    slideNumber: '5/7',
    brand: 'genkailabs'
  }, media, { niche: 'contabilidade' }, { ratio: '4:5', structureId: 'slide-prova' }],
  ['Slide de conclusão', {
    title: 'O erro nao esta na conta, esta no processo',
    highlight: 'processo',
    subtitle: 'Arrumar a rotina resolve o que a planilha nunca resolveu.',
    eyebrow: 'Resumindo',
    slideNumber: '6/7',
    brand: 'genkailabs'
  }, null, { niche: 'contabilidade' }, { ratio: '4:5', structureId: 'slide-conclusao' }],
  ['Slide de chamada', {
    title: 'Quer o diagnostico do seu fechamento',
    cta: 'Chame no direct',
    eyebrow: 'Agora',
    slideNumber: '7/7',
    brand: 'genkailabs'
  }, null, { niche: 'contabilidade' }, { ratio: '4:5', structureId: 'slide-cta' }]
];

// Cenário 2 — Educar · Tutorial · Carrossel 4:5. O que se confere aqui não é um
// slide: é a SEQUÊNCIA. Slides iguais do primeiro ao último eram o defeito.
const CARROSSEL = {
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
};

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

function renderPiece(label, result) {
  const [w, h] = result.canvas;
  const layers = result.surface.layers.map(renderLayer).join('');
  const bg = result.surface.media
    ? `<img src="${result.surface.media.url}" style="position:absolute;left:${result.surface.bg.x}px;top:${result.surface.bg.y}px;width:${result.surface.bg.w}px;height:${result.surface.bg.h}px;object-fit:cover" />`
    : '';
  return `<figure><figcaption>${label} — ${result.plan.structure.label} / ${result.plan.style.label} · ${result.ratio}${result.ok ? '' : ' ⚠'}</figcaption>
    <div class="canvas" style="width:${w}px;height:${h}px">${bg}${layers}</div></figure>`;
}

describe('prévia visual do motor de layouts', () => {
  it('escreve um HTML com as peças montadas', () => {
    const blocks = CASES.map(([label, content, mediaItem, brand, options]) => {
      const result = composeSmartPost({ content, brand, kit, media: mediaItem, ...options });
      return `<figure><figcaption>${label} — ${result.plan.structure.label} / ${result.plan.style.label} · ${result.ratio}${result.ok ? '' : ' ⚠'}</figcaption>
        <div class="canvas" style="width:${result.canvas[0]}px;height:${result.canvas[1]}px">${result.surface.media
        ? `<img src="${result.surface.media.url}" style="position:absolute;left:${result.surface.bg.x}px;top:${result.surface.bg.y}px;width:${result.surface.bg.w}px;height:${result.surface.bg.h}px;object-fit:cover" />`
        : ''}${result.surface.layers.map(renderLayer).join('')}</div>
        <ul>${result.mascot.map((line) => `<li>${line}</li>`).join('')}</ul></figure>`;
    }).join('');

    // A sequência do carrossel entra numa faixa própria, na ordem em que a
    // pessoa vai deslizar: é assim que se vê se há ritmo ou repetição.
    const carrossel = composeSmartCarousel({
      content: CARROSSEL, brand: { niche: 'contabilidade', name: 'Genkai' }, kit, ratio: '4:5', media
    });
    const trilha = `<section class="trilha">
      <h2>Cenário 2 · Tutorial em carrossel 4:5 — ${carrossel.slides.length} slides</h2>
      <ul>${carrossel.mascot.map((line) => `<li>${line}</li>`).join('')}</ul>
      <div class="fila">${carrossel.slides.map((slide, index) => renderPiece(`Slide ${index + 1}`, slide)).join('')}</div>
    </section>`;

    mkdirSync(fileURLToPath(new URL('./output/', import.meta.url)), { recursive: true });
    writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>Prévia do motor de layouts</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Baloo+2:wght@400;700&family=Caveat:wght@400;700&family=Cormorant+Garamond:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Lora:wght@400;700&family=Marcellus&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;700&display=swap" rel="stylesheet">
<style>body{background:#111;color:#eee;font:13px system-ui;padding:24px}
.grade{display:flex;flex-wrap:wrap;gap:28px}
figure{margin:0;max-width:440px}figcaption{margin-bottom:8px;font-weight:600}
.canvas{position:relative;background:#202024;overflow:hidden;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
ul{padding-left:16px;color:#9aa;font-size:11px;margin-top:8px}
.trilha{margin:32px 0;padding:20px;border:1px solid #333;border-radius:10px}
.trilha h2{font-size:15px;margin:0 0 6px}
.fila{display:flex;gap:16px;overflow-x:auto;padding-bottom:12px}
.fila figure{flex:0 0 auto}</style>
${trilha}
<div class="grade">${blocks}</div>`, 'utf8');
  });
});
