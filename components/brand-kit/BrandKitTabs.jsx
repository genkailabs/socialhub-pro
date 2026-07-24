'use client';
import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { DnaReport } from './DnaReport';
import { DnaVersions } from './DnaVersions';
import { BrandKitForm } from './BrandKitForm';
import { Button } from '@/components/ui/Button';

export function BrandKitTabs({ brandId, brandColor, kit, versions = [], connectedPlatforms = {} }) {
  const [editing, setEditing] = useState(false);
  const updatedAt = kit?.updated_at || kit?.dna_report?.updated_at;

  return (
    <div className="space-y-4">
      <DnaReport report={kit?.dna_report} updatedAt={updatedAt} />

      {/* Histórico e editor lado a lado (1fr 1fr), como no handoff. O editor
          expandido ocupa a largura toda para os campos não ficarem apertados. */}
      <div className={editing ? 'space-y-4' : 'grid items-start gap-4 lg:grid-cols-2'}>
        <DnaVersions brandId={brandId} versions={versions} showProposal={false} />

        <section aria-labelledby="brand-kit-editor-title" className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="brand-kit-editor-title" className="text-[15px] font-bold text-ink">Editor do Brand Kit</h3>
              <p className="mt-1 text-[12.5px] text-muted">Ajuste os detalhes da marca quando precisar.</p>
            </div>
            <Button size="sm" onClick={() => setEditing((value) => !value)}>
              <Pencil className="h-4 w-4" /> {editing ? 'Fechar editor' : 'Editar Brand Kit'}
            </Button>
          </div>
          {editing && (
            <div className="mt-5 border-t border-line pt-5">
              <BrandKitForm brandId={brandId} brandColor={brandColor} kit={kit} connectedPlatforms={connectedPlatforms} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
