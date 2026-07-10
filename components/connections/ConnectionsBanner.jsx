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
    <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={() => setMsg(null)}><X className="h-4 w-4" /></button>
    </div>
  );
}
