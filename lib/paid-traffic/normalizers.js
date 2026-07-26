function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function findActionValue(rows, names) {
  if (!Array.isArray(rows)) return null;
  const row = rows.find((item) => names.includes(item?.action_type));
  return optionalNumber(row?.value);
}

function rounded(value, decimals = 2) {
  return value === null ? null : Number(value.toFixed(decimals));
}

export function normalizeInsight(row = {}, currency) {
  const spend = optionalNumber(row.spend);
  const impressions = optionalNumber(row.impressions);
  const reach = optionalNumber(row.reach);
  const frequency = optionalNumber(row.frequency);
  const linkClicks = optionalNumber(row.inline_link_clicks) ?? optionalNumber(row.clicks);
  const results = findActionValue(row.actions, ['offsite_conversion.fb_pixel_purchase', 'lead', 'onsite_conversion.lead_grouped']);
  const costPerResult = findActionValue(row.cost_per_action_type, ['offsite_conversion.fb_pixel_purchase', 'lead', 'onsite_conversion.lead_grouped']);
  const ctr = impressions && linkClicks !== null ? rounded((linkClicks / impressions) * 100) : null;
  const cpc = linkClicks && spend !== null ? rounded(spend / linkClicks) : null;

  return {
    metaObjectId: row.campaign_id || row.adset_id || row.ad_id || null,
    name: row.campaign_name || row.adset_name || row.ad_name || null,
    dateStart: row.date_start || null,
    dateStop: row.date_stop || null,
    currency: currency || row.account_currency || null,
    spend,
    impressions,
    reach,
    frequency,
    linkClicks,
    ctr,
    cpc,
    cpm: optionalNumber(row.cpm),
    results,
    costPerResult,
    fetchedAt: new Date().toISOString()
  };
}

export function summarizeInsights(insights = []) {
  const rows = insights.filter(Boolean);
  const currencies = [...new Set(rows.map((row) => row.currency).filter(Boolean))];
  if (currencies.length > 1) throw new Error('Nao e permitido somar insights de moedas diferentes.');
  const sum = (key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
  const spend = sum('spend');
  const impressions = sum('impressions');
  const linkClicks = sum('linkClicks');
  return {
    currency: currencies[0] || null,
    spend,
    impressions,
    reach: sum('reach'),
    linkClicks: rows.some((row) => row.linkClicks !== null) ? linkClicks : null,
    ctr: impressions && rows.some((row) => row.linkClicks !== null) ? rounded((linkClicks / impressions) * 100) : null,
    cpc: linkClicks && rows.some((row) => row.spend !== null) ? rounded(spend / linkClicks) : null
  };
}
