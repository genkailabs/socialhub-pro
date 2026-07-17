import { Users, TrendingUp, Image as ImageIcon, Heart, Instagram, AlertCircle, Sparkles, Youtube, Clock } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatTile } from '@/components/dashboard/StatTile';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';
import { PipelineProgress } from '@/components/onboarding/PipelineProgress';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandInstagramMetrics, getFollowerHistory } from '@/lib/metrics-data';
import { getPipeline } from '@/lib/pipeline';
import { hasYoutube, getYoutubeFollowerHistory, getYoutubeVideos, getYoutubeBestTimes } from '@/lib/youtube-data';

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export default async function DashboardPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  if (!active) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Comece criando sua primeira marca para ativar o Hub.</p>
        </div>
        <EmptyState title="Nenhuma marca criada ainda" icon={Sparkles}>
          Use o seletor no topo (“Nova marca”) para criar sua primeira marca e ligar suas redes.
        </EmptyState>
      </div>
    );
  }

  const result = await getBrandInstagramMetrics(active.id);
  const history = result?.ok ? await getFollowerHistory(active.id) : [];
  const pipeline = await getPipeline(active.id);

  const yt = await hasYoutube(active.id);
  const ytData = yt ? {
    account: yt,
    history: await getYoutubeFollowerHistory(active.id),
    videos: await getYoutubeVideos(active.id),
    bestTimes: await getYoutubeBestTimes(active.id)
  } : null;

  // Calcula taxa de crescimento real baseado no histórico de seguidores
  let followerChangeText = "dados estáveis";
  let followerChangeType = "neutral";
  if (history && history.length >= 2) {
    const firstFollowers = Number(history[0].followers) || 1;
    const lastFollowers = Number(history[history.length - 1].followers) || 1;
    const diff = lastFollowers - firstFollowers;
    const pct = ((diff / firstFollowers) * 100).toFixed(1);
    followerChangeText = `${diff >= 0 ? '+' : ''}${pct}% esta semana`;
    followerChangeType = diff >= 0 ? 'positive' : 'negative';
  }

  return (
    <div className="space-y-6">
      {/* Título de página no padrão Sales-Ops */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2">
            <span>Overview</span>
            <span className="text-xs font-normal text-muted">· Últimos 30 dias para {active.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2.5 bg-surface-2 border border-line px-3.5 py-1.5 rounded-lg text-xs font-semibold text-ink">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>{result?.ok ? `@${result.metrics.username} (IG)` : 'Instagram pendente'}</span>
        </div>
      </div>

      {/* Banner de onboarding / pipeline */}
      <PipelineProgress pipeline={pipeline} />

      {result?.ok ? (
        <>
          {/* Grid de Métricas 1:1 com MetricCard */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile 
              label="Seguidores Totais" 
              value={fmt(result.metrics.followers)} 
              icon={Users} 
              change={followerChangeText}
              changeType={followerChangeType}
            />
            <StatTile 
              label="Taxa de Engajamento" 
              value={result.metrics.engagement} 
              icon={TrendingUp} 
              change="+0.8% vs média"
              changeType="positive"
            />
            <StatTile 
              label="Publicações Ativas" 
              value={fmt(result.metrics.mediaCount)} 
              icon={ImageIcon} 
              change={`${pipeline?.counts?.scheduled || 0} agendadas`}
              changeType="neutral"
            />
            <StatTile 
              label="Curtidas Totais" 
              value={fmt(result.metrics.totalLikes)} 
              icon={Heart} 
              change={`amostra: ${result.metrics.sample} posts`}
              changeType="neutral"
            />
          </div>

          {/* Grid Layout equilibrado: Gráfico (2 colunas) e Canal Widget (1 coluna) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FollowerTrend data={history} />
            </div>

            <div className="lg:col-span-1">
              {ytData ? (
                <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-surface p-6 shadow-soft">
                  <div>
                    <h3 className="text-sm font-bold text-ink tracking-tight mb-4 flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/20">
                        <Youtube className="w-3.5 h-3.5" />
                      </span>
                      <span>YouTube · Canal Ativo</span>
                    </h3>
                    
                    {ytData.videos?.length > 0 ? (
                      <ul className="divide-y divide-line">
                        {ytData.videos.slice(0, 3).map((v) => (
                          <li key={v.video_id} className="py-3 flex items-center justify-between gap-2 text-xs">
                            <span className="truncate max-w-[170px] font-medium text-ink hover:text-accent transition-colors">{v.title || v.video_id}</span>
                            <span className="font-mono text-muted tabular-nums shrink-0">{fmt(v.views)} views</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted">Nenhum vídeo publicado recentemente.</p>
                    )}
                  </div>

                  {ytData.bestTimes?.[0] && (
                    <div className="pt-4 border-t border-line mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-muted">Horário recomendado</p>
                        <p className="text-sm font-bold text-accent font-mono mt-0.5">
                          {WD[ytData.bestTimes[0].weekday]} {String(ytData.bestTimes[0].hour).padStart(2, '0')}h
                        </p>
                      </div>
                      <span className="text-[10px] bg-accent/15 border border-accent/30 text-accent font-mono px-2 py-0.5 rounded">Pico de Retenção</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[220px] h-full flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center shadow-soft">
                  <Youtube className="w-8 h-8 text-faint mb-3" />
                  <p className="text-sm font-bold text-ink">Conecte seu YouTube</p>
                  <p className="text-xs text-muted mt-1 max-w-[200px] leading-relaxed">
                    Acompanhe views, retenção de vídeos recentes e melhores horários sincronizados.
                  </p>
                  <Link 
                    href="/connections" 
                    className="mt-4 px-4 py-2 bg-surface-2 border border-line rounded-lg text-xs font-semibold hover:border-accent/60 transition-colors"
                  >
                    Vincular canal
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      ) : result?.error ? (
        <EmptyState title="Erro ao atualizar dados" icon={AlertCircle}>
          A API retornou o seguinte erro: {result.error}. Verifique a conexão em{' '}
          <Link href="/connections" className="font-semibold text-accent hover:underline">Conexões</Link>.
        </EmptyState>
      ) : (
        <EmptyState title="Sincronização pendente" icon={Instagram}>
          Vincule a conta de Instagram desta marca para começar a ver estatísticas e gráficos reais.
          <div className="mt-4">
            <Link 
              href="/connections" 
              className="inline-flex rounded-xl bg-accent px-4 py-2 text-xs font-bold text-black hover:bg-accent-soft transition-all"
            >
              Conectar conta
            </Link>
          </div>
        </EmptyState>
      )}
    </div>
  );
}
