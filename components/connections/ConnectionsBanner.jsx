'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export function ConnectionsBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const status = params.get('status');
    const error = params.get('error');
    const username = params.get('username');
    if (status === 'success') setMsg({ type: 'ok', text: `Instagram @${username || ''} conectado com sucesso!` });
    else if (error) setMsg({ type: 'err', text: error });
    if (status || error) router.replace(pathname);
  }, [params, router, pathname]);

  if (!msg) return null;
  const ok = msg.type === 'ok';
  return (
    <div className={`animate-pop flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold text-ink ${ok ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <AlertCircle className="h-4 w-4 shrink-0 text-danger" />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={() => setMsg(null)} className="text-muted transition-colors hover:text-ink"><X className="h-4 w-4" /></button>
    </div>
  );
}
