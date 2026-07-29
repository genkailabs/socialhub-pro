// Estratégia do Composer (PRD 01 §3, §4, §5, §6). Puro, sem I/O.
//
// É a cabeça do fluxo guiado: antes de escrever qualquer campo, a peça precisa
// saber PARA QUE existe (objetivo) e O QUE é (tipo). Sem isso o Composer começa
// por "título" e produz arte tecnicamente correta que não serve a nada.
//
// O que este módulo NÃO faz, de propósito:
// - não cria estrutura nem estilo: quem manda nisso é lib/layouts/structures.js
//   e lib/layouts/styles.js, e este registro só aponta para os ids de lá;
// - não inventa formato: os quatro do Composer continuam em FORMAT_META;
// - não promete alcance nem viralização (PRD §11).

import { structureIds } from '@/lib/layouts/structures';

// ---------------------------------------------------------------- §3 modos

// Dois modos, porque só existem dois comportamentos. O PRD previa "assistido"
// com aprovação etapa a etapa e "automático" decidindo sozinho; nenhum dos dois
// foi construído — `asksApproval` nunca era lido e "automático" apenas jogava
// fora a estrutura e o estilo que a pessoa tinha escolhido. Três rótulos para
// dois comportamentos é o que deixava a tela confusa.
//
// A diferença real é uma só: a IA escreve o texto ou não.
export const MODES = [
  {
    id: 'manual',
    label: 'Manual',
    hint: 'Você escreve o conteúdo e o Hub monta a arte.',
    usesAi: false
  },
  {
    id: 'ia',
    label: 'Com IA',
    hint: 'A IA escreve o conteúdo a partir do tema e você edita antes de montar.',
    usesAi: true
  }
];

export const DEFAULT_MODE_ID = 'ia';

const MODE_BY_ID = new Map(MODES.map((m) => [m.id, m]));
export const modeById = (id) => MODE_BY_ID.get(id) || MODE_BY_ID.get(DEFAULT_MODE_ID);

// ----------------------------------------------------------- §4 objetivos

// `goal` é a frase que vai para o prompt da IA — `buildContentPrompt` já lê
// `brief.goal` (lib/ai/prompt.js) e só nunca recebia nada do Composer.
//
// `favors` aponta categorias de estrutura (lib/layouts/structures.js), não
// estruturas soltas: o objetivo inclina a escolha, quem decide é o select.
export const OBJECTIVES = [
  { id: 'autoridade', label: 'Gerar autoridade', goal: 'construir autoridade da marca no assunto', favors: ['autoridade', 'editorial'], wantsCta: false },
  { id: 'educar', label: 'Educar', goal: 'ensinar algo útil e aplicável', favors: ['educativo', 'informativo'], wantsCta: false },
  { id: 'vender', label: 'Vender', goal: 'levar quem já conhece a marca a comprar', favors: ['servico', 'visual'], wantsCta: true },
  { id: 'seguidores', label: 'Ganhar seguidores', goal: 'fazer quem ainda não segue querer seguir', favors: ['educativo', 'editorial'], wantsCta: true },
  { id: 'engajamento', label: 'Gerar engajamento', goal: 'abrir conversa e provocar resposta', favors: ['engajamento'], wantsCta: true },
  { id: 'cliques', label: 'Gerar cliques', goal: 'levar a pessoa a abrir o link', favors: ['servico', 'noticia'], wantsCta: true },
  { id: 'novidade', label: 'Anunciar novidade', goal: 'anunciar algo novo da marca', favors: ['servico', 'visual'], wantsCta: true },
  { id: 'noticia', label: 'Divulgar notícia', goal: 'informar sobre um fato recente', favors: ['noticia'], wantsCta: false },
  { id: 'marca', label: 'Fortalecer marca', goal: 'reforçar quem a marca é e no que acredita', favors: ['editorial', 'autoridade'], wantsCta: false }
];

const OBJECTIVE_BY_ID = new Map(OBJECTIVES.map((o) => [o.id, o]));
export const objectiveById = (id) => OBJECTIVE_BY_ID.get(id) || null;

/** Frase de objetivo para o prompt. Vazio devolve null: o prompt tem o próprio padrão. */
export function goalForPrompt(objectiveId) {
  return objectiveById(objectiveId)?.goal || null;
}

/**
 * Categorias de estrutura que o objetivo favorece (§4).
 *
 * Vai para `selectStructure` como lista, não como texto livre: o casamento por
 * substring que existia antes só acertava por acidente ("vender" nunca contém
 * "servico"). Sem objetivo devolve vazio, e a escolha fica com o conteúdo.
 */
