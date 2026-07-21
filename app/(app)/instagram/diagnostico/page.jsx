import Link from 'next/link';
import { Instagram, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { DiagnosticoPanel } from '@/components/instagram/DiagnosticoPanel';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { getLatestAudit } from '@/lib/instagram-audit-data';

export default async function DiagnosticoPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const connected = active ? await listConnectedPlatforms(active.id) : {};
  const igConnected = !!connected.instagram;
  // Diagnóstico é caro: mostra o último salvo em vez de refazer a cada visita.
  const audit = active && igConnected ? await getLatestAudit(active.id) : null;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Diagnóstico do Instagram</h1>
        <p className="mt-1 text-sm text-muted">
          {active
            ? <>Entendendo o perfil de <strong className="text-ink">{active.name}</strong>{igConnected && <> · @{connected.instagram.platform_username}</>} antes de propor uma estratégia.</>
            : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : !igConnected ? (
        <EmptyState title="Instagram não conectado" icon={Instagram}>
          Conecte seu Instagram profissional em{' '}
          <Link href="/connections" className="font-semibold text-accent hover:underline">Conexões</Link>{' '}
          para o Social Hub entender seu conteúdo, suas métricas e seu histórico.
        </EmptyState>
      ) : (
        <DiagnosticoPanel brandId={active.id} inicial={audit} />
      )}
    </div>
  );
}
