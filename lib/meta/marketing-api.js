import 'server-only';

export const MARKETING_GRAPH_VERSION = 'v21.0';
const GRAPH = `https://graph.facebook.com/${MARKETING_GRAPH_VERSION}`;
const TIMEOUT_MS = 12_000;

export class MetaMarketingError extends Error {
  constructor({ code, subcode, message, retryable = false }) {
    super(message || 'Falha ao consultar a Meta Marketing API.');
    this.code = code || null;
    this.subcode = subcode || null;
    this.retryable = retryable;
  }
}

function sanitizeMessage(value) {
  return String(value || 'Falha ao consultar a Meta Marketing API.')
    .replace(/access_token=[^&\s]+/gi, 'access_token=[removido]');
}

async function graphGet(path, token, params = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const query = new URLSearchParams(params);
    const response = await fetch(`${GRAPH}/${path}?${query}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json();
    if (!response.ok || payload?.error) {
      const error = payload?.error || {};
      throw new MetaMarketingError({
        code: error.code || response.status,
        subcode: error.error_subcode,
        message: sanitizeMessage(error.message),
        retryable: response.status === 429 || response.status >= 500
      });
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new MetaMarketingError({ message: 'A consulta da Meta excedeu o tempo limite.', retryable: true });
    if (error instanceof MetaMarketingError) throw error;
    throw new MetaMarketingError({ message: sanitizeMessage(error.message), retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

export async function listAdAccounts(token) {
  const payload = await graphGet('me/adaccounts', token, { fields: 'id,name,account_status,currency', limit: '100' });
  return payload.data || [];
}

export async function listCampaigns({ accountId, token, after, limit = 50 }) {
  const payload = await graphGet(`${accountId}/campaigns`, token, {
    fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time',
    limit: String(Math.min(Math.max(Number(limit) || 50, 1), 100)),
    ...(after ? { after } : {})
  });
  return { data: payload.data || [], nextCursor: payload.paging?.cursors?.after || null };
}

export async function getInsights({ accountId, token, level = 'campaign', since, until }) {
  const timeRange = since && until ? JSON.stringify({ since, until }) : undefined;
  const payload = await graphGet(`${accountId}/insights`, token, {
    level,
    fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,date_start,date_stop,spend,impressions,reach,frequency,clicks,inline_link_clicks,ctr,cpc,cpm,actions,cost_per_action_type',
    limit: '100',
    ...(timeRange ? { time_range: timeRange } : {})
  });
  return payload.data || [];
}
