'use client';
import { useState } from 'react';
import { PenSquare, Wand2 } from 'lucide-react';
import { ComposerForm } from './ComposerForm';
import { AIStudioPanel } from '@/components/ai/AIStudioPanel';

export function ComposerTabs({ brandId, brandName, hasBrandKit }) {
  const [tab, setTab] = useState('manual');
  const btn = (active) =>
    `flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
      active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
        <button onClick={() => setTab('manual')} className={btn(tab === 'manual')}><PenSquare className="h-3.5 w-3.5" /> Criar manual</button>
        <button onClick={() => setTab('ai')} className={btn(tab === 'ai')}><Wand2 className="h-3.5 w-3.5" /> Gerar com IA</button>
      </div>
      {tab === 'manual'
        ? <ComposerForm brandId={brandId} brandName={brandName} />
        : <AIStudioPanel brandId={brandId} brandName={brandName} hasBrandKit={hasBrandKit} />}
    </div>
  );
}
