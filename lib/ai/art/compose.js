// As composições da biblioteca de layouts (§15), desenhadas de verdade.
// Puro, sem I/O — devolve o nó que o next/og rasteriza.
//
// O que muda em relação ao gerador antigo: a imagem participa da composição
// (não é fundo chapado nem "título sobre foto"), o texto tem hierarquia
// explícita (§16) e a peça ocupa a área (§17) em vez de flutuar no centro.
//
// Duas regras vieram da inspeção visual dos PNGs (nenhuma aparecia em teste):
//   1. Peso tipográfico só existe se a fonte tiver o peso (art/fonts.js). Aqui
//      só usamos os pesos de FONT_WEIGHT — valor fora deles o satori aproxima
//      em silêncio.
//   2. Bloco com `flex: 1` e conteúdo centralizado vira deserto em peça alta.
//      Quem ocupa o quadro é massa de cor e escala, não espaçador.

import { typeScale, frameInsets, densityFor, fitTitleSize, MIN_TITLE_RATIO, ART_FONT_FAMILY, FONT_WEIGHT } from '@/lib/ai/art/style';
import { resolveSize } from '@/lib/ai/art/palette';
import {
  box, column, text, image, scrim, badge, accentRule, brandMark, phoneMockup
} from '@/lib/ai/art/primitives';

// Contexto comum a todos os layouts: evita cada composição recalcular escala,
// margem e assinatura.
function baseContext({ content, palette, size }) {
  const dim = resolveSize(size);
  const density = densityFor([content.title, content.subtitle, ...(content.bullets || [])].join(' '));
  const scale = typeScale({ width: dim.width, height: dim.height, density });
  const insets = frameInsets(dim);
  return {
    dim,
    scale,
    insets,
    pad: insets.x,
    density,
    mark: brandMark({ handle: content.brand, color: palette.muted, accent: palette.accent, size: Math.round(scale.body * 0.85) })
  };
}

function frame({ dim, palette, insets, children, background }) {
  return column({
    width: dim.width,
    height: dim.height,
    padding: `${insets.top}px ${insets.x}px ${insets.bottom}px`,
    background: background || `linear-gradient(150deg, ${palette.gradient?.[0] || palette.bg}, ${palette.gradient?.[1] || palette.surface})`,
    color: palette.ink,
    fontFamily: ART_FONT_FAMILY,
    position: 'relative',
    justifyContent: 'space-between'
  }, children);
}

// Tamanho do título já ajustado à caixa onde ele vai morar. Cada layout sabe a
// própria largura útil — o mesmo título ocupa metade do quadro no editorial (que
// divide espaço com a imagem) e o quadro inteiro na declaração.
function tituloSize({ ctx, content, boxWidth, fator = 1 }) {
  return fitTitleSize({
    title: content.title,
    size: Math.round(ctx.scale.title * fator),
    boxWidth,
    // O piso é o limite da hierarquia (§16), não o do subtítulo: amarrá-lo ao
    // subtítulo (que também cresce no Story) travava a redução justo onde ela
    // era mais necessária.
    floor: Math.round(ctx.scale.body * MIN_TITLE_RATIO)
  });
}

// Pílula de ação. Sobre cor sólida ela inverte: fundo claro e texto na cor do
// painel, senão o CTA some dentro do próprio bloco.
function ctaPill(rotulo, { palette, size, invertido = false }) {
  if (!rotulo) return null;
  return badge(rotulo, {
    bg: invertido ? palette.onAccent : palette.accent,
    color: invertido ? palette.accent : palette.onAccent,
    size,
    radius: 16
  });
}

// 1. HERO — imagem dominante, título sobreposto na base.
function hero({ content, palette, ctx }) {
  const { dim, scale, insets, mark } = ctx;
  return column({
    width: dim.width,
    height: dim.height,
    position: 'relative',
    fontFamily: ART_FONT_FAMILY,
    background: palette.bg
  }, [
    content.imageUrl
      ? image(content.imageUrl, { position: 'absolute', top: 0, left: 0, width: dim.width, height: dim.height })
      : box({ position: 'absolute', top: 0, left: 0, width: dim.width, height: dim.height, background: `linear-gradient(150deg, ${palette.accent}, ${palette.bg})` }),
    scrim({ to: 'rgba(0,0,0,0.88)' }),
    column({
      position: 'absolute', left: insets.x, right: insets.x, bottom: insets.bottom, gap: Math.round(scale.body * 0.7)
    }, [
      content.eyebrow ? badge(content.eyebrow, { bg: palette.accent, color: palette.onAccent, size: scale.eyebrow }) : null,
      text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: dim.width - insets.x * 2 }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.04, color: '#FFFFFF' }),
      content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: 'rgba(255,255,255,0.82)', lineHeight: 1.25 }) : null,
      content.cta ? ctaPill(content.cta, { palette, size: scale.cta }) : null,
      mark
    ].filter(Boolean))
  ]);
}

