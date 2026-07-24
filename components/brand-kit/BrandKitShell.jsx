'use client';
import React from 'react';
import { BrandKitTabs } from './BrandKitTabs';

export function BrandKitShell({ brandId, brandName, brandColor, kit, versions = [], connectedPlatforms = {} }) {
  const updatedAt = kit?.updated_at || kit?.dna_report?.updated_at;
  const formattedUpdatedAt = updatedAt ? new Date(updatedAt).toLocaleDateString('pt-BR') : 'Ainda não disponível';
  const status = kit?.onboarding_status === 'completed' ? 'Brand Kit atualizado' : 'Brand Kit em configuração';

  return (
    <div className="space-y-6">
      {/* Pílula de estado no lugar da faixa antiga — padrão do handoff. */}
      <p className="inline-flex flex-wrap items-center gap-2 rounded-full bg-accent-tint px-3.5 py-1.5 text-[11.5px] font-semibold text-accent-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        <span>{status}</span>
        <span aria-hidden="true" className="opacity-50">·</span>
        <span className="tabular-nums">{formattedUpdatedAt}</span>
      </p>

      <BrandKitTabs
        brandId={brandId}
        brandName={brandName}
        brandColor={brandColor}
        kit={kit}
        versions={versions}
        connectedPlatforms={connectedPlatforms}
      />
    </div>
  );
}
