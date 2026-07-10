import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

function PlatformTutorial({ platform }) {
  const [open, setOpen] = useState(false);
  const Icon = platform.icon;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${platform.color} text-white shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800">{platform.name}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-gray-600">
          <p className="font-extrabold text-gray-800 text-[11px] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
            {platform.tutorialTitle}
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
            {platform.steps.map((step, idx) => (
              <li key={idx} className="pl-1">
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function HelpDrawer({ isOpen, onClose, platforms }) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-96 max-w-[calc(100vw-2rem)] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#F26526]" />
              Central de Ajuda
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tutoriais de conexão para cada plataforma
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {platforms.map((platform) => (
            <PlatformTutorial key={platform.id} platform={platform} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Dúvidas? Consulte nossa documentação ou entre em contato com o suporte.
          </p>
        </div>
      </div>
    </>
  );
}
