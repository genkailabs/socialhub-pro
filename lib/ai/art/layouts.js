// Biblioteca de layouts (§15) e a regra de variação automática.
// Puro, sem I/O.
//
// O problema que isto resolve: o gerador antigo tinha um punhado de templates
// que sempre produziam a mesma composição (título no meio, muito vazio em
// volta). Aqui o layout é escolhido pelo que o conteúdo TEM, e nunca repete o
// layout usado no post anterior da marca.

export const LAYOUTS = [
  {
    id: 'hero',
    label: 'Hero',
    description: 'Imagem dominante com título sobreposto.',
    imageRole: 'dominant',
    // Precisa de imagem: sem ela vira só um título grande num fundo.
    requires: { image: true, minBullets: 0 },
    // Proporções em que a composição se sustenta. Nem toda composição sobrevive
    // ao 9:16 — ver o comentário de `editorial`.
    shapes: ['square', 'story'],
    // O que a composição realmente coloca na peça. Layout que ignora metade do
    // conteúdo desperdiça o que a IA escreveu (§17).
    uses: { image: true, bullets: false, subtext: true },
    density: 'airy'
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Imagem lateral com blocos de texto.',
    imageRole: 'side',
    requires: { image: true, minBullets: 0, subtext: true },
    // Só no quadrado. Num Story, a coluna lateral deixa o texto com 40% da
    // largura: o título quebra em seis linhas de uma palavra e a foto vira uma
    // tira. Foi assim no PNG antes desta regra existir.
    shapes: ['square'],
    uses: { image: true, bullets: false, subtext: true },
    density: 'normal'
  },
  {
    id: 'magazine',
    label: 'Magazine',
    description: 'Título, imagem, subtítulo e informações.',
    imageRole: 'band',
    requires: { image: true, minBullets: 0, subtext: true },
    shapes: ['square', 'story'],
    uses: { image: true, bullets: false, subtext: true },
    density: 'normal'
  },
  {
    id: 'comparativo',
    label: 'Comparativo',
    description: 'Antes e depois, lado a lado.',
    imageRole: 'split',
    // Comparar exige exatamente dois lados: com um só não há comparação, com
    // seis vira lista.
    requires: { image: false, minBullets: 2, maxBullets: 2 },
    shapes: ['square', 'story'],
    uses: { image: false, bullets: true, subtext: false },
    density: 'normal'
  },
  {
    id: 'declaracao',
    label: 'Declaracao',
    description: 'Painel de cor da marca com uma frase forte.',
    imageRole: 'none',
    // O único layout que não exige nada além de um título — por isso é o
    // fallback. Nem toda peça tem imagem, e a produção do Planejamento nunca
    // tem: sem ele, esse caminho todo caía num texto solto no meio do quadro.
    requires: { image: false, minBullets: 0 },
    shapes: ['square', 'story'],
    uses: { image: false, bullets: false, subtext: true },
    density: 'airy'
  },
  {
    id: 'manchete',
    label: 'Manchete',
    description: 'Titulo grande em cima, bloco de apoio ancorado embaixo.',
    imageRole: 'none',
    // Só entra quando há texto de apoio: sem o bloco de baixo, a peça volta a
    // ser um título flutuando num quadro vazio.
    requires: { image: false, minBullets: 0, subtext: true },
    shapes: ['square', 'story'],
    uses: { image: false, bullets: false, subtext: true },
    density: 'normal'
  },
  {
    id: 'cards',
    label: 'Cards',
    description: 'Blocos com ícone e texto curto.',
    imageRole: 'none',
    requires: { image: false, minBullets: 3 },
    shapes: ['square', 'story'],
    uses: { image: false, bullets: true, subtext: true },
    density: 'dense'
  },
  {
    id: 'mockup',
    label: 'Mockup',
    description: 'Interface em tela de celular ou notebook.',
    imageRole: 'mockup',
    requires: { image: true, minBullets: 0 },
    shapes: ['square'],
    uses: { image: true, bullets: false, subtext: true },
    density: 'normal'
  }
];

