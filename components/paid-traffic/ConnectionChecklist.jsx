import Link from 'next/link';

export function paidTrafficConnectionHref(brandId) {
  const params = new URLSearchParams({ brand_id: brandId, return_to: '/paid-traffic' });
  return `/api/meta/ads/oauth?${params.toString()}`;
}

export function ConnectionChecklist({ brandId }) {
  return <div className="rounded-2xl border border-dashed border-line bg-surface p-6">
    <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent">Tráfego pago</p>
    <h2 className="mt-2 text-lg font-bold text-ink">Conecte uma conta de anúncios Meta</h2>
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">Esta janela mostrará apenas resultados pagos da conta escolhida para esta marca. A conexão precisa da permissão de leitura <code>ads_read</code> e será habilitada após a validação no painel Meta.</p>
    <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted"><li>Tenha acesso à conta de anúncios no Business Manager.</li><li>Autorize a leitura da conta para esta marca.</li><li>Escolha a conta e sincronize os primeiros dados.</li></ol>
    <Link href={paidTrafficConnectionHref(brandId)} className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white">Conectar conta de anúncios</Link>
  </div>;
}
