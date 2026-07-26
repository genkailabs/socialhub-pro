'use client';
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Peças compartilhadas pelos passos do agente. Existem para que os seis passos
// pareçam o mesmo agente falando, e não seis telas diferentes.

export function AgentButton({ children, onClick, disabled, busy, type = 'button', variant = 'primary' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary'
          ? 'bg-accent text-white hover:bg-accent-ink'
          : 'border border-line bg-surface text-ink hover:bg-surface-2'
      )}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// Lista de escolha única. Usada para objetivo e frequência.
export function AgentChoices({ options, value, onChange, name }) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'w-full cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              // Mesmo par de superfícies do ComposerTypeSelector: é o padrão de
              // escolha já provado em claro e escuro no resto do produto.
              active
                ? 'border-accent bg-accent-tint text-accent-ink'
                : 'border-line bg-surface-2/60 hover:border-line-strong'
            )}
          >
            <span className={cn('block text-[13px] font-semibold', active ? 'text-accent-ink' : 'text-ink')}>
              {opt.label}
            </span>
            {opt.hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{opt.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

// O que o agente já entregou naquele passo, antes de a pessoa aprovar.
export function AgentPreview({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.filter(Boolean).map((item) => (
          <li key={item} className="text-[12.5px] leading-snug text-ink-2">{item}</li>
        ))}
      </ul>
    </div>
  );
}
