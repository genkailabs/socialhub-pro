import { runText, resolveFallbackProvider } from '@/lib/ai/provider';
import { jsonFromModelOutput } from '@/lib/ai/json';
import { estimateCostUsd } from '@/lib/ai/cost';
import { checkLimit } from '@/lib/ai/limits';
import { captureError } from '@/lib/observability';

const MAX_ATTEMPTS = 2;

// Teto absoluto de saída. O modelo aceita mais do que o padrão das skills, e a
// segunda tentativa precisa de espaço para caber onde a primeira não coube.
export const MAX_OUTPUT_TOKENS = 8000;

// Teto de quem não declara o seu. A skill que omite `maxTokens` caía no padrão
// do provedor (1200) sem ninguém decidir isso: em produção, post-producer,
// content-strategy e story-planner foram cortadas exatamente em 1200 e
// gastaram uma tentativa inteira por causa disso. Skill devolve lista
// estruturada — 1200 nunca foi um teto plausível. `max_tokens` é limite, não
// consumo: quem já cabia continua custando o mesmo.
export const DEFAULT_SKILL_MAX_TOKENS = 4000;

// Quanto o teto cresce quando a resposta foi cortada. Repetir a MESMA chamada
// depois de um corte é jogar tokens fora: o corte é determinístico, então a
// segunda tentativa daria exatamente o mesmo resultado — foi o que aconteceu
// com o editorial-planner (duas tentativas, 4096 tokens cada, corte idêntico).
const RETRY_TOKEN_FACTOR = 2;

export function nextMaxTokens(atual) {
  if (!atual) return MAX_OUTPUT_TOKENS;
  return Math.min(MAX_OUTPUT_TOKENS, Math.round(atual * RETRY_TOKEN_FACTOR));
}

// Registra toda chamada de IA, com sucesso ou erro (RF-15). Best-effort: o log
// nunca pode derrubar uma geração que já foi paga.
async function logJob(supabase, row) {
  try {
    await supabase.from('generation_jobs').insert(row);
  } catch {
    // silencioso de propósito — ver comentário acima
  }
}

function valueAtPath(root, path) {
  let current = root;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function describeValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'ausente';
  if (Array.isArray(value)) return `lista de ${value.length}`;
  if (typeof value === 'string') return `texto de ${value.length} caracteres`;
  return typeof value;
}

// A razao da rejeicao vira o prompt de correcao da tentativa seguinte, entao
// ela precisa dizer o que fazer diferente. `issue.message` do Zod nao serve:
// no bundle do servidor a mensagem degrada para "Invalid input" seco — foi o
// que aconteceu por tres meses em generation_jobs, com enum, literal, objeto e
// string todos reduzidos ao mesmo texto. O modelo recebia o nome do campo e
// nenhuma pista, e a segunda tentativa repetia o mesmo erro. Aqui a razao e
// montada a partir do codigo da issue e do valor que realmente veio.
function issueDetail(issue, root) {
  const veio = describeValue(valueAtPath(root, issue.path));
  switch (issue.code) {
    case 'invalid_type':
      return `esperava ${issue.expected}, veio ${veio}`;
    case 'too_big':
      return `passou do maximo de ${issue.maximum} (veio ${veio})`;
    case 'too_small':
      return `abaixo do minimo de ${issue.minimum} (veio ${veio})`;
    case 'invalid_value':
      return `so aceita ${(issue.values || []).join(' | ')} (veio ${veio})`;
    case 'invalid_format':
      return `nao segue o formato ${issue.format} (veio ${veio})`;
    default:
      return issue.message || issue.code;
  }
}

