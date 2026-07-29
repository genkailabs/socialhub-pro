// Biblioteca de estruturas (PRD §4). Puro, sem I/O.
//
// A estrutura define APENAS a organização dos elementos — nunca cor, fonte ou
// tamanho. Por isso os slots vêm em coordenadas normalizadas (0..1) da área
// interna da peça: a mesma estrutura serve 1:1, 4:5 e 9:16 sem uma cópia por
// proporção, e o estilo (§6) entra depois sem mexer no posicionamento.
//
// `bleed: true` significa "ignora a margem e ocupa a peça inteira" — é o que a
// imagem de tela cheia e o véu precisam. Todo o resto vive dentro da margem de
// segurança, que é o que o §14 cobra.

export const STRUCTURES = [
  {
    id: 'imagem-titulo',
    label: 'Imagem com título sobreposto',
    description: 'Imagem em tela cheia, título sobre a imagem, subtítulo e logo.',
    category: 'visual',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'airy',
    contentTypes: ['noticia', 'inspiracao', 'promocao'],
    requires: { image: true },
    // Sobre foto o texto é sempre claro: o véu garante o contraste.
    inkOverImage: true,
    slots: [
      { component: 'imagem-principal', bleed: true, x: 0, y: 0, w: 1, h: 1 },
      { component: 'sobreposicao', bleed: true, x: 0, y: 0.42, w: 1, h: 0.58 },
      { component: 'selo-categoria', x: 0, y: 0, w: 0.42, h: 0.05 },
      { component: 'titulo', x: 0, y: 0.55, w: 1, h: 0.24 },
      { component: 'subtitulo', x: 0, y: 0.81, w: 0.92, h: 0.1 },
      { component: 'logo', x: 0, y: 0.94, w: 0.6, h: 0.05 }
    ]
  },
  {
    id: 'titulo-imagem-texto',
    label: 'Título, imagem e texto',
    description: 'Título no topo, imagem central, texto na parte inferior e rodapé.',
    category: 'informativo',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'normal',
    contentTypes: ['noticia', 'educativo', 'inspiracao'],
    requires: { image: true, subtext: true },
    slots: [
      { component: 'selo-categoria', x: 0, y: 0, w: 0.4, h: 0.05 },
      { component: 'titulo', x: 0, y: 0.07, w: 1, h: 0.2 },
      { component: 'imagem-principal', x: 0, y: 0.3, w: 1, h: 0.38 },
      { component: 'subtitulo', x: 0, y: 0.71, w: 1, h: 0.16 },
      { component: 'divisor', x: 0, y: 0.9, w: 0.22, h: 0.008 },
      { component: 'logo', x: 0, y: 0.94, w: 0.6, h: 0.05 }
    ]
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Título grande, texto curto, imagem e bloco de destaque com rodapé.',
    category: 'editorial',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'normal',
    contentTypes: ['educativo', 'autoridade', 'noticia'],
    requires: { image: true, subtext: true },
    slots: [
      { component: 'titulo', x: 0, y: 0, w: 1, h: 0.22 },
      { component: 'subtitulo', x: 0, y: 0.24, w: 0.88, h: 0.12 },
      { component: 'imagem-principal', x: 0, y: 0.39, w: 1, h: 0.34 },
      { component: 'box-informativo', x: 0, y: 0.76, w: 1, h: 0.12 },
      { component: 'logo', x: 0, y: 0.94, w: 0.55, h: 0.05 },
      { component: 'data', x: 0.62, y: 0.94, w: 0.38, h: 0.05 }
    ]
  },
  {
    id: 'conteudo-limpo',
    label: 'Conteúdo limpo',
    description: 'Fundo simples, título, texto, imagem pequena e CTA.',
    category: 'informativo',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'airy',
    contentTypes: ['educativo', 'autoridade', 'servico'],
    requires: {},
    slots: [
      { component: 'selo-categoria', x: 0, y: 0, w: 0.4, h: 0.05 },
      { component: 'titulo', x: 0, y: 0.09, w: 1, h: 0.24 },
      { component: 'subtitulo', x: 0, y: 0.36, w: 0.9, h: 0.16 },
      { component: 'imagem-principal', x: 0, y: 0.56, w: 0.46, h: 0.26 },
      { component: 'cta', x: 0, y: 0.87, w: 0.5, h: 0.06 },
      { component: 'logo', x: 0.58, y: 0.87, w: 0.42, h: 0.06 }
    ]
  },
  {
    id: 'manchete',
    label: 'Manchete',
    description: 'Selo, título grande e linha de apoio ancorada embaixo.',
    category: 'noticia',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'normal',
    contentTypes: ['noticia', 'autoridade'],
    // O único que não exige nada além do título: é o fallback honesto quando não
    // há imagem, item nem texto de apoio.
    requires: {},
    // Justamente por não ter mais nada, o título tem de carregar a peça sozinho.
    cover: true,
    slots: [
      { component: 'painel', bleed: true, x: 0, y: 0, w: 1, h: 1 },
      { component: 'selo-categoria', x: 0, y: 0.02, w: 0.44, h: 0.055 },
      { component: 'divisor', x: 0, y: 0.11, w: 0.3, h: 0.01 },
      { component: 'titulo', x: 0, y: 0.16, w: 1, h: 0.4 },
      { component: 'box-informativo', x: 0, y: 0.62, w: 1, h: 0.18 },
      { component: 'logo', x: 0, y: 0.93, w: 0.55, h: 0.05 },
      { component: 'data', x: 0.62, y: 0.93, w: 0.38, h: 0.05 }
    ]
  },
  {
    id: 'citacao',
    label: 'Citação',
    description: 'Painel de marca com uma frase forte e a assinatura.',
    category: 'engajamento',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'airy',
    contentTypes: ['inspiracao', 'autoridade'],
    requires: { fields: ['quote'] },
    slots: [
      { component: 'painel', x: 0, y: 0.06, w: 1, h: 0.7 },
      { component: 'citacao', x: 0.06, y: 0.14, w: 0.88, h: 0.44 },
      { component: 'subtitulo', x: 0.06, y: 0.6, w: 0.88, h: 0.1 },
      { component: 'logo', x: 0, y: 0.86, w: 0.6, h: 0.05 }
    ]
  },
  {
    id: 'estatistica',
    label: 'Estatística',
    description: 'Número grande em destaque com a leitura do dado.',
    category: 'autoridade',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'airy',
    contentTypes: ['dado', 'autoridade', 'noticia'],
    requires: { fields: ['stat'] },
    slots: [
      { component: 'selo-categoria', x: 0, y: 0, w: 0.42, h: 0.05 },
      { component: 'estatistica', x: 0, y: 0.12, w: 1, h: 0.3 },
      { component: 'estatistica-legenda', x: 0, y: 0.45, w: 0.92, h: 0.16 },
      { component: 'divisor', x: 0, y: 0.65, w: 0.26, h: 0.01 },
      { component: 'subtitulo', x: 0, y: 0.7, w: 0.92, h: 0.12 },
      { component: 'cta', x: 0, y: 0.88, w: 0.5, h: 0.06 },
      { component: 'logo', x: 0.58, y: 0.88, w: 0.42, h: 0.06 }
    ]
  },
  {
    id: 'lista',
    label: 'Lista',
    description: 'Título e itens numerados, com chamada no rodapé.',
    category: 'educativo',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'dense',
    contentTypes: ['educativo', 'servico'],
    requires: { minBullets: 3 },
    slots: [
      { component: 'selo-categoria', x: 0, y: 0, w: 0.42, h: 0.05 },
      { component: 'titulo', x: 0, y: 0.08, w: 1, h: 0.17 },
      { component: 'lista', index: 0, x: 0, y: 0.29, w: 1, h: 0.13 },
      { component: 'lista', index: 1, x: 0, y: 0.44, w: 1, h: 0.13 },
      { component: 'lista', index: 2, x: 0, y: 0.59, w: 1, h: 0.13 },
      { component: 'lista', index: 3, x: 0, y: 0.74, w: 1, h: 0.13, optional: true },
      { component: 'cta', x: 0, y: 0.9, w: 0.5, h: 0.06 },
      { component: 'logo', x: 0.58, y: 0.9, w: 0.42, h: 0.06 }
    ]
  },
  {
    id: 'comparativo',
    label: 'Comparativo',
    description: 'Dois lados lado a lado, para antes e depois.',
    category: 'educativo',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'normal',
    contentTypes: ['educativo', 'dado'],
    requires: { minBullets: 2, maxBullets: 2 },
    slots: [
      { component: 'titulo', x: 0, y: 0, w: 1, h: 0.2 },
      { component: 'comparacao', index: 0, x: 0, y: 0.26, w: 0.47, h: 0.42 },
      { component: 'comparacao', index: 1, x: 0.53, y: 0.26, w: 0.47, h: 0.42 },
      { component: 'destaque-palavra', x: 0.36, y: 0.72, w: 0.28, h: 0.08 },
      { component: 'logo', x: 0, y: 0.93, w: 0.6, h: 0.05 }
    ]
  },
  {
    id: 'pergunta',
    label: 'Pergunta',
    description: 'Pergunta grande para abrir conversa, com chamada de resposta.',
    category: 'engajamento',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'airy',
    contentTypes: ['engajamento', 'educativo'],
    requires: { fields: ['question'] },
    slots: [
      { component: 'selo-categoria', x: 0, y: 0, w: 0.44, h: 0.05 },
      { component: 'pergunta', x: 0, y: 0.16, w: 1, h: 0.36 },
      { component: 'subtitulo', x: 0, y: 0.56, w: 0.9, h: 0.12 },
      { component: 'cta', x: 0, y: 0.82, w: 0.56, h: 0.07 },
      { component: 'logo', x: 0, y: 0.93, w: 0.6, h: 0.05 }
    ]
  },
  {
    // Extraída das referências de carrossel em docs/referencias-layout (slides 2
    // e 10 de "morte-dos-reels"). Três coisas que o catálogo não tinha:
    //
    // 1. MOLDURA. Assinatura no topo E no rodapé, nas mesmas coordenadas em todo
    //    slide. É o que faz um carrossel parecer coleção em vez de peças soltas.
    // 2. TÍTULO DOMINANTE. Ocupa 26% da altura, com `cover` para partir grande.
    // 3. DESTAQUE ISOLADO. A palavra-chave sai do título e vira bloco próprio,
    //    em caixa de cor — o olho pousa nela antes de ler o resto.
    //
    // Nasce sem foto de propósito (§ decisão do produto: a peça é tipográfica e
    // o usuário troca o fundo depois). Por isso não há slot de imagem aqui: um
    // slot de mídia vazio deixaria buraco, já que os demais não se remanejam.
    id: 'texto-destaque',
    label: 'Texto com destaque',
    description: 'Moldura de marca, título grande, palavra em destaque e dois blocos de texto.',
    category: 'editorial',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'normal',
    contentTypes: ['educativo', 'autoridade', 'noticia'],
    // O destaque é o que difere esta estrutura da `manchete`: sem ele, a peça
    // vira uma manchete pior. Exigir o campo evita essa escolha ruim.
    requires: { fields: ['highlight'], subtext: true },
    uses: { subtext: true, special: true },
    cover: true,
    slots: [
      // Moldura de cima: assinatura à esquerda, data à direita.
      { component: 'rodape', x: 0, y: 0.02, w: 0.5, h: 0.04 },
      { component: 'data', x: 0.54, y: 0.02, w: 0.46, h: 0.04 },

      { component: 'titulo', x: 0, y: 0.13, w: 1, h: 0.26 },
      // À esquerda para alinhar com a coluna de texto; o padrão do componente é
      // centralizado porque nasceu para o "VS" do comparativo.
      { component: 'destaque-palavra', x: 0, y: 0.42, w: 0.62, h: 0.08, overrides: { align: 'left' } },
      { component: 'subtitulo', x: 0, y: 0.55, w: 0.94, h: 0.15 },
      { component: 'box-informativo', x: 0, y: 0.73, w: 1, h: 0.14 },

      // Moldura de baixo: marca à esquerda, posição no carrossel à direita.
      { component: 'logo', x: 0, y: 0.93, w: 0.6, h: 0.05 },
      { component: 'numero-slide', x: 0.68, y: 0.93, w: 0.32, h: 0.05 }
    ]
  },
  {
    id: 'capa-carrossel',
    label: 'Capa de carrossel',
    description: 'Capa com selo, título, contagem de slides e assinatura.',
    category: 'carrossel',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'normal',
    contentTypes: ['educativo', 'autoridade', 'noticia'],
    requires: {},
    inkOverImage: true,
    // A capa decide se alguém abre o carrossel: o título parte da escala maior.
    cover: true,
    slots: [
      { component: 'imagem-principal', bleed: true, x: 0, y: 0, w: 1, h: 1 },
      { component: 'sobreposicao', bleed: true, x: 0, y: 0, w: 1, h: 1 },
      { component: 'selo-categoria', x: 0, y: 0.02, w: 0.44, h: 0.055 },
      { component: 'titulo', x: 0, y: 0.28, w: 1, h: 0.32 },
      { component: 'subtitulo', x: 0, y: 0.63, w: 0.9, h: 0.12 },
      { component: 'logo', x: 0, y: 0.93, w: 0.55, h: 0.05 },
      { component: 'numero-slide', x: 0.7, y: 0.93, w: 0.3, h: 0.05 }
    ]
  },
  {
    id: 'aviso',
    label: 'Aviso',
    description: 'Box de alerta com o recado e a ação esperada.',
    category: 'servico',
    shapes: ['square', 'story'],
    slides: 1,
    density: 'normal',
    contentTypes: ['servico', 'promocao', 'noticia'],
    requires: { fields: ['warning'] },
    slots: [
      { component: 'selo-categoria', x: 0, y: 0, w: 0.44, h: 0.055 },
      { component: 'titulo', x: 0, y: 0.1, w: 1, h: 0.22 },
      { component: 'aviso', x: 0, y: 0.36, w: 1, h: 0.22 },
      { component: 'subtitulo', x: 0, y: 0.62, w: 0.92, h: 0.14 },
      { component: 'cta', x: 0, y: 0.85, w: 0.54, h: 0.07 },
      { component: 'logo', x: 0, y: 0.94, w: 0.6, h: 0.05 }
    ]
  }
];

