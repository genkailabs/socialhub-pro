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
    density: 'airy'
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Imagem lateral com blocos de texto.',
    imageRole: 'side',
    requires: { image: true, minBullets: 0, subtext: true },
    density: 'normal'
  },
  {
    id: 'magazine',
    label: 'Magazine',
    description: 'Título, imagem, subtítulo e informações.',
    imageRole: 'band',
    requires: { image: true, minBullets: 0, subtext: true },
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
    density: 'normal'
  },
  {
    id: 'cards',
    label: 'Cards',
    description: 'Blocos com ícone e texto curto.',
    imageRole: 'none',
    requires: { image: false, minBullets: 3 },
    density: 'dense'
  },
  {
    id: 'mockup',
    label: 'Mockup',
    description: 'Interface em tela de celular ou notebook.',
    imageRole: 'mockup',
    requires: { image: true, minBullets: 0 },
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

// Um layout só entra se o conteúdo atende ao que ele exige. Escolher um layout
// de comparação para um texto sem dois lados produziria exatamente a peça
// "genérica" que o §13 quer eliminar.
export function layoutFits(layout, content = {}) {
  if (!layout) return false;
  const bullets = Array.isArray(content.bullets) ? content.bullets.filter(Boolean).length : 0;
  const temImagem = Boolean(content.hasImage);
  const req = layout.requires || {};

  if (req.image && !temImagem) return false;
  if (req.subtext && !String(content.subtext || '').trim()) return false;
  if (bullets < (req.minBullets || 0)) return false;
  if (Number.isInteger(req.maxBullets) && bullets > req.maxBullets) return false;
  return true;
}

export function eligibleLayouts(content = {}) {
  return LAYOUTS.filter((layout) => layoutFits(layout, content));
}

// Fallback honesto: se nada se encaixa, usa o layout que não exige nada além
// de um título. Melhor uma peça simples e correta do que um layout quebrado.
export const FALLBACK_LAYOUT_ID = 'hero';

function fallbackLayout(content) {
  // Sem imagem, "hero" não se sustenta; "cards" precisa de bullets. Então o
  // último recurso é editorial sem imagem, tratado pelo render como texto forte.
  return layoutById(content?.hasImage ? FALLBACK_LAYOUT_ID : 'editorial') || LAYOUTS[0];
}

// §15: nunca usar o mesmo layout repetidamente. `recentLayouts` são os últimos
// layouts usados pela marca, do mais recente para o mais antigo.
export function selectLayout({ content = {}, recentLayouts = [], seed = 0 } = {}) {
  const candidatos = eligibleLayouts(content);
  if (!candidatos.length) return fallbackLayout(content);

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
