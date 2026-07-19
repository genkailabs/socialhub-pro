import { runText } from '@/lib/ai/provider';
import { estimateCostUsd } from '@/lib/ai/cost';
import { checkLimit } from '@/lib/ai/limits';

const MAX_ATTEMPTS = 2;

// Registra toda chamada de IA, com sucesso ou erro (RF-15). Best-effort: o log
// nunca pode derrubar uma geração que já foi paga.
async function logJob(supabase, row) {
  try {
    await supabase.from('generation_jobs').insert(row);
  } catch {
    // silencioso de propósito — ver comentário acima
  }
}

function jsonFromModelOutput(content) {
  const text = String(content || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] || text).trim();
  try { return JSON.parse(candidate); } catch {}

  // Alguns provedores adicionam uma frase curta antes/depois do objeto. Em vez
  // de gastar outra chamada, isolamos o primeiro objeto JSON completo.
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
  throw new Error('resposta nao era JSON');
}

function parseOutput(skill, content) {
  let raw;
  try {
    raw = jsonFromModelOutput(content);
  } catch {
    return { ok: false, reason: 'resposta nao era JSON' };
  }
  const parsed = skill.outputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  return { ok: true, data: parsed.data };
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
  let model = null;
  let provider = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let out;
    try {
      out = await runText({
        system,
        user,
        jsonMode: true,
        ...(skill.maxTokens !== undefined ? { maxTokens: skill.maxTokens } : {}),
        ...(skill.provider ? { provider: skill.provider } : {}),
        ...(skill.model ? { model: skill.model } : {}),
        ...(skill.temperature !== undefined ? { temperature: skill.temperature } : {})
      });
    } catch (e) {
      // Falha do provedor: sem tokens, mas o erro precisa aparecer no histórico.
      await logJob(supabase, { ...baseRow, provider: null, model: null, input_tokens: 0, output_tokens: 0, cost_usd: 0, status: 'error', error: e.message, retry_attempt: attempt });
      throw e;
    }

    usage = out.usage || {};
    model = out.model;
    provider = out.provider;
    const cost = estimateCostUsd(model, usage);
    const result = parseOutput(skill, out.content);

    if (result.ok) {
      await logJob(supabase, {
        ...baseRow,
        provider,
        model,
        input_tokens: usage.prompt_tokens || 0,
        output_tokens: usage.completion_tokens || 0,
        cost_usd: cost,
        status: 'success', retry_attempt: attempt
      });
      return { data: result.data, cost, usage, model, provider, attempts: attempt };
    }

    // Tentativa gasta tokens mesmo quando a saída não presta: cobra na conta.
    lastReason = result.reason;
    await logJob(supabase, {
      ...baseRow,
      provider,
      model,
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      cost_usd: cost,
      status: 'error',
      error: `saida invalida (tentativa ${attempt}): ${result.reason}`,
      retry_attempt: attempt
    });
  }

  throw new Error(`A skill ${skill.id} nao devolveu um resultado valido apos ${MAX_ATTEMPTS} tentativas: ${lastReason}`);
}
