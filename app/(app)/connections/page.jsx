import { Suspense } from 'react';
import { PLATFORMS } from '@/data/platforms';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { PlatformCard } from '@/components/connections/PlatformCard';
import { ConnectionsBanner } from '@/components/connections/ConnectionsBanner';
import { ConnectionsSummary } from '@/components/connections/ConnectionsSummary';

export default async function ConnectionsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const connectedMap = active ? await listConnectedPlatforms(active.id) : {};

  const connected = PLATFORMS.filter((p) => connectedMap[p.id]);
  const available = PLATFORMS.filter((p) => p.integrated && !connectedMap[p.id]);
  const soon = PLATFORMS.filter((p) => !p.integrated);

  const Section = ({ title, hint, items }) => items.length ? (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted">{title}</h2>
        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-faint">{items.length}</span>
        {hint && <span className="ml-auto text-[11px] text-faint">{hint}</span>}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {items.map((p) => (
          <PlatformCard key={p.id} platformId={p.id} connected={connectedMap[p.id]} activeBrandId={active?.id} />
        ))}
      </div>
    </section>
  ) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Conexões</h1>
        <p className="mt-1 text-sm text-muted">
          {active
            ? 'Ligue cada rede uma vez. A partir daí, publicação e métricas são reais — nada simulado.'
            : 'Crie uma marca no topo para começar a conectar redes.'}
        </p>
      </header>

      <Suspense><ConnectionsBanner /></Suspense>

      {active && (
        <ConnectionsSummary
          brandName={active.name}
          connected={connected.length}
          available={available.length}
          soon={soon.length}
        />
      )}

      <div>
        <Section title="Conectadas" hint="publicando de verdade" items={connected} />
        <Section title="Disponível agora" hint="OAuth real da Meta" items={available} />
        <Section title="Em breve" hint="integração em desenvolvimento" items={soon} />
      </div>
    </div>
  );
}
