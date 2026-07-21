// As 6 composições da biblioteca de layouts (§15), desenhadas de verdade.
// Puro, sem I/O — devolve o nó que o next/og rasteriza.
//
// O que muda em relação ao gerador antigo: a imagem participa da composição
// (não é fundo chapado nem "título sobre foto"), o texto tem hierarquia
// explícita (§16) e a peça ocupa a área (§17) em vez de flutuar no centro.

import { typeScale, framePadding, densityFor } from '@/lib/ai/art/style';
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
  const pad = framePadding(dim);
  return {
    dim,
    scale,
    pad,
    density,
    mark: brandMark({ handle: content.brand, color: palette.muted, accent: palette.accent, size: Math.round(scale.body * 0.85) })
  };
}

function frame({ dim, palette, pad, children, background }) {
  return column({
    width: dim.width,
    height: dim.height,
    padding: pad,
    background: background || `linear-gradient(150deg, ${palette.gradient?.[0] || palette.bg}, ${palette.gradient?.[1] || palette.surface})`,
    color: palette.ink,
    fontFamily: 'sans-serif',
    position: 'relative',
    justifyContent: 'space-between'
  }, children);
}

// 1. HERO — imagem dominante, título sobreposto na base.
function hero({ content, palette, ctx }) {
  const { dim, scale, pad, mark } = ctx;
  return column({
    width: dim.width,
    height: dim.height,
    position: 'relative',
    fontFamily: 'sans-serif',
    background: palette.bg
  }, [
    content.imageUrl
      ? image(content.imageUrl, { position: 'absolute', inset: 0, width: dim.width, height: dim.height })
      : box({ position: 'absolute', inset: 0, background: `linear-gradient(150deg, ${palette.accent}, ${palette.bg})` }),
    scrim({ to: 'rgba(0,0,0,0.88)' }),
    column({
      position: 'absolute', left: pad, right: pad, bottom: pad, gap: Math.round(scale.body * 0.7)
    }, [
      content.eyebrow ? badge(content.eyebrow, { bg: palette.accent, color: palette.onAccent, size: scale.eyebrow }) : null,
      text(content.title, { fontSize: scale.title, fontWeight: 800, lineHeight: 1.04, color: '#FFFFFF' }),
      content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: 'rgba(255,255,255,0.82)', lineHeight: 1.25 }) : null,
      content.cta ? text(content.cta, { fontSize: scale.cta, fontWeight: 700, color: palette.onAccent, background: palette.accent, padding: `${Math.round(scale.cta * 0.5)}px ${scale.cta}px`, borderRadius: 14, alignSelf: 'flex-start' }) : null,
      mark
    ].filter(Boolean))
  ]);
}

// 2. EDITORIAL — bloco de texto ao lado da imagem.
function editorial({ content, palette, ctx }) {
  const { dim, scale, pad, mark } = ctx;
  const colunaImagem = Math.round(dim.width * 0.42);
  return frame({
    dim, palette, pad,
    children: [
      box({ flex: 1, gap: pad, alignItems: 'stretch' }, [
        column({ flex: 1, justifyContent: 'center', gap: Math.round(scale.body * 0.8) }, [
          accentRule({ color: palette.accent, width: Math.round(scale.title * 1.4), height: Math.round(scale.eyebrow * 0.34) }),
          content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: 700, letterSpacing: 2 }) : null,
          text(content.title, { fontSize: scale.title, fontWeight: 800, lineHeight: 1.06 }),
          content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: palette.muted, lineHeight: 1.3 }) : null
        ].filter(Boolean)),
        content.imageUrl
          ? box({ width: colunaImagem, borderRadius: 28, overflow: 'hidden' }, [image(content.imageUrl, { width: colunaImagem, height: '100%' })])
          : null
      ].filter(Boolean)),
      box({ alignItems: 'center', justifyContent: 'space-between' }, [
        mark,
        content.cta ? text(content.cta, { fontSize: scale.cta, fontWeight: 700, color: palette.accent }) : null
      ].filter(Boolean))
    ]
  });
}

// 3. MAGAZINE — título em cima, faixa de imagem, informações embaixo.
function magazine({ content, palette, ctx }) {
  const { dim, scale, pad, mark } = ctx;
  return frame({
    dim, palette, pad,
    children: [
      column({ gap: Math.round(scale.body * 0.5) }, [
        content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: 700, letterSpacing: 3 }) : null,
        text(content.title, { fontSize: scale.title, fontWeight: 800, lineHeight: 1.04 })
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
          content.cta ? badge(content.cta, { bg: palette.accent, color: palette.onAccent, size: scale.cta, radius: 14 }) : null
        ].filter(Boolean))
      ].filter(Boolean))
    ]
  });
}

