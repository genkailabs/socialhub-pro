'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { BrandKitTabs } from './BrandKitTabs';
import { BrandWizard } from './wizard/BrandWizard';
import { DnaDashboard } from './wizard/DnaDashboard';
import { DnaVersions } from './DnaVersions';
import { Button } from '@/components/ui/Button';

export function BrandKitShell({ brandId, brandName, brandColor, kit, versions = [] }) {
  const router = useRouter();
  // Concluir a entrevista e aprovar o DNA são coisas diferentes: com o DNA
  // versionado, dna_generated_at só existe depois da aprovação. Sem olhar o
  // onboarding_status, quem recarregasse a página antes de aprovar cairia no
  // wizard de novo e regeraria o DNA — pagando outra vez pela mesma coisa.
  const onboarded = kit?.onboarding_status === 'completed' || Boolean(kit?.dna_generated_at);
  const [mode, setMode] = useState(onboarded ? 'tabs' : 'wizard');
  const [summary, setSummary] = useState(null);

  if (mode === 'wizard') {
    return (
      <BrandWizard
        brandId={brandId} brandName={brandName} brandColor={brandColor} kit={kit}
        onComplete={(s) => { setSummary(s); setMode('dashboard'); router.refresh(); }}
      />
    );
  }

  if (mode === 'dashboard' && summary) {
    return (
      <div className="space-y-4">
        <DnaVersions brandId={brandId} versions={versions} />
        <DnaDashboard summary={summary} onEditKit={() => setMode('tabs')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setMode('wizard')}>
          <RotateCcw className="h-3.5 w-3.5" />Refazer onboarding
        </Button>
      </div>
      <DnaVersions brandId={brandId} versions={versions} />
      <BrandKitTabs brandId={brandId} brandName={brandName} brandColor={brandColor} kit={kit} />
    </div>
  );
}
