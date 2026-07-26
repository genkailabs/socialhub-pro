'use client';
import React from 'react';
import { generateWeekPlan } from '@/lib/planning-actions';
import { finishJourney } from '@/lib/journey-actions';
import { AgentButton } from '../AgentUI';

// Fim da linha. O wizard antigo chamava generateWeekPlan logo depois de aprovar
// o DNA, pulando a estratégia — e o gate duro do planejamento derrubava a
// chamada toda vez. Aqui o plano só é pedido quando a estratégia já existe
// aprovada, porque a etapa anterior é justamente essa.
export function StepPlan({ brandId, run, busy, advance }) {
  async function gerar() {
    const res = await run(() => generateWeekPlan({ brandId }));
    if (!res?.ok) return;
    // Concluir aqui e não no primeiro item aprovado: o plano existindo já
    // destrava todas as telas com conteúdo real para mostrar.
    await run(() => finishJourney({ brandId }));
    advance();
  }

  return (
    <div className="space-y-2.5">
      <AgentButton onClick={gerar} busy={busy}>
        {busy ? 'Montando sua semana…' : 'Gerar meu plano da semana'}
      </AgentButton>
      <p className="text-[11.5px] leading-snug text-muted">
        Depois disso o menu inteiro fica liberado.
      </p>
    </div>
  );
}