// O que a estrutura realmente coloca na peça é derivado dos slots, não
// declarado à mão. Declarado, isso saía do lugar: `editorial` prometia CTA sem
// ter slot de CTA, e a validação (§14) reprovava toda peça montada com ela.
const USES_BY_COMPONENT = {
  'imagem-principal': 'image',
  lista: 'bullets',
  comparacao: 'bullets',
  subtitulo: 'subtext',
  'box-informativo': 'subtext',
  'estatistica-legenda': 'subtext',
  cta: 'cta',
  // Campos especiais: uma estrutura que desenha o aviso aproveita mais um
  // conteúdo de aviso do que uma que só tem título e apoio. Sem isso, no empate
  // vencia a estrutura genérica e o texto do aviso era descartado em silêncio.
  aviso: 'warning',
  citacao: 'quote',
  estatistica: 'stat',
  pergunta: 'question'
};

// Campos especiais do conteúdo, na mesma ordem em que valem ponto.
export const SPECIAL_USES = ['warning', 'quote', 'stat', 'question'];

for (const structure of STRUCTURES) {
  const uses = { image: false, bullets: false, subtext: false, cta: false };
  for (const key of SPECIAL_USES) uses[key] = false;
  for (const slot of structure.slots) {
    const key = USES_BY_COMPONENT[slot.component];
    if (key) uses[key] = true;
  }
  structure.uses = uses;
}

