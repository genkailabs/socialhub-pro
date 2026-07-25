import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandKitShell } from '@/components/brand-kit/BrandKitShell';
import { MascotTip } from '@/components/onboarding/MascotTip';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandKit } from '@/lib/brand-kit-data';
import { listDnaVersions } from '@/lib/dna-versions-data';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';

export default async function BrandKitPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const kit = active ? await getBrandKit(active.id) : null;
  const versions = active ? await listDnaVersions(active.id) : [];
  const connectedPlatforms = active ? await listConnectedPlatforms(active.id) : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.6px] text-ink">Brand Kit</h1>
        {!active && <p className="mt-1 text-sm text-muted">Crie uma marca primeiro.</p>}
      </div>
      {active && (
        <MascotTip
          id="brand-kit"
          title="Aqui você me ensina a falar como a sua marca."
          lines={[
            'Nicho, tom de voz, cores e fontes: leio tudo isso antes de escrever ou desenhar qualquer post.',
            'Cada alteração vira uma versão do DNA — dá para comparar e voltar atrás.',
            'Sem Brand Kit eu chuto o estilo, e aí o conteúdo não parece seu.'
          ]}
        />
      )}

      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <BrandKitShell
          brandId={active.id}
          brandName={active.name}
          brandColor={active.color}
          kit={kit}
          versions={versions}
          connectedPlatforms={connectedPlatforms}
        />
      )}
    </div>
  );
}
