import React from 'react';
import { Users, Activity, Clock, Settings } from 'lucide-react';

export default function ConnectedAccountCard({ network, onManage, hasSyncError }) {
  const Icon = network.icon;
  const isError = hasSyncError || (network.expiresIn && (
    network.expiresIn.toLowerCase().includes('erro') ||
    network.expiresIn.toLowerCase().includes('expirado')
  ));

  const borderClass = isError
    ? 'border-red-300 bg-red-50/30'
    : 'border-emerald-200 bg-emerald-50/30 shadow-sm hover:shadow-md';

  const badgeClass = isError
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const badgeLabel = isError ? 'Reconectar' : 'Conectado';
  const badgeDot = isError ? 'bg-red-500' : 'bg-emerald-500';

  const profileUrl = network.profileUrl || (() => {
    const handle = (network.handle || '').replace('@', '');
    const id = network.id;
    if (id === 'instagram') return `instagram.com/${handle}`;
    if (id === 'facebook') return `facebook.com/${handle}`;
    if (id === 'tiktok') return `tiktok.com/@${handle}`;
    if (id === 'linkedin') return `linkedin.com/in/${handle}`;
    if (id === 'youtube') return `youtube.com/@${handle}`;
    if (id === 'twitter') return `x.com/${handle}`;
    return '';
  })();

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${borderClass}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`p-2.5 rounded-xl shadow-sm bg-gradient-to-br ${network.color} text-white shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-gray-900 leading-tight truncate">{network.name}</h3>
            <p className="text-[11px] text-gray-500 truncate">{network.handle || network.accountName || ''}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ml-2 ${badgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`}></span>
          {badgeLabel}
        </span>
      </div>

      {/* Métricas */}
      <div className="px-4 pb-1 space-y-2">
        {profileUrl && (
          <p className="text-[11px] text-gray-400 truncate">{profileUrl}</p>
        )}

        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-extrabold text-gray-900">{network.followers || '--'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-extrabold text-emerald-600">{network.engagement || '--'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Sinc: {network.lastSynced || '--'}</span>
        </div>

        {isError && network.expiresIn && (
          <p className="text-[10px] text-red-500 font-medium">{network.expiresIn}</p>
        )}
      </div>

      {/* Bio inline compacta */}
      {network.bio && (
        <div className="px-4 pb-1">
          <p className="text-[11px] text-gray-500 italic leading-snug line-clamp-1 border-l-2 border-emerald-300 pl-2">
            &ldquo;{network.bio}&rdquo;
          </p>
        </div>
      )}

      {/* Botão Gerenciar */}
      <div className="px-4 pb-4 pt-2 mt-auto">
        <button
          onClick={() => onManage(network)}
          className="w-full py-2 px-3 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          <Settings className="w-3.5 h-3.5" />
          Gerenciar
        </button>
      </div>
    </div>
  );
}
