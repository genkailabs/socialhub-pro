import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { VisualComposer } from '@/components/composer/VisualComposer';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { getLatestComposerDraft } from '@/lib/posts-data';

export default async function ComposerPage() {
  const [brands, activeBrandId] = await Promise.all([
    listBrands(),
    getActiveBrandId()
  ]);
  const active = resolveActive(brands, activeBrandId);
  const connected = active ? await listConnectedPlatforms(active.id) : {};
  const initialDraft = active ? await getLatestComposerDraft(active.id) : null;

  return (
    <div>
      {!active ? (
        <div className="p-8"><EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState></div>
      ) : (
        <VisualComposer
          brandId={active.id}
          brandName={connected.instagram?.platform_username || active.name}
          initialDraft={initialDraft}
        />
      )}
    </div>
  );
}
