// Instagram Insights (alcance, impressões, salvamentos, visitas ao perfil).
//
// Diferente de perfil/mídia, estas métricas exigem `instagram_manage_insights` e
// só existem para conta profissional. Faltar permissão é um estado ESPERADO do
// produto, não uma falha: devolvemos null e o diagnóstico segue, listando as
// métricas como indisponíveis (lib/meta/audit.js). A skill é proibida de tratar
// ausência como zero (PRD §9.2).

const GRAPH = 'https://graph.facebook.com/v20.0';

// Métricas do Graph -> nomes usados no resumo do diagnóstico.
const METRIC_MAP = {
  reach: 'reach',
  impressions: 'impressions',
  saved: 'saves',
  shares: 'shares',
  profile_views: 'profileViews'
};

// A Meta sinaliza "voce nao pode ver isso" de varias formas. Todas significam a
// mesma coisa para o produto: siga sem a metrica.
export const MISSING_PERMISSION_CODES = new Set([
  10,  // permissão ausente
  200, // sem permissão para o recurso
  803  // objeto não visível para o app
]);

// Subcódigos de "métrica não suportada para esta conta" (ex.: conta pessoal).
const UNSUPPORTED_SUBCODES = new Set([2108006, 2108001]);

export function parseInsights(payload) {
  const rows = payload?.data;
  if (!Array.isArray(rows)) return {};

  const out = {};
  for (const row of rows) {
    const key = METRIC_MAP[row?.name];
    if (!key) continue; // métrica que não pedimos ou não entendemos
    const total = (row.values || []).reduce((sum, v) => sum + (Number(v?.value) || 0), 0);
    out[key] = total;
  }
  return out;
}

export async function fetchInstagramInsights(igId, token, { period = 'days_28' } = {}) {
  const metrics = Object.keys(METRIC_MAP).join(',');
  const url = `${GRAPH}/${igId}/insights?metric=${metrics}&period=${period}&access_token=${token}`;

  let data;
  try {
    data = await (await fetch(url, { next: { revalidate: 600 } })).json();
  } catch {
    // Rede fora não pode derrubar o diagnóstico inteiro.
    return null;
  }

  const error = data?.error;
  if (error) {
    // Token inválido/expirado precisa chegar até a tela de reconexão.
    if (error.code === 190) throw new Error(`Graph API (insights): token invalido ou expirado — ${error.message}`);
    if (MISSING_PERMISSION_CODES.has(error.code) || UNSUPPORTED_SUBCODES.has(error.error_subcode)) return null;
    // Erro desconhecido: melhor seguir sem a métrica do que perder o diagnóstico.
    return null;
  }

  const parsed = parseInsights(data);
  return Object.keys(parsed).length ? parsed : null;
}
