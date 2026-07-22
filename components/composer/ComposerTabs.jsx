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
  // Abas de nível de página: sublinhado, não pílula. O formato do post e o
  // seletor de horário usam outras formas, então os três controles deixam de
  // parecer a mesma coisa empilhada.
  const btn = (active) =>
    `-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-1 pb-2.5 text-sm font-bold transition-colors duration-200 ${
      active ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
    }`;

  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-6 border-b border-line">
        <button type="button" role="tab" id="composer-tab-manual" aria-controls="composer-panel" aria-selected={tab === 'manual'} onClick={() => setTab('manual')} className={btn(tab === 'manual')}><PenSquare className="h-4 w-4" aria-hidden="true" /> Manual</button>
        <button type="button" role="tab" id="composer-tab-assistant" aria-controls="composer-panel" aria-selected={tab === 'assistant'} onClick={() => setTab('assistant')} className={btn(tab === 'assistant')}><Sparkles className="h-4 w-4" aria-hidden="true" /> Assistente de Marketing</button>
      </div>
      <div id="composer-panel" role="tabpanel" aria-labelledby={tab === 'manual' ? 'composer-tab-manual' : 'composer-tab-assistant'}>
      {tab === 'manual'
        ? <ComposerForm brandId={brandId} brandName={brandName} />
        : assistantStage === 'complete'
          ? <div className="max-w-2xl rounded-2xl border border-success/30 bg-surface p-8 text-center shadow-soft"><Sparkles className="mx-auto h-9 w-9 text-success" /><h2 className="mt-4 text-xl font-extrabold text-ink">Publicação concluída</h2><p className="mt-2 text-sm text-muted">Seu conteúdo já está no fluxo certo. Quando quiser, crie uma nova ideia com o assistente.</p><button type="button" onClick={resetAssistant} className="mt-5 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white">Criar nova ideia</button></div>
        : assistantStage === 'content'
          ? <AssistantContentEditor brandId={brandId} brandName={brandName} recommendation={recommendation} onBack={resetAssistant} onComplete={finishContent} />
          : <MarketingAssistantPanel hasApprovedDna={hasApprovedDna} instagramConnected={instagramConnected} recommendation={recommendation} onCreateContent={() => setAssistantStage('content')} />}
      </div>
    </div>
  );
}
