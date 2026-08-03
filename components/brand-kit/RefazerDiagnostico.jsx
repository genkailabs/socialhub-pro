'use client';

// Refazer o diagnóstico depois que a marca já existe.
//
// O questionário de posicionamento só rodava uma vez, no primeiro uso: quem
// mudou de nicho, achou outra tese ou entrou com a conta já criada não tinha
// como refazer. A versão nova entra como proposta — a anterior continua no
// histórico até alguém aprovar a troca.

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { analyzeBrandDNA, approveDnaVersion } from '@/lib/dna-actions';
import {
  PERGUNTAS_POSICIONAMENTO, avaliarResposta, proximaPergunta, respostasParaManual
} from '@/lib/diagnostico-perguntas';
import { Button } from '@/components/ui/Button';

export function RefazerDiagnostico({ brandId, brandName }) {
  const [aberto, setAberto] = useState(false);
  const [respostas, setRespostas] = useState({});
  const [rascunho, setRascunho] = useState('');
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposta, setProposta] = useState(null);
  const [mensagem, setMensagem] = useState('');

  const pergunta = proximaPergunta(respostas);
  const respondidas = Object.keys(respostas).length;

  function responder() {
    const veredito = avaliarResposta(pergunta.id, rascunho);
    if (!veredito.ok) { setAviso(veredito.motivo); return; }
    setRespostas((atual) => ({ ...atual, [pergunta.id]: rascunho.trim() }));
    setRascunho('');
    setAviso('');
  }

  async function gerar() {
    setBusy(true);
    setMensagem('');
    try {
      const res = await analyzeBrandDNA({
        brandId,
        brandName,
        wantIg: true,
        manual: respostasParaManual(respostas)
      });
      if (res?.error) throw new Error(res.error);
      setProposta({ id: res.version?.id, dna: res.dna });
    } catch (error) {
      setMensagem(error.message || 'Não foi possível refazer o diagnóstico.');
    } finally {
      setBusy(false);
    }
  }

  async function aprovar() {
    setBusy(true);
    try {
      const res = await approveDnaVersion({ brandId, versionId: proposta.id });
      if (res?.error) throw new Error(res.error);
      setMensagem('Diagnóstico novo aprovado. A versão anterior continua no histórico.');
      setProposta(null);
      setRespostas({});
      setAberto(false);
    } catch (error) {
      setMensagem(error.message || 'Não foi possível aprovar.');
    } finally {
      setBusy(false);
    }
  }

  function reiniciar() {
    setRespostas({});
    setRascunho('');
    setAviso('');
    setProposta(null);
    setMensagem('');
  }

  return (
    <section aria-labelledby="refazer-diagnostico-title" className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="refazer-diagnostico-title" className="text-[15px] font-bold text-ink">Refazer diagnóstico</h3>
          <p className="mt-1 text-[12.5px] text-muted">
            Mudou de nicho, de público ou achou outra tese? Responda de novo — a versão atual fica guardada.
          </p>
        </div>
        <Button size="sm" onClick={() => { setAberto((v) => !v); if (aberto) reiniciar(); }}>
          <RefreshCw className="h-4 w-4" /> {aberto ? 'Cancelar' : 'Refazer diagnóstico'}
        </Button>
      </div>

      {mensagem && <p className="mt-3 text-[12px] leading-relaxed text-muted">{mensagem}</p>}

      {aberto && !proposta && pergunta && (
        <div className="mt-5 space-y-2.5 border-t border-line pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
            Pergunta {respondidas + 1} de {PERGUNTAS_POSICIONAMENTO.length}
          </p>
          <label htmlFor={`refazer-${pergunta.id}`} className="block text-[13px] font-semibold text-ink">{pergunta.pergunta}</label>
          <p className="text-[11.5px] leading-relaxed text-muted">{pergunta.ajuda}</p>
          <textarea
            id={`refazer-${pergunta.id}`}
            value={rascunho}
            onChange={(event) => { setRascunho(event.target.value); if (aviso) setAviso(''); }}
            rows={3}
            maxLength={600}
            placeholder={pergunta.exemplo}
            className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink"
          />
          {aviso && <p className="text-[11.5px] leading-relaxed text-danger">{aviso}</p>}
          <Button size="sm" onClick={responder} disabled={!rascunho.trim()}>Continuar</Button>
        </div>
      )}

      {aberto && !proposta && !pergunta && (
        <div className="mt-5 space-y-2.5 border-t border-line pt-5">
          <p className="text-[12.5px] leading-relaxed text-muted">
            Respondido. Vou reler seu Instagram junto com estas respostas e propor o posicionamento novo.
          </p>
          <Button size="sm" onClick={gerar} disabled={busy}>
            {busy ? 'Analisando…' : 'Gerar diagnóstico novo'}
          </Button>
        </div>
      )}

      {proposta && (
        <div className="mt-5 space-y-2.5 border-t border-line pt-5">
          <p className="text-[13px] font-semibold text-ink">Proposta nova</p>
          <ul className="space-y-1 text-[12.5px] leading-relaxed text-muted">
            {[
              proposta.dna?.niche && `Nicho: ${proposta.dna.niche}`,
              proposta.dna?.territory && `Território: ${proposta.dna.territory}`,
              proposta.dna?.icp && `Cliente ideal: ${proposta.dna.icp}`,
              proposta.dna?.pain && `Dor: ${proposta.dna.pain}`,
              proposta.dna?.bigIdea && `Tese: ${proposta.dna.bigIdea}`
            ].filter(Boolean).map((linha) => <li key={linha}>{linha}</li>)}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={aprovar} disabled={busy}>Aprovar e substituir</Button>
            <Button size="sm" variant="ghost" onClick={reiniciar} disabled={busy}>Descartar</Button>
          </div>
        </div>
      )}
    </section>
  );
}
