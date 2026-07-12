import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AutopilotForm } from '@/components/autopilot/AutopilotForm';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getContentPlan } from '@/lib/content-plan-data';
import { getBrandKit } from '@/lib/brand-kit-data';

export default async function AutopilotPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const [plan, kit] = active
    ? await Promise.all([getContentPlan(active.id), getBrandKit(active.id)])
    : [null, null];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Piloto de conteúdo</h1>
        <p className="mt-1 text-sm text-muted">
          {active
            ? <>Acorde com a semana de <strong className="text-ink">{active.name}</strong> pronta pra aprovar. A IA gera todo dia; você só decide o que vai ao ar.</>
            : 'Crie uma marca primeiro.'}
        </p>
      </div>
      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <AutopilotForm brandId={active.id} plan={plan} hasBrandKit={!!kit} />
      )}
    </div>
  );
}