// 4. COMPARATIVO — dois lados, com o "VS" no meio.
function comparativo({ content, palette, ctx }) {
  const { dim, scale, pad, mark } = ctx;
  const [antes = '', depois = ''] = content.bullets || [];
  const lado = (rotulo, valor, cor) => column({
    flex: 1, gap: Math.round(scale.body * 0.6), padding: Math.round(pad * 0.7),
    background: palette.surface, borderRadius: 26, justifyContent: 'center'
  }, [
    text(rotulo, { fontSize: scale.eyebrow, fontWeight: 800, letterSpacing: 2, color: cor }),
    text(valor, { fontSize: Math.round(scale.subtitle * 1.15), fontWeight: 700, lineHeight: 1.2, color: palette.ink })
  ]);

  return frame({
    dim, palette, pad,
    children: [
      column({ gap: Math.round(scale.body * 0.4) }, [
        text(content.title, { fontSize: Math.round(scale.title * 0.82), fontWeight: 800, lineHeight: 1.06 })
      ]),
      box({ flex: 1, alignItems: 'center', gap: Math.round(pad * 0.5), paddingTop: pad, paddingBottom: pad }, [
        lado('ANTES', antes, palette.muted),
        text('VS', { fontSize: scale.subtitle, fontWeight: 800, color: palette.onAccent, background: palette.accent, width: Math.round(scale.title * 1.1), height: Math.round(scale.title * 1.1), borderRadius: 999, alignItems: 'center', justifyContent: 'center' }),
        lado('DEPOIS', depois, palette.accent)
      ]),
      box({ alignItems: 'center', justifyContent: 'space-between' }, [
        mark,
        content.cta ? text(content.cta, { fontSize: scale.cta, fontWeight: 700, color: palette.accent }) : null
      ].filter(Boolean))
    ]
  });
}

// 5. CARDS — itens com índice, sem imagem.
function cards({ content, palette, ctx }) {
  const { dim, scale, pad, mark } = ctx;
  const itens = (content.bullets || []).slice(0, 5);
  return frame({
    dim, palette, pad,
    children: [
      column({ gap: Math.round(scale.body * 0.5) }, [
        accentRule({ color: palette.accent, width: Math.round(scale.title * 1.3), height: Math.round(scale.eyebrow * 0.34) }),
        text(content.title, { fontSize: Math.round(scale.title * 0.86), fontWeight: 800, lineHeight: 1.06 })
      ]),
      column({ flex: 1, justifyContent: 'center', gap: Math.round(scale.body * 0.6), paddingTop: Math.round(pad * 0.5) },
        itens.map((item, i) => box({
          alignItems: 'center', gap: Math.round(scale.body * 0.7),
          background: palette.surface, borderRadius: 20, padding: Math.round(scale.body * 0.7)
        }, [
          text(String(i + 1), {
            fontSize: scale.body, fontWeight: 800, color: palette.onAccent, background: palette.accent,
            width: Math.round(scale.body * 2), height: Math.round(scale.body * 2), borderRadius: 14,
            alignItems: 'center', justifyContent: 'center'
          }),
          text(item, { flex: 1, fontSize: Math.round(scale.body * 1.15), fontWeight: 600, color: palette.ink, lineHeight: 1.25 })
        ]))
      ),
      box({ alignItems: 'center', justifyContent: 'space-between' }, [
        mark,
        content.cta ? text(content.cta, { fontSize: scale.cta, fontWeight: 700, color: palette.accent }) : null
      ].filter(Boolean))
    ]
  });
}

// 6. MOCKUP — a imagem vira tela de celular.
function mockup({ content, palette, ctx }) {
  const { dim, scale, pad, mark } = ctx;
  const larguraFone = Math.round(dim.width * 0.34);
  return frame({
    dim, palette, pad,
    children: [
      column({ gap: Math.round(scale.body * 0.5) }, [
        content.eyebrow ? text(content.eyebrow, { fontSize: scale.eyebrow, color: palette.accent, fontWeight: 700, letterSpacing: 2 }) : null,
        text(content.title, { fontSize: Math.round(scale.title * 0.88), fontWeight: 800, lineHeight: 1.06, maxWidth: Math.round(dim.width * 0.62) })
      ].filter(Boolean)),
      box({ flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: pad }, [
        column({ flex: 1, gap: Math.round(scale.body * 0.6) }, [
          content.subtitle ? text(content.subtitle, { fontSize: scale.subtitle, color: palette.muted, lineHeight: 1.3 }) : null,
          content.cta ? badge(content.cta, { bg: palette.accent, color: palette.onAccent, size: scale.cta, radius: 14 }) : null
        ].filter(Boolean)),
        phoneMockup({ src: content.imageUrl, width: larguraFone, palette })
      ]),
      mark
    ].filter(Boolean)
  });
}

const RENDERERS = { hero, editorial, magazine, comparativo, cards, mockup };

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
  const id = layout?.id && RENDERERS[layout.id] ? layout.id : 'editorial';
  const ctx = baseContext({ content, palette, size });
  return RENDERERS[id]({ content, palette, ctx });
}

export function composableLayoutIds() {
  return Object.keys(RENDERERS);
}
