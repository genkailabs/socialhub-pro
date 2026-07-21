// Primitivos de composição da arte. Puro, sem I/O.
//
// O renderizador é o next/og (satori), que aceita elementos React ou objetos
// no formato { type, props }. Usamos os objetos para manter estes módulos em
// .js e testáveis sem JSX.
//
// Regra do satori que vale lembrar: qualquer div com mais de um filho precisa
// de display explícito. Por isso `box` sempre declara display.

export function box(style = {}, children = null) {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}

export function column(style = {}, children = null) {
  return box({ flexDirection: 'column', ...style }, children);
}

export function text(content, style = {}) {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children: String(content ?? '') } };
}

export function image(src, style = {}) {
  if (!src) return null;
  return { type: 'img', props: { src, style: { objectFit: 'cover', ...style } } };
}

// Véu sobre a foto: sem ele, texto branco sobre imagem clara some. É o que
// permite os layouts de foto dominante manterem contraste sem escurecer a
// imagem inteira.
//
// Atenção: o satori não entende o atalho `inset`. Com ele, o véu virava uma
// caixa de tamanho zero e a foto ficava sem escurecer nenhum — o texto branco
// sobre o claro da imagem, exatamente o que o véu existe para impedir. Só
// aparece no PNG. Daí os quatro lados escritos um a um.
export function scrim({ from = 'rgba(0,0,0,0.15)', to = 'rgba(0,0,0,0.86)', direction = 'to bottom' } = {}, style = {}) {
  return box({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `linear-gradient(${direction}, ${from}, ${to})`,
    ...style
  });
}

// Pílula de destaque (categoria, preço, "antes/depois").
export function badge(label, { bg, color, size = 28, radius = 999 } = {}) {
  return text(label, {
    alignSelf: 'flex-start',
    background: bg,
    color,
    fontSize: size,
    fontWeight: 700,
    letterSpacing: 1,
    padding: `${Math.round(size * 0.42)}px ${Math.round(size * 0.85)}px`,
    borderRadius: radius
  });
}

// Barra fina de acento — âncora visual barata que evita a "peça flutuando".
export function accentRule({ color, width = 96, height = 10 } = {}) {
  return box({ width, height, background: color, borderRadius: height / 2 });
}

// Assinatura da marca no rodapé.
export function brandMark({ handle, color, accent, size = 26 } = {}) {
  if (!handle) return null;
  return box({ alignItems: 'center', gap: Math.round(size * 0.5) }, [
    box({ width: size * 1.3, height: size * 1.3, borderRadius: size * 0.4, background: accent }),
    text(`@${handle}`, { fontSize: size, color, fontWeight: 700 })
  ]);
}

// Moldura de celular para os layouts de mockup (§13: screenshots/mockups
// quando fizer sentido). Desenhada com divs — nada de asset externo.
export function phoneMockup({ src, width, palette }) {
  const height = Math.round(width * 2);
  const raio = Math.round(width * 0.12);
  return box({
    width,
    height,
    borderRadius: raio,
    background: '#0B0B0D',
    padding: Math.round(width * 0.035),
    boxShadow: '0 40px 80px rgba(0,0,0,0.45)'
  }, [
    box({
      width: '100%',
      height: '100%',
      borderRadius: raio * 0.82,
      overflow: 'hidden',
      background: palette.surface
    }, [
      src
        ? image(src, { width: '100%', height: '100%' })
        : box({ width: '100%', height: '100%', background: `linear-gradient(160deg, ${palette.accent}, ${palette.bg})` })
    ])
  ]);
}

// Quebra o texto em linhas aproximadas para decidir se cabe. Não é medição
// tipográfica real (satori mede na hora), mas evita título absurdo passar.
export function estimateLines(content, { fontSize, boxWidth }) {
  const chars = String(content || '').length;
  if (!chars || !fontSize || !boxWidth) return 0;
  // ~0.52em por caractere é uma média boa para sans-serif em caixa mista.
  const porLinha = Math.max(1, Math.floor(boxWidth / (fontSize * 0.52)));
  return Math.ceil(chars / porLinha);
}
