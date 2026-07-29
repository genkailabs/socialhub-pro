// Seleção automática pela IA (PRD §12) e antirrepetição (§13). Puro, sem I/O.
//
// Deliberadamente determinístico: a escolha de estrutura e estilo é uma decisão
// de regra, não de texto livre. Isso é o §18 na prática — economizar tokens e
// tornar o resultado previsível. O modelo continua responsável pelo CONTEÚDO;
// aqui só se decide como esse conteúdo é organizado e vestido.

import {
  STRUCTURES, eligibleStructures, contentUsage, structureById,
  FALLBACK_STRUCTURE_ID, shapeOf
} from '@/lib/layouts/structures';
import { VISUAL_STYLES, styleById, styleForKeywords, deaccent, FALLBACK_STYLE_ID } from '@/lib/layouts/styles';

// §12 "tipo de conteúdo". Ordem importa: o primeiro padrão que casa vence, e os
// sinais mais específicos (dado, pergunta) vêm antes dos genéricos.
const CONTENT_TYPE_RULES = [
  { type: 'dado', test: (t, c) => Boolean(String(c.stat || '').trim()) || /\b\d+([.,]\d+)?\s*%/.test(t) },
  { type: 'engajamento', test: (t, c) => Boolean(String(c.question || '').trim()) || /\?\s*$/.test(t.trim()) || /(voce ja|voces ja|qual e o seu|conta pra gente|comenta)/.test(t) },
  { type: 'promocao', test: (t) => /(promocao|oferta|desconto|cupom|black friday|ultimas vagas|frete gratis|so hoje|imperdivel)/.test(t) },
  { type: 'noticia', test: (t) => /(noticia|urgente|anuncio|anunciou|lancou|lancamento|nesta semana|governo|mercado|acaba de|divulgou)/.test(t) },
  { type: 'servico', test: (t, c) => Boolean(String(c.warning || '').trim()) || /(atencao|aviso|prazo|horario de funcionamento|agende|atendimento|nova regra)/.test(t) },
  { type: 'inspiracao', test: (t, c) => Boolean(String(c.quote || '').trim()) || /(inspir|motiva|reflex|frase)/.test(t) },
  { type: 'educativo', test: (t, c) => (Array.isArray(c.bullets) && c.bullets.filter(Boolean).length >= 2) || /(dica|passo|como |aprenda|entenda|guia|erros|checklist)/.test(t) }
];

export const CONTENT_TYPES = ['noticia', 'educativo', 'dado', 'inspiracao', 'engajamento', 'promocao', 'servico', 'autoridade'];

/**
 * Classifica o conteúdo (§12). `content.contentType` explícito sempre vence:
 * quando o planejamento já disse o que é, adivinhar de novo só cria divergência.
 */
export function classifyContent(content = {}) {
  const declared = String(content.contentType || '').trim().toLowerCase();
  if (CONTENT_TYPES.includes(declared)) return declared;

  const text = deaccent([
    content.title, content.subtitle, content.eyebrow, content.cta,
    ...(Array.isArray(content.bullets) ? content.bullets : [])
  ].filter(Boolean).join(' '));

  const rule = CONTENT_TYPE_RULES.find((candidate) => candidate.test(text, content));
  return rule ? rule.type : 'autoridade';
}

// Pontuação da estrutura. Cada parcela responde a um item do §12.
function scoreStructure(structure, { content, contentType, objectiveFavors, format }) {
  let score = contentUsage(structure, content) * 3;

  if (structure.contentTypes?.includes(contentType)) score += 6;
  // O objetivo chega como lista de categorias favorecidas (§4), não como texto
  // livre: comparar strings só acertava por acidente. Quem traduz o id do
  // objetivo nessa lista é `favorsForObjective` em lib/composer-strategy.
  if (objectiveFavors.includes(structure.category)) score += 3;
  if (format === 'carrossel' && structure.category === 'carrossel') score += 5;
  if (format !== 'carrossel' && structure.category === 'carrossel') score -= 4;

  // §13: excesso de texto em estrutura curta. `density` declara o quanto a
  // estrutura aguenta; textão em estrutura "airy" estoura a caixa.
  const chars = [content.title, content.subtitle, ...(content.bullets || [])].filter(Boolean).join(' ').length;
  if (structure.density === 'airy' && chars > 220) score -= 4;
  if (structure.density === 'dense' && chars < 70) score -= 2;

  return score;
}

/**
 * Escolhe a estrutura (§12) evitando o que foi usado recentemente (§13).
 *
 * @param {string[]} recentStructures ids do mais recente para o mais antigo.
 */
