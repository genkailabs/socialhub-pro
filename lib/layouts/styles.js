// Estilos visuais (PRD §6). Puro, sem I/O.
//
// O estilo é a única camada que decide APARÊNCIA. A estrutura (§4) só organiza e
// o componente (§5) só descreve o papel — sem isso, trocar de estilo obrigaria a
// redesenhar cada estrutura, que é exatamente o custo que o PRD quer eliminar.
//
// O que cada estilo controla, na ordem do §6: tipografia, contraste, bordas,
// sombras, espaçamentos, intensidade visual, uso de imagem e forma de destacar
// palavras.

// `structures` não importa daqui (é catálogo puro de coordenadas), então esta
// dependência é de mão única e não fecha ciclo.
import { shapeOf, isTallShape } from '@/lib/layouts/structures';

// Escala tipográfica base, em fração do lado MENOR da peça. A mesma escala serve
// feed (1:1) e story (9:16) — é a regra que já vale na arte rasterizada
// (lib/ai/art/style.js) e mantém as duas superfícies coerentes.
const BASE_TYPE_RATIOS = {
  eyebrow: 0.030,
  title: 0.095,
  subtitle: 0.042,
  body: 0.034,
  cta: 0.032,
  meta: 0.028,
  number: 0.180
};

// Piso em pixels de canvas. O canvas de edição é pequeno (430px no feed): sem
// piso, `meta` cairia para 9px e o usuário editaria às cegas.
const TYPE_FLOOR = { eyebrow: 9, title: 20, subtitle: 12, body: 10, cta: 10, meta: 9, number: 34 };

// Ponto de partida do título nas estruturas de capa, onde o título É o conteúdo.
//
// `fitTextSize` só ENCOLHE: parte do tamanho pedido e reduz até caber. Com o
// tamanho de título comum, um título curto ficava pequeno no meio de um slot
// grande — a peça saía morna mesmo com a composição certa. Exagerar aqui é
// seguro justamente porque o encolhimento é automático: título longo volta ao
// tamanho que cabe, título curto ocupa o quadro.
const COVER_TITLE_BOOST = 1.7;

