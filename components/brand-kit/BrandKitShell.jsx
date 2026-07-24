'use client';
import React from 'react';
import { HeartPulse } from 'lucide-react';
import { BrandKitTabs } from './BrandKitTabs';

export function BrandKitShell({ brandId, brandName, brandColor, kit, versions = [], connectedPlatforms = {} }) {
  const updatedAt = kit?.updated_at || kit?.dna_report?.updated_at;
  const formattedUpdatedAt = updatedAt ? new Date(updatedAt).toLocaleDateString('pt-BR') : 'Ainda não disponível';
  const status = kit?.onboarding_status === 'completed' ? 'Brand Kit atualizado' : 'Brand Kit em configuração';

  return <div className="space-y-6">
    <section aria-labelledby="brand-kit-health-title" className="rounded-2xl border border-line bg-surface-2 p-5"><h2 id="brand-kit-health-title" className="flex items-center gap-2 text-sm font-bold text-ink"><HeartPulse className="h-4 w-4 text-accent" /> {status}</h2><p className="mt-2 text-xs text-muted">Última atualização: <strong className="text-ink">{formattedUpdatedAt}</strong></p></section>
    <BrandKitTabs brandId={brandId} brandName={brandName} brandColor={brandColor} kit={kit} versions={versions} connectedPlatforms={connectedPlatforms} />
  </div>;
}