function reasonFrom(issues, root) {
  return issues.map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issueDetail(issue, root)}`).join('; ');
}

// O modelo manda `null` no campo opcional que ele nao quis preencher, e
// `.default()` do Zod so cobre `undefined` — um campo que nem era obrigatorio
// derrubava a resposta inteira. Trocar null por undefined na arvore toda
// quebraria quem declara `.nullable()` de proposito (story-planner faz isso no
// cta), entao o conserto e local: so os caminhos que o proprio Zod rejeitou por
// tipo E que estao em null. Se nao houver nenhum, nao ha o que consertar.
function repairNulls(value, issues) {
  const alvos = issues.filter((issue) => (
    issue.code === 'invalid_type'
    && issue.path.length > 0
    && valueAtPath(value, issue.path) === null
  ));
  if (!alvos.length) return null;

  const copia = structuredClone(value);
  for (const issue of alvos) {
    const pai = valueAtPath(copia, issue.path.slice(0, -1));
    if (pai && typeof pai === 'object') delete pai[issue.path.at(-1)];
  }
  return copia;
}

function parseOutput(skill, content) {
  let raw;
  try {
    raw = jsonFromModelOutput(content);
  } catch {
    return { ok: false, reason: 'resposta nao era JSON' };
  }
  const normalized = typeof skill.normalizeOutput === 'function' ? skill.normalizeOutput(raw) : raw;
  const parsed = skill.outputSchema.safeParse(normalized);
  if (parsed.success) return { ok: true, data: parsed.data };

  const consertado = repairNulls(normalized, parsed.error.issues);
  if (consertado) {
    const segunda = skill.outputSchema.safeParse(consertado);
    if (segunda.success) return { ok: true, data: segunda.data };
    return { ok: false, reason: reasonFrom(segunda.error.issues, consertado) };
  }

  return { ok: false, reason: reasonFrom(parsed.error.issues, normalized) };
}

// Executor único das skills: valida entrada, checa limite, chama o provedor,
// valida a saída (com uma segunda tentativa) e registra o custo.
export async function runSkill({ skill, input, supabase, brandId, userId, refPostId = null }) {
  const parsedInput = skill.inputSchema.safeParse(input);
  if (!parsedInput.success) {
    const detail = parsedInput.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Entrada invalida para a skill ${skill.id}: ${detail}`);
  }

  // Antes de qualquer gasto.
  const limit = await checkLimit({ supabase, brandId, userId, skillId: skill.id });
  if (!limit.allowed) throw new Error(limit.reason);

  const { system, user } = skill.buildPrompt(parsedInput.data);
  const baseRow = {
    brand_id: brandId,
    user_id: userId,
    kind: 'skill',
    skill_id: skill.id,
    skill_version: skill.version,
    ref_post_id: refPostId
  };

  let lastReason = '';
  let usage = {};
  // Quem de fato atendeu, que na tentativa de fallback não é quem foi pedido.
  let usedModel = null;
  let usedProvider = null;
  let maxTokens = skill.maxTokens ?? DEFAULT_SKILL_MAX_TOKENS;
  let retryReason = '';

  // As duas tentativas do provedor principal já cobrem corte (dobra o teto) e
  // JSON inválido (manda a correção no prompt). Quando as duas queimam, o que
  // sobrou de diferente para tentar não é um terceiro pedido igual — é outro
  // modelo. Sem fallback configurado nada muda: continua desistindo na segunda.
  const fallback = resolveFallbackProvider(skill.provider);
  const totalAttempts = fallback ? MAX_ATTEMPTS + 1 : MAX_ATTEMPTS;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const noFallback = attempt > MAX_ATTEMPTS;
    // O modelo pertence ao provedor: o da skill não existe do outro lado.
    const provider = noFallback ? fallback : skill.provider;
    const model = noFallback ? undefined : skill.model;
    const correction = retryReason
      ? `\n\nCORRECAO OBRIGATORIA: a resposta anterior foi rejeitada por estes erros: ${retryReason}. `
        + 'Corrija todos eles. Retorne somente o objeto JSON raiz solicitado, sem wrapper, explicacao ou Markdown.'
      : '';
    let out;
    try {
      out = await runText({
        system: `${system}${correction}`,
        user: `${user}${correction}`,
        jsonMode: true,
        maxTokens,
        ...(provider ? { provider } : {}),
        ...(model ? { model } : {}),
        ...(skill.temperature !== undefined ? { temperature: skill.temperature } : {})
      });
    } catch (e) {
      // Falha do provedor: sem tokens, mas o erro precisa aparecer no histórico.
      captureError(e, { skillId: skill.id, brandId, attempt, stage: 'provider' });
      await logJob(supabase, { ...baseRow, provider: null, model: null, input_tokens: 0, output_tokens: 0, cost_usd: 0, status: 'error', error: e.message, retry_attempt: attempt });
      throw e;
    }

    usage = out.usage || {};
    usedModel = out.model;
    usedProvider = out.provider;
    const cost = estimateCostUsd(usedModel, usage);
    // Resposta cortada no teto não é resposta malformada: o JSON estava certo
    // até acabar o espaço. Tratar as duas como "não era JSON" escondia a causa
    // real e mandava o usuário procurar erro no prompt.
    const cortada = out.finishReason === 'length';
    const result = cortada
      ? { ok: false, reason: `resposta cortada no limite de ${maxTokens} tokens` }
      : parseOutput(skill, out.content);

    if (result.ok) {
      await logJob(supabase, {
        ...baseRow,
        provider: usedProvider,
        model: usedModel,
        input_tokens: usage.prompt_tokens || 0,
        output_tokens: usage.completion_tokens || 0,
        cost_usd: cost,
        status: 'success', retry_attempt: attempt
      });
      return { data: result.data, cost, usage, model: usedModel, provider: usedProvider, attempts: attempt };
    }

    // Tentativa gasta tokens mesmo quando a saída não presta: cobra na conta.
    lastReason = result.reason;
    await logJob(supabase, {
      ...baseRow,
      provider: usedProvider,
      model: usedModel,
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      cost_usd: cost,
      status: 'error',
      error: `saida invalida (tentativa ${attempt}): ${result.reason}`,
      retry_attempt: attempt
    });

    // A próxima tentativa só faz sentido se algo mudar. Depois de um corte, o
    // que muda é o espaço.
    retryReason = result.reason;
    if (cortada) maxTokens = nextMaxTokens(maxTokens);
  }

  const finalError = new Error(`A skill ${skill.id} nao devolveu um resultado valido apos ${totalAttempts} tentativas: ${lastReason}`);
  captureError(finalError, { skillId: skill.id, brandId });
  throw finalError;
}
