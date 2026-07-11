import { EmptyState } from '@/components/ui/EmptyState';
import { ComposerForm } from '@/components/composer/ComposerForm';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';

export default async function ComposerPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const connected = active ? await listConnectedPlatforms(active.id) : {};
  const igConnected = !!connected.instagram;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Composer</h1>
        <p className="text-xs text-muted">
          {active ? <>Publicando como <strong>{active.name}</strong> {igConnected && <>· @{connected.instagram.platform_username}</>}</> : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca">Crie/selecione uma marca no topo.</EmptyState>
      ) : !igConnected ? (
        <EmptyState title="Instagram não conectado">
          Conecte o Instagram desta marca na aba <strong>Conexões</strong> para publicar.
        </EmptyState>
      ) : (
        <ComposerForm brandId={active.id} />
      )}
    </div>
  );
}
