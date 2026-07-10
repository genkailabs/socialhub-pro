import { EmptyState } from '@/components/ui/EmptyState';

export default function ConnectionsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">Conexões</h1>
      <EmptyState title="Em construção (M3)">
        Conexão real do Instagram e gating "Em breve" das demais redes chegam no milestone M3.
      </EmptyState>
    </div>
  );
}
