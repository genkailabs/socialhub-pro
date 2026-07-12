// Estimativa de custo por geração (USD). Preços aproximados do DeepSeek —
// ajuste conforme a tabela vigente. Registrado por transparência (núcleo honesto).
export const DEEPSEEK_PRICING = {
  'deepseek-chat': { inPerM: 0.27, outPerM: 1.10 }
};

export function estimateCostUsd(model, usage) {
  const p = DEEPSEEK_PRICING[model] || DEEPSEEK_PRICING['deepseek-chat'];
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

export function formatUsd(v) {
  const n = Number(v) || 0;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
