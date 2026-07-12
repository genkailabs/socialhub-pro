'use client';
import { useState } from 'react';
import { Instagram, Calendar, CheckSquare, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signInWithPassword } from './actions';
import { Button } from '@/components/ui/Button';

const FEATURES = [
  { icon: Instagram, text: 'Publique no Instagram e Facebook de verdade — OAuth real, sem mocks.' },
  { icon: Calendar, text: 'Calendário editorial com agendamento automático.' },
  { icon: CheckSquare, text: 'Aprovação do cliente por link, sem exigir login.' }
];

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signInWithPassword(null, new FormData(e.currentTarget));
    if (res?.error) setError(res.error);
    setLoading(false);
  }

  async function googleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* painel de marca */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-accent via-accent to-accent-soft p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg font-extrabold">SocialHub</span>
        </div>
        <div className="relative">
          <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight text-balance">
            Uma central honesta para as redes das suas marcas.
          </h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/15">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-white/90">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">Dados reais da Graph API · nada simulado.</p>
      </div>

      {/* form */}
      <div className="grid place-items-center bg-app px-4 py-10">
        <div className="animate-rise w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-accent-soft" />
            <span className="text-lg font-extrabold">SocialHub</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Acesse sua conta para gerenciar suas marcas.</p>

          <form onSubmit={onSubmit} className="space-y-3">
            <input name="email" type="email" required placeholder="E-mail" className={field} />
            <input name="password" type="password" required placeholder="Senha" className={field} />
            {error && <p className="text-xs font-semibold text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={googleLogin}>
            Continuar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}