export function selectStructure({
  content = {}, contentType = 'autoridade', objectiveFavors = [], format = 'post',
  shape = 'square', recentStructures = [], seed = 0
} = {}) {
  const eligible = eligibleStructures(content, shape);
  if (!eligible.length) return { structure: structureById(FALLBACK_STRUCTURE_ID) || STRUCTURES[0], repeated: false };

  const favors = Array.isArray(objectiveFavors) ? objectiveFavors : [];
  const scored = eligible.map((structure) => ({
    structure,
    score: scoreStructure(structure, { content, contentType, objectiveFavors: favors, format })
  }));
  const best = Math.max(...scored.map((item) => item.score));
  const candidates = scored.filter((item) => item.score === best).map((item) => item.structure);

  const recent = (recentStructures || []).filter(Boolean);
  // Nunca duas vezes seguidas a mesma estrutura. Se todos os candidatos já
  // apareceram, ao menos não repete o imediatamente anterior.
  const unused = candidates.filter((structure) => !recent.includes(structure.id));
  const pool = unused.length ? unused : candidates.filter((structure) => structure.id !== recent[0]);
  const finalists = pool.length ? pool : candidates;

  const chosen = finalists[Math.abs(Math.trunc(seed)) % finalists.length];
  return { structure: chosen, repeated: recent.includes(chosen.id) && !unused.length };
}

/**
 * Escolhe o estilo visual (§6/§12). A ordem é: preferência explícita da marca >
 * palavra-chave do estilo visual/nicho/tom > tipo de conteúdo > neutro.
 */
export function selectStyle({
  brand = {}, contentType = 'autoridade', recentStyles = [], seed = 0
} = {}) {
  const forced = styleById(String(brand.styleId || brand.visualStyleId || '').trim());
  if (forced) return { style: forced, forced: true, repeated: false };

  const byBrand = styleForKeywords([brand.visualStyle, brand.niche, brand.tone].filter(Boolean).join(' '));
  const byContent = CONTENT_TYPE_STYLE[contentType] ? styleById(CONTENT_TYPE_STYLE[contentType]) : null;
  const preferred = byBrand || byContent || styleById(FALLBACK_STYLE_ID);

  const recent = (recentStyles || []).filter(Boolean);
  // A identidade da marca pesa mais que a variação: se o estilo veio do Brand
  // Kit, repetir é coerência, não repetição preguiçosa. A variação só entra
  // quando ninguém pediu um estilo específico.
  if (byBrand) return { style: preferred, forced: false, repeated: recent[0] === preferred.id };
  if (recent[0] !== preferred.id) return { style: preferred, forced: false, repeated: false };

  const alternatives = VISUAL_STYLES.filter((style) => !recent.slice(0, 2).includes(style.id));
  if (!alternatives.length) return { style: preferred, forced: false, repeated: true };
  return { style: alternatives[Math.abs(Math.trunc(seed)) % alternatives.length], forced: false, repeated: false };
}

// Estilo padrão por tipo de conteúdo, quando a marca não deu pista nenhuma.
const CONTENT_TYPE_STYLE = {
  noticia: 'jornalistico',
  educativo: 'editorial',
  dado: 'corporativo',
  inspiracao: 'premium',
  engajamento: 'acolhedor',
  promocao: 'comercial',
  servico: 'corporativo',
  autoridade: 'minimalista'
};

/**
 * Plano completo: tipo, estrutura, estilo e as razões da escolha.
 * As razões existem para o mascote (§15) — decisão sem explicação é caixa preta.
 */
export function selectLayoutPlan({
  content = {}, brand = {}, format = 'post', size = { width: 1080, height: 1080 },
  recentStructures = [], recentStyles = [], seed = 0, objectiveFavors = []
} = {}) {
  const contentType = classifyContent(content);
  const shape = shapeOf(size);
  const structurePick = selectStructure({
    content, contentType, objectiveFavors,
    format, shape, recentStructures, seed
  });
  const stylePick = selectStyle({ brand, contentType, recentStyles, seed });

  const reasons = [
    `Tipo identificado: ${contentType}.`,
    `Estrutura "${structurePick.structure.label}": ${structurePick.structure.description}`,
    stylePick.forced
      ? `Estilo "${stylePick.style.label}" porque a marca fixou esse estilo.`
      : `Estilo "${stylePick.style.label}" combinando com o conteúdo e com a identidade da marca.`
  ];

  return {
    contentType,
    shape,
    structure: structurePick.structure,
    style: stylePick.style,
    repeatedStructure: structurePick.repeated,
    repeatedStyle: stylePick.repeated,
    reasons
  };
}
