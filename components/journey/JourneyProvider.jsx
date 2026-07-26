'use client';
import React, { createContext, useContext } from 'react';

// A jornada resolvida no servidor, disponível para qualquer client component.
//
// Existe por um motivo concreto: MascotTip e FlowStepper precisam se calar
// enquanto o agente conduz, e eles são renderizados por cinco páginas
// diferentes. Contexto evita passar a mesma prop por todas elas.

const JourneyContext = createContext(null);

export function JourneyProvider({ journey, children }) {
  return <JourneyContext.Provider value={journey || null}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  return useContext(JourneyContext);
}

// Açúcar para o caso mais comum: "estou sendo conduzido agora?".
export function useConducting() {
  return !!useContext(JourneyContext)?.conducting;
}
