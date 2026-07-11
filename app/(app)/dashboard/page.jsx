import { Users, TrendingUp, Image as ImageIcon, Heart } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatTile } from '@/components/dashboard/StatTile';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';
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
          <h1 className="text-xl font-extrabold">Dashboard</h1>
          <p className="text-xs text-muted">Comece criando sua primeira marca.</p>
        </div>
        <EmptyState title="Nenhuma marca ainda">
          Use o seletor no topo (“Nova marca”) para criar sua primeira marca.
        </EmptyState>
      </div>
    );
  }

  const result = await getBrandInstagramMetrics(active.id);
  const history = result?.ok ? await getFollowerHistory(active.id) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Olá, {active.name}</h1>
        <p className="text-xs text-muted">
          {result?.ok ? <>Instagram @{result.metrics.username} · dados reais da Graph API</> : 'Métricas reais aparecem após conectar o Instagram desta marca.'}
        </p>
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
        <EmptyState title="Não deu para atualizar agora">
          A Graph API retornou: {result.error}. Tente novamente em instantes ou reconecte o Instagram em Conexões.
        </EmptyState>
      ) : (
        <EmptyState title="Sem dados ainda">
          Conecte o Instagram desta marca na aba <strong>Conexões</strong> para ver seguidores, engajamento e posts reais. Nada aqui é simulado.
        </EmptyState>
      )}
    </div>
  );
}
