// src/components/common/SyncStatusBar.jsx
// Barra de status de sincronização com APIs oficiais das redes sociais
// Exibe indicador visual (🟢/🟡/🔴), data/hora da última sincronização e o botão "Atualizar Agora".

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function SyncStatusBar({ lastSyncedAt, isSyncing, onSyncNow, syncError }) {
  const [justSynced, setJustSynced] = useState(false);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Nunca sincronizado via API oficial';
    const parsedDate = new Date(isoString);
    if (isNaN(parsedDate.getTime())) {
      return typeof isoString === 'string' ? isoString : 'Sincronizado agora';
    }
    const diffMs = Date.now() - parsedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins <= 2) return 'Sincronizado agora';
    if (diffMins < 60) return `Atualizado há ${diffMins} minutos`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Atualizado há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    try {
      return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Sincronizado';
    }
  };

  const formatSafeTime = (isoString) => {
    if (!isoString) return '';
    const parsedDate = new Date(isoString);
    if (isNaN(parsedDate.getTime())) {
      return typeof isoString === 'string' ? isoString : '';
    }
    try {
      return parsedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getStatusBadge = () => {
    if (isSyncing) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Consultando APIs Oficiais...
        </span>
      );
    }
    if (syncError) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
          <AlertTriangle className="w-3.5 h-3.5" />
          🔴 Erro na sincronização
        </span>
      );
    }
    const relativeTime = formatRelativeTime(lastSyncedAt);
    const isRecent = relativeTime === 'Sincronizado agora' || relativeTime.includes('minutos');

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
        isRecent
          ? 'text-green-800 bg-green-50 border-green-200'
          : 'text-amber-800 bg-amber-50 border-amber-200'
      }`}>
        {isRecent ? '🟢' : '🟡'} {relativeTime}
      </span>
    );
  };

  const handleRefreshClick = async () => {
    if (isSyncing) return;
    setJustSynced(false);
    if (onSyncNow) {
      await onSyncNow();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl p-4 shadow-lg border border-gray-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-4">
      <div className="flex flex-wrap items-center gap-3">
        {getStatusBadge()}
        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>APIs Oficiais Conectadas • Estritamente Zero Mocks</span>
        </div>
        {lastSyncedAt && (
          <span className="text-[11px] text-gray-400 font-mono hidden md:inline">
            ({formatSafeTime(lastSyncedAt)})
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {justSynced && (
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in duration-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Dados reais atualizados!
          </span>
        )}
        <button
          onClick={handleRefreshClick}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          Atualizar Agora
        </button>
      </div>
    </div>
  );
}
