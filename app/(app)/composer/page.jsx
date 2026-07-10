import { EmptyState } from '@/components/ui/EmptyState';

export default function ComposerPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">Composer</h1>
      <EmptyState title="Em construção (M4)">
        Criação e agendamento de posts chegam no milestone M4.
      </EmptyState>
    </div>
  );
}
