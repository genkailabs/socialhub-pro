import Link from 'next/link';
import {
  BarChart3,
  Clock,
  Eye,
  Heart,
  Image as ImageIcon,
  Instagram,
  Sparkles,
  Users,
  Youtube
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatTile } from '@/components/dashboard/StatTile';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandInstagramMetrics, getFollowerHistory } from '@/lib/metrics-data';
import { hasYoutube, getYoutubeBestTimes, getYoutubeFollowerHistory, getYoutubeVideos } from '@/lib/youtube-data';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function formatNumber(value) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1).replace('.0', '')}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace('.0', '')}k`;
  return String(number);
}

function getGrowth(history) {
  if (!history || history.length < 2) return { text: 'Aguardando historico', type: 'neutral' };
  const first = Number(history[0].followers) || 0;
  const last = Number(history[history.length - 1].followers) || 0;
  const difference = last - first;
  return {
    text: `${difference >= 0 ? '+' : ''}${formatNumber(difference)} no periodo`,
    type: difference >= 0 ? 'positive' : 'negative'
  };
}

function ConnectionPrompt({ platform, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><Icon className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-bold text-ink">{platform} ainda nao conectado</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
          <Link href="/connections" className="mt-4 inline-flex rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-black transition-colors hover:bg-accent-soft">Conectar {platform}</Link>
        </div>
      </div>
    </div>
  );
}

export default async function MetricsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  if (!active) {
    return (
      <div className="space-y-6">
        <header><h1 className="text-2xl font-bold tracking-tight text-ink">Relatorios</h1><p className="mt-1 text-sm text-muted">Acompanhe o resultado das suas redes em um unico lugar.</p></header>
        <EmptyState title="Crie uma marca para ver os relatorios" icon={Sparkles}>Depois de criar uma marca e conectar suas redes, os dados aparecerao aqui.</EmptyState>
      </div>
    );
  }

  const instagram = await getBrandInstagramMetrics(active.id);
  const instagramHistory = instagram?.ok ? await getFollowerHistory(active.id) : [];
  const youtube = await hasYoutube(active.id);
  const [youtubeHistory, youtubeVideos, bestTimes] = youtube
    ? await Promise.all([getYoutubeFollowerHistory(active.id), getYoutubeVideos(active.id), getYoutubeBestTimes(active.id)])
    : [[], [], []];
  const instagramGrowth = getGrowth(instagramHistory);
  const youtubeGrowth = getGrowth(youtubeHistory);
  const bestTime = bestTimes[0];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Analise de desempenho</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Relatorios de {active.name}</h1>
          <p className="mt-1 text-sm text-muted">Dados reais das contas conectadas, atualizados durante a sincronizacao.</p>
        </div>
        <Link href="/connections" className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent/60">Gerenciar conexoes</Link>
      </header>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-pink-500/30 bg-pink-500/10 text-pink-500"><Instagram className="h-4 w-4" /></span>
          <div><h2 className="text-lg font-bold text-ink">Instagram</h2><p className="text-xs text-muted">Comunidade, engajamento e conteudo publicado</p></div>
          {instagram?.ok && <span className="ml-auto rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">Conectado</span>}
        </div>
        {instagram?.ok ? <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Seguidores" value={formatNumber(instagram.metrics.followers)} icon={Users} change={instagramGrowth.text} changeType={instagramGrowth.type} />
            <StatTile label="Engajamento" value={instagram.metrics.engagement} icon={BarChart3} hint="media por publicacao" />
            <StatTile label="Publicacoes" value={formatNumber(instagram.metrics.mediaCount)} icon={ImageIcon} hint="no perfil" />
            <StatTile label="Curtidas" value={formatNumber(instagram.metrics.totalLikes)} icon={Heart} hint={`amostra: ${instagram.metrics.sample} posts`} />
          </div>
          <FollowerTrend data={instagramHistory} platform="Instagram" />
        </> : <ConnectionPrompt platform="Instagram" icon={Instagram}>Conecte a conta para ver seguidores, taxa de engajamento e a evolucao diaria.</ConnectionPrompt>}
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-500"><Youtube className="h-4 w-4" /></span>
          <div><h2 className="text-lg font-bold text-ink">YouTube</h2><p className="text-xs text-muted">Inscritos, videos recentes e melhor horario para publicar</p></div>
          {youtube && <span className="ml-auto rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">Conectado</span>}
        </div>
        {youtube ? <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatTile label="Inscritos" value={youtubeHistory.length ? formatNumber(youtubeHistory[youtubeHistory.length - 1].followers) : '-'} icon={Users} change={youtubeGrowth.text} changeType={youtubeGrowth.type} />
            <StatTile label="Videos analisados" value={formatNumber(youtubeVideos.length)} icon={Eye} hint="ultimos videos sincronizados" />
            <StatTile label="Melhor horario" value={bestTime ? `${WEEKDAYS[bestTime.weekday]} ${String(bestTime.hour).padStart(2, '0')}h` : '-'} icon={Clock} hint={bestTime ? 'baseado no seu canal' : 'aguardando dados'} />
          </div>
          <FollowerTrend data={youtubeHistory} platform="YouTube" />
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><h3 className="text-sm font-bold text-ink">Videos recentes</h3><span className="text-xs text-muted">Views e retencao</span></div>
            {youtubeVideos.length ? <ul className="divide-y divide-line">{youtubeVideos.map((video) => <li key={video.video_id} className="flex items-center gap-4 px-5 py-4"><p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{video.title || video.video_id}</p><span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">{formatNumber(video.views)} views</span><span className="rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-xs font-bold text-accent">{Math.round(Number(video.avg_view_pct) || 0)}% retencao</span></li>)}</ul> : <p className="px-5 py-8 text-sm text-muted">Ainda nao ha videos sincronizados para este canal.</p>}
          </div>
        </> : <ConnectionPrompt platform="YouTube" icon={Youtube}>Conecte o canal para acompanhar inscritos, visualizacoes, retencao e sugestoes de horario.</ConnectionPrompt>}
      </section>
    </div>
  );
}
