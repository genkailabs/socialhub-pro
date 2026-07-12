import { Users, TrendingUp, Image as ImageIcon, Heart, Instagram, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatTile } from '@/components/dashboard/StatTile';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';
import { BrandBadge } from '@/components/workspace/BrandBadge';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandInstagramMetrics, getFollowerHistory } from '@/lib/metrics-data';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export default async function DashboardPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  if (!active) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Comece criando sua primeira marca.</p>
        </div>
        <EmptyState title="Nenhuma marca ainda" icon={Sparkles}>
          Use o seletor no topo (“Nova marca”) para criar sua primeira marca e ligar suas redes.
        </EmptyState>
      </div>
    );
  }

  const result = await getBrandInstagramMetrics(active.id);
  const history = result?.ok ? await getFollowerHistory(active.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BrandBadge name={active.name} color={active.color} size={40} />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">Olá, {active.name}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            {result?.ok ? (
              <><Instagram className="h-3.5 w-3.5 text-accent" /> @{result.metrics.username} · dados reais da Graph API</>
            ) : 'Conecte o Instagram desta marca para ver métricas reais.'}
          </p>
        </div>
      </div>

      {result?.ok ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Seguidores" value={fmt(result.metrics.followers)} icon={Users} accent />
            <StatTile label="Engajamento" value={result.metrics.engagement} hint={`amostra: ${result.metrics.sample} posts`} icon={TrendingUp} />
            <StatTile label="Posts" value={fmt(result.metrics.mediaCount)} icon={ImageIcon} />
            <StatTile label="Curtidas (amostra)" value={fmt(result.metrics.totalLikes)} hint={`${result.metrics.totalComments} comentários`} icon={Heart} />
          </div>
          <FollowerTrend data={history} />
        </>
      ) : result?.error ? (
        <EmptyState title="Não deu para atualizar agora" icon={AlertCircle}>
          A Graph API retornou: {result.error}. Tente novamente em instantes ou reconecte o Instagram em{' '}
          <Link href="/connections" className="font-semibold text-accent hover:underline">Conexões</Link>.
        </EmptyState>
      ) : (
        <EmptyState title="Sem dados ainda" icon={Instagram}>
          Conecte o Instagram desta marca na aba{' '}
          <Link href="/connections" className="font-semibold text-accent hover:underline">Conexões</Link>{' '}
          para ver seguidores, engajamento e posts reais. Nada aqui é simulado.
        </EmptyState>
      )}
    </div>
  );
}
