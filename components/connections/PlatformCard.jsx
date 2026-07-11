'use client';
import { platformById } from '@/data/platforms';

export function PlatformCard({ platformId, connected, activeBrandId }) {
  const platform = platformById(platformId);
  if (!platform) return null;
  const Icon = platform.icon;
  const canConnect = platform.integrated && activeBrandId;

  return (
    <div className={`rounded-xl border bg-surface p-4 ${connected ? 'border-emerald-200' : 'border-line'}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg text-white" style={{ backgroundColor: platform.color }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-extrabold ${platform.integrated ? 'text-ink' : 'text-muted'}`}>{platform.name}</p>
          <p className="text-[11px] text-muted">{connected ? `@${connected.platform_username || ''}` : platform.subtitle}</p>
        </div>
        {connected && <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">● real</span>}
        {!platform.integrated && <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-extrabold text-gray-500">Em breve</span>}
      </div>

      <div className="mt-3">
        {connected ? (
          <a href={`/api/meta/oauth?brand_id=${activeBrandId}`}
            className="block w-full rounded-lg bg-app py-2 text-center text-[11px] font-bold text-ink hover:bg-line">Reconectar</a>
        ) : platform.integrated ? (
          canConnect ? (
            <a href={`/api/meta/oauth?brand_id=${activeBrandId}`}
              className="block w-full rounded-lg bg-accent py-2 text-center text-[11px] font-extrabold text-white hover:bg-accent/90">Conectar (OAuth real)</a>
          ) : (
            <div className="w-full rounded-lg bg-gray-100 py-2 text-center text-[11px] font-bold text-gray-400">Crie/selecione uma marca</div>
          )
        ) : (
          <div className="w-full rounded-lg bg-gray-100 py-2 text-center text-[11px] font-bold text-gray-400">Indisponível</div>
        )}
      </div>
    </div>
  );
}
