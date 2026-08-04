import 'server-only';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { pollinationsSearch } from '@/lib/ai/pollinations-search';
import { POLLINATIONS_SEARCH_USD } from '@/lib/ai/cost';
import { validateContentSources } from '@/lib/content-source-contract';

// Janela de validade do cache de pesquisa. Notícia envelhece: 6h mantém o
// contexto "atual" e corta chamadas duplicadas no mesmo ciclo de cron.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_EVIDENCE_HTML_BYTES = 256 * 1024;
// O Gemini entrega as fontes como redirect do `vertexaisearch.cloud.google.com`,
// e veículo bom ainda redireciona http→https ou para a URL canônica. Três
// saltos cobrem isso sem virar um crawler.
const MAX_EVIDENCE_REDIRECTS = 3;

function queryHash(query) {
  return createHash('sha1').update(query).digest('hex');
}

// Erro tipado: o pedido depende de informação atual e a pesquisa falhou. Quem
// chama NÃO deve gerar conteúdo com base só na IA de texto — sem inventar fatos.
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
// informação atual. Formato é texto livre — "notícia" sempre pesquisa (mesmo
// deaccented, ex: "Noticia comentada"); flag explícita força (modo avançado).
export function needsResearch(brief = {}) {
  if (brief.research === true) return true;
  // `pieceType` entra junto com `format`: no Composer o formato é o do canvas
  // ('post'), e quem diz "isto é uma notícia" é o tipo de peça da Estratégia.
  if (/noticia|news/.test(`${deaccent(brief.format)} ${deaccent(brief.pieceType)}`)) return true;
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

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return (match?.[1] || match?.[2] || match?.[3] || '').trim();
}

function meta(html, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const tag of String(html || '').match(/<meta\b[^>]*>/gi) || []) {
    const key = attribute(tag, 'property') || attribute(tag, 'name') || attribute(tag, 'itemprop');
    if (wanted.has(key.toLowerCase())) return attribute(tag, 'content');
  }
  return '';
}

function titleFromHtml(html) {
  const match = String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return String(match?.[1] || '').replace(/\s+/g, ' ').trim();
}

// JSON-LD é como quem publica notícia declara data e veículo — metatag é o
// acessório, não a regra. Ler só metatag descartava jornal legítimo por falta
// de uma tag. Achata `@graph` e arrays para procurar em tudo que veio.
function jsonLdRecords(html) {
  const records = [];
  const blocks = String(html || '').match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const body = block.replace(/^[\s\S]*?>/, '').replace(/<\/script>\s*$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      continue;
    }
    const pending = [parsed];
    while (pending.length && records.length < 50) {
      const node = pending.shift();
      if (Array.isArray(node)) pending.push(...node);
      else if (node && typeof node === 'object') {
        records.push(node);
        if (Array.isArray(node['@graph'])) pending.push(...node['@graph']);
      }
    }
  }
  return records;
}

function jsonLdValue(records, keys) {
  for (const record of records) {
    for (const key of keys) {
      const value = record?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      // `publisher` e `author` costumam vir como objeto com `name`.
      if (value && typeof value === 'object') {
        const name = Array.isArray(value) ? value[0]?.name : value.name;
        if (typeof name === 'string' && name.trim()) return name.trim();
      }
    }
  }
  return '';
}

function timeFromHtml(html) {
  const match = String(html || '').match(/<time\b[^>]*\bdatetime\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return (match?.[1] || match?.[2] || '').trim();
}

// Nome do veículo em último caso: o domínio. É honesto — diz de onde veio — e
// evita jogar fora uma fonte boa só porque o site não declarou `og:site_name`.
function publisherFromHost(url) {
  return String(url?.hostname || '').replace(/^www\./i, '');
}

function privateAddress(address) {
  const value = String(address || '').trim().toLowerCase();
  if (isIP(value) === 6) {
    let canonical = value;
    try {
      canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
    } catch {
      return true;
    }
    const first = Number.parseInt(canonical.split(':')[0] || '0', 16);
    return canonical === '::' || canonical === '::1'
      || canonical.startsWith('::ffff:')
      || (first & 0xfe00) === 0xfc00
      || (first & 0xffc0) === 0xfe80
      || (first & 0xffc0) === 0xfec0
      || (first & 0xff00) === 0xff00
      || canonical === '100::' || canonical.startsWith('100::')
      || canonical === '64:ff9b::' || canonical.startsWith('64:ff9b:')
      || canonical === '2001:db8::' || canonical.startsWith('2001:db8:')
      || canonical === '2001:2::' || canonical.startsWith('2001:2:')
      || canonical === '3fff::' || canonical.startsWith('3fff:');
  }
  if (isIP(value) !== 4) return true;
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && (parts[1] === 168 || parts[1] === 0 || parts[1] === 2))
    || (parts[0] === 192 && parts[1] === 88 && parts[2] === 99)
    || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19 || (parts[1] === 51 && parts[2] === 100)))
    || (parts[0] === 203 && parts[1] === 0 && parts[2] === 113);
}

async function safeEvidenceUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return null;
  let addresses;
  try {
    addresses = await lookup(host, { all: true });
    if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) return null;
  } catch {
    return null;
  }
  url.hash = '';
  // IPv4 na frente: o pin trava a conexão num endereço só, e uma máquina sem
  // rota IPv6 não abriria a conexão se o primeiro do DNS fosse AAAA.
  return { url, address: addresses.find((entry) => entry.family === 4) || addresses[0] };
}

