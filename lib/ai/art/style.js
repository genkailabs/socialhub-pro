// Estilo visual da arte: nicho (§14), tipografia (§16) e aproveitamento de
// espaço (§17). Puro, sem I/O — dá para testar cada regra isoladamente.
//
// A régua: a arte tem que parecer feita por designer, não "gerada por IA".
// Na prática isso vira decisões concretas — título grande de verdade, contraste
// alto, pouca área vazia e um estilo que conversa com o setor da marca.

// §14: cada nicho tem um repertório visual próprio. O objetivo não é "tema
// bonito", é coerência: advocacia escura e sóbria, saúde clara e limpa.
export const NICHE_STYLES = {
  tecnologia: {
    id: 'tecnologia',
    mood: 'moderno, escuro, com brilho',
    surfaceMode: 'dark',
    gradient: ['#0B1020', '#141C3A'],
    accentFallback: '#6366F1',
    graphics: ['glow', 'grid', 'mockup'],
    keywords: ['tecnologia', 'tech', 'software', 'app', 'startup', 'saas', 'ti', 'digital', 'marketing digital']
  },
  saude: {
    id: 'saude',
    mood: 'claro, limpo, confiável',
    surfaceMode: 'light',
    gradient: ['#FFFFFF', '#EAF4FF'],
    accentFallback: '#0EA5E9',
    graphics: ['soft-shapes', 'icon'],
    keywords: ['saude', 'saúde', 'clinica', 'clínica', 'medico', 'médico', 'odonto', 'dentista', 'psicologia', 'nutricao', 'nutrição', 'fisioterapia']
  },
  advocacia: {
    id: 'advocacia',
    mood: 'sóbrio, premium, escuro com dourado',
    surfaceMode: 'dark',
    gradient: ['#0E0E10', '#1C1A16'],
    accentFallback: '#C8A24A',
    graphics: ['rule', 'serif-accent'],
    keywords: ['advocacia', 'advogado', 'juridico', 'jurídico', 'direito', 'contabil', 'contábil', 'contabilidade']
  },
  imobiliaria: {
    id: 'imobiliaria',
    mood: 'foto grande, informação objetiva',
    surfaceMode: 'photo',
    gradient: ['#101418', '#1E2429'],
    accentFallback: '#0F9D58',
    graphics: ['photo-dominant', 'info-bar'],
    keywords: ['imobiliaria', 'imobiliária', 'imovel', 'imóvel', 'corretor', 'aluguel', 'construtora']
  },
  restaurante: {
    id: 'restaurante',
    mood: 'foto do prato, preço em destaque',
    surfaceMode: 'photo',
    gradient: ['#1A0F0C', '#2B1712'],
    accentFallback: '#E4572E',
    graphics: ['photo-dominant', 'price-badge'],
    keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'food', 'gastronomia', 'cafe', 'café', 'padaria', 'delivery', 'bar']
  },
  geral: {
    id: 'geral',
    mood: 'editorial, contemporâneo',
    surfaceMode: 'light',
    gradient: ['#F7F6F3', '#ECEAE4'],
    accentFallback: '#4F46E5',
    graphics: ['shape', 'icon'],
    keywords: []
  }
};

const NICHE_LIST = Object.values(NICHE_STYLES);

// Casa o nicho por palavra-chave. Sem correspondência, "geral" — nunca um
// palpite: estilo errado é pior que estilo neutro.
export function styleForNiche(niche = '') {
  const texto = String(niche || '').toLowerCase();
  if (!texto.trim()) return NICHE_STYLES.geral;
  const achado = NICHE_LIST.find((estilo) =>
    estilo.keywords.some((palavra) => texto.includes(palavra))
  );
  return achado || NICHE_STYLES.geral;
}

// A família tipográfica da arte. É a mesma da interface (DESIGN.md): peça e
// produto falando a mesma língua. Quem carrega os arquivos é art/fonts.js — aqui
// fica só o nome, para os módulos de composição continuarem sem I/O.
export const ART_FONT_FAMILY = 'Outfit';

// Pesos que existem de verdade em assets/fonts. Usar um valor fora desta lista
// faz o satori aproximar em silêncio, e a hierarquia sai diferente do previsto.
export const FONT_WEIGHT = { regular: 400, medium: 600, bold: 800 };

// §16: hierarquia é o que separa peça de designer de "texto no meio da tela".
// Os tamanhos são proporcionais ao lado menor da arte, então a mesma escala
// serve para feed (1080x1080) e story (1080x1920).
//
// §17: nada de "texto pequeno". O piso existe para impedir que um título longo
// encolha até virar legenda.
export const TYPE_ROLES = ['eyebrow', 'title', 'subtitle', 'body', 'cta'];

const TYPE_RATIOS = {
  eyebrow: 0.028,
  title: 0.095,
  subtitle: 0.042,
  body: 0.032,
  cta: 0.030
};

