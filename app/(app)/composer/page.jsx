import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { VisualComposer } from '@/components/composer/VisualComposer';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { getComposerPost, getLatestComposerDraft } from '@/lib/posts-data';
import { getBrandKit } from '@/lib/brand-kit-data';
import { brandKitToStudioBrand, getStudioDraft } from '@/lib/carrossel-studio-data';

// Só o que a montagem da arte usa — nada de DNA bruto no cliente.
function publicBrandKit(kit) {
  if (!kit) return null;
  return {
    niche: kit.niche || '',
    audience: kit.audience || '',
    tone: kit.tone || '',
    visual_style: kit.visual_style || '',
    palette: kit.palette && typeof kit.palette === 'object' ? kit.palette : {},
    donts: Array.isArray(kit.donts) ? kit.donts : []
  };
}

export default async function ComposerPage({ searchParams }) {
  const [brands, activeBrandId] = await Promise.all([
    listBrands(),
    getActiveBrandId()
  ]);
  const active = resolveActive(brands, activeBrandId);
  const requestedPostId = typeof searchParams?.post === 'string' ? searchParams.post : null;
  const initialFormat = searchParams?.format === 'carrossel' ? 'carrossel' : null;
  // O id só vale para o Studio quando o pedido é de carrossel; num pedido de
  // post ele pertence ao Composer, e mandá-lo aqui abriria o Studio no post
  // errado (ou em nada).
  const studioPostId = initialFormat === 'carrossel' ? requestedPostId : null;
  const [connected, brandKit, studioDraft] = active
    ? await Promise.all([listConnectedPlatforms(active.id), getBrandKit(active.id), getStudioDraft(active.id, studioPostId)])
    : [{}, null, null];
  const initialDraft = active
    ? initialFormat === 'carrossel'
      ? null
      : requestedPostId
      ? await getComposerPost(active.id, requestedPostId)
      : await getLatestComposerDraft(active.id)
    : null;
  const studioBrand = active
    ? brandKitToStudioBrand(brandKit, active.name, connected.instagram?.platform_username || active.name)
    : null;

  return (
    <div>
      {!active ? (
        <div className="p-8"><EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState></div>
      ) : (
        <VisualComposer
          brandId={active.id}
          brandName={connected.instagram?.platform_username || active.name}
          brandLabel={active.name}
          brandKit={publicBrandKit(brandKit)}
          initialDraft={initialDraft}
          studioBrand={studioBrand}
          studioDraft={studioDraft}
          initialFormat={initialFormat}
        />
      )}
    </div>
  );
}
