'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Hand, ShieldAlert } from 'lucide-react';
import { updateContent, approveContent, markPostedManually } from '@/lib/content-actions';
import { needsManualPosting, formatLabel } from '@/lib/content-production';
import { Button } from '@/components/ui/Button';

const field = 'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15';

const VEREDITO = {
  aprovado: { icon: CheckCircle2, cor: 'text-success', borda: 'border-success/40 bg-success/5', titulo: 'A revisao nao encontrou problemas' },
  atencao: { icon: AlertTriangle, cor: 'text-warning', borda: 'border-warning/40 bg-warning/10', titulo: 'Vale ajustar antes de publicar' },
  bloqueado: { icon: ShieldAlert, cor: 'text-danger', borda: 'border-danger/40 bg-danger/10', titulo: 'Revise antes de publicar' }
};

function Revisao({ review }) {
  if (!review) return null;
  const v = VEREDITO[review.decision] || VEREDITO.atencao;
  const Icone = v.icon;

  return (
    <div className={`rounded-2xl border p-4 ${v.borda}`}>
      <p className={`flex items-center gap-2 text-sm font-bold ${v.cor}`}>
        <Icone className="h-4 w-4" aria-hidden="true" />{v.titulo}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{review.summary}</p>

      {!!review.problems?.length && (
        <ul className="mt-3 space-y-2">
          {review.problems.map((p, i) => (
            <li key={i} className="rounded-xl border border-line bg-surface p-3">
              {p.excerpt && <p className="text-[11px] italic text-faint">&ldquo;{p.excerpt}&rdquo;</p>}
              <p className="mt-0.5 text-xs font-semibold text-ink">{p.issue}</p>
              <p className="mt-0.5 text-xs text-muted">Sugestao: {p.suggestion}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Linguagem do PRD: o produto sinaliza risco, nao atesta conformidade. */}
      {!!review.professionalReviewReasons?.length && (
        <p className="mt-3 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
          Este conteudo pode exigir revisao profissional antes da publicacao: {review.professionalReviewReasons.join('; ')}.
        </p>
      )}
    </div>
  );
}

function Stories({ cards }) {
  return (
    <ol className="space-y-2">
      {cards.map((c, i) => (
        <li key={i} className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">{c.order || i + 1}</span>
            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{c.type}</span>
            <span className="text-[10px] text-faint">{c.mediaType}</span>
          </div>
          <p className="mt-1.5 text-sm text-ink">{c.screenText}</p>
          <p className="mt-0.5 text-[11px] text-faint">Como gravar: {c.captureHint}</p>
          {c.interaction && (
            <p className="mt-1 text-[11px] text-accent">
              {c.interaction.question}
              {!!c.interaction.options?.length && ` — ${c.interaction.options.join(' / ')}`}
            </p>
          )}
          {c.cta && <p className="mt-1 text-[11px] font-semibold text-ink">CTA: {c.cta}</p>}
        </li>
      ))}
    </ol>
  );
}

function Reel({ p }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-surface p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Primeira fala</p>
        <p className="text-sm text-ink">{p.spokenHook}</p>
      </div>
      <ol className="space-y-2">
        {(p.scenes || []).map((s, i) => (
          <li key={i} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted">Cena {s.order || i + 1}</span>
              <span className="text-[11px] text-faint">{s.seconds}s</span>
            </div>
            <p className="mt-1 text-sm text-ink">{s.speech}</p>
            {s.screenText && <p className="mt-0.5 text-[11px] text-accent">Na tela: {s.screenText}</p>}
            <p className="mt-0.5 text-[11px] text-faint">Como filmar: {s.action}</p>
          </li>
        ))}
      </ol>
      {!!p.recordingTips?.length && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Na hora de gravar</p>
          <ul className="mt-1 space-y-0.5">
            {p.recordingTips.map((t, i) => <li key={i} className="text-[11px] text-muted">— {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ContentReview({ post }) {
  const router = useRouter();
  const p = post.production || {};
  const manual = needsManualPosting(post.format);

  const [caption, setCaption] = useState(post.content || '');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  async function salvar() {
    setBusy('save'); setMsg(null);
    try {
      const res = await updateContent({ postId: post.id, patch: { content: caption } });
      if (res?.error) throw new Error(res.error);
      setMsg({ type: 'ok', text: 'Alteracoes salvas. Editar nao consome IA.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); } finally { setBusy(''); }
  }

  async function aprovar() {
    setBusy('approve'); setMsg(null);
    try {
      const res = await approveContent({ postId: post.id });
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (e) { setMsg({ type: 'err', text: e.message }); } finally { setBusy(''); }
  }

  async function marcarPostado() {
    setBusy('posted'); setMsg(null);
    try {
      const res = await markPostedManually({ postId: post.id });
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (e) { setMsg({ type: 'err', text: e.message }); } finally { setBusy(''); }
  }

  return (
    <div className="space-y-5">
      <Revisao review={post.review} />

      {/* Reel e Stories nao publicam sozinhos: dizer isso antes evita a pessoa
          esperar por uma publicacao que nunca vem. */}
      {manual && (
        <p className="flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/5 p-3 text-xs text-muted">
          <Hand className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            {formatLabel(post.format)} o Social Hub ainda nao posta sozinho. Depois de aprovar, o roteiro fica
            disponivel para voce gravar e publicar — e voce marca aqui quando tiver postado.
          </span>
        </p>
      )}

      {!!post.media_urls?.length && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {post.media_urls.map((url, i) => (
            <img key={i} src={url} alt={p.altText || `Arte ${i + 1}`} className="h-40 w-40 shrink-0 rounded-xl border border-line object-cover" />
          ))}
        </div>
      )}

      {post.format === 'stories' && !!p.cards?.length && <Stories cards={p.cards} />}
      {post.format === 'reel' && <Reel p={p} />}

      {post.format !== 'stories' && (
        <div>
          <label htmlFor="caption" className="mb-1.5 block text-xs font-bold text-ink">Legenda</label>
          <textarea id="caption" rows={8} value={caption} onChange={(e) => setCaption(e.target.value)} className={field} />
          <p className="mt-1 text-[11px] text-faint">{caption.length} caracteres</p>
        </div>
      )}

      {!!p.slides?.length && (
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink">Slides</p>
          <ol className="space-y-2">
            {p.slides.map((s, i) => (
              <li key={i} className="rounded-xl border border-line bg-surface p-3">
                <p className="text-sm font-semibold text-ink">{s.title}</p>
                {s.body && <p className="mt-0.5 text-xs text-muted">{s.body}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {msg && (
        <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.type === 'ok' ? <Check className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
          {msg.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {post.format !== 'stories' && (
          <Button variant="ghost" onClick={salvar} disabled={busy === 'save'}>
            {busy === 'save' ? 'Salvando...' : 'Salvar alteracoes'}
          </Button>
        )}

        {post.status === 'ready_to_post' ? (
          <Button onClick={marcarPostado} disabled={busy === 'posted'}>
            <Hand className="h-4 w-4" aria-hidden="true" />
            {busy === 'posted' ? 'Marcando...' : 'Ja postei este conteudo'}
          </Button>
        ) : (
          <Button onClick={aprovar} disabled={busy === 'approve'}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {busy === 'approve' ? 'Aprovando...' : manual ? 'Aprovar e receber o roteiro' : 'Aprovar e agendar'}
          </Button>
        )}
      </div>
    </div>
  );
}