export function favorsForObjective(objectiveId) {
  return objectiveById(objectiveId)?.favors || [];
}

// -------------------------------------------------------- §5 tipos de peça

// Cada tipo amarra três coisas: o formato do Composer (FORMAT_META), quais
// estruturas fazem sentido e quais campos aparecem (§6 — "não exigir campos que
// não fazem sentido para o tipo escolhido").
//
// `structures` lista ids que EXISTEM hoje. Tipo sem estrutura própria aponta
// para a mais próxima e registra a lacuna em `missing` — fingir que existe
// produziria uma escolha que o motor não sabe montar.
export const PIECE_TYPES = [
  {
    id: 'post-unico', label: 'Post único', format: 'post',
    structures: ['conteudo-limpo', 'imagem-titulo', 'manchete', 'texto-destaque', 'hero-editorial', 'editorial-minimalista'],
    fields: ['title', 'subtitle', 'highlight', 'cta']
  },
  {
    id: 'capa-carrossel', label: 'Capa de carrossel', format: 'carrossel',
    structures: ['capa-carrossel', 'manchete', 'hero-editorial'],
    fields: ['title', 'subtitle', 'highlight']
  },
  {
    id: 'carrossel', label: 'Carrossel completo', format: 'carrossel',
    structures: ['capa-carrossel', 'lista', 'texto-destaque'],
    fields: ['title', 'subtitle', 'bullets', 'cta']
  },
  {
    // §1.4: notícia é o tipo com mais regra própria — pede crédito e data, e não
    // pode oferecer campo de lista genérica. As estruturas são as jornalísticas.
    id: 'noticia', label: 'Notícia', format: 'post',
    structures: ['manchete', 'titulo-imagem-texto', 'noticia-premium', 'hero-editorial', 'trend-alert'],
    fields: ['title', 'subtitle', 'highlight', 'source', 'date', 'cta']
  },
  {
    id: 'editorial', label: 'Editorial', format: 'post',
    structures: ['editorial', 'texto-destaque', 'citacao', 'hero-editorial', 'editorial-minimalista', 'manchete-pessoa'],
    fields: ['title', 'subtitle', 'highlight', 'cta']
  },
  {
    id: 'anuncio', label: 'Anúncio', format: 'post',
    structures: ['anuncio-foto', 'aviso', 'conteudo-limpo'],
    fields: ['title', 'subtitle', 'highlight', 'cta']
  },
  {
    id: 'lista', label: 'Lista', format: 'post',
    structures: ['lista'],
    fields: ['title', 'bullets', 'cta']
  },
  {
    id: 'comparacao', label: 'Comparação', format: 'post',
    structures: ['comparativo'],
    fields: ['title', 'bullets', 'highlight', 'cta']
  },
  {
    id: 'tutorial', label: 'Tutorial', format: 'carrossel',
    // Passo a passo é uma lista com ordem que importa; estrutura própria fica
    // registrada como lacuna.
    structures: ['lista', 'capa-carrossel'],
    missing: 'Estrutura de passo a passo com numeração destacada ainda não existe.',
    fields: ['title', 'bullets', 'cta']
  },
  {
    id: 'story', label: 'Story', format: 'story',
    structures: ['conteudo-limpo', 'manchete', 'pergunta'],
    fields: ['title', 'subtitle', 'cta']
  },
  {
    id: 'capa-reel', label: 'Capa de Reel', format: 'reel',
    structures: ['manchete', 'imagem-titulo'],
    fields: ['title', 'subtitle']
  }
];

const PIECE_BY_ID = new Map(PIECE_TYPES.map((p) => [p.id, p]));
export const pieceTypeById = (id) => PIECE_BY_ID.get(id) || null;

export function pieceTypesForFormat(format) {
  return PIECE_TYPES.filter((p) => p.format === format);
}

/** §6: só os campos que fazem sentido para o tipo. Sem tipo, mostra todos. */
export const ALL_FIELDS = ['title', 'subtitle', 'bullets', 'highlight', 'source', 'date', 'cta'];

export function fieldsForPieceType(id) {
  const piece = pieceTypeById(id);
  return piece ? piece.fields : ALL_FIELDS;
}

/**
 * Estruturas candidatas ao tipo escolhido.
 * Devolve vazio quando não há tipo: quem chama cai no catálogo inteiro.
 */
export function structuresForPieceType(id) {
  const piece = pieceTypeById(id);
  if (!piece) return [];
  const existentes = new Set(structureIds());
  return piece.structures.filter((sid) => existentes.has(sid));
}
