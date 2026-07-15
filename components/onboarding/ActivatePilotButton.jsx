'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap, ArrowRight } from 'lucide-react';
import { setAutopilotActive } from '@/lib/content-plan-actions';

// CTA que LIGA o Piloto em 1 clique (não só navega). Ativa, persiste e atualiza a barra.
export function ActivatePilotButton({ brandId, label }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const router = useRouter();

  async function activate() {
    if (busy || !brandId) return;
    setBusy(true);
    setErr(null);
    const res = await setAutopilotActive({ brandId, active: true });
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh(); // recarrega os server components → passo ② vira ✓
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={activate}
        disabled={busy}
        className="glow-accent inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
        {busy ? 'Ativando…' : label}
        {!busy && <ArrowRight className="h-3.5 w-3.5" />}
      </button>
      {err && <span className="text-[11px] font-semibold text-danger">{err}</span>}
    </div>
  );
}
