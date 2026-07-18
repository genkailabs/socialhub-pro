// Monta as linhas de generation_jobs a partir de um resultado de generateCreative.
// Puro/sem I/O — usado pelo post avulso (textKind:'post') e pelo Autopilot
// (textKind:'autopilot'), sem duplicar a lógica de log entre os dois fluxos.
// Registra pesquisa, texto e imagem em linhas separadas (núcleo honesto).
export function buildGenerationJobs({ brandId, gen, textKind, refPostId = null }) {
  const rows = [{
    brand_id: brandId, kind: textKind, provider: 'deepseek', model: gen.model,
    input_tokens: gen.usage?.prompt_tokens || 0, output_tokens: gen.usage?.completion_tokens || 0,
    cost_usd: gen.textCost, status: 'success', ref_post_id: refPostId
  }];

  if (gen.research) {
    rows.push({
      brand_id: brandId, kind: 'research', provider: 'tavily', model: gen.research.model,
      input_tokens: gen.research.usage?.prompt_tokens || 0, output_tokens: gen.research.usage?.completion_tokens || 0,
      cost_usd: gen.research.cost || 0, status: gen.research.cached ? 'cached' : 'success', ref_post_id: refPostId
    });
  }

  if (gen.imageProvider === 'pollinations') {
    rows.push({
      brand_id: brandId, kind: 'image', provider: 'pollinations', model: gen.imageModel,
      cost_usd: gen.imageCost, status: 'success', ref_post_id: refPostId
    });
  }

  return rows;
}
