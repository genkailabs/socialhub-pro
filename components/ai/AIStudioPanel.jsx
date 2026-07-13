'use client';
import { useState } from 'react';
import {
  Sparkles, Wand2, Send, Clock, FileText, Link2, Copy, Check,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import { generatePost } from '@/lib/ai-actions';
import { publishNow, schedulePost, saveDraft, submitForApproval } from '@/lib/posts-actions';
import { TEMPLATES, TEMPLATE_LABELS } from '@/lib/ai/templates';
import { formatUsd } from '@/lib/ai/cost';
import { Button } from '@/components/ui/Button';

export function AIStudioPanel({ brandId, brandName = 'sua_marca', hasBrandKit }) {
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('quote');
  const [goal, setGoal] = useState('engajar a audiência');
  const [ignoreDna, setIgnoreDna] = useState(false);
  const [gen, setGen] = useState(null); // { spec, imageUrls, cost }
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState('now');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [approvalLink, setApprovalLink] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy('gen'); setMsg(null); setApprovalLink('');
    try {
      const res = await generatePost({ brandId, brandName, brief: { topic, format, goal }, ignoreDna });
      if (res?.error) throw new Error(res.error);
      setGen(res);
      setCaption(res.spec.caption || '');
      setHashtags((res.spec.hashtags || []).join(' '));
      setSlide(0);
      setMsg({
        type: 'ok',
        text: `Gerado! Custo total: ${formatUsd(res.cost)} (Gemini texto: ${formatUsd(res.textCost || 0)} · Imagem ${res.imageProvider === 'gemini' ? 'Gemini' : 'render'}: ${formatUsd(res.imageCost || 0)}).`
      });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setBusy(''); }
  }

  async function run(action) {
    if (!gen) return;
    if (action === 'schedule' && !when) { setMsg({ type: 'err', text: 'Escolha data e hora.' }); return; }
    setBusy(action); setMsg(null); setApprovalLink('');
    try {
      const payload = { brandId, caption, hashtags, imageUrls: gen.imageUrls };
      let res;
      if (action === 'now') res = await publishNow(payload);
      else if (action === 'schedule') res = await schedulePost({ ...payload, scheduledAt: new Date(when).toISOString() });
      else if (action === 'draft') res = await saveDraft(payload);
      else if (action === 'approval') res = await submitForApproval(payload);
      if (res?.error) throw new Error(res.error);
      if (action === 'approval' && res.token) {
        setApprovalLink(`${window.location.origin}/approve/${res.token}`);
        setMsg({ type: 'ok', text: 'Enviado para aprovação! Copie o link para o cliente.' });
      } else {
        setMsg({ type: 'ok', text: { now: 'Publicado no Instagram!', schedule: 'Post agendado!', draft: 'Rascunho salvo!' }[action] });
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setBusy(''); }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(approvalLink);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';
  const tab = (active) => `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'}`;
  const urls = gen?.imageUrls || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {!hasBrandKit && (
          <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>Configure o <a href="/brand-kit" className="font-bold text-accent hover:underline">Brand Kit</a> desta marca (nicho, tom, paleta) para a IA gerar conteúdo mais on-brand.</span>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink">Tema / assunto do post</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: benefícios do café coado, dica de produtividade…" className={field} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Formato</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className={field}>
              {TEMPLATES.map((t) => <option key={t} value={t}>{TEMPLATE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Objetivo</label>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="engajar, vender, educar…" className={field} />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={ignoreDna} onChange={(e) => setIgnoreDna(e.target.checked)} className="h-4 w-4" />
          Ignorar Brand DNA (geração genérica)
        </label>

        <Button onClick={generate} disabled={busy === 'gen'} className="w-full">
          <Wand2 className="h-4 w-4" /> {busy === 'gen' ? 'Gerando com Gemini…' : gen ? 'Gerar outra ideia' : 'Gerar com IA'}
        </Button>

        {gen && (
          <>
            <div className="border-t border-line pt-4">
              <label className="mb-1.5 block text-xs font-bold text-ink">Legenda (edite à vontade)</label>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className={field} />
              <label className="mb-1.5 mt-3 block text-xs font-bold text-ink">Hashtags</label>
              <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} className={field} />
            </div>

            <div className="inline-flex w-full gap-1 rounded-xl bg-surface-2 p-1">
              <button type="button" onClick={() => setMode('now')} className={tab(mode === 'now')}><Send className="h-3.5 w-3.5" /> Publicar agora</button>
              <button type="button" onClick={() => setMode('schedule')} className={tab(mode === 'schedule')}><Clock className="h-3.5 w-3.5" /> Agendar</button>
            </div>
            {mode === 'schedule' && (
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => run(mode)} disabled={!!busy}>
                {busy === mode ? 'Processando…' : mode === 'now' ? 'Publicar no Instagram' : 'Agendar'}
              </Button>
              <Button variant="outline" onClick={() => run('approval')} disabled={!!busy}><Link2 className="h-4 w-4" /> {busy === 'approval' ? 'Enviando…' : 'Enviar p/ aprovação'}</Button>
              <Button variant="ghost" onClick={() => run('draft')} disabled={!!busy}><FileText className="h-4 w-4" /> {busy === 'draft' ? 'Salvando…' : 'Rascunho'}</Button>
            </div>
          </>
        )}

        {msg && (
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
            {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}
          </p>
        )}
        {approvalLink && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
            <Link2 className="ml-1 h-4 w-4 shrink-0 text-accent" />
            <input readOnly value={approvalLink} className="min-w-0 flex-1 bg-transparent text-[11px] text-muted outline-none" />
            <button onClick={copyLink} className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
        )}
      </div>

      {/* prévia dos slides gerados */}
      <div className="lg:sticky lg:top-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><Sparkles className="h-3.5 w-3.5 text-accent" /> Prévia gerada</p>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          <div className="relative aspect-square w-full bg-surface-2">
            {urls.length ? (
              <img src={urls[slide]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-[11px] text-faint">
                {busy === 'gen' ? 'Gerando texto e imagem…' : 'A imagem gerada aparece aqui'}
              </div>
            )}
            {urls.length > 1 && (
              <>
                <button onClick={() => setSlide((s) => Math.max(0, s - 1))} className="absolute left-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setSlide((s) => Math.min(urls.length - 1, s + 1))} className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white"><ChevronRight className="h-4 w-4" /></button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {urls.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === slide ? 'bg-white' : 'bg-white/50'}`} />)}
                </div>
              </>
            )}
          </div>
          {gen && (
            <div className="space-y-1.5 border-t border-line bg-surface-2/40 p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Template: <strong className="text-ink">{TEMPLATE_LABELS[gen.spec?.template] || gen.spec?.template}</strong></span>
                <span className="font-extrabold text-accent">Total: {formatUsd(gen.cost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-line/60 bg-surface px-2.5 py-1.5 text-[11px]">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Gemini (texto): <strong className="text-ink">{formatUsd(gen.textCost || 0)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  {gen.imageProvider === 'gemini' ? 'Gemini (imagem)' : 'Render (imagem)'}: <strong className="text-ink">{formatUsd(gen.imageCost || 0)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
