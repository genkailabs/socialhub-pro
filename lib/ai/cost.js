// Estimativa de custo por geração (USD). Preços aproximados do DeepSeek —
// ajuste conforme a tabela vigente. Registrado por transparência (núcleo honesto).
export const DEEPSEEK_PRICING = {
  'deepseek-v4-flash': { inPerM: 0.14, outPerM: 0.28 },
  'deepseek-v4-pro': { inPerM: 0.435, outPerM: 0.87 },
  'deepseek-chat': { inPerM: 0.14, outPerM: 0.28 }, // legado, mapeia p/ v4-flash até depreciar 2026-07-24
  // preços aproximados do Gemini — ajuste conforme a tabela vigente.
  'gemini-2.5-flash': { inPerM: 0.30, outPerM: 2.50 },
  'gemini-flash-latest': { inPerM: 0.30, outPerM: 2.50 }
};

export function estimateCostUsd(model, usage) {
  const p = DEEPSEEK_PRICING[model] || DEEPSEEK_PRICING['deepseek-v4-flash'];
  const inT = usage?.prompt_tokens || 0;
  const outT = usage?.completion_tokens || 0;
  const cost = (inT / 1e6) * p.inPerM + (outT / 1e6) * p.outPerM;
  return Math.round(cost * 1e6) / 1e6; // 6 casas
}

// Custo por imagem gerada na deAPI (USD). Varia por modelo — valor padrão
// aproximado do Flux schnell; sobrescreva com DEAPI_IMAGE_USD conforme a tabela.
export const DEAPI_IMAGE_USD = Number(process.env.DEAPI_IMAGE_USD) || 0.003;

export function deapiImageCostUsd(n = 1) {
  const count = Math.max(0, Number(n) || 0);
  return Math.round(count * DEAPI_IMAGE_USD * 1e6) / 1e6;
}

// Taxa fixa por chamada de Google Search Grounding (USD), além do custo de
// tokens. Aproximado; ajustar por env conforme a tabela vigente do Gemini.
export const GEMINI_GROUNDING_USD = Number(process.env.GEMINI_GROUNDING_USD) || 0.007;

// custo por imagem Gemini (USD) — aproximado; ajustar por env.
export const GEMINI_IMAGE_USD = Number(process.env.GEMINI_IMAGE_USD) || 0.039;
export function geminiImageCostUsd(n = 1) {
  const count = Math.max(0, Number(n) || 0);
  return Math.round(count * GEMINI_IMAGE_USD * 1e6) / 1e6;
}

export function formatUsd(v) {
  const n = Number(v) || 0;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
