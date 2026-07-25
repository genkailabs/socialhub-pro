import Link from 'next/link';
import { Instagram, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { DiagnosticoPanel } from '@/components/instagram/DiagnosticoPanel';
import { MascotTip } from '@/components/onboarding/MascotTip';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.6px] text-ink">Diagnóstico do Instagram</h1>
        <p className="mt-1 text-[13px] text-muted">
          {active
            ? <>Entendendo o perfil de <strong className="text-ink">{active.name}</strong>{igConnected && <> · @{connected.instagram.platform_username}</>} antes de propor uma estratégia.</>
            : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {active && (
        <MascotTip
          id="ig-diagnostico"
          title="Antes de propor estratégia, eu leio o seu perfil."
          lines={[
            'Olho conteúdo, métricas e histórico da conta conectada para entender o que já funciona.',
            'O diagnóstico é caro de rodar: guardo o último e só refaço quando você pedir.',
            'O resultado alimenta a Estratégia — é o retrato de onde você está hoje.'
          ]}
        />
      )}

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
