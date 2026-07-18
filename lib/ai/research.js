import 'server-only';
import { createHash } from 'node:crypto';
import { pollinationsSearch } from '@/lib/ai/pollinations-search';
import { POLLINATIONS_SEARCH_USD } from '@/lib/ai/cost';

// Janela de validade do cache de pesquisa. Notícia envelhece: 6h mantém o
// contexto "atual" e corta chamadas duplicadas no mesmo ciclo de cron.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function queryHash(query) {
  return createHash('sha1').update(query).digest('hex');
}

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

// Lê o cache de pesquisa (< TTL). Best-effort: erro de tabela/coluna não
// derruba a geração — só volta null e segue para a pesquisa.
async function readCache(supabase, hash) {
  if (!supabase) return null;
  try {
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data } = await supabase
      .from('research_cache')
      .select('summary, sources, model, created_at')
      .eq('query_hash', hash)
      .gte('created_at', cutoff)
      .maybeSingle();
    if (data && String(data.summary || '').trim()) return data;
  } catch { /* cache indisponível: segue sem ele */ }
  return null;
}

async function writeCache(supabase, { hash, query, summary, sources, model }) {
  if (!supabase) return;
  try {
    await supabase.from('research_cache').upsert({ query_hash: hash, query, summary, sources, model });
  } catch { /* falha ao gravar não afeta o resultado */ }
}

// Busca contexto atual via Pollinations (gemini-search). Contrato: sucesso
// devolve { summary, sources, usage, model, cost, cached } ou LANÇA
// ResearchUnavailableError. Nunca retorna null quando obrigatório — sem
// degradação silenciosa. Falha nunca é tratada como "sem contexto".
// Passa pelo cache primeiro (quando há `supabase`); só grava sucesso.
// Custo aproximado por busca (flat) — ajustável por env.
export async function researchContext({ supabase, brief = {}, kit = {} } = {}) {
  const query = buildResearchQuery({ brief, kit });
  const hash = queryHash(query);

  const cached = await readCache(supabase, hash);
  if (cached) {
    return { summary: cached.summary, sources: cached.sources || [], usage: {}, model: cached.model, cost: 0, cached: true };
  }

  let out;
  try {
    out = await pollinationsSearch({ query });
  } catch (e) {
    throw new ResearchUnavailableError();
  }
  const summary = String(out?.summary || '').trim();
  if (!summary) throw new ResearchUnavailableError();

  const sources = out.sources || [];
  const cost = POLLINATIONS_SEARCH_USD;
  await writeCache(supabase, { hash, query, summary, sources, model: out.model });
  return { summary, sources, usage: {}, model: out.model, cost, cached: false };
}