// 2. EDITORIAL — bloco de texto ao lado da imagem.
function editorial({ content, palette, ctx }) {
  const { dim, scale, insets, pad, mark } = ctx;
  const colunaImagem = Math.round(dim.width * 0.42);
  return frame({
    dim, palette, insets,
    children: [
      box({ flex: 1, gap: pad, alignItems: 'stretch' }, [
        column({ flex: 1, justifyContent: 'center', gap: Math.round(scale.body * 0.8) }, [
          accentRule({ color: palette.accent, width: Math.round(scale.title * 1.4), height: Math.round(scale.eyebrow * 0.34) }),
          content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: FONT_WEIGHT.medium, letterSpacing: 2 }) : null,
          text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: dim.width - insets.x * 2 - pad - colunaImagem }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.06 }),
          content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: palette.muted, lineHeight: 1.3 }) : null
        ].filter(Boolean)),
        content.imageUrl
          ? box({ width: colunaImagem, borderRadius: 28, overflow: 'hidden' }, [image(content.imageUrl, { width: colunaImagem, height: '100%' })])
          : null
      ].filter(Boolean)),
      box({ alignItems: 'center', justifyContent: 'space-between' }, [
        mark,
        content.cta ? text(content.cta, { fontSize: scale.cta, fontWeight: FONT_WEIGHT.medium, color: palette.accent }) : null
      ].filter(Boolean))
    ]
  });
}

// 3. MAGAZINE — título em cima, faixa de imagem, informações embaixo.
function magazine({ content, palette, ctx }) {
  const { dim, scale, insets, mark } = ctx;
  return frame({
    dim, palette, insets,
    children: [
      column({ gap: Math.round(scale.body * 0.5) }, [
        content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: FONT_WEIGHT.medium, letterSpacing: 3 }) : null,
        text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: dim.width - insets.x * 2 }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.04 })
      ].filter(Boolean)),
      content.imageUrl
        ? box({ height: Math.round(dim.height * 0.36), borderRadius: 26, overflow: 'hidden' }, [
            image(content.imageUrl, { width: '100%', height: '100%' })
          ])
        : box({ height: Math.round(dim.height * 0.3), borderRadius: 26, background: `linear-gradient(120deg, ${palette.accent}, ${palette.surface})` }),
      column({ gap: Math.round(scale.body * 0.6) }, [
        content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: palette.muted, lineHeight: 1.3 }) : null,
        box({ alignItems: 'center', justifyContent: 'space-between' }, [
          mark,
          ctaPill(content.cta, { palette, size: scale.cta })
        ].filter(Boolean))
      ].filter(Boolean))
    ]
  });
}

// 4. COMPARATIVO — dois lados, com o "VS" no meio.
function comparativo({ content, palette, ctx }) {
  const { dim, scale, insets, pad, mark } = ctx;
  const [antes = '', depois = ''] = content.bullets || [];
  const lado = (rotulo, valor, cor) => column({
    flex: 1, gap: Math.round(scale.body * 0.6), padding: Math.round(pad * 0.7),
    background: palette.surface, borderRadius: 26, justifyContent: 'center'
  }, [
    text(rotulo, { fontSize: scale.eyebrow, fontWeight: FONT_WEIGHT.bold, letterSpacing: 2, color: cor }),
    text(valor, { fontSize: Math.round(scale.subtitle * 1.15), fontWeight: FONT_WEIGHT.medium, lineHeight: 1.2, color: palette.ink })
  ]);

  return frame({
    dim, palette, insets,
    children: [
      column({ gap: Math.round(scale.body * 0.4) }, [
        text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: dim.width - insets.x * 2, fator: 0.82 }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.06 })
      ]),
      box({ flex: 1, alignItems: 'stretch', gap: Math.round(pad * 0.5), paddingTop: pad, paddingBottom: pad }, [
        lado('ANTES', antes, palette.muted),
        column({ justifyContent: 'center' }, [
          text('VS', { fontSize: scale.subtitle, fontWeight: FONT_WEIGHT.bold, color: palette.onAccent, background: palette.accent, width: Math.round(scale.title * 1.1), height: Math.round(scale.title * 1.1), borderRadius: 999, alignItems: 'center', justifyContent: 'center' })
        ]),
        lado('DEPOIS', depois, palette.accent)
      ]),
      box({ alignItems: 'center', justifyContent: 'space-between' }, [
        mark,
        content.cta ? text(content.cta, { fontSize: scale.cta, fontWeight: FONT_WEIGHT.medium, color: palette.accent }) : null
      ].filter(Boolean))
    ]
  });
}

