'use client';
import { useState } from 'react';
import { CheckCircle2, AlertCircle, Palette, Pipette, HelpCircle, Eye } from 'lucide-react';
import { saveBrandKit } from '@/lib/brand-kit-actions';
import { dominantColorFromImageUrl } from '@/lib/color/dominant';
import { DEFAULT_PALETTE } from '@/lib/ai/templates';
import { Button } from '@/components/ui/Button';

const joinLines = (a) => (Array.isArray(a) ? a.join('\n') : (a || ''));

// --- textos de impacto dinâmico (PRD §4) ---
const EMOJI_IMPACT = {
  nunca: 'A IA não utilizará emojis nos conteúdos.',
  poucos: 'A IA utilizará entre 0 e 3 emojis por conteúdo.',
  muitos: 'A IA utilizará vários emojis para dar mais leveza.'
};
const CAPTION_IMPACT = {
  curta: 'Legendas curtas, com aproximadamente 50 a 150 palavras.',
  média: 'Legendas médias, com aproximadamente 150 a 300 palavras.',
  longa: 'Legendas longas, com 300 palavras ou mais.'
};
const FORMALITY_IMPACT = {
  baixa: 'A comunicação será mais próxima e humana.',
  média: 'Equilíbrio entre linguagem próxima e profissional.',
  alta: 'A comunicação será mais profissional e institucional.'
};

// --- preview local (sem IA, PRD §5) ---
const EMOJI_RE = /([☀-➿]|[\u{1F000}-\u{1FAFF}])/gu;
function limitEmoji(s, mode) {
  if (mode === 'nunca') return s.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
  if (mode === 'muitos') return s;
  let n = 0;
  return s.replace(EMOJI_RE, (m) => (++n <= 1 ? m : '')).replace(/\s{2,}/g, ' ').trim();
}
function buildPreview(s) {
  const brand = s.niche?.trim() || 'sua marca';
  const title = {
    premium: 'Excelência em cada detalhe',
    moderno: `O novo jeito de ${brand}`,
    minimalista: 'Menos é mais',
    criativo: 'Ideias que inspiram'
  }[s.visualStyle] || 'Exemplo de conteúdo gerado';

  const parts = [];
  if (s.storytelling) parts.push('Tudo começou com uma ideia simples. ✨');
  parts.push(
    {
      alta: `Na ${brand}, entregamos soluções pensadas para o seu crescimento.`,
      média: `Aqui na ${brand}, a gente cuida de cada detalhe pra você.`,
      baixa: `Bora falar da ${brand}? 🙌 A gente simplifica tudo pra você.`
    }[s.formality] || `A ${brand} cria conteúdo pensado para o seu público.`
  );
  const len = s.captionLength || 'média';
  if (len !== 'curta') parts.push('Cada conteúdo é feito com atenção ao que realmente importa.');
  if (len === 'longa') parts.push('Qualidade e consistência em toda publicação, sempre alinhadas ao seu tom.');
  if (s.ctaPolicy === 'sempre') parts.push('👉 Fala com a gente e comece hoje mesmo!');
  else if (s.ctaPolicy === 'só vendas') parts.push('👉 Confira nossa oferta e garanta a sua.');

  return { title, caption: limitEmoji(parts.join(' '), s.emojiUsage || 'poucos') };
}

// --- helpers de UI ---
function Tip({ text }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label="Ajuda" className="text-faint transition-colors hover:text-accent">
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-5 z-20 w-56 -translate-x-1/2 rounded-lg border border-line bg-bg p-2.5 text-[11px] font-medium leading-snug text-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}

