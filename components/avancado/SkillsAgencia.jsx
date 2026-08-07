'use client';

// Ponte com as skills GenkaiLabs. Elas rodam no Claude, não aqui: o Hub
// monta o briefing com os dados reais da marca e entrega. Saída manual e
// assumida, igual à ponte com GPT próprio no Studio.

import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Sparkles, Wrench } from 'lucide-react';
import { briefingDaSkill, claudeUrl, skillsPorEscopo } from '@/lib/skills-agencia';

function SkillCard({ skill, marca, observacao }) {
  const [copiado, setCopiado] = useState(false);
  const briefing = briefingDaSkill(skill.id, marca, observacao);
  const url = claudeUrl(briefing);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(briefing);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-ink">{skill.label}</h3>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-muted">{skill.entrega}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{skill.resumo}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-faint"><strong className="font-semibold text-muted">Quando:</strong> {skill.quando}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-faint">{skill.aplicacaoNoHub}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={url || 'https://claude.ai/new'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white"
        >
          Abrir no Claude <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink hover:border-accent/40"
        >
          {copiado ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar briefing</>}
        </button>
      </div>
    </article>
  );
}

export function SkillsAgencia({ marca }) {
  // A observação é o que muda a cada uso (a oferta, o cliente, a campanha). O
  // resto do briefing o Hub já sabe.
  const [observacao, setObservacao] = useState('');
  const nucleo = skillsPorEscopo('nucleo');
  const avancado = skillsPorEscopo('avancado');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <label htmlFor="skills-observacao" className="text-xs font-bold text-ink">O que você quer nesta rodada (opcional)</label>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          Vai junto no briefing. O nome, o nicho, o público e o tom da marca o Hub já manda sozinho.
        </p>
        <textarea
          id="skills-observacao"
          value={observacao}
          onChange={(event) => setObservacao(event.target.value)}
          rows={2}
          maxLength={1200}
          placeholder="Ex.: turma de setembro, R$ 497, foco em donos de ótica no DF"
          className="mt-2 w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink"
        />
      </div>

      <section>
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Alimenta o Hub
        </h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {nucleo.map((skill) => <SkillCard key={skill.id} skill={skill} marca={marca} observacao={observacao} />)}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
          <Wrench className="h-3.5 w-3.5" /> Modo avançado
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-faint">
          Trabalho de agência que não passa pelo calendário do Hub. Fica aqui para não sumir, e fora do caminho de quem só quer publicar.
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {avancado.map((skill) => <SkillCard key={skill.id} skill={skill} marca={marca} observacao={observacao} />)}
        </div>
      </section>
    </div>
  );
}
