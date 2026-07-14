'use client';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Pencil, PenSquare, Instagram, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/40 p-4">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-accent">{title}</h3>
      {children}
    </div>
  );
}
const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 py-0.5 text-sm">
    <span className="text-muted">{k}</span><span className="font-semibold text-ink">{v || '—'}</span>
  </div>
);
const Tick = ({ children }) => (
  <li className="flex items-center gap-1.5 text-sm text-ink"><Check className="h-3.5 w-3.5 text-success" />{children}</li>
);

function diagnose(s) {
  const traits = (s.personality || []).slice(0, 3).join(', ').toLowerCase();
  const tone = s.tone ? s.tone.toLowerCase() : 'próximo';
  const style = s.visual?.style ? s.visual.style.toLowerCase() : 'consistente';
  const focus = s.identity?.niche || s.identity?.audience || 'seu público';
  return `Sua marca transmite ${traits || 'personalidade própria'}. O conteúdo será gerado com tom ${tone}, visual ${style} e foco em ${focus}.`;
}

export function DnaDashboard({ summary, onEditKit }) {
  const router = useRouter();
  const s = summary;
  const conf = Math.round(Math.max(0, Math.min(10, Number(s.report?.overall) || 0)) * 10);
  const content = s.content || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15">
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-ink">Brand DNA criado! 🎉</p>
          <p className="mt-0.5 text-sm text-muted">{diagnose(s)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Identidade">
          <Row k="Empresa" v={s.identity?.name} />
          <Row k="Nicho" v={s.identity?.niche} />
          <Row k="Público" v={s.identity?.audience} />
          <Row k="Objetivo" v={s.identity?.objective} />
        </Card>

        <Card title="Confiança do Brand DNA">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-accent/10">
              <span className="text-2xl font-extrabold text-accent">{conf}%</span>
            </div>
            <p className="text-xs text-muted">
              Quanto mais fontes forem conectadas, mais preciso será o Brand DNA.
            </p>
          </div>
        </Card>

        <Card title="Tom de voz">
          <ul className="space-y-1">
            {(s.tone ? s.tone.split(',').map((t) => t.trim()).filter(Boolean) : []).map((t, i) => <Tick key={i}>{t}</Tick>)}
          </ul>
        </Card>

        <Card title="Personalidade">
          <ul className="space-y-1">{(s.personality || []).map((t, i) => <Tick key={i}>{t}</Tick>)}</ul>
        </Card>

        <Card title="Conteúdo">
          <ul className="space-y-1">
            {content.storytelling && <Tick>Storytelling</Tick>}
            {content.emoji && <Tick>{content.emoji} emojis</Tick>}
            {content.cta && <Tick>CTA: {content.cta}</Tick>}
            {content.caption && <Tick>Legenda {content.caption}</Tick>}
          </ul>
        </Card>

        <Card title="Visual">
          <ul className="space-y-1">
            {s.visual?.style && <Tick>{s.visual.style}</Tick>}
            {s.visual?.palette?.accent && (
              <li className="flex items-center gap-1.5 text-sm text-ink">
                <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: s.visual.palette.accent }} />
                Paleta definida
              </li>
            )}
          </ul>
        </Card>

        <Card title="Fontes utilizadas">
          <ul className="space-y-1">
            {s.sources?.manual && <Tick>Manual</Tick>}
            {s.sources?.website && <Tick>Website</Tick>}
            {s.sources?.ig && <Tick>Instagram</Tick>}
            {s.sources?.text && <Tick>Texto</Tick>}
          </ul>
          {!s.sources?.ig && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-faint"><ShieldCheck className="h-3 w-3" />Conecte o Instagram p/ subir a confiança.</p>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button type="button" variant="outline" onClick={onEditKit}><Pencil className="h-4 w-4" />Editar Brand Kit</Button>
        <Button type="button" onClick={() => router.push('/composer')}><PenSquare className="h-4 w-4" />Gerar primeiro post</Button>
        <Button type="button" variant="outline" onClick={() => router.push('/connections')}><Instagram className="h-4 w-4" />Conectar Instagram</Button>
      </div>
    </div>
  );
}
