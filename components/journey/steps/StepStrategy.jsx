'use client';
import React from 'react';
import { useState } from 'react';
import { generateStrategy, approveStrategy } from '@/lib/strategy-actions';
import { setJourneyFrequency, saveJourneyAnswers } from '@/lib/journey-actions';
import { JOURNEY_FREQUENCIES } from '../journey-copy';
import { AgentButton, AgentChoices, AgentPreview } from '../AgentUI';

// A frequência escolhida aqui é a que chega na estratégia — via parâmetro, não
// via content_plans.posts_per_day, que é inteiro por dia e não representa "3x
// por semana". Era esse o furo que fazia toda estratégia sair com 7 posts.
export function StepStrategy({ brandId, run, busy, advance }) {
  const [frequency, setFrequency] = useState('');
  const [proposal, setProposal] = useState(null);

  async function gerar() {
    const escolhida = JOURNEY_FREQUENCIES.find((f) => f.value === frequency);
    const perWeek = escolhida?.perWeek || 7;
    await run(() => setJourneyFrequency({ brandId, postsPerWeek: perWeek }));
    await run(() => saveJourneyAnswers({ brandId, answers: { frequencia: frequency }, step: 4 }));
    const res = await run(() => generateStrategy({ brandId, postsPerWeek: perWeek }));
    if (res?.ok) setProposal({ id: res.id, strategy: res.strategy });
  }

  async function aprovar() {
    const res = await run(() => approveStrategy({ brandId, strategyId: proposal.id }));
    if (res?.ok) advance();
  }

  if (proposal) {
    const s = proposal.strategy || {};
    const pilares = (s.pillars || []).map((p) => p?.name || p).filter(Boolean).slice(0, 4);
    return (
      <div className="space-y-2.5">
        <AgentPreview
          title="A estratégia que eu proponho"
          items={[
            s.mainObjective && `Objetivo: ${s.mainObjective}`,
            pilares.length ? `Pilares: ${pilares.join(', ')}` : null,
            s.postsPerWeek && `Ritmo: ${s.postsPerWeek} posts por semana`
          ]}
        />
        <AgentButton onClick={aprovar} busy={busy}>Aprovar estratégia</AgentButton>
        <AgentButton variant="ghost" onClick={() => setProposal(null)} disabled={busy}>
          Refazer com outro ritmo
        </AgentButton>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <AgentChoices name="Frequência de publicação" options={JOURNEY_FREQUENCIES} value={frequency} onChange={setFrequency} />
      <AgentButton onClick={gerar} busy={busy} disabled={!frequency}>
        {busy ? 'Montando a estratégia…' : 'Montar minha estratégia'}
      </AgentButton>
    </div>
  );
}
