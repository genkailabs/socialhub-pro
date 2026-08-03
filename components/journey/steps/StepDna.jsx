'use client';
import React from 'react';
import { useState } from 'react';
import { analyzeBrandDNA, approveDnaVersion } from '@/lib/dna-actions';
import { saveJourneyAnswers } from '@/lib/journey-actions';
import {
  PERGUNTAS_POSICIONAMENTO, avaliarResposta, proximaPergunta, respostasParaManual
} from '@/lib/diagnostico-perguntas';
import { JOURNEY_OBJECTIVES } from '../journey-copy';
import { AgentButton, AgentChoices, AgentPreview } from '../AgentUI';

// Duas fases dentro do passo, porque o produto inteiro se apoia nisso: a IA
// PROPÕE e a pessoa APROVA. Gerar e ativar no mesmo clique tiraria dela a única
// decisão que define a marca.
//
// Antes da fase de proposta vem o questionário de posicionamento: uma pergunta
// por vez, afunilando o genérico. Perguntar só o objetivo e deduzir o resto do
// feed devolvia sempre a mesma casca — nicho, público e tom —, e território,
// ICP, dor e tese não estão em legenda nenhuma.
export function StepDna({ brandId, brandName, run, busy, advance }) {
  const [objective, setObjective] = useState('');
  const [respostas, setRespostas] = useState({});
  const [rascunho, setRascunho] = useState('');
  const [aviso, setAviso] = useState('');
  const [proposal, setProposal] = useState(null);

  const pergunta = proximaPergunta(respostas);
  const respondidas = Object.keys(respostas).length;

  function responder() {
    const veredito = avaliarResposta(pergunta.id, rascunho);
    if (!veredito.ok) {
      setAviso(veredito.motivo);
      return;
    }
    setRespostas((atual) => ({ ...atual, [pergunta.id]: rascunho.trim() }));
    setRascunho('');
    setAviso('');
  }

  function voltarUma() {
    const respondidasIds = PERGUNTAS_POSICIONAMENTO.map((p) => p.id).filter((id) => respostas[id]);
    const ultima = respondidasIds.at(-1);
    if (!ultima) return;
    setRascunho(respostas[ultima]);
    setAviso('');
    setRespostas((atual) => {
      const copia = { ...atual };
      delete copia[ultima];
      return copia;
    });
  }

  async function gerar() {
    const escolhido = JOURNEY_OBJECTIVES.find((o) => o.value === objective);
    const answers = { ...respostas, objetivo: objective };
    await run(() => saveJourneyAnswers({ brandId, answers, step: 3 }));
    const res = await run(() =>
      analyzeBrandDNA({
        brandId,
        brandName,
        wantIg: true,
        manual: respostasParaManual({ ...respostas, objetivo: escolhido?.label || '' })
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
    const editorias = Array.isArray(dna.editorias) ? dna.editorias.filter(Boolean) : [];
    return (
      <div className="space-y-2.5">
        <AgentPreview
          title="Foi isso que eu entendi"
          items={[
            dna.niche && `Nicho: ${dna.niche}`,
            dna.territory && `Território: ${dna.territory}`,
            dna.icp && `Cliente ideal: ${dna.icp}`,
            dna.pain && `Dor: ${dna.pain}`,
            dna.bigIdea && `Tese: ${dna.bigIdea}`,
            dna.tone && `Tom de voz: ${dna.tone}`,
            editorias.length && `Editorias: ${editorias.map((e) => e.nome || e).join(', ')}`
          ]}
        />
        <AgentButton onClick={aprovar} busy={busy}>Aprovar e continuar</AgentButton>
        <AgentButton variant="ghost" onClick={() => setProposal(null)} disabled={busy}>
          Não ficou bom, gerar de novo
        </AgentButton>
      </div>
    );
  }

  // Questionário: uma pergunta por vez até acabar.
  if (pergunta) {
    return (
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
          Pergunta {respondidas + 1} de {PERGUNTAS_POSICIONAMENTO.length}
        </p>
        <p className="text-[12px] font-semibold text-ink-2">{pergunta.pergunta}</p>
        <p className="text-[11px] leading-relaxed text-muted">{pergunta.ajuda}</p>
        <label className="sr-only" htmlFor={`dna-${pergunta.id}`}>{pergunta.pergunta}</label>
        <textarea
          id={`dna-${pergunta.id}`}
          value={rascunho}
          onChange={(event) => { setRascunho(event.target.value); if (aviso) setAviso(''); }}
          rows={3}
          maxLength={600}
          placeholder={pergunta.exemplo}
          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink"
        />
        {aviso && <p className="text-[11px] leading-relaxed text-danger">{aviso}</p>}
        <AgentButton onClick={responder} disabled={busy || !rascunho.trim()}>Continuar</AgentButton>
        {respondidas > 0 && (
          <AgentButton variant="ghost" onClick={voltarUma} disabled={busy}>Voltar uma pergunta</AgentButton>
        )}
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
      <AgentButton variant="ghost" onClick={voltarUma} disabled={busy}>Revisar a última resposta</AgentButton>
    </div>
  );
}
