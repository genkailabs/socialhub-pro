import { EmptyState } from '@/components/ui/EmptyState';

export default function ApprovalsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">Aprovações</h1>
      <EmptyState title="Em construção (M5)">
        Fluxo de aprovação por link chega no milestone M5.
      </EmptyState>
    </div>
  );
}
