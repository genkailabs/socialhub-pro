'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Clock, History, RotateCcw } from 'lucide-react';
import { approveDnaVersion } from '@/lib/dna-actions';
import { activeDna, canApprove, versionLabel } from '@/lib/dna-versions';
import { Button } from '@/components/ui/Button';

const data = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const TOM = {
  approved: 'border-success/40 bg-success/5',
  proposed: 'border-accent/40 bg-accent/5',
  archived: 'border-line bg-surface'
};

// Histórico do Brand DNA (PRD §8-E6 / RF-04): a IA propõe, o usuário aprova, e
// nada some — dá para voltar para uma versão anterior.
export function DnaVersions({ brandId, versions = [] }) {
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
      {proposta && (
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

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <History className="h-4 w-4 text-muted" aria-hidden="true" />
          Historico do Brand DNA
        </h3>
        <ul className="space-y-2">
          {versions.map((v) => (
            <li key={v.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${TOM[v.status] || TOM.archived}`}>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink">{versionLabel(v)}</p>
                <p className="text-[11px] text-faint">
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
          ))}
        </ul>
      </div>
    </div>
  );
}
