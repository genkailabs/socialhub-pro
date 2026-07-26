import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { VisualComposer } from '@/components/composer/VisualComposer';
import { DailyContentBrief } from '@/components/composer/DailyContentBrief';
import { MascotTip } from '@/components/onboarding/MascotTip';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { getComposerPost, getLatestComposerDraft } from '@/lib/posts-data';
import { getBrandKit } from '@/lib/brand-kit-data';
import { createClient } from '@/lib/supabase/server';
import { getDailyContentPackage } from '@/lib/daily-content-data';
import { dailyPackageToComposerDraft } from '@/lib/daily-content-composer';
import { dailyContentDateInSaoPaulo } from '@/lib/daily-content-date';

// Só o que o prompt de arte externa usa — nada de DNA bruto no cliente.
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
  const [connected, brandKit] = active
    ? await Promise.all([listConnectedPlatforms(active.id), getBrandKit(active.id)])
    : [{}, null];
  const requestedPostId = typeof searchParams?.post === 'string' ? searchParams.post : null;
  const initialDraft = active
    ? requestedPostId
      ? await getComposerPost(active.id, requestedPostId)
      : await getLatestComposerDraft(active.id)
    : null;
  const contentDate = dailyContentDateInSaoPaulo();
  let dailyPackage = null;
  let dailyUnavailableMessage = '';
  if (active) {
    try {
      dailyPackage = await getDailyContentPackage({
        supabase: await createClient(),
        brandId: active.id,
        contentDate
      });
    } catch {
      // Falha de leitura nunca vira um falso "pronto". O painel informa a
      // indisponibilidade e deixa a ação devolver seu erro autenticado.
      dailyUnavailableMessage = 'Não foi possível consultar o conteúdo de hoje agora.';
    }
  }
  const requestedDailyId = typeof searchParams?.daily === 'string' ? searchParams.daily : null;
  const dailyDraft = requestedDailyId && dailyPackage?.id === requestedDailyId
    ? dailyPackageToComposerDraft(dailyPackage)
    : null;

  return (
    <div>
      {!active ? (
        <div className="p-8"><EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState></div>
      ) : (
        <>
          <div className="px-4 pt-4 md:px-6">
            <DailyContentBrief
              brandId={active.id}
              contentDate={contentDate}
              package={dailyPackage}
              unavailableMessage={dailyUnavailableMessage}
            />
          </div>
          <VisualComposer
            brandId={active.id}
            brandName={connected.instagram?.platform_username || active.name}
            brandLabel={active.name}
            brandKit={publicBrandKit(brandKit)}
            initialDraft={dailyDraft || initialDraft}
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