// `imageMode`:
//   'full'    — foto ocupa a peça inteira (precisa de véu para o texto sobreviver);
//   'framed'  — foto dentro de um bloco com raio;
//   'accent'  — foto pequena, apoio;
//   'avoid'   — o estilo prefere cor sólida a foto.
// `highlight`: como o componente `destaque-palavra` se comporta.
export const VISUAL_STYLES = [
  {
    id: 'editorial',
    label: 'Editorial',
    fonts: { title: 'Playfair Display', body: 'Lora', accent: 'Playfair Display' },
    typeScale: { title: 1.06, subtitle: 1.04 },
    contrast: 'alto',
    radius: 4,
    shadow: false,
    spacing: 1.15,
    intensity: 'media',
    imageMode: 'framed',
    highlight: 'underline',
    uppercaseEyebrow: false,
    letterSpacing: { eyebrow: 2, title: 0 },
    titleWeight: 700,
    keywords: ['editorial', 'revista', 'artigo', 'ensaio', 'moda', 'arquitetura', 'interiores', 'design']
  },
  {
    id: 'jornalistico',
    label: 'Jornalístico',
    fonts: { title: 'Archivo Black', body: 'Montserrat', accent: 'Montserrat' },
    typeScale: { title: 1.12, subtitle: 0.96 },
    contrast: 'maximo',
    radius: 0,
    shadow: false,
    spacing: 0.9,
    intensity: 'alta',
    imageMode: 'full',
    highlight: 'box',
    uppercaseEyebrow: true,
    letterSpacing: { eyebrow: 2, title: -0.5 },
    titleWeight: 400,
    keywords: ['noticia', 'notícia', 'jornal', 'urgente', 'manchete', 'imprensa', 'politica', 'política', 'economia']
  },
  {
    id: 'tecnologia',
    label: 'Tecnologia',
    // Monoespaçada saiu do corpo: alarga o texto corrido e derruba a leitura no
    // feed. O sinal "tech" continua vindo do raio 18, da sombra e do destaque em
    // cor. JetBrains Mono segue na biblioteca para o usuário aplicar à mão.
    fonts: { title: 'Poppins', body: 'Montserrat', accent: 'Poppins' },
    typeScale: { title: 1.0, subtitle: 0.96 },
    contrast: 'alto',
    radius: 18,
    shadow: true,
    spacing: 1.0,
    intensity: 'alta',
    imageMode: 'framed',
    highlight: 'color',
    uppercaseEyebrow: true,
    letterSpacing: { eyebrow: 2, title: -0.5 },
    titleWeight: 700,
    keywords: ['tecnologia', 'tech', 'software', 'app', 'startup', 'saas', 'ti', 'digital', 'ia', 'dados', 'marketing digital']
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    fonts: { title: 'Montserrat', body: 'Montserrat', accent: 'Montserrat' },
    typeScale: { title: 0.94, subtitle: 0.94 },
    contrast: 'medio',
    radius: 10,
    shadow: false,
    spacing: 1.35,
    intensity: 'baixa',
    imageMode: 'accent',
    highlight: 'none',
    uppercaseEyebrow: true,
    letterSpacing: { eyebrow: 3, title: -0.3 },
    titleWeight: 700,
    keywords: ['minimalista', 'clean', 'simples', 'essencial', 'zen', 'bem-estar']
  },
  {
    id: 'corporativo',
    label: 'Corporativo',
    fonts: { title: 'Poppins', body: 'Poppins', accent: 'Poppins' },
    typeScale: { title: 0.98, subtitle: 1.0 },
    contrast: 'alto',
    radius: 12,
    shadow: false,
    spacing: 1.05,
    intensity: 'media',
    imageMode: 'framed',
    highlight: 'box',
    uppercaseEyebrow: true,
    letterSpacing: { eyebrow: 2, title: 0 },
    titleWeight: 700,
    keywords: ['corporativo', 'empresa', 'b2b', 'consultoria', 'contabil', 'contábil', 'contabilidade', 'financeiro', 'seguros', 'rh']
  },
  {
    id: 'premium',
    label: 'Premium',
    fonts: { title: 'Cormorant Garamond', body: 'Marcellus', accent: 'Marcellus' },
    typeScale: { title: 1.14, subtitle: 1.0 },
    contrast: 'alto',
    radius: 2,
    shadow: true,
    spacing: 1.25,
    intensity: 'media',
    imageMode: 'full',
    highlight: 'underline',
    uppercaseEyebrow: true,
    letterSpacing: { eyebrow: 4, title: 0.5 },
    titleWeight: 700,
    keywords: ['premium', 'luxo', 'advocacia', 'advogado', 'juridico', 'jurídico', 'direito', 'joalheria', 'alto padrao', 'alto padrão', 'imobiliaria', 'imobiliária']
  },
  {
    id: 'acolhedor',
    label: 'Acolhedor',
    fonts: { title: 'Baloo 2', body: 'Poppins', accent: 'Caveat' },
    typeScale: { title: 1.0, subtitle: 1.02 },
    contrast: 'medio',
    radius: 24,
    shadow: true,
    spacing: 1.2,
    intensity: 'media',
    imageMode: 'framed',
    highlight: 'box',
    uppercaseEyebrow: false,
    letterSpacing: { eyebrow: 1, title: 0 },
    titleWeight: 700,
    keywords: ['saude', 'saúde', 'clinica', 'clínica', 'psicologia', 'infantil', 'pet', 'cafe', 'café', 'padaria', 'terapia', 'nutricao', 'nutrição', 'odonto', 'dentista']
  },
  {
    id: 'comercial',
    label: 'Comercial',
    fonts: { title: 'Anton', body: 'Montserrat', accent: 'Montserrat' },
    typeScale: { title: 1.1, subtitle: 0.94 },
    contrast: 'maximo',
    radius: 8,
    shadow: true,
    spacing: 0.85,
    intensity: 'alta',
    imageMode: 'full',
    highlight: 'box',
    uppercaseEyebrow: true,
    letterSpacing: { eyebrow: 1.5, title: 0 },
    titleWeight: 400,
    keywords: ['promocao', 'promoção', 'oferta', 'desconto', 'venda', 'loja', 'varejo', 'ecommerce', 'e-commerce', 'delivery', 'restaurante', 'black friday']
  }
];

