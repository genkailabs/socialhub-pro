import Link from 'next/link';
import { BarChart3, Clock, Eye, Heart, Image as ImageIcon, Instagram, Sparkles, Users, Youtube } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatTile } from '@/components/dashboard/StatTile';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';
import { ReportNavigation } from '@/components/reports/ReportNavigation';
import { MissingMetric, ReportSection } from '@/components/reports/ReportSection';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandInstagramMetrics, getFollowerHistory } from '@/lib/metrics-data';
import { hasYoutube, getYoutubeBestTimes, getYoutubeFollowerHistory, getYoutubeVideos } from '@/lib/youtube-data';
import { normalizeReportChannel, reportSectionForMetric } from '@/lib/reports/channel-adapters';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function formatNumber(value) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1).replace('.0', '')}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace('.0', '')}k`;
  return String(number);
}

function getGrowth(history) {
  if (!history || history.length < 2) return { text: 'Aguardando historico', type: 'neutral' };
  const difference = (Number(history.at(-1)?.followers) || 0) - (Number(history[0]?.followers) || 0);
  return { text: `${difference >= 0 ? '+' : ''}${formatNumber(difference)} no periodo`, type: difference >= 0 ? 'positive' : 'negative' };
}

function ConnectionPrompt({ platform, icon: Icon, children }) {
  return <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6"><div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><Icon className="h-5 w-5" /></span><div><h2 className="text-base font-bold text-ink">{platform} ainda nao conectado</h2><p className="mt-1 text-sm leading-relaxed text-muted">{children}</p><Link href="/connections" className="mt-4 inline-flex rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-white">Conectar {platform}</Link></div></div></div>;
}

function InstagramReport({ instagram, history, activeSection }) {
  if (!instagram?.ok) return <ConnectionPrompt platform="Instagram" icon={Instagram}>Conecte a conta para ver seguidores, engajamento e a evolucao diaria.</ConnectionPrompt>;
  const metrics = instagram.metrics;
  const growth = getGrowth(history);
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Seguidores" value={formatNumber(metrics.followers)} icon={Users} change={growth.text} changeType={growth.type} />
      <StatTile label="Engajamento" value={metrics.engagement} icon={BarChart3} hint="media por publicacao" />
      <StatTile label="Publicacoes" value={formatNumber(metrics.mediaCount)} icon={ImageIcon} hint="no perfil" />
      <StatTile label="Curtidas" value={formatNumber(metrics.totalLikes)} icon={Heart} hint={`amostra: ${metrics.sample} posts`} />
    </div>
    <ReportSection id="crescimento" title="Crescimento" description="Seguidores registrados nas sincronizacoes do Instagram." active={activeSection === 'crescimento'}><FollowerTrend data={history} platform="Instagram" /></ReportSection>
    <ReportSection id="engajamento" title="Engajamento" description="Media de interacoes por publicacao, em relacao aos seguidores." active={activeSection === 'engajamento'}><p className="font-mono text-2xl font-bold text-ink">{metrics.engagement}</p><p className="mt-1 text-xs text-muted">Base: {metrics.sample} publicacoes sincronizadas.</p></ReportSection>
    <ReportSection id="conteudos" title="Conteudos" description="Amostra de publicacoes usada no relatorio." active={activeSection === 'conteudos'}><p className="text-sm text-ink">{formatNumber(metrics.totalLikes)} curtidas e {formatNumber(metrics.totalComments)} comentarios em {metrics.sample} publicacoes.</p></ReportSection>
    <ReportSection id="alcance" title="Alcance" description="Pessoas alcancadas pelas publicacoes." active={activeSection === 'alcance'}><MissingMetric>O alcance ainda nao esta disponivel na sincronizacao atual do Instagram.</MissingMetric></ReportSection>
    <ReportSection id="retencao" title="Retencao" description="Acompanhamento de quanto tempo as pessoas permanecem no conteudo." active={activeSection === 'retencao'}><MissingMetric>Dados de retencao ainda nao foram recebidos para esta conta do Instagram.</MissingMetric></ReportSection>
  </div>;
}

function YoutubeReport({ connected, history, videos, bestTimes, activeSection }) {
  if (!connected) return <ConnectionPrompt platform="YouTube" icon={Youtube}>Conecte o canal para acompanhar inscritos, visualizacoes, retencao e horarios.</ConnectionPrompt>;
  const growth = getGrowth(history);
  const views = videos.reduce((total, video) => total + (Number(video.views) || 0), 0);
  const watchTime = videos.reduce((total, video) => total + (Number(video.watch_time_min) || 0), 0);
  const retentionVideos = videos.filter((video) => Number.isFinite(Number(video.avg_view_pct)) && Number(video.avg_view_pct) > 0);
  const avgRetention = retentionVideos.length ? retentionVideos.reduce((total, video) => total + Number(video.avg_view_pct), 0) / retentionVideos.length : null;
  const bestTime = bestTimes[0];
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><StatTile label="Inscritos" value={history.length ? formatNumber(history.at(-1).followers) : '-'} icon={Users} change={growth.text} changeType={growth.type} /><StatTile label="Videos analisados" value={formatNumber(videos.length)} icon={Eye} hint="ultimos videos sincronizados" /><StatTile label="Melhor horario" value={bestTime ? `${WEEKDAYS[bestTime.weekday]} ${String(bestTime.hour).padStart(2, '0')}h` : '-'} icon={Clock} hint={bestTime ? 'baseado no seu canal' : 'aguardando dados'} /></div>
    <ReportSection id="visualizacoes" title="Visualizacoes" description="Soma dos videos exibidos abaixo; nao e combinada com alcance de outras redes." active={activeSection === 'visualizacoes'}><p className="font-mono text-2xl font-bold text-ink">{formatNumber(views)}</p><p className="mt-1 text-xs text-muted">Nos {videos.length} videos sincronizados.</p></ReportSection>
    <ReportSection id="tempoExibicao" title="Tempo de exibicao" description="Tempo assistido nos videos sincronizados." active={activeSection === 'tempoExibicao'}>{watchTime ? <p className="font-mono text-2xl font-bold text-ink">{formatNumber(watchTime)} min</p> : <MissingMetric />}</ReportSection>
    <ReportSection id="retencao" title="Retencao" description="Media simples da retencao dos videos que possuem este dado." active={activeSection === 'retencao'}>{avgRetention === null ? <MissingMetric /> : <p className="font-mono text-2xl font-bold text-ink">{avgRetention.toFixed(1)}%</p>}</ReportSection>
    <ReportSection id="inscritos" title="Inscritos" description="Evolucao registrada nas sincronizacoes do canal." active={activeSection === 'inscritos'}><FollowerTrend data={history} platform="YouTube" /></ReportSection>
    <ReportSection id="videos" title="Videos" description="Videos recentes ordenados por visualizacoes." active={activeSection === 'videos'}>{videos.length ? <div className="space-y-2">{videos.map((video, index) => <div key={video.video_id} className={`flex items-center justify-between gap-4 rounded-[14px] px-3.5 py-3 ${index % 2 === 0 ? 'bg-surface-2' : ''}`}><p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">{video.title || video.video_id}</p><span className="shrink-0 font-mono text-[11px] font-bold text-ink">{formatNumber(video.views)}</span><span className="shrink-0 font-mono text-[11px] font-bold text-success">{Math.round(Number(video.avg_view_pct) || 0)}%</span></div>)}</div> : <MissingMetric>Ainda nao ha videos sincronizados para este canal.</MissingMetric>}</ReportSection>
    <ReportSection id="trafego" title="Origem do trafego" description="Como as pessoas encontraram seus videos." active={activeSection === 'trafego'}><MissingMetric>A origem do trafego ainda nao esta disponivel na sincronizacao atual.</MissingMetric></ReportSection>
  </div>;
}

function Overview({ instagram, instagramHistory, youtube, youtubeHistory, youtubeVideos }) {
  const instagramGrowth = getGrowth(instagramHistory); const youtubeGrowth = getGrowth(youtubeHistory);
  return <div className="space-y-5"><div className="rounded-[24px] bg-[#1c1c1e] p-6"><p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Visao geral por canal</p><p className="mt-2 max-w-[560px] text-lg font-bold leading-snug text-white">Compare o resultado de cada rede sem somar metricas com significados diferentes.</p></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><ReportSection title="Instagram" description={instagram?.ok ? `Seguidores: ${formatNumber(instagram.metrics.followers)}. ${instagramGrowth.text}.` : 'Conta ainda nao conectada.'}><Link href="/metrics?channel=instagram" className="text-xs font-bold text-accent">Abrir relatorio do Instagram</Link></ReportSection><ReportSection title="YouTube" description={youtube ? `Inscritos: ${youtubeHistory.length ? formatNumber(youtubeHistory.at(-1).followers) : 'aguardando'}. ${youtubeGrowth.text}.` : 'Canal ainda nao conectado.'}><Link href="/metrics?channel=youtube" className="text-xs font-bold text-accent">Abrir relatorio do YouTube</Link></ReportSection></div><ReportSection title="Alertas e oportunidades" description="Leitura separada para facilitar a proxima decisao."><ul className="space-y-2 text-sm text-muted"><li>{instagram?.ok ? 'Instagram conectado: acompanhe crescimento e engajamento no relatorio proprio.' : 'Conecte o Instagram para receber dados de desempenho.'}</li><li>{youtube ? `${youtubeVideos.length} videos do YouTube estao disponiveis para analise.` : 'Conecte o YouTube para receber dados de videos e inscritos.'}</li></ul></ReportSection></div>;
}

export default async function MetricsPage({ searchParams = {} }) {
  const brands = await listBrands(); const active = resolveActive(brands, await getActiveBrandId());
  if (!active) return <div className="space-y-6"><header><h1 className="text-2xl font-bold tracking-tight text-ink">Relatorios</h1><p className="mt-1 text-sm text-muted">Acompanhe o resultado das suas redes em um unico lugar.</p></header><EmptyState title="Crie uma marca para ver os relatorios" icon={Sparkles}>Depois de criar uma marca e conectar suas redes, os dados aparecerao aqui.</EmptyState></div>;
  const channel = normalizeReportChannel(searchParams.channel); const activeSection = reportSectionForMetric(channel, searchParams.metric);
  const instagram = await getBrandInstagramMetrics(active.id); const instagramHistory = instagram?.ok ? await getFollowerHistory(active.id) : [];
  const youtube = await hasYoutube(active.id); const [youtubeHistory, youtubeVideos, bestTimes] = youtube ? await Promise.all([getYoutubeFollowerHistory(active.id), getYoutubeVideos(active.id), getYoutubeBestTimes(active.id)]) : [[], [], []];
  return <div className="space-y-7"><header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Analise de desempenho</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Relatorios de {active.name}</h1><p className="mt-1 text-sm text-muted">Dados reais das contas conectadas, separados por canal.</p></div><Link href="/connections" className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink">Gerenciar conexoes</Link></header><ReportNavigation activeChannel={channel} />{channel === 'instagram' ? <InstagramReport instagram={instagram} history={instagramHistory} activeSection={activeSection} /> : channel === 'youtube' ? <YoutubeReport connected={youtube} history={youtubeHistory} videos={youtubeVideos} bestTimes={bestTimes} activeSection={activeSection} /> : <Overview instagram={instagram} instagramHistory={instagramHistory} youtube={youtube} youtubeHistory={youtubeHistory} youtubeVideos={youtubeVideos} />}</div>;
}
