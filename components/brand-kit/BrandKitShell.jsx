'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Sparkles } from 'lucide-react';
import { BrandKitTabs } from './BrandKitTabs';
import { DnaVersions } from './DnaVersions';
import { Button } from '@/components/ui/Button';
import { resetOnboarding } from '@/lib/onboarding-actions';

export function BrandKitShell({ brandId, brandName, brandColor, kit, versions = [] }) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function handleResetOnboarding() {
    if (!confirm('Deseja refazer a jornada guiada de onboarding desde o início? Suas configurações manuais serão mantidas.')) return;
    setResetting(true);
    try {
      await resetOnboarding({ brandId });
      router.push('/onboarding');
    } catch (err) {
      console.error('Erro ao resetar onboarding:', err);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 p-4">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent" /> Configuração Avançada do Brand DNA
          </h2>
          <p className="text-xs text-muted">Ajuste logo, website, manual e regras de marca para melhorar a precisão da IA (§3.2 / §25).</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetOnboarding} disabled={resetting} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> {resetting ? 'Reiniciando...' : 'Refazer onboarding guiado'}
        </Button>
      </div>

      <DnaVersions brandId={brandId} versions={versions} />
      <BrandKitTabs brandId={brandId} brandName={brandName} brandColor={brandColor} kit={kit} />
    </div>
  );
}

