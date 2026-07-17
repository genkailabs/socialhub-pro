import { deepseekChat } from '@/lib/ai/deepseek';
import { geminiChat } from '@/lib/ai/gemini';

// Camada de provedores de texto. Quem gera conteúdo (skills, autopilot, studio)
// chama runText e não sabe qual API está do outro lado. Trocar de provedor é
// mudar AI_TEXT_PROVIDER — nenhuma skill precisa ser reescrita.
//
// Os dois clientes já devolvem { content, usage, model } com usage no formato
// prompt_tokens/completion_tokens, então o adapter aqui é fino de propósito.
const ADAPTERS = {
  deepseek: deepseekChat,
  gemini: geminiChat
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

export async function runText({ system, user, provider, model, temperature, jsonMode }) {
  const name = provider || resolveTextProvider();
  const adapter = ADAPTERS[name];
  if (!adapter) throw new Error(`Provedor de texto desconhecido: ${name}. Use ${listTextProviders().join(' ou ')}.`);

  // Só repassa o que foi pedido, para cada cliente aplicar seus próprios padrões
  // (modelo, temperatura) em vez de recebê-los duplicados aqui.
  const args = { system, user };
  if (model !== undefined) args.model = model;
  if (temperature !== undefined) args.temperature = temperature;
  if (jsonMode !== undefined) args.jsonMode = jsonMode;

  const out = await adapter(args);
  return {
    content: out.content,
    usage: out.usage || {},
    model: out.model,
    provider: name
  };
}
