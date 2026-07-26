import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { summarizeInsights } from '@/lib/paid-traffic/normalizers';

export async function getActiveAdAccount(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('meta_ad_accounts')
    .select('id,meta_account_id,name,currency,account_status,last_synced_at')
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .maybeSingle();
  return data || null;
}

export async function getPendingAdAccounts(brandId) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdmin();
  const { data } = await admin.from('meta_ads_tokens')
    .select('account_options')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle();
  return Array.isArray(data?.account_options) ? data.account_options : [];
}

export async function getPaidTrafficReport({ brandId, days = 30 }) {
  const account = await getActiveAdAccount(brandId);
  if (!account) return { account: null, campaigns: [], summary: null };
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - Math.max(0, Math.min(Number(days) || 30, 90) - 1));
  const from = start.toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data } = await supabase
    .from('meta_ads_snapshots')
    .select('meta_object_id,payload,range_start,range_end,fetched_at')
    .eq('brand_id', brandId)
    .eq('ad_account_id', account.id)
    .eq('level', 'campaign')
    .gte('snapshot_date', from)
    .order('snapshot_date', { ascending: false });
  const snapshots = data || [];
  const grouped = new Map();
  for (const row of snapshots) {
    const item = { ...row.payload, rangeStart: row.range_start, rangeEnd: row.range_end, fetchedAt: row.fetched_at };
    const current = grouped.get(row.meta_object_id);
    if (!current) {
      grouped.set(row.meta_object_id, { ...item });
      continue;
    }
    const aggregate = summarizeInsights([current, item]);
    grouped.set(row.meta_object_id, {
      ...current,
      ...aggregate,
      rangeStart: item.rangeStart < current.rangeStart ? item.rangeStart : current.rangeStart,
      rangeEnd: item.rangeEnd > current.rangeEnd ? item.rangeEnd : current.rangeEnd,
      fetchedAt: item.fetchedAt > current.fetchedAt ? item.fetchedAt : current.fetchedAt
    });
  }
  const campaigns = [...grouped.values()];
  return {
    account,
    campaigns,
    summary: campaigns.length ? summarizeInsights(campaigns) : null
  };
}
