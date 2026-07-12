'use client';
import { useState } from 'react';
import { Wand2, CheckCircle2, AlertCircle, CalendarClock } from 'lucide-react';
import { saveContentPlan } from '@/lib/content-plan-actions';
import { TEMPLATES, TEMPLATE_LABELS } from '@/lib/ai/templates';
import { Button } from '@/components/ui/Button';

export function AutopilotForm({ brandId, plan, hasBrandKit }) {
  const [active, setActive] = useState(!!plan?.active);
  const [postsPerDay, setPostsPerDay] = useState(plan?.posts_per_day || 1);
  const [format, setFormat] = useState(plan?.format || 'quote');
  const [pillars, setPillars] = useState((plan?.pillars || []).join('\n'));
  const [times, setTimes] = useState((plan?.preferred_times || []).join(', '));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function save() {
    setBusy(true); setMsg(null);
    const res = await saveContentPlan({ brandId, active, postsPerDay, format, pillars, preferredTimes: times });
    setBusy(false);
    setMsg(res?.error ? { type: 'err', text: res.error } : { type: 'ok', text: 'Piloto salvo!' });
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';

  return (
    <div className="space-y-5">
      {/* switch principal */}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-tint text-accent"><Wand2 className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-extrabold text-ink">Piloto automático</p>
            <p className="text-xs text-muted">Todo dia a IA cria os criativos e deixa como <strong>rascunhos p/ aprovação</strong>. Nada publica sem você aprovar.</p>
          </div>
        </div>
        <button
          type="button" onClick={() => setActive((v) => !v)} role="switch" aria-checked={active}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${active ? 'bg-accent' : 'bg-line-strong'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {!hasBrandKit && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>Sem <a href="/brand-kit" className="font-bold text-accent hover:underline">Brand Kit</a>, o conteúdo sai genérico. Configure nicho, tom e paleta primeiro.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink">Posts por dia</label>
          <select value={postsPerDay} onChange={(e) => setPostsPerDay(Number(e.target.value))} className={field}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} post{n > 1 ? 's' : ''}/dia</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink">Formato preferido</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className={field}>
            {TEMPLATES.map((t) => <option key={t} value={t}>{TEMPLATE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-ink">Pilares (rodízio de temas)</label>
        <textarea value={pillars} onChange={(e) => setPillars(e.target.value)} rows={3} placeholder={'um por linha:\ndicas\nbastidores\nprova social'} className={field} />
        <p className="mt-1 text-[11px] text-faint">Vazio = usa os pilares do Brand Kit.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-ink">Horários preferidos (opcional)</label>
        <input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="09:00, 18:00" className={field} />
      </div>

      {plan?.last_run_at && (
        <p className="flex items-center gap-1.5 text-[11px] text-faint"><CalendarClock className="h-3.5 w-3.5" /> Última geração: {new Date(plan.last_run_at).toLocaleString('pt-BR')}</p>
      )}

      {msg && (
        <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}
        </p>
      )}
      <Button onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar configuração'}</Button>

      <p className="rounded-xl border border-line bg-surface-2 p-3 text-[11px] leading-relaxed text-muted">
        A geração roda 1× por dia (cron). Cada post consome tokens do DeepSeek (custo registrado por transparência). As imagens são renderizadas on-brand pelo próprio app — sem custo de modelo de imagem.
      </p>
    </div>
  );
}
