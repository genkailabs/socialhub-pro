import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getPaidTrafficReport } from '@/lib/paid-traffic/data';
import { PaidTrafficKpis } from '@/components/paid-traffic/PaidTrafficKpis';

export default async function PaidTrafficCampaignPage({ params }) {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  if (!active) notFound();
  const report = await getPaidTrafficReport({ brandId: active.id, days: 30 });
  const campaign = report.campaigns.find((item) => item.metaObjectId === params.campaignId);
  if (!report.account || !campaign) notFound();
  return <div className="space-y-6"><Link href="/paid-traffic" className="text-xs font-bold text-accent">← Voltar para tráfego pago</Link><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Campanha Meta</p><h1 className="mt-1 text-2xl font-bold text-ink">{campaign.name || 'Campanha sem nome'}</h1><p className="mt-1 text-sm text-muted">Dados pagos dos últimos 30 dias. Status: {campaign.effectiveStatus || 'indisponível'}.</p></header><PaidTrafficKpis summary={campaign} currency={report.account.currency} rangeLabel="últimos 30 dias" syncedAt={campaign.fetchedAt} /><div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">O detalhamento por conjunto e anúncio será liberado quando a sincronização Meta estiver autorizada para esta conta.</div></div>;
}
