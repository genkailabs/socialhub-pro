import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandKit } from '@/lib/brand-kit-data';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { GuidedOnboardingWizard } from '@/components/onboarding/guided/GuidedOnboardingWizard';

export default async function OnboardingPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  if (!active) return <div className="p-8 text-center text-muted">Crie ou selecione uma marca para iniciar o onboarding.</div>;

  const kit = await getBrandKit(active.id);
  const connectedPlatforms = await listConnectedPlatforms(active.id);

  return (
    <div className="min-h-screen bg-app p-4 sm:p-6 lg:p-8">
      <GuidedOnboardingWizard
        brandId={active.id}
        brandName={active.name}
        kit={kit || {}}
        connectedPlatforms={connectedPlatforms || {}}
      />
    </div>
  );
}
