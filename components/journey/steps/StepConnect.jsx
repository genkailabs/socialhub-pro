'use client';
import React from 'react';
import { connectHref, platformById } from '@/data/platforms';
import { AgentButton } from '../AgentUI';

// O OAuth sai da aplicação e volta. Não há action a chamar: só mandar a pessoa
// para o fluxo da Meta e deixar o gate reposicionar quando ela voltar — como o
// passo é derivado de fatos, basta o token existir para a jornada andar.
export function StepConnect({ brandId }) {
  const instagram = platformById('instagram');

  return (
    <div className="space-y-2.5">
      <AgentButton onClick={() => { window.location.href = connectHref(instagram, brandId, '/instagram/diagnostico'); }}>
        Conectar meu Instagram
      </AgentButton>
      <p className="text-[11.5px] leading-snug text-muted">
        Você vai para a tela da Meta e volta para cá logo depois.
      </p>
    </div>
  );
}
