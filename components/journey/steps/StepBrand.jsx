'use client';
import React from 'react';
import { useState } from 'react';
import { startJourney } from '@/lib/journey-actions';
import { AgentButton } from '../AgentUI';

// A marca nasce aqui, e não no modal do topo, porque é ela que liga a pessoa a
// tudo o mais: sem marca ativa não há Instagram para conectar nem DNA para
// gerar. startJourney também deixa a marca marcada como "em jornada".
export function StepBrand({ run, busy, advance }) {
  const [name, setName] = useState('');

  async function submit(e) {
    e.preventDefault();
    const res = await run(() => startJourney({ name }));
    if (res?.ok) advance();
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <label className="block">
        <span className="sr-only">Nome da marca</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da sua marca"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-faint focus:border-accent"
        />
      </label>
      <AgentButton type="submit" busy={busy} disabled={name.trim().length < 2}>
        Criar marca e continuar
      </AgentButton>
    </form>
  );
}