const BY_ID = new Map(VISUAL_STYLES.map((style) => [style.id, style]));

export function styleById(id) {
  return BY_ID.get(id) || null;
}

export function styleIds() {
  return VISUAL_STYLES.map((style) => style.id);
}

export const FALLBACK_STYLE_ID = 'minimalista';

/**
 * Escala tipográfica em pixels do canvas de edição.
 *
 * `density` vem do volume de texto (peça cheia aperta, peça curta respira) e
 * `stretch` compensa a peça alta: proporcional só ao lado menor, o Story sairia
 * com o título de um Post no meio de um quadro quase duas vezes maior.
 */
export function styleTypeScale(style, { width = 430, height = 430, density = 'normal' } = {}) {
  const base = Math.min(width, height);
  const ratio = Math.max(width, height) / base;
  const stretch = 1 + Math.min(0.4, (ratio - 1) * 0.45);
  const densityFactor = density === 'dense' ? 0.84 : density === 'airy' ? 1.08 : 1;
  const scale = {};
  for (const role of Object.keys(BASE_TYPE_RATIOS)) {
    const styleFactor = style?.typeScale?.[role] ?? 1;
    const value = base * BASE_TYPE_RATIOS[role] * styleFactor * densityFactor * stretch;
    scale[role] = Math.max(TYPE_FLOOR[role], Math.round(value));
  }
  // Derivado do título, não do ratio base, para herdar o peso tipográfico que
  // cada estilo já declara (`typeScale.title`) sem repetir a tabela.
  scale.cover = Math.round(scale.title * COVER_TITLE_BOOST);
  return scale;
}

// §17 da arte e §14 daqui: margem proporcional. `spacing` do estilo é o que faz
// um minimalista respirar e um comercial apertar.
export function styleInsets(style, { width = 430, height = 430 } = {}) {
  const base = Math.min(width, height);
  const x = Math.round(base * 0.062 * (style?.spacing ?? 1));
  // Story/Reel têm interface do Instagram por cima (perfil no topo, barra de
  // resposta embaixo): texto colado na borda fica atrás do app.
  //
  // O 4:5 e o 3:4 NÃO têm — são peças de feed, e o app não desenha nada por
  // cima. Enquanto `height > width` decidia isso, o 4:5 perdia 7,5% de altura
  // nas duas pontas por um motivo que não existe nele, e o título encolhia para
  // caber numa área menor que a real. É o "4:5 recebendo regras de Story".
  const vertical = isTallShape(shapeOf({ width, height })) ? Math.round(height * 0.075) : x;
  return { x, top: vertical, bottom: vertical };
}

export function styleShadow(style) {
  if (!style?.shadow) return null;
  return { shOn: true, shX: 0, shY: 2, shB: 8, shColor: 'rgba(0,0,0,0.45)' };
}

export function densityForText(text = '') {
  const chars = String(text || '').length;
  if (chars > 220) return 'dense';
  if (chars < 70) return 'airy';
  return 'normal';
}

const COMBINING_MARKS = new RegExp('[\u0300-\u036f]', 'g');

export function deaccent(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase();
}

// Casamento estilo↔nicho/tom. Sem correspondência devolve `null` — chutar um
// estilo é pior que cair no neutro, que quem decide é o seletor (§12).
export function styleForKeywords(text = '') {
  const words = new Set(deaccent(text).split(/[^a-z0-9]+/).filter(Boolean));
  if (!words.size) return null;
  const phrase = [...words].join(' ');
  return VISUAL_STYLES.find((style) => style.keywords.some((keyword) => {
    const clean = deaccent(keyword);
    // Palavra inteira, nunca pedaço: "ia" casava dentro de "advocacia" e jogava
    // um escritório de advocacia no estilo de tecnologia.
    return clean.includes(' ') ? phrase.includes(clean) : words.has(clean);
  })) || null;
}