function requestPinnedHtml({ url, address }) {
  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const request = transport(url, {
      method: 'GET',
      credentials: 'omit',
      servername: url.hostname,
      headers: { accept: 'text/html,application/xhtml+xml', host: url.host },
      // O Node pede `all: true` por conta do autoSelectFamily (v18+) e aí espera
      // um ARRAY de volta. Responder no formato antigo fazia toda conexão morrer
      // com "Invalid IP address: undefined" — nenhuma evidência era lida, nunca.
      lookup: (_hostname, options, callback) => (options?.all
        ? callback(null, [{ address: address.address, family: address.family }])
        : callback(null, address.address, address.family)),
      timeout: 5000
    }, (response) => {
      // Redirect não é resposta: é endereço novo. Quem chama decide se segue,
      // e revalida o destino antes de abrir conexão (o IP privado continua
      // barrado a cada salto).
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume?.();
        resolve({ redirect: String(response.headers.location) });
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume?.();
        reject(new Error('Evidence response was not successful'));
        return;
      }
      if (!String(response.headers['content-type'] || '').toLowerCase().includes('text/html')) {
        response.resume?.();
        reject(new Error('Evidence response was not HTML'));
        return;
      }
      // Teto de leitura, não de aceitação: a evidência (título, veículo, data,
      // resumo) mora no `<head>`. Recusar a página inteira por ser grande
      // descartava veículo bom — portal de notícia passa de 256KB com folga.
      // Aqui o download para no teto e o que já veio é lido.
      const chunks = [];
      let bytes = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve({ html: Buffer.concat(chunks).toString('utf8') });
      };
      response.on('data', (chunk) => {
        bytes += chunk.length;
        chunks.push(bytes > MAX_EVIDENCE_HTML_BYTES ? chunk.subarray(0, chunk.length - (bytes - MAX_EVIDENCE_HTML_BYTES)) : chunk);
        if (bytes >= MAX_EVIDENCE_HTML_BYTES) {
          response.destroy();
          finish();
        }
      });
      response.on('end', finish);
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Evidence request timed out')));
    request.on('error', reject);
    request.end();
  });
}

// Abre a evidência seguindo até `MAX_EVIDENCE_REDIRECTS` saltos. Cada salto
// passa de novo pelo `safeEvidenceUrl` — protocolo, host e IP são conferidos
// no destino, não só na primeira URL.
async function fetchEvidence(rawUrl) {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_EVIDENCE_REDIRECTS; hop += 1) {
    const target = await safeEvidenceUrl(current);
    if (!target) return null;
    const result = await requestPinnedHtml(target);
    if (!result?.redirect) return { url: target.url, html: result.html };
    try {
      current = new URL(result.redirect, target.url).toString();
    } catch {
      return null;
    }
  }
  return null;
}

async function enrichSource(source) {
  const alreadyVerified = validateContentSources({ sources: [source], images: [] });
  if (alreadyVerified.ok) return alreadyVerified.sources[0];

  try {
    const evidence = await fetchEvidence(source?.url || source?.uri);
    if (!evidence) return null;
    const { url, html } = evidence;
    const linkedData = jsonLdRecords(html);
    const candidate = {
      // A URL que vale é a do veículo, não a do redirecionador do Google.
      url: url.toString(),
      title: String(source?.title || '').trim() || meta(html, ['og:title']) || jsonLdValue(linkedData, ['headline', 'name']) || titleFromHtml(html),
      publisher: meta(html, ['og:site_name', 'application-name'])
        || jsonLdValue(linkedData, ['publisher', 'sourceOrganization', 'provider'])
        || publisherFromHost(url),
      publishedAt: meta(html, ['article:published_time', 'datepublished', 'date', 'pubdate', 'parsely-pub-date', 'sailthru.date', 'dc.date.issued'])
        || jsonLdValue(linkedData, ['datePublished', 'dateCreated', 'dateModified'])
        || timeFromHtml(html),
      consultedAt: new Date().toISOString(),
      summary: meta(html, ['description', 'og:description']) || jsonLdValue(linkedData, ['description', 'abstract'])
    };
    const verified = validateContentSources({ sources: [candidate], images: [] });
    return verified.ok ? verified.sources[0] : null;
  } catch {
    return null;
  }
}

// Tenta oito e entrega até cinco: parte dos links cai (404, bloqueio, página
// sem data), e a curadoria precisa de fonte de pé para existir. O teto de cinco
// é o que as skills aceitam na entrada.
const MAX_EVIDENCE_SOURCES = 5;

async function enrichSources(sources) {
  const enriched = await Promise.all((Array.isArray(sources) ? sources : []).slice(0, 8).map(enrichSource));
  return enriched.filter(Boolean).slice(0, MAX_EVIDENCE_SOURCES);
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
    const sources = await enrichSources(cached.sources);
    return { summary: cached.summary, sources, usage: {}, model: cached.model, cost: 0, cached: true };
  }

  let out;
  try {
    out = await pollinationsSearch({ query });
  } catch (error) {
    const timedOut = /excedeu o tempo limite/i.test(String(error?.message || ''));
    throw new ResearchUnavailableError(
      timedOut
        ? 'A pesquisa demorou mais que o esperado. Tente novamente em instantes.'
        : undefined
    );
  }
  const summary = String(out?.summary || '').trim();
  if (!summary) throw new ResearchUnavailableError();

  const sources = await enrichSources(out.sources);
  const cost = POLLINATIONS_SEARCH_USD;
  // Um resumo sem fonte verificável não serve de evidência e não deve prender
  // uma tentativa seguinte no cache durante seis horas.
  if (sources.length) await writeCache(supabase, { hash, query, summary, sources, model: out.model });
  return { summary, sources, usage: {}, model: out.model, cost, cached: false };
}
