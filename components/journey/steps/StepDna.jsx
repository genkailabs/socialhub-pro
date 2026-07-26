'use client';
import React from 'react';
import { useState } from 'react';
import { analyzeBrandDNA, approveDnaVersion } from '@/lib/dna-actions';
import { saveJourneyAnswers } from '@/lib/journey-actions';
import { JOURNEY_OBJECTIVES } from '../journey-copy';
import { AgentButton, AgentChoices, AgentPreview } from '../AgentUI';

// Duas fases dentro do passo, porque o produto inteiro se apoia nisso: a IA
// PROPÕE e a pessoa APROVA. Gerar e ativar no mesmo clique tiraria dela a única
// decisão que define a marca.
export function StepDna({ brandId, brandName, run, busy, advance }) {
  const [objective, setObjective] = useState('');
  const [proposal, setProposal] = useState(null);

  async function gerar() {
    const escolhido = JOURNEY_OBJECTIVES.find((o) => o.value === objective);
    await run(() => saveJourneyAnswers({ brandId, answers: { objetivo: objective }, step: 3 }));
    const res = await run(() =>
      analyzeBrandDNA({
        brandId,
        brandName,
        wantIg: true,
        manual: { objetivo: escolhido?.label || '' }
      })
    );
    if (res?.ok) setProposal({ id: res.version?.id, dna: res.dna });
  }

  async function aprovar() {
    const res = await run(() => approveDnaVersion({ brandId, versionId: proposal.id }));
    if (res?.ok) advance();
  }

  if (proposal) {
    const dna = proposal.dna || {};
    return (
      <div className="space-y-2.5">
        <AgentPreview
          title="Foi isso que eu entendi"
          items={[
            dna.niche && `Nicho: ${dna.niche}`,
            dna.audience && `Público: ${dna.audience}`,
            dna.tone && `Tom de voz: ${dna.tone}`
          ]}
        />
        <AgentButton onClick={aprovar} busy={busy}>Aprovar e continuar</AgentButton>
        <AgentButton variant="ghost" onClick={() => setProposal(null)} disabled={busy}>
          Não ficou bom, gerar de novo
        </AgentButton>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[12px] font-semibold text-ink-2">O que a marca precisa alcançar?</p>
      <AgentChoices name="Objetivo da marca" options={JOURNEY_OBJECTIVES} value={objective} onChange={setObjective} />
      <AgentButton onClick={gerar} busy={busy} disabled={!objective}>
        {busy ? 'Montando seu DNA…' : 'Montar meu Brand DNA'}
      </AgentButton>
    </div>
  );
}
