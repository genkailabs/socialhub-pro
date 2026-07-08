import React from 'react';
import { Plug } from 'lucide-react';

export default function AvailablePlatformCard({ network, onConnect }) {
  const Icon = network.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
      {/* Header */}
      <div className="p-3.5 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gray-100 text-gray-400 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-900">{network.name}</h3>
          <p className="text-[11px] text-gray-400 truncate">{network.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase border border-gray-200 shrink-0">
          Disponível
        </span>
      </div>

      {/* Botão Conectar */}
      <div className="px-3.5 pb-3.5 mt-auto">
        <button
          onClick={() => onConnect(network)}
          className="w-full py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white shadow-md shadow-[#F26526]/20 active:scale-[0.98]"
        >
          <Plug className="w-3.5 h-3.5" />
          Conectar
        </button>
      </div>
    </div>
  );
}
