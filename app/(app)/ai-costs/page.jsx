import { Coins, Sparkles, AlertCircle, CheckCircle2, Cpu, Image as ImageIcon, DollarSign, Layers } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAICostsSummary } from '@/lib/ai-costs-data';
import { formatUsd } from '@/lib/ai/cost';
import { BrandBadge } from '@/components/workspace/BrandBadge';

function StatCard({ label, value, hint, icon: Icon, accent, badge }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-soft transition-all hover:border-line-strong">
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
    </div>
  );
}

export default async function AICostsPage() {
  const result = await getAICostsSummary();
  const summary = result?.summary || {
    totalUsd: 0,
    deepseekUsd: 0,
    deapiUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    deepseekCount: 0,
    deapiCount: 0,
    errorCount: 0,
    totalJobs: 0
  };
  const jobs = result?.jobs || [];

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
          Detalhamento em tempo real do uso do <strong className="text-ink">DeepSeek (texto & prompt)</strong> e da <strong className="text-ink">deAPI (geração de imagens)</strong>.
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
          label="Custo deAPI (Imagens)"
          value={formatUsd(summary.deapiUsd)}
          hint={`${summary.deapiCount} artes geradas por IA`}
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
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Histórico de Chamadas (DeepSeek & deAPI)</h2>
        {jobs.length === 0 ? (
          <EmptyState title="Nenhum custo registrado ainda" icon={Sparkles}>
            Gere posts no Composer ou no Piloto Automático para ver o detalhamento por requisição.
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">Provedor / Modelo</th>
                    <th className="px-4 py-3">Marca</th>
                    <th className="px-4 py-3">Tokens (In / Out)</th>
                    <th className="px-4 py-3">Custo (USD)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {jobs.map((job) => {
                    const brand = job.brands || {};
                    const isDeepSeek = job.provider === 'deepseek';
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
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              }`}
                            >
                              {isDeepSeek ? <Cpu className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                              {isDeepSeek ? 'DeepSeek' : 'deAPI'}
                            </span>
                            <span className="text-xs font-semibold text-muted">{job.model || '-'}</span>
                          </div>
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
                            <span className="text-faint">1 imagem</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-extrabold text-accent">{formatUsd(job.cost_usd)}</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
