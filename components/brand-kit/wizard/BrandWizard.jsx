'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, AlertCircle, Pipette, Instagram, Globe, FileText, User, Check } from 'lucide-react';
import { saveBrandKit } from '@/lib/brand-kit-actions';
import { analyzeBrandDNA } from '@/lib/dna-actions';
import { dominantColorFromImageUrl } from '@/lib/color/dominant';
import { DEFAULT_PALETTE } from '@/lib/ai/templates';
import { Button } from '@/components/ui/Button';
import {
  OBJECTIVES, TONES, PERSONALITIES, STORYTELLING, EMOJIS, CAPTIONS, CTAS, STYLES, STEP_TITLES
} from './options';

const field = 'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15';
const norm = (o) => (typeof o === 'string' ? { value: o.toLowerCase(), label: o } : o);
const labelOf = (arr, v) => norm(arr.find((o) => norm(o).value === v) || {}).label || '';

function Chips({ options, value, onChange, max }) {
  const arr = options.map(norm);
  const toggle = (v) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!max || value.length < max) onChange([...value, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {arr.map((o) => {
        const on = value.includes(o.value);
        const blocked = !on && max && value.length >= max;
        return (
          <button key={o.value} type="button" onClick={() => toggle(o.value)} disabled={blocked}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              on ? 'border-accent bg-accent text-white'
                 : blocked ? 'border-line text-faint opacity-40'
                 : 'border-line text-ink hover:border-accent/50'}`}>
            {on && <Check className="mr-1 inline h-3.5 w-3.5" />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

function Radios({ options, value, onChange, cols = 2 }) {
  const arr = options.map(norm);
  return (
    <div className={`grid gap-2 ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {arr.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
              on ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/50'}`}>
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
              {on && <Check className="h-3.5 w-3.5 text-accent" />}{o.label}
            </span>
            {(o.impact || o.hint) && <span className="mt-0.5 block text-[11px] leading-snug text-faint">{o.impact || o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Q({ title, desc, children }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        {desc && <p className="text-[11px] leading-snug text-faint">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function BrandWizard({ brandId, brandName, brandColor, kit, onComplete }) {
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState(kit?.niche || '');
  const [audience, setAudience] = useState(kit?.audience || '');
  const [objective, setObjective] = useState(kit?.objective || '');
  const [tones, setTones] = useState([]);
  const [toneOther, setToneOther] = useState('');
  const [personalities, setPersonalities] = useState([]);
  const [storytelling, setStorytelling] = useState('');
  const [emoji, setEmoji] = useState('');
  const [caption, setCaption] = useState('');
  const [cta, setCta] = useState('');
  const [style, setStyle] = useState('');
  const [palette, setPalette] = useState({
    accent: kit?.palette?.accent || brandColor || DEFAULT_PALETTE.accent,
    bg: kit?.palette?.bg || DEFAULT_PALETTE.bg,
    surface: kit?.palette?.surface || DEFAULT_PALETTE.surface,
    ink: kit?.palette?.ink || DEFAULT_PALETTE.ink
  });
  const [logoUrl, setLogoUrl] = useState(kit?.logo_url || '');
  const [pick, setPick] = useState(false);
  const [wantIg, setWantIg] = useState(false);
  const [useWebsite, setUseWebsite] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [useText, setUseText] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pct = Math.round(((step + 1) / 6) * 100);
  const canNext = step === 0 ? niche.trim().length > 0 : true;

  async function extractColor() {
    if (!logoUrl) return;
    setPick(true);
    try {
      const hex = await dominantColorFromImageUrl(logoUrl);
      setPalette((p) => ({ ...p, accent: hex }));
    } catch { setError('Não deu p/ ler a cor da logo (CORS ou URL inválida).'); }
    finally { setPick(false); }
  }

  async function finish() {
    setBusy(true); setError(null);
    const toneStr = [...tones.map((v) => labelOf(TONES, v)), toneOther.trim()].filter(Boolean).join(', ');
    const answers = {
      brandId, niche, audience, objective,
      tone: toneStr,
      personality: personalities.map((v) => labelOf(PERSONALITIES, v)),
      palette, logoUrl,
      ...(storytelling ? { storytelling: storytelling === 'sim' } : {}),
      ...(emoji ? { emojiUsage: emoji } : {}),
      ...(caption ? { captionLength: caption } : {}),
      ...(cta ? { ctaPolicy: cta } : {}),
      ...(style ? { visualStyle: style } : {})
    };
    const save = await saveBrandKit(answers);
    if (save?.error) { setBusy(false); setError(save.error); return; }

    const manual = {
      niche, audience,
      objetivo: labelOf(OBJECTIVES, objective) || null,
      tone: toneStr,
      personality: answers.personality,
      storytelling: storytelling ? storytelling === 'sim' : null,
      emoji_usage: emoji || null,
      caption_length: caption || null,
      cta_policy: cta ? labelOf(CTAS, cta) : null,
      visual_style: style || null
    };
    const res = await analyzeBrandDNA({
      brandId, brandName, wantIg,
      websiteUrl: useWebsite ? websiteUrl : '',
      pastedText: useText ? pastedText : '',
      manual
    });
    setBusy(false);
    if (res?.error) { setError(res.error); return; }

    onComplete({
      dna: res.dna,
      report: res.report,
      identity: { name: brandName, niche, audience, objective: labelOf(OBJECTIVES, objective) },
      tone: toneStr,
      personality: answers.personality,
      content: {
        storytelling: storytelling === 'sim',
        emoji: labelOf(EMOJIS, emoji),
        caption: labelOf(CAPTIONS, caption),
        cta: labelOf(CTAS, cta)
      },
      visual: { style: labelOf(STYLES, style), palette },
      sources: {
        manual: true,
        ig: !!res.sources?.hasIg,
        website: !!res.sources?.hasWebsite,
        text: !!res.sources?.hasPasted
      }
    });
  }

  const swatch = (key, label) => (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-2">
      <input type="color" value={palette[key]} onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
        className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" />
      <span className="text-xs font-semibold text-ink">{label}</span>
    </label>
  );
  const src = (checked, set, Icon, label) => (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="h-4 w-4" />
      <Icon className="h-4 w-4 text-accent" />
      <span className="text-sm font-semibold text-ink">{label}</span>
    </label>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* progresso */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[13px] font-semibold">
          <span className="text-accent">Passo {step + 1} de 6</span>
          <span className="text-faint">{pct}%</span>
        </div>
        <div className="flex gap-1.5">
          {STEP_TITLES.map((_, i) => (
            <button key={i} type="button" onClick={() => setStep(i)} aria-label={`Ir ao passo ${i + 1}`}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ease-emphasized ${i <= step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      {/* hero — pergunta grande, respiro Apple */}
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[34px]">
        {STEP_TITLES[step]}
      </h1>

      <div className="rounded-2xl glass p-5 shadow-soft sm:p-6 space-y-5">
        {step === 0 && (
          <>
            <Q title="Nome da marca">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
                <User className="h-4 w-4 text-accent" />{brandName}
              </div>
            </Q>
            <Q title="Qual o nicho da sua empresa?" desc="Ajuda a IA a usar exemplos e vocabulário do seu mercado.">
              <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex: cafeteria de especialidade" className={field} autoFocus />
            </Q>
            <Q title="Quem é o seu público?" desc="A IA adapta linguagem e abordagem a essas pessoas.">
              <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex: jovens de 25 a 40, amantes de café" className={field} />
            </Q>
            <Q title="Qual o objetivo principal?" desc="O foco central que a IA vai perseguir no conteúdo.">
              <Radios options={OBJECTIVES} value={objective} onChange={setObjective} />
            </Q>
          </>
        )}

        {step === 1 && (
          <Q title="Como sua marca conversa?" desc="Escolha até 3. A IA usa isso como tom de voz em legendas e roteiros.">
            <Chips options={TONES} value={tones} onChange={setTones} max={3} />
            <input value={toneOther} onChange={(e) => setToneOther(e.target.value)} placeholder="Outro (opcional)" className={`${field} mt-3`} />
          </Q>
        )}

        {step === 2 && (
          <Q title="Personalidade da marca" desc="Escolha até 5 características que descrevem sua marca.">
            <Chips options={PERSONALITIES} value={personalities} onChange={setPersonalities} max={5} />
          </Q>
        )}

        {step === 3 && (
          <>
            <Q title="Sua marca usa storytelling?" desc="Contar histórias em vez de ir direto ao ponto.">
              <Radios options={STORYTELLING} value={storytelling} onChange={setStorytelling} />
            </Q>
            <Q title="Uso de emojis"><Radios options={EMOJIS} value={emoji} onChange={setEmoji} /></Q>
            <Q title="Tamanho da legenda"><Radios options={CAPTIONS} value={caption} onChange={setCaption} cols={3} /></Q>
            <Q title="Chamadas para ação (CTA)" desc="Quando a IA deve convidar o público a agir.">
              <Radios options={CTAS} value={cta} onChange={setCta} />
            </Q>
          </>
        )}

        {step === 4 && (
          <>
            <Q title="Estilo das artes" desc="O visual predominante das artes geradas pela IA.">
              <Radios options={STYLES} value={style} onChange={setStyle} cols={3} />
            </Q>
            <Q title="Logo (opcional)" desc="A IA pode extrair a cor de destaque a partir do seu logo.">
              <div className="flex gap-2">
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className={field} />
                <Button type="button" variant="outline" size="sm" onClick={extractColor} disabled={pick || !logoUrl} className="shrink-0">
                  <Pipette className="h-3.5 w-3.5" />{pick ? '…' : 'Extrair cor'}
                </Button>
              </div>
            </Q>
            <Q title="Paleta" desc="Cores usadas nas artes geradas.">
              <div className="grid gap-2 sm:grid-cols-2">
                {swatch('accent', 'Destaque')}{swatch('bg', 'Fundo')}{swatch('surface', 'Superfície')}{swatch('ink', 'Texto')}
              </div>
            </Q>
          </>
        )}

        {step === 5 && (
          <>
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5 text-xs font-semibold text-accent">
              Quanto mais informações você fornecer, mais preciso será o Brand DNA. Todas as fontes são opcionais.
            </div>
            {src(true, () => {}, User, 'Manual da marca (suas respostas) — sempre usado')}
            {src(wantIg, setWantIg, Instagram, 'Instagram conectado (bio + legendas)')}
            {src(useWebsite, setUseWebsite, Globe, 'Website')}
            {useWebsite && <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://sua-marca.com" className={field} />}
            {src(useText, setUseText, FileText, 'Texto / manual da marca (colar)')}
            {useText && <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} rows={4} placeholder="Cole aqui bio, sobre, briefing…" className={field} />}
          </>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-danger"><AlertCircle className="h-4 w-4" />{error}</p>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
          <ArrowLeft className="h-4 w-4" />Voltar
        </Button>
        {step < 5 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Avançar<ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={finish} disabled={busy}>
            <Sparkles className="h-4 w-4" />{busy ? 'Gerando Brand DNA…' : 'Gerar Brand DNA'}
          </Button>
        )}
      </div>
    </div>
  );
}
