'use client';
import * as Tabs from '@radix-ui/react-tabs';
import { Sparkles, Pencil } from 'lucide-react';
import { DnaAnalyzer } from './DnaAnalyzer';
import { BrandKitForm } from './BrandKitForm';

const trigger =
  'flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm font-bold text-muted transition-colors data-[state=active]:border-accent data-[state=active]:text-ink border-transparent hover:text-ink';

export function BrandKitTabs({ brandId, brandName, brandColor, kit }) {
  return (
    <Tabs.Root defaultValue="analise" className="space-y-5">
      <div className="flex items-center justify-between border-b border-line">
        <Tabs.List className="flex gap-2">
          <Tabs.Trigger value="analise" className={trigger}><Sparkles className="h-4 w-4" />Análise</Tabs.Trigger>
          <Tabs.Trigger value="editor" className={trigger}><Pencil className="h-4 w-4" />Editor</Tabs.Trigger>
        </Tabs.List>
        <span className="mb-2 hidden rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent sm:inline">
          DNA usado automaticamente na geração
        </span>
      </div>

      <Tabs.Content value="analise" className="outline-none">
        <DnaAnalyzer brandId={brandId} brandName={brandName} kit={kit} savedReport={kit?.dna_report} />
      </Tabs.Content>
      <Tabs.Content value="editor" className="outline-none">
        <BrandKitForm brandId={brandId} brandColor={brandColor} kit={kit} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