const BY_ID = new Map(LAYOUTS.map((l) => [l.id, l]));

export function layoutById(id) {
  return BY_ID.get(id) || null;
}

export function layoutIds() {
  return LAYOUTS.map((l) => l.id);
}

// Proporção da peça, do jeito que o layout entende: larga/quadrada ou alta.
export function shapeOf({ width = 1080, height = 1080 } = {}) {
  return height > width ? 'story' : 'square';
}

// Um layout só entra se o conteúdo atende ao que ele exige. Escolher um layout
// de comparação para um texto sem dois lados produziria exatamente a peça
// "genérica" que o §13 quer eliminar.
export function layoutFits(layout, content = {}, shape = 'square') {
  if (!layout) return false;
  const bullets = Array.isArray(content.bullets) ? content.bullets.filter(Boolean).length : 0;
  const temImagem = Boolean(content.hasImage);
  const req = layout.requires || {};

  if (layout.shapes && !layout.shapes.includes(shape)) return false;
  if (req.image && !temImagem) return false;
  if (req.subtext && !String(content.subtext || '').trim()) return false;
  if (bullets < (req.minBullets || 0)) return false;
  if (Number.isInteger(req.maxBullets) && bullets > req.maxBullets) return false;
  return true;
}

export function eligibleLayouts(content = {}, shape = 'square') {
  return LAYOUTS.filter((layout) => layoutFits(layout, content, shape));
}

// Fallback honesto: se nada se encaixa, usa o layout que não exige nada além
// de um título. Melhor uma peça simples e correta do que um layout quebrado.
export const FALLBACK_LAYOUT_ID = 'hero';

function fallbackLayout(content) {
  // Sem imagem, "hero" não se sustenta e "cards" precisa de bullets: sobra
  // "declaracao", que foi feito exatamente para título sozinho.
  return layoutById(content?.hasImage ? FALLBACK_LAYOUT_ID : 'declaracao') || LAYOUTS[0];
}

// Quanto do conteúdo disponível o layout coloca na peça.
//
// Existe porque a inspeção visual pegou um Post com três dicas escritas pela IA
// saindo como uma frase só: o layout escolhido simplesmente não desenhava
// bullets. Variar layout é bom (§15), mas nunca ao preço de jogar conteúdo fora.
export function contentUsage(layout, content = {}) {
  const uses = layout?.uses || {};
  const bullets = Array.isArray(content.bullets) ? content.bullets.filter(Boolean).length : 0;
  let pontos = 0;
  if (content.hasImage) pontos += uses.image ? 2 : 0;
  if (bullets) pontos += uses.bullets ? 2 : 0;
  if (String(content.subtext || '').trim()) pontos += uses.subtext ? 1 : 0;
  return pontos;
}

// §15: nunca usar o mesmo layout repetidamente. `recentLayouts` são os últimos
// layouts usados pela marca, do mais recente para o mais antigo.
export function selectLayout({ content = {}, recentLayouts = [], seed = 0, shape = 'square' } = {}) {
  const elegiveis = eligibleLayouts(content, shape);
  if (!elegiveis.length) return fallbackLayout(content);

  // Primeiro filtro: quem aproveita mais do conteúdo. A variação decide depois,
  // entre os que empatam — assim ela nunca custa uma informação da peça.
  const melhor = Math.max(...elegiveis.map((l) => contentUsage(l, content)));
  const candidatos = elegiveis.filter((l) => contentUsage(l, content) === melhor);

  const recentes = (recentLayouts || []).filter(Boolean);
  // Prioriza o que não foi usado recentemente; empate desempata pelo mais
  // antigo. Assim a marca não recebe dois "cards" seguidos.
  const naoUsados = candidatos.filter((l) => !recentes.includes(l.id));
  const pool = naoUsados.length ? naoUsados : candidatos.filter((l) => l.id !== recentes[0]);
  const finais = pool.length ? pool : candidatos;

  // Seed torna a escolha determinística (testável) sem ser sempre a mesma.
  const indice = Math.abs(Math.trunc(seed)) % finais.length;
  return finais[indice];
}
