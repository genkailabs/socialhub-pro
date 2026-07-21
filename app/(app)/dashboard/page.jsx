import { Instagram, AlertCircle, Sparkles, Youtube, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';
import { FollowersKpi } from '@/components/dashboard/FollowersKpi';
import { AgendaHoje } from '@/components/dashboard/AgendaHoje';
import { AprovacoesPendentes } from '@/components/dashboard/AprovacoesPendentes';
import { FlowStepper } from '@/components/onboarding/FlowStepper';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandInstagramMetrics, getFollowerHistory } from '@/lib/metrics-data';
import { getPipeline } from '@/lib/pipeline';
import { listPostsForBrand } from '@/lib/posts-data';
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
  const posts = await listPostsForBrand(active.id);
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled').sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const waitingPosts = posts.filter((p) => p.status === 'waiting_approval');

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

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6">
      {/* Cabeçalho no padrão do design (saudação + ação) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{greet}, {active.name}</h1>
          <p className="mt-1 text-sm text-muted">Veja o desempenho das suas redes hoje.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink">
            <span className={`h-2 w-2 rounded-full ${result?.ok ? 'bg-success' : 'bg-warning'}`} />
            <span>{result?.ok ? `@${result.metrics.username}` : 'IG pendente'}</span>
          </div>
          <Link href="/composer" className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgb(var(--c-accent)/0.5)] transition-colors hover:bg-accent-ink">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Criar post
          </Link>
        </div>
      </div>

      {/* Stepper fino do fluxo (substitui as 5 caixas iguais) */}
      <FlowStepper pipeline={pipeline} />

      {result?.ok ? (
        <>
          {/* Hero: gráfico (2fr) + KPI Seguidores e métricas secundárias (1fr) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FollowerTrend data={history} />
            </div>
            <div className="flex flex-col gap-4 lg:col-span-1">
              <FollowersKpi
                value={fmt(result.metrics.followers)}
                changeText={followerChangeText}
                changeType={followerChangeType}
                history={history}
              />
              {/* Métricas secundárias num único card com divisores (não 3 cards iguais) */}
              <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
                <dl className="divide-y divide-line">
                  <div className="flex items-center justify-between py-2.5 first:pt-0">
                    <dt className="text-[13px] text-muted">Engajamento médio</dt>
                    <dd className="font-mono text-sm font-semibold tabular-nums text-ink">{result.metrics.engagement}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[13px] text-muted">Curtidas</dt>
                    <dd className="font-mono text-sm font-semibold tabular-nums text-ink">{fmt(result.metrics.totalLikes)}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5 last:pb-0">
                    <dt className="text-[13px] text-muted">Publicações</dt>
                    <dd className="font-mono text-sm font-semibold tabular-nums text-ink">{fmt(result.metrics.mediaCount)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Agenda de hoje · Aprovações pendentes · Oportunidade do dia (IA) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <AgendaHoje posts={scheduledPosts} />
            <AprovacoesPendentes posts={waitingPosts} />

            <div className="rounded-3xl border border-line bg-surface-2 p-5 shadow-soft">
              <div className="flex items-start gap-3.5">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-accent">
                  <Sparkles className="h-[19px] w-[19px] text-white" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-ink">Oportunidade para hoje</h2>
                  <p className="mt-2 text-[13px] leading-[19px] text-muted">
                    {ytData?.bestTimes?.[0]
                      ? `Seu conteúdo publicado ${WD[ytData.bestTimes[0].weekday]} às ${String(ytData.bestTimes[0].hour).padStart(2, '0')}h costuma performar melhor. Aproveite o horário para o próximo post.`
                      : 'Publique com constância nesta semana para a IA calcular seu melhor horário de alcance.'}
                  </p>
                  <Link href="/planning" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-accent-ink">
                    Ver planejamento <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {ytData && (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-tight text-ink">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/20">
                  <Youtube className="w-3.5 h-3.5" />
                </span>
                <span>YouTube · Canal Ativo</span>
              </h3>
              {ytData.videos?.length > 0 ? (
                <ul className="divide-y divide-line">
                  {ytData.videos.slice(0, 3).map((v) => (
                    <li key={v.video_id} className="flex items-center justify-between gap-2 py-3 text-xs">
                      <span className="max-w-[220px] truncate font-medium text-ink">{v.title || v.video_id}</span>
                      <span className="shrink-0 font-mono tabular-nums text-muted">{fmt(v.views)} views</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">Nenhum vídeo publicado recentemente.</p>
              )}
            </div>
          )}
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
              className="inline-flex rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-ink transition-all"
            >
              Conectar conta
            </Link>
          </div>
        </EmptyState>
      )}
    </div>
  );
}
