// Estimativa de custo por geração (USD). Preços aproximados do DeepSeek —
// ajuste conforme a tabela vigente. Registrado por transparência (núcleo honesto).
export const DEEPSEEK_PRICING = {
  'deepseek-v4-flash': { inPerM: 0.14, outPerM: 0.28 },
  'deepseek-v4-pro': { inPerM: 0.435, outPerM: 0.87 },
  'deepseek-chat': { inPerM: 0.14, outPerM: 0.28 } // legado, mapeia p/ v4-flash até depreciar 2026-07-24
};

export function estimateCostUsd(model, usage) {
  const p = DEEPSEEK_PRICING[model] || DEEPSEEK_PRICING['deepseek-v4-flash'];
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
