'use client';
import React from 'react';
import { runInstagramAudit } from '@/lib/instagram-audit-actions';
import { AgentButton } from '../AgentUI';

// O agente dispara o diagnóstico e a tela atrás mostra o resultado chegando.
// Chamar a action direto (em vez de pedir "clique no botão da tela") é o que
// torna o passo determinístico: não depende de a pessoa achar o botão certo.
export function StepDiagnose({ brandId, run, busy, advance }) {
  async function analisar() {
    const res = await run(() => runInstagramAudit({ brandId }));
    if (res?.ok) advance();
  }

  return (
    <div className="space-y-2.5">
      <AgentButton onClick={analisar} busy={busy}>
        {busy ? 'Lendo seu perfil…' : 'Ler meu perfil agora'}
      </AgentButton>
      <p className="text-[11.5px] leading-snug text-muted">
        O resultado fica salvo — não precisa rodar de novo toda vez.
      </p>
    </div>
  );
}