// 5. CARDS — título, texto de apoio e itens numerados.
//
// Os itens crescem para dividir a área entre eles: com `justifyContent: center`
// a lista ficava espremida no meio, com duas faixas vazias em volta.
function cards({ content, palette, ctx }) {
  const { dim, scale, insets, mark } = ctx;
  const itens = (content.bullets || []).slice(0, 5);
  const respiro = Math.round(scale.body * 0.55);

  return frame({
    dim, palette, insets,
    children: [
      column({ gap: respiro }, [
        accentRule({ color: palette.accent, width: Math.round(scale.title * 1.3), height: Math.round(scale.eyebrow * 0.34) }),
        content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: FONT_WEIGHT.medium, letterSpacing: 2 }) : null,
        text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: dim.width - insets.x * 2, fator: 0.86 }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.06 }),
        // O apoio some se não couber, mas nunca é descartado em silêncio: sem
        // ele o layout perdia a frase que explica o título.
        content.subtitle ? text(content.subtitle, { fontSize: Math.round(scale.subtitle * 0.9), color: palette.muted, lineHeight: 1.3 }) : null
      ].filter(Boolean)),
      column({ flex: 1, gap: respiro, paddingTop: respiro, paddingBottom: respiro },
        itens.map((item, i) => box({
          flex: 1,
          alignItems: 'center', gap: Math.round(scale.body * 0.7),
          background: palette.surface, borderRadius: 22, padding: Math.round(scale.body * 0.7)
        }, [
          text(String(i + 1), {
            fontSize: scale.body, fontWeight: FONT_WEIGHT.bold, color: palette.onAccent, background: palette.accent,
            width: Math.round(scale.body * 2), height: Math.round(scale.body * 2), borderRadius: 14,
            alignItems: 'center', justifyContent: 'center'
          }),
          text(item, { flex: 1, fontSize: Math.round(scale.body * 1.15), fontWeight: FONT_WEIGHT.medium, color: palette.ink, lineHeight: 1.25 })
        ]))
      ),
      box({ alignItems: 'center', justifyContent: 'space-between' }, [
        mark,
        content.cta ? text(content.cta, { fontSize: scale.cta, fontWeight: FONT_WEIGHT.medium, color: palette.accent }) : null
      ].filter(Boolean))
    ]
  });
}

// 6. MOCKUP — a imagem vira tela de celular.
function mockup({ content, palette, ctx }) {
  const { dim, scale, insets, pad, mark } = ctx;
  const larguraFone = Math.round(dim.width * 0.34);
  return frame({
    dim, palette, insets,
    children: [
      column({ gap: Math.round(scale.body * 0.5) }, [
        content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: FONT_WEIGHT.medium, letterSpacing: 2 }) : null,
        text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: Math.round(dim.width * 0.62), fator: 0.88 }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.06, maxWidth: Math.round(dim.width * 0.62) })
      ].filter(Boolean)),
      box({ flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: pad }, [
        column({ flex: 1, gap: Math.round(scale.body * 0.6) }, [
          content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: palette.muted, lineHeight: 1.3 }) : null,
          ctaPill(content.cta, { palette, size: scale.cta })
        ].filter(Boolean)),
        phoneMockup({ src: content.imageUrl, width: larguraFone, palette })
      ]),
      mark
    ].filter(Boolean)
  });
}

