import { Suspense } from 'react';
import { PLATFORMS } from '@/data/platforms';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { PlatformCard } from '@/components/connections/PlatformCard';
import { ConnectionsBanner } from '@/components/connections/ConnectionsBanner';

export default async function ConnectionsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const connectedMap = active ? await listConnectedPlatforms(active.id) : {};

  const connected = PLATFORMS.filter((p) => connectedMap[p.id]);
  const available = PLATFORMS.filter((p) => p.integrated && !connectedMap[p.id]);
  const soon = PLATFORMS.filter((p) => !p.integrated);

  const Section = ({ title, items }) => items.length ? (
    <div className="mb-8">
      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted">{title}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => <PlatformCard key={p.id} platform={p} connected={connectedMap[p.id]} activeBrandId={active?.id} />)}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">Conexões</h1>
        <p className="text-xs text-muted">
          {active ? <>Marca: <strong>{active.name}</strong> · conecte para publicar e ver métricas reais</> : 'Crie uma marca para conectar redes.'}
        </p>
      </div>
      <Suspense><ConnectionsBanner /></Suspense>
      <Section title={`Conectado (${connected.length})`} items={connected} />
      <Section title="Disponível agora" items={available} />
      <Section title="Em breve · integração real em desenvolvimento" items={soon} />
    </div>
  );
}
