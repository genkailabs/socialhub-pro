import Link from 'next/link';
import { Coins, Sparkles, AlertCircle, CheckCircle2, Cpu, Image as ImageIcon, DollarSign, Layers, ExternalLink } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { getAICostsSummary } from '@/lib/ai-costs-data';
import { actionLabel, ACTION_OPTIONS, COST_PERIODS } from '@/lib/ai-costs-labels';
import { formatUsd } from '@/lib/ai/cost';
import { BrandBadge } from '@/components/workspace/BrandBadge';
import { listBrands } from '@/lib/brands-data';
import { createClient } from '@/lib/supabase/server';
import { canAccessAICosts } from '@/lib/admin-access';
import { redirect } from 'next/navigation';

function StatCard({ label, value, hint, icon: Icon, accent, badge }) {
  return (
    <Card className="relative overflow-hidden p-5 transition-all hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className={`mt-2 text-2xl font-extrabold tracking-tight ${accent ? 'text-accent' : 'text-ink'}`}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-muted'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {badge && (
        <span className="mt-3 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-extrabold text-muted">
          {badge}
        </span>
      )}
    </Card>
  );
}

export default async function AICostsPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!canAccessAICosts(user?.email)) redirect('/dashboard');

  const sp = (await searchParams) || {};
  const filters = {
    brandId: sp.brand || '',
    action: sp.action || '',
    period: sp.period || 'all',
    page: Number(sp.page) || 1
  };
  const brands = await listBrands();
  const result = await getAICostsSummary({
    brandId: filters.brandId || null,
    skillId: filters.action || null,
    period: filters.period,
    page: filters.page
  });
  const summary = result?.summary || {
    totalUsd: 0,
    deepseekUsd: 0,
    imageUsd: 0,
    researchUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    deepseekCount: 0,
    imageCount: 0,
    researchCount: 0,
    errorCount: 0,
    totalJobs: 0
  };
  const pollinationsUsd = Math.round((summary.imageUsd + summary.researchUsd) * 1e6) / 1e6;
  const jobs = result?.jobs || [];
  const total = result?.total || 0;
  const pageSize = result?.pageSize || 50;
  const page = result?.page || 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // Preserva os filtros nos links do paginador.
  const pageHref = (p) => {
    const q = new URLSearchParams();
    if (filters.brandId) q.set('brand', filters.brandId);
    if (filters.action) q.set('action', filters.action);
    if (filters.period && filters.period !== 'all') q.set('period', filters.period);
    if (p > 1) q.set('page', String(p));
    const s = q.toString();
    return s ? `/ai-costs?${s}` : '/ai-costs';
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            <Coins className="h-3.5 w-3.5" /> Controle de Consumo & Custos
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Dashboard de Custos de IA</h1>
        <p className="mt-1 text-sm text-muted">
          Detalhamento em tempo real do uso do <strong className="text-ink">DeepSeek (texto & prompt)</strong> e do <strong className="text-ink">Pollinations (imagens & pesquisa)</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Custo Total IA"
          value={formatUsd(summary.totalUsd)}
          hint={`${summary.totalJobs} requisição(ões) registradas`}
          icon={DollarSign}
          accent
        />
        <StatCard
          label="Custo DeepSeek"
          value={formatUsd(summary.deepseekUsd)}
          hint={`${summary.deepseekCount} chamadas de texto`}
          icon={Cpu}
          badge={`${summary.totalInputTokens + summary.totalOutputTokens} tokens processados`}
        />
        <StatCard
          label="Custo Pollinations"
          value={formatUsd(pollinationsUsd)}
          hint={`${summary.imageCount} imagens · ${summary.researchCount} pesquisas`}
          icon={ImageIcon}
        />
        <StatCard
          label="Taxa de Erros"
          value={`${summary.errorCount} falha(s)`}
          hint={summary.errorCount > 0 ? 'Erros como saldo insuficiente' : 'Todas as chamadas bem-sucedidas'}
          icon={AlertCircle}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Histórico de Chamadas (DeepSeek & Pollinations)</h2>
          <form method="GET" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Marca
              <select name="brand" defaultValue={filters.brandId} className="h-9 rounded-lg border border-line bg-surface-2 px-2 text-xs font-semibold text-ink">
                <option value="">Todas</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Ação
              <select name="action" defaultValue={filters.action} className="h-9 rounded-lg border border-line bg-surface-2 px-2 text-xs font-semibold text-ink">
                <option value="">Todas</option>
                {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Período
              <select name="period" defaultValue={filters.period} className="h-9 rounded-lg border border-line bg-surface-2 px-2 text-xs font-semibold text-ink">
                {COST_PERIODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-xs font-bold text-white">Filtrar</button>
            <Link href="/ai-costs" className="flex h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:text-ink">Limpar</Link>
          </form>
        </div>
        {jobs.length === 0 ? (
          <EmptyState title="Nenhum custo registrado ainda" icon={Sparkles}>
            Gere posts no Composer ou no Planejamento para ver o detalhamento por requisição.
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-2xl glass shadow-soft">
            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-xs font-bold uppercase tracking-wider text-muted shadow-sm">
                    <th className="px-4 py-3">Provedor / Modelo</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Marca</th>
                    <th className="px-4 py-3">Tokens (In / Out)</th>
                    <th className="px-4 py-3">Custo (USD)</th>
                    <th className="px-4 py-3">Tentativa</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {jobs.map((job) => {
                    const brand = job.brands || {};
                    const isDeepSeek = job.provider === 'deepseek';
                    const isResearch = job.kind === 'research';
                    const providerLabel = isDeepSeek ? 'DeepSeek' : isResearch ? 'Pesquisa' : 'Imagem';
                    const dateStr = job.created_at
                      ? new Date(job.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-';

                    return (
                      <tr key={job.id} className="transition-colors hover:bg-surface-2/30">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-extrabold ${
                                isDeepSeek
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'bg-accent/10 text-accent'
                              }`}
                            >
                              {isDeepSeek ? <Cpu className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                              {providerLabel}
                            </span>
                            <span className="text-xs font-semibold text-muted">{job.model || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {job.ref_post_id ? (
                            <Link href={`/content/${job.ref_post_id}/review`} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                              {actionLabel(job)}<ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </Link>
                          ) : (
                            <span className="font-semibold text-ink">{actionLabel(job)}</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {brand.name && <BrandBadge name={brand.name} color={brand.color} size={20} />}
                            <span className="font-semibold text-ink">{brand.name || 'Geral'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-muted">
                          {isDeepSeek ? (
                            <span>
                              <strong className="text-ink">{job.input_tokens || 0}</strong> in /{' '}
                              <strong className="text-ink">{job.output_tokens || 0}</strong> out
                            </span>
                          ) : (
                            <span className="text-faint">{isResearch ? 'pesquisa web' : '1 imagem'}</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-extrabold text-accent">{formatUsd(job.cost_usd)}</span>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          <span className="text-muted">{job.retry_attempt > 1 ? `${job.retry_attempt}ª tentativa` : '1ª'}</span>
                          {job.charged && job.status === 'error' && (
                            <span className="ml-1 inline-flex items-center rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning" title="Falhou mas consumiu tokens">cobrado</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {job.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" /> OK
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                              title={job.error}
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span className="max-w-[180px] truncate">{job.error || 'Erro'}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-xs text-faint">{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-xs text-muted">
              <span>{total} registro(s) · página {page} de {pageCount}</span>
              <div className="flex items-center gap-2">
                {page > 1
                  ? <Link href={pageHref(page - 1)} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-ink hover:border-accent/40">Anterior</Link>
                  : <span className="rounded-lg border border-line px-3 py-1.5 font-semibold text-faint opacity-50">Anterior</span>}
                {page < pageCount
                  ? <Link href={pageHref(page + 1)} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-ink hover:border-accent/40">Próxima</Link>
                  : <span className="rounded-lg border border-line px-3 py-1.5 font-semibold text-faint opacity-50">Próxima</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