// 7. DECLARACAO — painel na cor da marca ocupando o miolo.
//
// É o layout do texto sozinho, e existe por causa da inspeção visual: sem
// imagem e sem itens, a peça caía num título centralizado com metade do quadro
// vazia. Aqui a cor da marca é que preenche — e de quebra a identidade aparece
// em massa, não só num filete de acento.
function declaracao({ content, palette, ctx }) {
  const { dim, scale, insets, pad, mark } = ctx;
  const interno = Math.round(pad * 0.95);

  return frame({
    dim, palette, insets,
    children: [
      column({ gap: Math.round(scale.body * 0.5) }, [
        accentRule({ color: palette.accent, width: Math.round(scale.title * 1.1), height: Math.round(scale.eyebrow * 0.36) }),
        content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: FONT_WEIGHT.medium, letterSpacing: 2 }) : null
      ].filter(Boolean)),
      // O painel tem a altura do próprio texto, com margem interna generosa, e
      // o `space-between` do quadro divide o que sobra em dois respiros iguais.
      //
      // Foram três tentativas até aqui, todas visíveis nos PNGs: esticar o
      // painel com o texto no rodapé deixava meia tela de cor vazia em cima;
      // esticar com o texto no meio deixava vazio dentro E fora. Uma frase de
      // 40 caracteres não preenche 1920px — insistir só muda o vazio de lugar.
      // Distribuído em cima e embaixo, ele lê como respiro.
      column({
        marginTop: Math.round(pad * 0.7),
        marginBottom: Math.round(pad * 0.7),
        padding: `${Math.round(interno * 1.35)}px ${interno}px`,
        borderRadius: Math.round(pad * 0.6),
        background: palette.accent,
        color: palette.onAccent,
        justifyContent: 'center',
        gap: Math.round(scale.body * 0.8)
      }, [
        text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: dim.width - insets.x * 2 - interno * 2 }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.05, color: palette.onAccent }),
        content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, lineHeight: 1.3, color: palette.onAccent, opacity: 0.85 }) : null,
        content.cta ? ctaPill(content.cta, { palette, size: scale.cta, invertido: true }) : null
      ].filter(Boolean)),
      mark
    ].filter(Boolean)
  });
}

// 8. MANCHETE — título grande em cima, bloco de apoio ancorado embaixo.
//
// A alternativa clara ao painel de cor: usada quando há texto de apoio, para a
// sequência não virar quatro telas iguais (§15).
function manchete({ content, palette, ctx }) {
  const { dim, scale, insets, pad, mark } = ctx;

  return frame({
    dim, palette, insets,
    children: [
      column({ gap: Math.round(scale.body * 0.6) }, [
        accentRule({ color: palette.accent, width: Math.round(scale.title * 1.6), height: Math.round(scale.eyebrow * 0.42) }),
        content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: FONT_WEIGHT.medium, letterSpacing: 2 }) : null,
        text(content.title, { fontSize: tituloSize({ ctx, content, boxWidth: dim.width - insets.x * 2, fator: 1.08 }), fontWeight: FONT_WEIGHT.bold, lineHeight: 1.02 })
      ].filter(Boolean)),
      column({
        // O bloco de apoio ancora a composição embaixo: sem ele, o espaço
        // abaixo do título voltava a ser deserto. Altura do próprio texto, pelo
        // mesmo motivo do painel da declaração — esticá-lo só empurrava o vazio
        // para dentro do bloco.
        marginTop: Math.round(pad * 0.7),
        padding: `${Math.round(pad * 1.1)}px ${Math.round(pad * 0.85)}px`,
        borderRadius: Math.round(pad * 0.5),
        background: palette.surface,
        borderLeft: `${Math.max(6, Math.round(scale.eyebrow * 0.32))}px solid ${palette.accent}`,
        gap: Math.round(scale.body * 0.7)
      }, [
        content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: palette.ink, lineHeight: 1.32 }) : null,
        content.cta ? ctaPill(content.cta, { palette, size: scale.cta }) : null
      ].filter(Boolean)),
      mark
    ].filter(Boolean)
  });
}

const RENDERERS = { hero, editorial, magazine, comparativo, cards, mockup, declaracao, manchete };

/**
 * Monta a arte.
 *
 * @param {object} params
 * @param {object} params.layout   Layout escolhido (de selectLayout).
 * @param {object} params.content  { title, subtitle, eyebrow, bullets, cta, brand, imageUrl }
 * @param {object} params.palette  Saída de resolveArtPalette.
 * @param {string} params.size     'square' | 'story'
 */
export function composeArt({ layout, content = {}, palette, size = 'square' }) {
  const id = layout?.id && RENDERERS[layout.id] ? layout.id : 'declaracao';
  const ctx = baseContext({ content, palette, size });
  return RENDERERS[id]({ content, palette, ctx });
}

export function composableLayoutIds() {
  return Object.keys(RENDERERS);
}
