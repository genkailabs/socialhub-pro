import 'server-only';
import { geminiGrounded } from '@/lib/ai/gemini';
import { estimateCostUsd, GEMINI_GROUNDING_USD } from '@/lib/ai/cost';

// Erro tipado: o pedido depende de informação atual e a pesquisa falhou. Quem
// chama NÃO deve gerar conteúdo com base só no DeepSeek — sem inventar fatos.
export class ResearchUnavailableError extends Error {
  constructor(message = 'Não foi possível consultar informações atuais agora. Tente novamente em instantes.') {
    super(message);
    this.name = 'ResearchUnavailableError';
    this.code = 'research_unavailable';
  }
}

// Remove acentos p/ casar gatilhos mesmo quando o usuário digita sem acento.
function deaccent(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Gatilhos de atualidade em pt-BR. Palavras que indicam dependência de algo
// recente/externo que o modelo de texto não conhece com confiança.
const TRIGGERS = /\b(noticias?|hoje|atual|atualidades?|tendencias?|lancamentos?|recentes?|novidades?|agora|esta semana|202\d)\b/;

// Classificador heurístico (sem chamada de LLM). Decide se o pedido depende de
// informação atual. news sempre pesquisa; flag explícita força (modo avançado).
export function needsResearch(brief = {}) {
  if (brief.research === true) return true;
  if (brief.format === 'news') return true;
  return TRIGGERS.test(deaccent(brief.topic));
}

// Query de busca determinística (mesmo input = mesma string → chave de cache
// estável). Junta tema + nicho, sem ruído.
export function buildResearchQuery({ brief = {}, kit = {} } = {}) {
  const parts = [brief.topic, kit.niche].map((p) => String(p || '').trim()).filter(Boolean);
  return parts.join(' — ') || 'assuntos atuais relevantes';
}

// Busca contexto atual via Gemini Grounding. Contrato: sucesso devolve
// { summary, sources, usage, model, cost, cached } ou LANÇA
// ResearchUnavailableError. Nunca retorna null quando obrigatório — sem
// degradação silenciosa. Falha nunca é tratada como "sem contexto".
export async function researchContext({ brief = {}, kit = {} } = {}) {
  const query = buildResearchQuery({ brief, kit });
  let out;
  try {
    out = await geminiGrounded({ query });
  } catch (e) {
    throw new ResearchUnavailableError();
  }
  const summary = String(out?.summary || '').trim();
  if (!summary) throw new ResearchUnavailableError();

  const usage = out.usage || {};
  const cost = Math.round((estimateCostUsd(out.model, usage) + GEMINI_GROUNDING_USD) * 1e6) / 1e6;
  return { summary, sources: out.sources || [], usage, model: out.model, cost, cached: false };
}
