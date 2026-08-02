import { Sparkles, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendsExplorer } from '@/components/trends/TrendsExplorer';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';

export const metadata = { title: 'Tendências do Instagram' };

export default async function TrendsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-xs font-bold text-accent-ink"><TrendingUp className="h-3.5 w-3.5" /> Radar editorial</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Tendências do Instagram</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Padrões atuais transformados em ideias executáveis, sempre ligados às fontes originais e sem métricas estimadas.</p>
        </div>
        {active && <div className="rounded-xl border border-line bg-panel px-3 py-2 text-xs text-muted">Curadoria para <strong className="text-ink">{active.name}</strong></div>}
      </header>

      {!active ? <EmptyState title="Nenhuma marca selecionada" icon={Sparkles}>Crie ou selecione uma marca para pesquisar tendências relevantes.</EmptyState> : <TrendsExplorer brandId={active.id} brandName={active.name} />}
    </div>
  );
}
