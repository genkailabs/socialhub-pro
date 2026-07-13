import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandKitTabs } from '@/components/brand-kit/BrandKitTabs';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandKit } from '@/lib/brand-kit-data';

export default async function BrandKitPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const kit = active ? await getBrandKit(active.id) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Brand Kit</h1>
        <p className="mt-1 text-sm text-muted">
          {active ? <>O DNA de <strong className="text-ink">{active.name}</strong> — a IA usa isto para gerar conteúdo on-brand.</> : 'Crie uma marca primeiro.'}
        </p>
      </div>
      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <BrandKitTabs brandId={active.id} brandName={active.name} brandColor={active.color} kit={kit} />
      )}
    </div>
  );
}
