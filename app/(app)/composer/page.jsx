import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { VisualComposer } from '@/components/composer/VisualComposer';
import { MascotTip } from '@/components/onboarding/MascotTip';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { getComposerPost, getLatestComposerDraft } from '@/lib/posts-data';

export default async function ComposerPage({ searchParams }) {
  const [brands, activeBrandId] = await Promise.all([
    listBrands(),
    getActiveBrandId()
  ]);
  const active = resolveActive(brands, activeBrandId);
  const connected = active ? await listConnectedPlatforms(active.id) : {};
  const requestedPostId = typeof searchParams?.post === 'string' ? searchParams.post : null;
  const initialDraft = active
    ? requestedPostId
      ? await getComposerPost(active.id, requestedPostId)
      : await getLatestComposerDraft(active.id)
    : null;

  return (
    <div>
      {!active ? (
        <div className="p-8"><EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState></div>
      ) : (
        <>
          <VisualComposer
            brandId={active.id}
            brandName={connected.instagram?.platform_username || active.name}
            initialDraft={initialDraft}
          />
          {/* Composer não tem cabeçalho: o mascote fica numa bolha fixa, fechada por padrão. */}
          <MascotTip
            variant="floating"
            id="composer"
            title="Composer: onde o post vira arte."
            lines={[
              'Mídia, texto e formas no canvas — a edição é não destrutiva, dá para voltar.',
              'Feed, Story e Reel são formatos do mesmo post; troque no topo.',
              'Ao terminar, salve: o post vai para o Calendário, onde você escolhe a data.'
            ]}
            cta={{ label: 'Abrir Calendário', href: '/calendar' }}
          />
        </>
      )}
    </div>
  );
}
