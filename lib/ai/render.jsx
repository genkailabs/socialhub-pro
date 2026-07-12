import { resolvePalette } from '@/lib/ai/templates';

// Retorna um elemento React p/ o next/og rasterizar em PNG.
// Sem I/O — recebe a spec + paleta e devolve o nó do slide pedido.
export function renderNode({ template, spec = {}, palette, slideIndex = 0, size = 'square' }) {
  const p = resolvePalette(palette);
  const brand = (spec.brand || '').trim();
  const pad = 96;

  const root = (children, extra = {}) => ({
    type: 'div',
    props: {
      style: {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        padding: pad, background: `linear-gradient(135deg, ${p.bg}, ${p.surface})`,
        color: p.ink, fontFamily: 'sans-serif', position: 'relative', ...extra
      },
      children
    }
  });
  const div = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
  const accentBar = div({ width: 96, height: 10, background: p.accent, borderRadius: 8 });
  const footer = brand
    ? div({ position: 'absolute', left: pad, bottom: pad, alignItems: 'center', gap: 14, fontSize: 26, color: p.muted, fontWeight: 700 },
        [div({ width: 34, height: 34, borderRadius: 10, background: p.accent }), `@${brand}`])
    : null;

  if (template === 'stat') {
    return root([
      accentBar,
      div({ flex: 1, flexDirection: 'column', justifyContent: 'center' }, [
        div({ fontSize: 190, fontWeight: 800, color: p.accent, lineHeight: 1 }, spec.headline || '100%'),
        div({ fontSize: 40, color: p.ink, marginTop: 12, fontWeight: 700, maxWidth: 820 }, spec.subtext || spec.caption || '')
      ]),
      footer
    ]);
  }

  if (template === 'promo') {
    return root([
      div({ alignSelf: 'flex-start', background: p.accent, color: '#fff', fontSize: 28, fontWeight: 800, padding: '10px 22px', borderRadius: 999, letterSpacing: 2 }, 'OFERTA'),
      div({ flex: 1, flexDirection: 'column', justifyContent: 'center' }, [
        div({ fontSize: 82, fontWeight: 800, lineHeight: 1.05, maxWidth: 880 }, spec.headline || ''),
        div({ fontSize: 38, color: p.muted, marginTop: 22, maxWidth: 820 }, spec.subtext || '')
      ]),
      div({ alignSelf: 'flex-start', border: `3px solid ${p.accent}`, color: p.ink, fontSize: 32, fontWeight: 800, padding: '16px 32px', borderRadius: 16 }, 'Saiba mais'),
      footer
    ]);
  }

  if (template === 'tips_carousel') {
    if (slideIndex <= 0) {
      const tips = Array.isArray(spec.bullets) ? spec.bullets.length : 0;
      return root([
        accentBar,
        div({ flex: 1, flexDirection: 'column', justifyContent: 'center' }, [
          div({ fontSize: 76, fontWeight: 800, lineHeight: 1.08, maxWidth: 880 }, spec.headline || ''),
          div({ fontSize: 34, color: p.muted, marginTop: 24 }, tips ? `${tips} dicas — arraste para o lado` : 'Arraste para o lado')
        ]),
        footer
      ]);
    }
    const idx = slideIndex - 1;
    const tip = (spec.bullets || [])[idx] || '';
    return root([
      div({ alignItems: 'center', gap: 20 }, [
        div({ width: 78, height: 78, borderRadius: 20, background: p.accent, color: '#fff', fontSize: 40, fontWeight: 800, alignItems: 'center', justifyContent: 'center' }, String(slideIndex)),
        div({ fontSize: 30, color: p.muted, fontWeight: 700, letterSpacing: 1 }, 'DICA')
      ]),
      div({ flex: 1, flexDirection: 'column', justifyContent: 'center' }, [
        div({ fontSize: 60, fontWeight: 800, lineHeight: 1.15, maxWidth: 880 }, tip)
      ]),
      footer
    ]);
  }

  // quote (default)
  return root([
    accentBar,
    div({ flex: 1, flexDirection: 'column', justifyContent: 'center' }, [
      div({ fontSize: 40, color: p.accent, fontWeight: 800, marginBottom: 18 }, '“'),
      div({ fontSize: 72, fontWeight: 800, lineHeight: 1.12, maxWidth: 880 }, spec.headline || ''),
      div({ fontSize: 36, color: p.muted, marginTop: 24, maxWidth: 820 }, spec.subtext || '')
    ]),
    footer
  ]);
}

// Quantos slides o template gera (carrossel = capa + dicas).
export function slideCount(spec = {}) {
  if (spec.template === 'tips_carousel') {
    const tips = Array.isArray(spec.bullets) ? spec.bullets.length : 0;
    return Math.max(2, Math.min(10, tips + 1));
  }
  return 1;
}
