import { Sparkles, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { StrategyPanel } from '@/components/autopilot/StrategyPanel';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listStrategies } from '@/lib/planning-data';
import { getPipeline } from '@/lib/pipeline';
import { PipelineProgress } from '@/components/onboarding/PipelineProgress';
import { BrandBadge } from '@/components/workspace/BrandBadge';

export default async function StrategyPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const pipeline = active ? await getPipeline(active.id) : null;
  const strategies = active ? await listStrategies(active.id) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Base do Planejamento
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Estratégia</h1>
          <p className="mt-1 text-sm text-muted">
            {active ? (
              <>
                Pilares, objetivos e frequência de <strong className="text-ink">{active.name}</strong>. É o que o Planejamento semanal usa para sugerir os temas.
              </>
            ) : (
              'Selecione ou crie uma marca no topo para definir a estratégia.'
            )}
          </p>
        </div>
        {active && <BrandBadge name={active.name} color={active.color} size={44} />}
      </div>

      {active && <PipelineProgress pipeline={pipeline} />}

      {!active ? (
        <EmptyState title="Nenhuma marca selecionada" icon={Sparkles}>
          Crie ou selecione uma marca no seletor acima para definir a estratégia.
        </EmptyState>
      ) : (
        <div className="rounded-2xl glass p-5 shadow-soft">
          <StrategyPanel brandId={active.id} strategies={strategies} />
        </div>
      )}
    </div>
  );
}
