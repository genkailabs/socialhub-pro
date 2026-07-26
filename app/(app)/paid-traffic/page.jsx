import { BarChart3 } from 'lucide-react';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getPaidTrafficReport, getPendingAdAccounts } from '@/lib/paid-traffic/data';
import { ConnectionChecklist } from '@/components/paid-traffic/ConnectionChecklist';
import { AccountPicker } from '@/components/paid-traffic/AccountPicker';
import { PaidTrafficKpis } from '@/components/paid-traffic/PaidTrafficKpis';
import { CampaignTable } from '@/components/paid-traffic/CampaignTable';

function validDays(value) {
  return [1, 7, 30].includes(Number(value)) ? Number(value) : 30;
}

export default async function PaidTrafficPage({ searchParams = {} }) {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const days = validDays(searchParams.period);
  const notice = searchParams.warning || (searchParams.status === 'connected' ? 'Conta de anúncios conectada e primeira leitura concluída.' : null);
  const error = searchParams.error;

  if (!active) return <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">Crie uma marca antes de conectar uma conta de anúncios.</div>;
  const report = await getPaidTrafficReport({ brandId: active.id, days });
  const pendingAccounts = !report.account ? await getPendingAdAccounts(active.id) : [];

  return <div className="space-y-7">
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    <header className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Análise de desempenho</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink"><BarChart3 className="h-6 w-6" />Tráfego pago</h1>
        <p className="mt-1 text-sm text-muted">Resultados pagos da Meta separados do desempenho orgânico de {active.name}.</p>
      </div>
      <div className="flex gap-2">{[1, 7, 30].map((value) => <a key={value} href={`/paid-traffic?period=${value}`} className={`rounded-lg border px-3 py-2 text-xs font-bold ${days === value ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-muted'}`}>{value === 1 ? 'Hoje' : `${value} dias`}</a>)}</div>
    </header>
    {!report.account ? (pendingAccounts.length ? <AccountPicker brandId={active.id} accounts={pendingAccounts} /> : <ConnectionChecklist brandId={active.id} />) : <>
      <div className="rounded-2xl border border-line bg-surface p-4"><p className="text-xs font-bold text-ink">{report.account.name}</p><p className="mt-1 text-xs text-muted">Conta {report.account.meta_account_id} · moeda {report.account.currency} · status {report.account.account_status || 'indisponível'}</p></div>
      <PaidTrafficKpis summary={report.summary} currency={report.account.currency} rangeLabel={days === 1 ? 'hoje' : `últimos ${days} dias`} syncedAt={report.account.last_synced_at} />
      <section className="space-y-3"><div><h2 className="text-base font-bold text-ink">Campanhas</h2><p className="text-sm text-muted">Dados de leitura. Esta janela não cria nem altera campanhas.</p></div><CampaignTable campaigns={report.campaigns} currency={report.account.currency} /></section>
    </>}
  </div>;
}