function Field({ label, tip, desc, impact, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        <label className="text-xs font-bold text-ink">{label}</label>
        {tip && <Tip text={tip} />}
      </div>
      {children}
      {desc && <p className="mt-1 text-[11px] leading-snug text-faint">{desc}</p>}
      {impact && <p className="mt-0.5 text-[11px] font-semibold leading-snug text-accent">{impact}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface/40 p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-accent">{title}</h3>
      {children}
    </section>
  );
}

export function BrandKitForm({ brandId, brandColor, kit }) {
  const [niche, setNiche] = useState(kit?.niche || '');
  const [audience, setAudience] = useState(kit?.audience || '');
  const [tone, setTone] = useState(kit?.tone || '');
  const [pillars, setPillars] = useState(joinLines(kit?.pillars));
  const [dos, setDos] = useState(joinLines(kit?.dos));
  const [donts, setDonts] = useState(joinLines(kit?.donts));
  const [personality, setPersonality] = useState(joinLines(kit?.personality));
  const [emotions, setEmotions] = useState(joinLines(kit?.emotions));
  const [formality, setFormality] = useState(kit?.formality || '');
  const [emojiUsage, setEmojiUsage] = useState(kit?.emoji_usage || '');
  const [ctaPolicy, setCtaPolicy] = useState(kit?.cta_policy || '');
  const [visualStyle, setVisualStyle] = useState(kit?.visual_style || '');
  const [captionLength, setCaptionLength] = useState(kit?.caption_length || '');
  const [storytelling, setStorytelling] = useState(Boolean(kit?.storytelling));
  const [palette, setPalette] = useState({
    accent: kit?.palette?.accent || brandColor || DEFAULT_PALETTE.accent,
    bg: kit?.palette?.bg || DEFAULT_PALETTE.bg,
    surface: kit?.palette?.surface || DEFAULT_PALETTE.surface,
    ink: kit?.palette?.ink || DEFAULT_PALETTE.ink
  });
  const [logoUrl, setLogoUrl] = useState(kit?.logo_url || '');
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function save() {
    setBusy(true); setMsg(null);
    const res = await saveBrandKit({
      brandId, niche, audience, tone, pillars, dos, donts, palette, logoUrl,
      personality, emotions, formality, emojiUsage, ctaPolicy, storytelling, visualStyle, captionLength
    });
    setBusy(false);
    setMsg(res?.error ? { type: 'err', text: res.error } : { type: 'ok', text: 'Brand Kit salvo!' });
  }

  async function extractColor() {
    if (!logoUrl) return;
    setPick(true); setMsg(null);
    try {
      const hex = await dominantColorFromImageUrl(logoUrl);
      setPalette((p) => ({ ...p, accent: hex }));
    } catch {
      setMsg({ type: 'err', text: 'Não deu p/ ler a cor da logo (CORS ou URL inválida).' });
    } finally {
      setPick(false);
    }
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';
  const select = (value, setter, opts) => (
    <select value={value} onChange={(e) => setter(e.target.value)} className={field}>
      <option value="">—</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const swatch = (key, label) => (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
      <input type="color" value={palette[key]} onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
        className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" />
      <span className="text-xs font-semibold text-ink">{label}</span>
      <span className="ml-auto text-[10px] uppercase text-faint">{palette[key]}</span>
    </label>
  );

  const preview = buildPreview({ niche, tone, formality, ctaPolicy, storytelling, emojiUsage, captionLength, visualStyle });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* IDENTIDADE */}
        <Section title="Identidade">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nicho da marca" desc="O ramo da sua marca. A IA usa isso para escolher exemplos e vocabulário do seu mercado.">
              <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex: cafeteria de especialidade" className={field} />
            </Field>
            <Field label="Público-alvo" desc="Quem você quer alcançar. A IA adapta a linguagem e a abordagem a esse público.">
              <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex: jovens de 25 a 40, amantes de café" className={field} />
            </Field>
          </div>
          <Field label="Tom de voz" desc="Define como sua marca conversa com as pessoas. A IA usa esse estilo em todas as legendas, roteiros e textos.">
            <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ex: acolhedor, especialista, sem formalidade" className={field} />
          </Field>
        </Section>

        {/* CONTEÚDO */}
        <Section title="Conteúdo">
          <Field label="Pilares" desc="São os assuntos que sua empresa aborda com frequência. Ajudam a IA a manter consistência no conteúdo.">
            <textarea value={pillars} onChange={(e) => setPillars(e.target.value)} rows={4}
              placeholder={'Exemplo:\nDicas de café\nBastidores da loja\nPromoções'} className={field} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sempre fazer" desc="Coisas que a IA deve sempre incluir ou respeitar nos conteúdos.">
              <textarea value={dos} onChange={(e) => setDos(e.target.value)} rows={3}
                placeholder={'Exemplo:\nResponder comentários\nMostrar bastidores'} className={field} />
            </Field>
            <Field label="Nunca fazer" desc="Coisas que a IA deve evitar em qualquer conteúdo.">
              <textarea value={donts} onChange={(e) => setDonts(e.target.value)} rows={3}
                placeholder={'Exemplo:\nUsar gírias pesadas\nPrometer resultados irreais'} className={field} />
            </Field>
          </div>
          <label className="flex cursor-pointer items-start gap-2">
            <input type="checkbox" checked={storytelling} onChange={(e) => setStorytelling(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="flex items-center gap-1 text-sm font-bold text-ink">
                Usa storytelling
                <Tip text="Quando ativado, a IA prioriza histórias em vez de textos diretos." />
              </span>
              <span className="text-[11px] leading-snug text-faint">A IA prioriza histórias em vez de textos diretos.</span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tamanho da legenda" desc="Define o tamanho padrão das legendas geradas." impact={captionLength && CAPTION_IMPACT[captionLength]}>
              {select(captionLength, setCaptionLength, ['curta', 'média', 'longa'])}
            </Field>
            <Field label="Chamadas para ação" tip={'Define quando a IA deve convidar o usuário a agir. Ex: sempre vender, só em conteúdos comerciais, ou nunca usar CTA.'}
              desc="Define quando a IA deve incentivar o usuário a realizar uma ação.">
              {select(ctaPolicy, setCtaPolicy, ['sempre', 'só vendas', 'nunca'])}
            </Field>
          </div>
        </Section>

        {/* PERSONALIDADE */}
        <Section title="Personalidade">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Personalidade" desc="Traços que descrevem sua marca. A IA reflete essa personalidade nos textos.">
              <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={3}
                placeholder={'Exemplo:\nEspecialista\nAcessível\nAutêntica'} className={field} />
            </Field>
            <Field label="Emoções que evoca" desc="Como você deseja que as pessoas se sintam ao consumir seu conteúdo.">
              <textarea value={emotions} onChange={(e) => setEmotions(e.target.value)} rows={3}
                placeholder={'Exemplo:\nConfiança\nAconchego\nInspiração'} className={field} />
            </Field>
          </div>
        </Section>

        {/* COMUNICAÇÃO */}
        <Section title="Comunicação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nível de formalidade"
              tip={'Alta: linguagem corporativa e institucional. Baixa: linguagem mais próxima e humana.'}
              desc="Controla o nível de formalidade usado pela IA na escrita." impact={formality && FORMALITY_IMPACT[formality]}>
              {select(formality, setFormality, ['baixa', 'média', 'alta'])}
            </Field>
            <Field label="Uso de emojis" desc="Define a quantidade de emojis usados automaticamente." impact={emojiUsage && EMOJI_IMPACT[emojiUsage]}>
              {select(emojiUsage, setEmojiUsage, ['nunca', 'poucos', 'muitos'])}
            </Field>
          </div>
        </Section>

        {/* VISUAL */}
        <Section title="Visual">
          <Field label="Estilo das artes" desc="Define o estilo predominante das artes que serão geradas.">
            {select(visualStyle, setVisualStyle, ['premium', 'moderno', 'minimalista', 'criativo'])}
          </Field>
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink"><Palette className="h-3.5 w-3.5 text-accent" /> Paleta dos criativos</p>
            <p className="mb-2 text-[11px] leading-snug text-faint">Cores usadas nas artes geradas pela IA.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {swatch('accent', 'Destaque')}
              {swatch('bg', 'Fundo')}
              {swatch('surface', 'Superfície')}
              {swatch('ink', 'Texto')}
            </div>
          </div>
          <Field label="URL do logo (opcional)" desc="A IA pode extrair a cor de destaque a partir do seu logo.">
            <div className="flex gap-2">
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className={field} />
              <Button type="button" variant="outline" size="sm" onClick={extractColor} disabled={pick || !logoUrl} className="shrink-0">
                <Pipette className="h-3.5 w-3.5" />{pick ? '…' : 'Extrair cor'}
              </Button>
            </div>
          </Field>
        </Section>

        {msg && (
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
            {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}
          </p>
        )}
        <Button onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar Brand Kit'}</Button>
      </div>

      {/* PREVIEW EM TEMPO REAL */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          <Eye className="h-3.5 w-3.5 text-accent" /> Prévia do conteúdo
        </p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="flex h-32 flex-col justify-center gap-2 p-5" style={{ background: `linear-gradient(135deg, ${palette.bg}, ${palette.surface})` }}>
            <span className="h-2 w-12 rounded" style={{ background: palette.accent }} />
            <span className="text-lg font-extrabold leading-tight" style={{ color: palette.ink }}>{preview.title}</span>
          </div>
          <div className="space-y-2 bg-surface p-4">
            <p className="text-sm leading-relaxed text-ink">{preview.caption}</p>
            {(tone.trim() || formality) && (
              <p className="text-[11px] text-faint">
                Tom: {tone.trim() || '—'}{formality ? ` · formalidade ${formality}` : ''}
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-faint">
          Exemplo local que atualiza conforme você ajusta as configurações. O conteúdo real é gerado pela IA.
        </p>
      </div>
    </div>
  );
}
