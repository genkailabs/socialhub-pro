import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComposerTabs } from '@/components/composer/ComposerTabs';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { listDnaVersions } from '@/lib/dna-versions-data';
import { getOrCreateMarketingRecommendation } from '@/lib/marketing-recommendations-data';

export default async function ComposerPage() {
  const [brands, activeBrandId] = await Promise.all([
    listBrands(),
    getActiveBrandId()
  ]);
  const active = resolveActive(brands, activeBrandId);
  const [connected, dnaVersions] = active
    ? await Promise.all([
      listConnectedPlatforms(active.id),
      listDnaVersions(active.id)
    ])
    : [{}, []];
  const igConnected = !!connected.instagram;
  const hasApprovedDna = dnaVersions.some((version) => version.status === 'approved');
  const recommendation = active && hasApprovedDna
    ? await getOrCreateMarketingRecommendation({ brandId: active.id, hasApprovedDna })
    : null;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Composer</h1>
        <p className="mt-1 text-sm text-muted">
          {active ? <>Publicando como <strong className="text-ink">{active.name}</strong>{igConnected && <> · @{connected.instagram.platform_username}</>}</> : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <ComposerTabs
          brandId={active.id}
          brandName={connected.instagram?.platform_username || active.name}
          hasApprovedDna={hasApprovedDna}
          instagramConnected={igConnected}
          recommendation={recommendation}
        />
      )}
    </div>
  );
}
