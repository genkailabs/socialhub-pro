'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, AlertCircle, Instagram, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { analyzeBrandDNA, approveDnaVersion } from '@/lib/dna-actions';
import { connectHref, platformById } from '@/data/platforms';
import { DnaReport } from './DnaReport';

const field = 'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15';

export function DnaAnalyzer({ brandId, brandName, kit, savedReport, connectedPlatforms = {} }) {
  const router = useRouter();
  const [wantIg, setWantIg] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState(kit?.website_url || '');
  const [pastedText, setPastedText] = useState(kit?.free_text || '');
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState(savedReport || kit?.dna_report || null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  function run() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        const res = await analyzeBrandDNA({ brandId, brandName, wantIg, websiteUrl, pastedText, manual: kit || {} });
        if (res?.error) {
          setError(res.error);
        } else {
          setReport(res.report);
          setOk(true);
        }
      } catch (e) {
        setError('Erro ao gerar Brand DNA.');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5 space-y-4">
        <p className="text-sm font-bold text-ink">Fontes para a IA analisar</p>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={wantIg} onChange={(e) => setWantIg(e.target.checked)} className="h-4 w-4 accent-accent" />
            <Instagram className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-ink">Analisar meu Instagram (bio + últimas legendas)</span>
          </label>
          {connectedPlatforms?.instagram?.is_active ? (
            <span className="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-semibold text-success flex items-center gap-1">
              @{connectedPlatforms.instagram.platform_username || 'conectado'}
            </span>
          ) : wantIg ? (
            <a
              href={connectHref(platformById('instagram'), brandId, '/brand-kit')}
              className="rounded-lg bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Instagram className="h-3.5 w-3.5" /> Conectar conta agora
            </a>
          ) : null}
        </div>

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

        <Button onClick={run} disabled={isPending}>
          <Sparkles className="h-4 w-4" />{isPending ? 'Analisando…' : 'Gerar Brand DNA'}
        </Button>
      </div>

      <DnaReport report={report} />
    </div>
  );
}
