'use client';
import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { DnaReport } from './DnaReport';
import { DnaVersions } from './DnaVersions';
import { BrandKitForm } from './BrandKitForm';
import { Button } from '@/components/ui/Button';

export function BrandKitTabs({ brandId, brandColor, kit, versions = [], connectedPlatforms = {} }) {
  const [editing, setEditing] = useState(false);
  return <div className="space-y-6"><DnaReport report={kit?.dna_report} /><DnaVersions brandId={brandId} versions={versions} showProposal={false} /><section aria-labelledby="brand-kit-editor-title" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="brand-kit-editor-title" className="text-base font-bold text-ink">Editor do Brand Kit</h2><p className="mt-1 text-xs text-muted">Ajuste os detalhes da marca quando precisar.</p></div><Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}><Pencil className="h-4 w-4" /> {editing ? 'Fechar editor' : 'Editar Brand Kit'}</Button></div>{editing && <BrandKitForm brandId={brandId} brandColor={brandColor} kit={kit} connectedPlatforms={connectedPlatforms} />}</section></div>;
}
