// Estimativa de custo por geração (USD). Preços aproximados do DeepSeek —
// ajuste conforme a tabela vigente. Registrado por transparência (núcleo honesto).
export const DEEPSEEK_PRICING = {
  'deepseek-v4-flash': { inPerM: 0.14, outPerM: 0.28 },
  'deepseek-v4-pro': { inPerM: 0.435, outPerM: 0.87 },
  'deepseek-chat': { inPerM: 0.14, outPerM: 0.28 } // alias aposentado em 2026-07-24; preço fica p/ ler jobs antigos
};

// Preços do Groq (USD por milhão de tokens), usado como fallback de texto.
// Sem entrada própria, um job do Groq entrava no histórico com o preço do
// DeepSeek — /ai-costs mostraria um número que ninguém cobrou. Ajuste conforme
// a tabela vigente; o modelo é escolhido por GROQ_MODEL.
export const GROQ_PRICING = {
  'openai/gpt-oss-20b': { inPerM: 0.10, outPerM: 0.50 },
  'openai/gpt-oss-120b': { inPerM: 0.15, outPerM: 0.75 },
  'llama-3.3-70b-versatile': { inPerM: 0.59, outPerM: 0.79 },
  'llama-3.1-8b-instant': { inPerM: 0.05, outPerM: 0.08 }
};

const PRICING = { ...DEEPSEEK_PRICING, ...GROQ_PRICING };

export function estimateCostUsd(model, usage) {
  const p = PRICING[model] || DEEPSEEK_PRICING['deepseek-v4-flash'];
  const inT = usage?.prompt_tokens || 0;
  const outT = usage?.completion_tokens || 0;
  const cost = (inT / 1e6) * p.inPerM + (outT / 1e6) * p.outPerM;
  return Math.round(cost * 1e6) / 1e6; // 6 casas
}

// Custo por imagem gerada via Pollinations (USD/pollen). Aproximado do flux;
// sobrescreva com POLLINATIONS_IMAGE_USD conforme o consumo real do dashboard.
export const POLLINATIONS_IMAGE_USD = Number(process.env.POLLINATIONS_IMAGE_USD) || 0.002;

export function pollinationsImageCostUsd(n = 1) {
  const count = Math.max(0, Number(n) || 0);
  return Math.round(count * POLLINATIONS_IMAGE_USD * 1e6) / 1e6;
}

// Custo aproximado por busca via Pollinations gemini-search (USD/pollen).
// Flat por chamada; ajustar por env conforme o consumo real do dashboard.
export const POLLINATIONS_SEARCH_USD = Number(process.env.POLLINATIONS_SEARCH_USD) || 0.001;

export function formatUsd(v) {
  const n = Number(v) || 0;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
