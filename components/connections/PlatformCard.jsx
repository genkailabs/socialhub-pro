import { Check, RefreshCw, Lock, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { platformById, connectHref } from '@/data/platforms';
import { needsReconnect } from '@/lib/social-tokens';

export function PlatformCard({ platformId, connected, activeBrandId }) {
  const platform = platformById(platformId);
  if (!platform) return null;
  const Icon = platform.icon;
  const soon = !platform.integrated;
  const canConnect = platform.integrated && activeBrandId;
  const oauthHref = connectHref(platform, activeBrandId);

  // Um token vencido não é "ao vivo": a publicação vai falhar. Avisar antes é o
  // que separa reconectar por escolha de descobrir pelo post que não saiu.
  const status = connected?.status || 'active';
  const quebrado = connected && needsReconnect(status);
  const expirando = connected && status === 'expiring';
  const alerta = quebrado || expirando;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-surface transition-all duration-300 ease-emphasized hover:-translate-y-0.5 hover:shadow-lift ${
        quebrado ? 'border-danger/50 shadow-[0_0_0_1px_rgb(var(--c-danger)/0.25)]'
          : expirando ? 'border-warning/50 shadow-[0_0_0_1px_rgb(var(--c-warning)/0.25)]'
          : connected ? 'border-success/40 shadow-[0_0_0_1px_rgb(var(--c-success)/0.22)]'
          : 'border-line'
      }`}
    >
      {/* Cabeçalho neutro — a marca aparece só no ícone (fio de cor no topo), consistente com o resto do sistema */}
      <div className="relative h-14 overflow-hidden bg-surface-2">
        <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: soon ? undefined : platform.color }} />

        <div className="absolute right-3 top-3">
          {alerta ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${quebrado ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
              <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {quebrado ? 'reconecte' : 'expira em breve'}
            </span>
          ) : connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-success" /> ao vivo
            </span>
          ) : soon ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
              <Lock className="h-3 w-3" /> Em breve
            </span>
          ) : (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
              Disponível
            </span>
          )}
        </div>

        {/* tile do ícone, atravessa o cabeçalho */}
        <div className="absolute -bottom-5 left-4">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-surface text-ink shadow-soft"
            style={{ color: soon ? undefined : platform.color }}
          >
            <Icon className="h-6 w-6" />
          </span>
        </div>
      </div>

      {/* corpo */}
      <div className="flex flex-1 flex-col gap-3 p-4 pt-7">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-extrabold text-ink">{platform.name}</p>
            {connected && <Check className="h-3.5 w-3.5 text-success" />}
          </div>
          <p className="truncate text-xs text-muted">
            {connected ? `@${connected.platform_username || 'conta conectada'}` : platform.subtitle}
          </p>
          {alerta && (
            <p className={`mt-1 text-[11px] font-semibold ${quebrado ? 'text-danger' : 'text-warning'}`}>
              {quebrado
                ? 'O acesso expirou. Reconecte para voltar a publicar.'
                : 'O acesso expira em menos de uma semana.'}
            </p>
          )}
        </div>

        {/* capacidades */}
        <div className="flex flex-wrap gap-1.5">
          {(platform.caps || []).map((cap) => (
            <span
              key={cap}
              className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted"
            >
              {cap}
            </span>
          ))}
        </div>

        {/* ação */}
        <div className="mt-auto pt-1">
          {connected ? (
            <a
              href={oauthHref}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-colors ${
                quebrado
                  ? 'bg-danger text-white hover:opacity-90'
                  : 'border border-line bg-surface-2 text-ink hover:border-accent/40 hover:text-accent'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reconectar
            </a>
          ) : soon ? (
            <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-[11px] font-bold text-faint">
              <Lock className="h-3.5 w-3.5" /> Integração em desenvolvimento
            </div>
          ) : canConnect ? (
            <a
              href={oauthHref}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-[11px] font-extrabold text-white shadow-soft transition-colors hover:bg-accent-ink"
            >
              Conectar via OAuth <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <div className="w-full rounded-lg border border-line bg-surface-2 py-2 text-center text-[11px] font-bold text-faint">
              Crie/selecione uma marca
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
