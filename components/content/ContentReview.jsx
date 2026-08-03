'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Hand, ShieldAlert } from 'lucide-react';
import { updateContent, approveContent, markPostedManually } from '@/lib/content-actions';
import { needsManualPosting, formatLabel } from '@/lib/content-production';
import { Button } from '@/components/ui/Button';

const field = 'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15';

// `datetime-local` fala no fuso do navegador, não em UTC: converter pelo ISO
// jogaria a hora escolhida para outro horário.
function agoraLocal() {
  const agora = new Date();
  const doisDigitos = (valor) => String(valor).padStart(2, '0');
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`
    + `T${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}`;
}

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

// Cada card e uma arte 1080x1920 que o sistema publica. Nao ha nada para
// gravar, entao a lista mostra o texto da arte — nao instrucao de captura.
function Stories({ cards }) {
  return (
    <ol className="space-y-2">
      {cards.map((c, i) => (
        <li key={i} className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">{c.order || i + 1}</span>
            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{c.type}</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-ink">{c.title}</p>
          {c.support && <p className="mt-0.5 text-xs text-muted">{c.support}</p>}
          {c.cta && <p className="mt-1 text-[11px] font-semibold text-accent">CTA: {c.cta}</p>}
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
  // Post que publica sozinho precisa de data para publicar. Quem chega do
  // Studio não tem nenhuma, e aprovar sem data criava um "agendado" que nunca
  // saía e sumia da grade do Calendário.
  const precisaDeData = !manual && !post.scheduled_at;
  const [quando, setQuando] = useState('');

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
      // A legenda editada vai junto: aprovar sem salvar antes publicava o
      // texto velho, e ninguém espera ter que clicar em dois botões.
      if (caption !== (post.content || '')) {
        const salvo = await updateContent({ postId: post.id, patch: { content: caption } });
        if (salvo?.error) throw new Error(salvo.error);
      }
      // O servidor roda em UTC: mandar "2026-08-02T21:35" cru fazia ele ler
      // essa hora como UTC e jogar o horário três fusos para trás, recusando
      // como "data que já passou" um agendamento minutos à frente. Quem sabe o
      // fuso é o navegador, então a conversão para instante absoluto é aqui.
      const instante = precisaDeData ? new Date(quando).getTime() : NaN;
      if (precisaDeData && Number.isNaN(instante)) throw new Error('Escolha o dia e a hora da publicação.');

      const res = await approveContent({
        postId: post.id,
        scheduledAt: precisaDeData ? new Date(instante).toISOString() : null
      });
      if (res?.error) throw new Error(res.error);
      router.push('/calendar');
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

      {precisaDeData && (
        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <label htmlFor="quando" className="block text-xs font-bold text-ink">Quando este post sai</label>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Sem dia e hora ele não é publicado nem aparece na grade do Calendário.
          </p>
          <input
            id="quando"
            type="datetime-local"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
            className={`${field} mt-2`}
          />
          {/* Publicar já é pedido comum, e o publicador roda a cada 5 minutos:
              basta marcar a hora atual que ele leva no próximo ciclo. */}
          <button
            type="button"
            onClick={() => setQuando(agoraLocal())}
            className="mt-2 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-ink transition-colors hover:border-accent/40 hover:text-accent"
          >
            Sair agora (no próximo ciclo, até 5 min)
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {post.format !== 'stories' && (
          <Button variant="ghost" onClick={salvar} disabled={busy === 'save'}>
            {busy === 'save' ? 'Salvando...' : 'Salvar alteracoes'}
          </Button>
        )}

        {/* "Aprovar ou não" precisa das duas saídas na mesma tela. Não aprovar
            não desfaz nada: o rascunho continua salvo, esperando. */}
        <Button variant="ghost" onClick={() => router.push('/calendar')} disabled={!!busy}>
          Ainda não
        </Button>

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