const TYPE_MIN = { eyebrow: 22, title: 54, subtitle: 30, body: 24, cta: 24 };

// Peça mais alta que larga tem mais área para o mesmo texto. Proporcional ao
// lado menor sozinho, o Story sairia com o título de um Post no meio de um
// quadro quase duas vezes maior — o "texto pequeno perdido no vazio" que a
// inspeção visual reprovou. Este esticão é o que faz o Story ocupar o quadro
// sem precisar de escala própria.
export function shapeStretch({ width = 1080, height = 1080 } = {}) {
  const menor = Math.min(width, height);
  const razao = Math.max(width, height) / menor;
  return 1 + Math.min(0.4, (razao - 1) * 0.45);
}

export function typeScale({ width = 1080, height = 1080, density = 'normal' } = {}) {
  const base = Math.min(width, height);
  // Muito texto reduz o título, mas nunca abaixo do piso: se não couber, quem
  // tem de encurtar é o texto, não a hierarquia.
  const fator = density === 'dense' ? 0.82 : density === 'airy' ? 1.08 : 1;
  const esticao = shapeStretch({ width, height });
  const escala = {};
  for (const role of TYPE_ROLES) {
    escala[role] = Math.max(TYPE_MIN[role], Math.round(base * TYPE_RATIOS[role] * fator * esticao));
  }
  return escala;
}

// Quantas linhas um título pode ocupar antes de deixar de ser título. Veio da
// inspeção visual: no Story, o título esticado quebrava em seis linhas de uma
// ou duas palavras — legível, mas com cara de cartaz, não de arte.
export const MAX_TITLE_LINES = 4;

// Largura média de um caractere na Outfit ExtraBold, em fração do tamanho da
// fonte. É estimativa: quem mede de verdade é o satori, na hora. Serve para
// escolher o tamanho ANTES de desenhar.
const BOLD_CHAR_WIDTH = 0.58;

// Palavra não parte no meio: a última de cada linha quase sempre não cabe e
// desce inteira, então a linha real leva menos texto do que a conta por
// caractere promete. Sem este desconto a estimativa erra sempre para menos —
// foi o que deixou um título de 43 caracteres ocupar cinco linhas no Story.
const PACKING = 0.82;

/**
 * Maior tamanho em que o título ainda cabe em MAX_TITLE_LINES.
 *
 * Sem isto, a escala é cega ao texto: título curto e título longo saem no mesmo
 * corpo, e o longo estoura o quadro. O piso preserva a hierarquia — se nem no
 * menor tamanho couber, quem tem de encurtar é o texto (§16).
 */
export function fitTitleSize({ title = '', size = 0, boxWidth = 0, maxLines = MAX_TITLE_LINES, floor = 0 } = {}) {
  const chars = String(title || '').length;
  if (!chars || !size || !boxWidth) return size;

  const piso = Math.max(floor, TYPE_MIN.title);
  let atual = size;
  while (atual > piso) {
    const porLinha = Math.max(1, Math.floor((boxWidth / (atual * BOLD_CHAR_WIDTH)) * PACKING));
    if (Math.ceil(chars / porLinha) <= maxLines) return atual;
    atual = Math.round(atual * 0.94);
  }
  return piso;
}

// §16: título grande de verdade. A proporção entre título e corpo é o sinal
// mais direto de hierarquia — abaixo disso a peça "achata".
export const MIN_TITLE_RATIO = 1.8;

export function hasTypographicHierarchy(scale = {}) {
  const title = Number(scale.title) || 0;
  const body = Number(scale.body) || 0;
  if (!title || !body) return false;
  return title / body >= MIN_TITLE_RATIO;
}

// §17: margem proporcional. O padding fixo de 96px do gerador antigo era o que
// criava as grandes áreas vazias em peça com pouco texto.
export function framePadding({ width = 1080, height = 1080 } = {}) {
  return Math.round(Math.min(width, height) * 0.062);
}

// Margens do quadro. No Story a margem vertical é bem maior porque o Instagram
// desenha por cima: a linha do perfil no topo e a barra de resposta embaixo
// comem cerca de um décimo da tela cada. Texto colado na borda de um Story fica
// atrás da interface do app — some sem ninguém perceber no editor.
export function frameInsets(dim = {}) {
  const x = framePadding(dim);
  const vertical = (dim.height || 0) > (dim.width || 0)
    ? Math.round(dim.height * 0.105)
    : x;
  return { x, top: vertical, bottom: vertical };
}

// Densidade sugerida a partir do volume de texto: peça com muito conteúdo
// aperta a escala; peça curta respira sem virar deserto.
export function densityFor(text = '') {
  const chars = String(text || '').length;
  if (chars > 220) return 'dense';
  if (chars < 70) return 'airy';
  return 'normal';
}
