'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signInWithPassword } from './actions';
import { Button } from '@/components/ui/Button';

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

  return (
    <div className="min-h-screen grid place-items-center bg-app px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-7 shadow-soft">
        <div className="mb-6 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-accent-soft" />
          <span className="text-lg font-extrabold">SocialHub</span>
        </div>
        <h1 className="text-xl font-extrabold">Entrar</h1>
        <p className="mb-5 text-sm text-muted">Acesse sua conta para gerenciar suas marcas.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input name="email" type="email" required placeholder="E-mail"
            className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          <input name="password" type="password" required placeholder="Senha"
            className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={googleLogin}>
          Continuar com Google
        </Button>
      </div>
    </div>
  );
}
