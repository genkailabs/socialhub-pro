'use client';
import { useState } from 'react';
import { PenSquare, Sparkles } from 'lucide-react';
import { ComposerForm } from './ComposerForm';
import { MarketingAssistantPanel } from './MarketingAssistantPanel';
import { AssistantContentEditor } from './AssistantContentEditor';

export function ComposerTabs({ brandId, brandName, hasApprovedDna, instagramConnected, recommendation }) {
  const [tab, setTab] = useState('assistant');
  const [assistantStage, setAssistantStage] = useState(() => typeof window !== 'undefined' && window.sessionStorage.getItem('composer:completion') ? 'complete' : 'recommendation');
  const finishContent = (kind) => {
    window.sessionStorage.setItem('composer:completion', kind);
    setAssistantStage('complete');
  };
  const resetAssistant = () => {
    window.sessionStorage.removeItem('composer:completion');
    setAssistantStage('recommendation');
  };
  const btn = (active) =>
    `flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
      active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
        <button type="button" onClick={() => setTab('manual')} className={btn(tab === 'manual')}><PenSquare className="h-3.5 w-3.5" /> Manual</button>
        <button type="button" onClick={() => setTab('assistant')} className={btn(tab === 'assistant')}><Sparkles className="h-3.5 w-3.5" /> Assistente de Marketing</button>
      </div>
      {tab === 'manual'
        ? <ComposerForm brandId={brandId} brandName={brandName} />
        : assistantStage === 'complete'
          ? <div className="max-w-2xl rounded-2xl border border-success/30 bg-surface p-8 text-center shadow-soft"><Sparkles className="mx-auto h-9 w-9 text-success" /><h2 className="mt-4 text-xl font-extrabold text-ink">Publicação concluída</h2><p className="mt-2 text-sm text-muted">Seu conteúdo já está no fluxo certo. Quando quiser, crie uma nova ideia com o assistente.</p><button type="button" onClick={resetAssistant} className="mt-5 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white">Criar nova ideia</button></div>
        : assistantStage === 'content'
          ? <AssistantContentEditor brandId={brandId} brandName={brandName} recommendation={recommendation} onBack={resetAssistant} onComplete={finishContent} />
          : <MarketingAssistantPanel hasApprovedDna={hasApprovedDna} instagramConnected={instagramConnected} recommendation={recommendation} onCreateContent={() => setAssistantStage('content')} />}
    </div>
  );
}
