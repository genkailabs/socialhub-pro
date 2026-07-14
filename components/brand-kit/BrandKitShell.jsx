'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { BrandKitTabs } from './BrandKitTabs';
import { BrandWizard } from './wizard/BrandWizard';
import { DnaDashboard } from './wizard/DnaDashboard';
import { Button } from '@/components/ui/Button';

export function BrandKitShell({ brandId, brandName, brandColor, kit }) {
  const router = useRouter();
  const onboarded = Boolean(kit?.dna_generated_at);
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
    return <DnaDashboard summary={summary} onEditKit={() => setMode('tabs')} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setMode('wizard')}>
          <RotateCcw className="h-3.5 w-3.5" />Refazer onboarding
        </Button>
      </div>
      <BrandKitTabs brandId={brandId} brandName={brandName} brandColor={brandColor} kit={kit} />
    </div>
  );
}
