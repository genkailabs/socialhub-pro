import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Dashboard</h1>
        <p className="text-xs text-muted">Métricas reais aparecem aqui após conectar o Instagram.</p>
      </div>
      <EmptyState title="Sem dados ainda">
        Conecte uma conta na aba <strong>Conexões</strong> para ver seguidores, engajamento e histórico reais. Nada aqui é simulado.
      </EmptyState>
    </div>
  );
}
