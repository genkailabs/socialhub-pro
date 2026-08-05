import { Instagram, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';
import { FollowersKpi } from '@/components/dashboard/FollowersKpi';
import { AgendaHoje } from '@/components/dashboard/AgendaHoje';
import { AprovacoesPendentes } from '@/components/dashboard/AprovacoesPendentes';
import { AiInsight } from '@/components/dashboard/AiInsight';
import { CreativeHero, CreativeHeroEmpty } from '@/components/dashboard/CreativeHero';
import { CreationShortcuts } from '@/components/dashboard/CreationShortcuts';
import { ProductionList } from '@/components/dashboard/ProductionList';
import { FlowStepper } from '@/components/onboarding/FlowStepper';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { productionCounts, productionQueue } from '@/lib/dashboard-production';
import { getBrandInstagramMetrics, getFollowerHistory } from '@/lib/metrics-data';
import { getPipeline } from '@/lib/pipeline';
import { listPostsForBrand } from '@/lib/posts-data';
import { hasYoutube, getYoutubeVideos, getYoutubeBestTimes } from '@/lib/youtube-data';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export default async function DashboardPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  if (!active) return <CreativeHeroEmpty />;

  const result = await getBrandInstagramMetrics(active.id);
  const history = result?.ok ? await getFollowerHistory(active.id) : [];
  const pipeline = await getPipeline(active.id);
  const posts = await listPostsForBrand(active.id);

  const counts = productionCounts(posts);
  const queue = productionQueue(posts);
  const scheduledPosts = posts
    .filter((post) => post.status === 'scheduled' || post.status === 'ready_to_post')
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const waitingPosts = posts.filter((post) => post.status === 'waiting_approval');

  const yt = await hasYoutube(active.id);
  const bestTime = yt ? (await getYoutubeBestTimes(active.id))?.[0] || null : null;
  const ytVideos = yt ? await getYoutubeVideos(active.id) : [];

  // Crescimento real a partir do histórico — sem histórico, nada é afirmado.
  let followerChangeText = 'dados estáveis';
  let followerChangeType = 'neutral';
  if (history && history.length >= 2) {
    const first = Number(history[0].followers) || 1;
    const last = Number(history[history.length - 1].followers) || 1;
    const diff = last - first;
    followerChangeText = `${diff >= 0 ? '+' : ''}${((diff / first) * 100).toFixed(1)}% esta semana`;
    followerChangeType = diff >= 0 ? 'positive' : 'negative';
  }

  return (
    <div className="space-y-6">
      {/* Hero + atalhos por intenção: a coluna da direita é "o que você quer
          criar?", que é a pergunta que essa tela precisa responder primeiro. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <CreativeHero counts={counts} hasDraft={counts.drafts > 0} />
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
          <SectionHeading
            label="Atalhos"
            tone="accent"
            title="O que você quer criar?"
            className="mb-4"
            action={
              <Link href="/biblioteca" className="text-[12.5px] font-semibold text-accent-ink hover:underline">
                Biblioteca
              </Link>
            }
          />
          <CreationShortcuts />
        </div>
      </div>

      {/* Barra fina da jornada guiada — continua sendo o mapa de quem começou
          agora, e some sozinha quando a marca já roda o ciclo inteiro. */}
      <FlowStepper pipeline={pipeline} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <ProductionList posts={queue} />
        <div className="space-y-6">
          <AiInsight bestTime={bestTime} />
          <AgendaHoje posts={scheduledPosts} />
        </div>
      </div>

      {/* Desempenho fica abaixo da produção: o número importa, mas depois de
          saber o que está em jogo hoje. */}
      {result?.ok ? (
        <section className="space-y-4">
          <SectionHeading
            label="Desempenho"
            tone="cyan"
            title={`@${result.metrics.username}`}
            description="Números vindos direto da Graph API."
          />
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <AprovacoesPendentes posts={waitingPosts} />
            {ytVideos.length > 0 && (
              <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft lg:col-span-2">
                <h3 className="text-sm font-bold tracking-tight text-ink">YouTube · últimos vídeos</h3>
                <ul className="mt-3 divide-y divide-line">
                  {ytVideos.slice(0, 3).map((video) => (
                    <li key={video.video_id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                      <span className="max-w-[320px] truncate font-medium text-ink">{video.title || video.video_id}</span>
                      <span className="shrink-0 font-mono tabular-nums text-muted">{fmt(video.views)} views</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : result?.error ? (
        <EmptyState title="Erro ao atualizar dados" icon={AlertCircle}>
          A API retornou o seguinte erro: {result.error}. Verifique a conexão em{' '}
          <Link href="/connections" className="font-semibold text-accent-ink hover:underline">Conexões</Link>.
        </EmptyState>
      ) : (
        <EmptyState title="Sincronização pendente" icon={Instagram}>
          Vincule a conta de Instagram desta marca para ver seguidores, engajamento e alcance reais.
          <div className="mt-4">
            <Link
              href="/connections"
              className="inline-flex rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-soft"
            >
              Conectar conta
            </Link>
          </div>
        </EmptyState>
      )}
    </div>
  );
}
