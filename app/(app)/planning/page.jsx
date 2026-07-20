import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlanningPanel } from '@/components/planning/PlanningPanel';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listStrategies, getWeekPlan } from '@/lib/planning-data';
import { activeStrategy, nextWeekStart } from '@/lib/strategy-plan';
import { usageForSkill } from '@/lib/ai/limits';
import { createClient } from '@/lib/supabase/server';

export default async function PlanningPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  const semana = nextWeekStart();
  const strategies = active ? await listStrategies(active.id) : [];
  const plan = active ? await getWeekPlan(active.id, semana) : null;
  const strategy = activeStrategy(strategies);
  const postsPerWeek = strategy?.frequency?.postsPerWeek || 3;
  const planningUsage = active
    ? await usageForSkill({ supabase: await createClient(), brandId: active.id, skillId: 'editorial-planner' })
    : null;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Planejamento</h1>
        <p className="mt-1 text-sm text-muted">
          {active
            ? <>Os temas da próxima semana de <strong className="text-ink">{active.name}</strong>. Você aprova antes de virar conteúdo.</>
            : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <PlanningPanel
          brandId={active.id}
          weekStart={semana}
          plan={plan}
          hasStrategy={!!strategy}
          postsPerWeek={postsPerWeek}
          planningUsage={planningUsage}
        />
      )}
    </div>
  );
}
