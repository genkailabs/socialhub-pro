import 'server-only';
import { getInsights } from '@/lib/meta/marketing-api';
import { normalizeInsight } from '@/lib/paid-traffic/normalizers';

export async function syncPaidTraffic({ admin, brandId, account, token, days = 30, now = new Date() }) {
  const until = now.toISOString().slice(0, 10);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - Math.max(0, Math.min(Number(days) || 30, 90) - 1));
  const since = start.toISOString().slice(0, 10);
  const insights = await getInsights({ accountId: account.meta_account_id || account.id, token, level: 'campaign', since, until });
  const fetchedAt = now.toISOString();
  const rows = insights.map((item) => {
    const report = normalizeInsight(item, account.currency);
    if (!report.metaObjectId || !report.dateStart || !report.dateStop) return null;
    return {
      brand_id: brandId, ad_account_id: account.id, level: 'campaign', meta_object_id: report.metaObjectId,
      snapshot_date: report.dateStop, range_start: report.dateStart, range_end: report.dateStop,
      payload: report, fetched_at: fetchedAt
    };
  }).filter(Boolean);
  if (rows.length) {
    const { error } = await admin.from('meta_ads_snapshots').upsert(rows, {
      onConflict: 'ad_account_id,level,meta_object_id,snapshot_date,range_start,range_end'
    });
    if (error) throw new Error('Nao foi possivel salvar os dados de leitura da Meta.');
  }
  const { error: accountError } = await admin.from('meta_ad_accounts')
    .update({ last_synced_at: fetchedAt }).eq('id', account.id).eq('brand_id', brandId);
  if (accountError) throw new Error('Nao foi possivel registrar a sincronizacao da Meta.');
  return { since, until, count: rows.length };
}