const BY_ID = new Map(STRUCTURES.map((structure) => [structure.id, structure]));

export function structureById(id) {
  return BY_ID.get(id) || null;
}

export function structureIds() {
  return STRUCTURES.map((structure) => structure.id);
}

// Sem imagem, item nem campo especial, "manchete" é a única que se sustenta com
// um título sozinho — por isso ela é o fallback.
export const FALLBACK_STRUCTURE_ID = 'manchete';

export function shapeOf({ width = 1080, height = 1080 } = {}) {
  return height > width ? 'story' : 'square';
}

/**
 * A estrutura só entra se o conteúdo atende ao que ela exige. Escolher
 * "comparativo" para um texto sem dois lados produz exatamente a peça genérica
 * que o §13 quer eliminar.
 */
export function structureFits(structure, content = {}, shape = 'square') {
  if (!structure) return false;
  const bullets = Array.isArray(content.bullets) ? content.bullets.filter(Boolean).length : 0;
  const req = structure.requires || {};

  if (structure.shapes && !structure.shapes.includes(shape)) return false;
  if (req.image && !content.hasImage) return false;
  if (req.subtext && !String(content.subtitle || '').trim()) return false;
  if (bullets < (req.minBullets || 0)) return false;
  if (Number.isInteger(req.maxBullets) && bullets > req.maxBullets) return false;
  for (const field of req.fields || []) {
    if (!String(content[field] || '').trim()) return false;
  }
  return true;
}

export function eligibleStructures(content = {}, shape = 'square') {
  return STRUCTURES.filter((structure) => structureFits(structure, content, shape));
}

// Quanto do conteúdo disponível a estrutura coloca na peça. Variar é bom (§13),
// mas nunca ao preço de jogar fora o que a IA escreveu.
export function contentUsage(structure, content = {}) {
  const uses = structure?.uses || {};
  const bullets = Array.isArray(content.bullets) ? content.bullets.filter(Boolean).length : 0;
  let points = 0;
  if (content.hasImage) points += uses.image ? 2 : 0;
  if (bullets) points += uses.bullets ? 2 : 0;
  if (String(content.subtitle || '').trim()) points += uses.subtext ? 1 : 0;
  if (String(content.cta || '').trim()) points += uses.cta ? 1 : 0;
  // Campo especial vale mais que apoio: é a informação que fez o conteúdo ser
  // daquele tipo, e uma peça que não a mostra perde o assunto.
  for (const key of SPECIAL_USES) {
    if (String(content[key] || '').trim() && uses[key]) points += 2;
  }
  return points;
}
