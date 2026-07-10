import { EmptyState } from '@/components/ui/EmptyState';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';

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
          Use o seletor no topo (“Nova marca”) para criar sua primeira marca. Depois conecte o Instagram na aba <strong>Conexões</strong>.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Olá, {active.name}</h1>
        <p className="text-xs text-muted">Métricas reais aparecem aqui após conectar o Instagram desta marca.</p>
      </div>
      <EmptyState title="Sem dados ainda">
        Conecte uma conta na aba <strong>Conexões</strong> para ver seguidores, engajamento e histórico reais. Nada aqui é simulado.
      </EmptyState>
    </div>
  );
}
