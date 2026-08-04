import { deepseekChat } from '@/lib/ai/deepseek';
import { groqChat } from '@/lib/ai/groq';

// Camada de provedores de texto. Quem gera conteúdo (skills, autopilot, studio)
// chama runText e não sabe qual API está do outro lado. Trocar de provedor é
// mudar AI_TEXT_PROVIDER — nenhuma skill precisa ser reescrita.
//
// O DeepSeek escreve (PRD 2026-07-18: Gemini removido). O Groq entra como plano
// B: ver `runText` no fim do arquivo. Um provedor novo entra adicionando 1 linha
// aqui.
const ADAPTERS = {
  deepseek: deepseekChat,
  groq: groqChat
};

// Cada provedor só pode ser tentado se a sua credencial existir. Sem isso, ligar
// o fallback trocaria um erro por outro erro.
const API_KEY_ENV = {
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY'
};

export const DEFAULT_TEXT_PROVIDER = 'deepseek';

export function listTextProviders() {
  return Object.keys(ADAPTERS);
}

// Ambiente inválido não derruba a geração: cai no padrão. Já um provedor pedido
// explicitamente pelo código é erro, porque indica bug de quem chamou.
export function resolveTextProvider(env = process.env) {
  const wanted = env.AI_TEXT_PROVIDER;
  return ADAPTERS[wanted] ? wanted : DEFAULT_TEXT_PROVIDER;
}

// Quem atende quando o principal não atende. Desligado por padrão: sem
// AI_TEXT_FALLBACK, ou sem a chave do provedor, o comportamento é exatamente o
// de antes de o fallback existir. Fallback igual ao principal é a mesma chamada
// de novo — devolve null.
export function resolveFallbackProvider(principal = resolveTextProvider(), env = process.env) {
  const wanted = env.AI_TEXT_FALLBACK;
  if (!wanted || wanted === principal || !ADAPTERS[wanted]) return null;
  if (!env[API_KEY_ENV[wanted]]) return null;
  return wanted;
}

async function callAdapter(name, { system, user, model, temperature, jsonMode, maxTokens }) {
  const adapter = ADAPTERS[name];
  if (!adapter) throw new Error(`Provedor de texto desconhecido: ${name}. Use ${listTextProviders().join(' ou ')}.`);

  // Só repassa o que foi pedido, para cada cliente aplicar seus próprios padrões
  // (modelo, temperatura) em vez de recebê-los duplicados aqui.
  const args = { system, user };
  if (model !== undefined) args.model = model;
  if (temperature !== undefined) args.temperature = temperature;
  if (jsonMode !== undefined) args.jsonMode = jsonMode;
  if (maxTokens !== undefined) args.maxTokens = maxTokens;

  const out = await adapter(args);
  return {
    content: out.content,
    usage: out.usage || {},
    model: out.model,
    provider: name,
    // Por que o provedor parou de escrever. 'length' = cortou no teto de tokens.
    finishReason: out.finishReason || null
  };
}

// Falha dura do provedor: ele não respondeu, ou respondeu nada. Retry no mesmo
// provedor não conserta provedor fora do ar — outro provedor conserta.
//
// Corte de token e JSON inválido NÃO entram aqui de propósito: os dois só são
// visíveis contra o schema da skill, e `lib/ai/skills/run.js` já tem retry
// próprio para eles (dobra o teto / manda a correção). Duplicar aquilo aqui
// gastaria duas chamadas para resolver o que uma resolve.
export async function runText({ system, user, provider, model, temperature, jsonMode, maxTokens }) {
  const name = provider || resolveTextProvider();
  const args = { system, user, model, temperature, jsonMode, maxTokens };

  let primeiroErro;
  try {
    const out = await callAdapter(name, args);
    if (String(out.content || '').trim()) return out;
    // Resposta vazia gasta o mesmo tempo de uma falha e entrega menos: para
    // quem chamou, é indistinguível de não ter chamado.
    primeiroErro = new Error(`${name}: resposta vazia.`);
  } catch (error) {
    primeiroErro = error;
  }

  const reserva = resolveFallbackProvider(name);
  if (!reserva) throw primeiroErro;

  try {
    // Sem `model`: o modelo pertence ao provedor, e pedir deepseek-v4-pro ao
    // Groq é pedir um modelo que a outra API não conhece.
    return await callAdapter(reserva, { ...args, model: undefined });
  } catch {
    // O erro do principal é o que explica a queda; o do reserva só diz que o
    // plano B também não salvou.
    throw primeiroErro;
  }
}
