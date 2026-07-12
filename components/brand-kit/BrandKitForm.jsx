'use client';
import { useState } from 'react';
import { CheckCircle2, AlertCircle, Palette } from 'lucide-react';
import { saveBrandKit } from '@/lib/brand-kit-actions';
import { DEFAULT_PALETTE } from '@/lib/ai/templates';
import { Button } from '@/components/ui/Button';

const joinLines = (a) => (Array.isArray(a) ? a.join('\n') : (a || ''));

export function BrandKitForm({ brandId, brandColor, kit }) {
  const [niche, setNiche] = useState(kit?.niche || '');
  const [audience, setAudience] = useState(kit?.audience || '');
  const [tone, setTone] = useState(kit?.tone || '');
  const [pillars, setPillars] = useState(joinLines(kit?.pillars));
  const [dos, setDos] = useState(joinLines(kit?.dos));
  const [donts, setDonts] = useState(joinLines(kit?.donts));
  const [palette, setPalette] = useState({
    accent: kit?.palette?.accent || brandColor || DEFAULT_PALETTE.accent,
    bg: kit?.palette?.bg || DEFAULT_PALETTE.bg,
    surface: kit?.palette?.surface || DEFAULT_PALETTE.surface,
    ink: kit?.palette?.ink || DEFAULT_PALETTE.ink
  });
  const [logoUrl, setLogoUrl] = useState(kit?.logo_url || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function save() {
    setBusy(true); setMsg(null);
    const res = await saveBrandKit({ brandId, niche, audience, tone, pillars, dos, donts, palette, logoUrl });
    setBusy(false);
    setMsg(res?.error ? { type: 'err', text: res.error } : { type: 'ok', text: 'Brand Kit salvo!' });
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';
  const swatch = (key, label) => (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
      <input type="color" value={palette[key]} onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
        className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" />
      <span className="text-xs font-semibold text-ink">{label}</span>
      <span className="ml-auto text-[10px] uppercase text-faint">{palette[key]}</span>
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Nicho da marca</label>
            <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex: cafeteria de especialidade" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Público-alvo</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex: jovens 25–40, amantes de café" className={field} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink">Tom de voz</label>
          <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ex: acolhedor, especialista, sem formalidade" className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Pilares</label>
            <textarea value={pillars} onChange={(e) => setPillars(e.target.value)} rows={4} placeholder={'um por linha:\ndicas\nbastidores\nofertas'} className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Sempre fazer</label>
            <textarea value={dos} onChange={(e) => setDos(e.target.value)} rows={4} placeholder={'um por linha'} className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Nunca fazer</label>
            <textarea value={donts} onChange={(e) => setDonts(e.target.value)} rows={4} placeholder={'um por linha'} className={field} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink">URL do logo (opcional)</label>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className={field} />
        </div>

        {msg && (
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
            {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}
          </p>
        )}
        <Button onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar Brand Kit'}</Button>
      </div>

      {/* paleta */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><Palette className="h-3.5 w-3.5 text-accent" /> Paleta dos criativos</p>
        {swatch('accent', 'Destaque')}
        {swatch('bg', 'Fundo')}
        {swatch('surface', 'Superfície')}
        {swatch('ink', 'Texto')}
        <div className="mt-2 overflow-hidden rounded-xl border border-line">
          <div className="flex h-24 flex-col justify-center gap-1 p-4" style={{ background: `linear-gradient(135deg, ${palette.bg}, ${palette.surface})` }}>
            <span className="h-2 w-10 rounded" style={{ background: palette.accent }} />
            <span className="text-sm font-extrabold" style={{ color: palette.ink }}>Exemplo on-brand</span>
          </div>
        </div>
      </div>
    </div>
  );
}
