'use client';

import { useFormStatus } from 'react-dom';
import { selectPaidTrafficAccount } from '@/app/(app)/paid-traffic/actions';

function SelectButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{pending ? 'Conectando...' : 'Usar esta conta'}</button>;
}

export function AccountPicker({ brandId, accounts = [] }) {
  return <section className="rounded-2xl border border-line bg-surface p-6">
    <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">Tráfego pago</p>
    <h2 className="mt-2 text-lg font-bold text-ink">Escolha a conta de anúncios</h2>
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">A Meta devolveu mais de uma conta. Escolha a conta que você criou para a GenkaiLabs; o SocialHub só terá acesso de leitura a ela.</p>
    <div className="mt-5 space-y-3">{accounts.map((account) => <form key={account.id} action={selectPaidTrafficAccount} className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between"><input type="hidden" name="brand_id" value={brandId} /><input type="hidden" name="account_id" value={account.id} /><div><p className="font-semibold text-ink">{account.name || 'Conta de anúncios sem nome'}</p><p className="mt-1 text-xs text-muted">ID {account.id} · moeda {account.currency || 'BRL'}</p></div><SelectButton /></form>)}</div>
  </section>;
}
