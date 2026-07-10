import { EmptyState } from '@/components/ui/EmptyState';

export default function CalendarPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">Calendário</h1>
      <EmptyState title="Em construção (M5)">
        Calendário de posts chega no milestone M5.
      </EmptyState>
    </div>
  );
}
