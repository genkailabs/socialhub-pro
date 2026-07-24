'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Clock, History, RotateCcw } from 'lucide-react';
import { approveDnaVersion } from '@/lib/dna-actions';
import { activeDna, canApprove, versionLabel } from '@/lib/dna-versions';
import { Button } from '@/components/ui/Button';

const data = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// Handoff: a versão em uso ganha linha em accentTint e pill accent; a que
// aguarda aprovação leva chip neutro; arquivadas ficam sem destaque.
const TOM = {
  approved: 'border-transparent bg-accent-tint',
  proposed: 'border-line bg-surface-2',
  archived: 'border-line bg-surface'
};

const PILL = {
  approved: { label: 'Em uso', className: 'bg-accent text-white' },
  proposed: { label: 'Aguardando', className: 'bg-surface-3 text-muted' },
  archived: null
};

// Histórico do Brand DNA (PRD §8-E6 / RF-04): a IA propõe, o usuário aprova, e
// nada some — dá para voltar para uma versão anterior.
export function DnaVersions({ brandId, versions = [], showProposal = true }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [erro, setErro] = useState(null);

  if (!versions.length) return null;

  const ativa = activeDna(versions);
  const proposta = versions.find((v) => v.status === 'proposed');

  async function aprovar(versionId) {
    setBusy(versionId); setErro(null);
    try {
      const res = await approveDnaVersion({ brandId, versionId });
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-3">
      {/* A proposta pendente é a ação mais importante da tela. */}
      {showProposal && proposta && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Clock className="h-4 w-4 text-accent" aria-hidden="true" />
            {ativa ? 'Nova versao do seu Brand DNA pronta' : 'Seu Brand DNA esta pronto'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {ativa
              ? 'Ela so passa a valer depois que voce aprovar. Ate la, o Social Hub continua usando a versao atual.'
              : 'Revise e aprove para o Social Hub comecar a usar nos seus conteudos.'}
          </p>
          <Button className="mt-3" onClick={() => aprovar(proposta.id)} disabled={busy === proposta.id}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {busy === proposta.id ? 'Aprovando...' : 'Aprovar e usar esta versao'}
          </Button>
        </div>
      )}

      {erro && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{erro}
        </p>
      )}

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="mb-3.5 flex items-center gap-2 text-[15px] font-bold text-ink">
          <History className="h-4 w-4 text-muted" aria-hidden="true" />
          Histórico do Brand DNA
        </h3>
        <ul className="space-y-2">
          {versions.map((v) => {
            const pill = PILL[v.status];
            return (
              <li key={v.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${TOM[v.status] || TOM.archived}`}>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-ink">
                    {versionLabel(v)}
                    {pill && (
                      <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${pill.className}`}>
                        {pill.label}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">
                    Criada em {data(v.created_at)}
                    {v.approved_at && ` · aprovada em ${data(v.approved_at)}`}
                  </p>
                </div>
                {v.status === 'archived' && canApprove(v) && (
                  <Button variant="ghost" size="sm" onClick={() => aprovar(v.id)} disabled={busy === v.id}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {busy === v.id ? 'Restaurando...' : 'Restaurar'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
