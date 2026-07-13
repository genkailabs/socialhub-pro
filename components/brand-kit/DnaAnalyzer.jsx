'use client';
import { useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, Instagram, Globe, FileText } from 'lucide-react';
import { analyzeBrandDNA } from '@/lib/dna-actions';
import { Button } from '@/components/ui/Button';
import { DnaReport } from './DnaReport';

const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';

export function DnaAnalyzer({ brandId, brandName, kit, savedReport }) {
  const [wantIg, setWantIg] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [report, setReport] = useState(savedReport || kit?.dna_report || null);

  async function run() {
    setBusy(true); setError(null); setOk(false);
    const res = await analyzeBrandDNA({ brandId, brandName, wantIg, websiteUrl, pastedText, manual: kit || {} });
    setBusy(false);
    if (res?.error) { setError(res.error); return; }
    setReport(res.report);
    setOk(true);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <p className="text-sm font-bold text-ink">Fontes para a IA analisar</p>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" checked={wantIg} onChange={(e) => setWantIg(e.target.checked)} className="h-4 w-4 accent-[var(--accent,#6366f1)]" />
          <Instagram className="h-4 w-4 text-accent" />
          <span className="text-sm text-ink">Analisar meu Instagram (bio + últimas legendas)</span>
        </label>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink"><Globe className="h-3.5 w-3.5 text-accent" /> URL do site (opcional)</label>
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" className={field} />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink"><FileText className="h-3.5 w-3.5 text-accent" /> Texto colado (manual da marca, briefing…)</label>
          <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} rows={4} placeholder="Cole aqui qualquer texto que descreva a marca." className={field} />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-danger"><AlertCircle className="h-4 w-4" />{error}</p>
        )}
        {ok && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 className="h-4 w-4" />DNA salvo — edite os campos na aba Editor.</p>
        )}

        <Button onClick={run} disabled={busy}>
          <Sparkles className="h-4 w-4" />{busy ? 'Analisando…' : 'Gerar Brand DNA'}
        </Button>
      </div>

      <DnaReport report={report} />
    </div>
  );
}
