import { Instagram, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComposerTabs } from '@/components/composer/ComposerTabs';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { getBrandKit } from '@/lib/brand-kit-data';

export default async function ComposerPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const connected = active ? await listConnectedPlatforms(active.id) : {};
  const igConnected = !!connected.instagram;
  const kit = active ? await getBrandKit(active.id) : null;

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
      ) : !igConnected ? (
        <EmptyState title="Instagram não conectado" icon={Instagram}>
          Conecte o Instagram desta marca na aba{' '}
          <Link href="/connections" className="font-semibold text-accent hover:underline">Conexões</Link> para publicar.
        </EmptyState>
      ) : (
        <ComposerTabs
          brandId={active.id}
          brandName={connected.instagram?.platform_username || active.name}
          hasBrandKit={!!kit}
          niche={kit?.niche || ''}
        />
      )}
    </div>
  );
}
