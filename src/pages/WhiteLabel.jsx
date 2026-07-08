import React, { useState } from 'react';
import { Sparkles, Copy, Check, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function WhiteLabel() {
  const { activeBrand } = useWorkspace();
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/#conectar-cliente`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-full font-sans select-none">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2.5">
          <span className="p-2 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] text-white shadow-lg shadow-[#F26526]/20">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Portal White-Label
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Convite seguro para seus clientes conectarem redes sociais
            </p>
          </div>
        </div>
      </div>

      {/* Card principal */}
      <div className="max-w-2xl">
        <div className="bg-[#0B0F19] text-white rounded-2xl p-6 md:p-8 shadow-2xl border border-gray-800 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#F26526]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-4 max-w-xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F26526]/20 border border-[#F26526]/40 text-[#FF8A50] text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Exclusivo Agências / White-Label
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
              Seu cliente prefere conectar ele mesmo sem te passar senhas?
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Gere um Link de Convite de Conexão Segura. Seu cliente acessa pelo celular ou computador dele,
              autoriza o Instagram ou YouTube em 1 clique e a permissão cai automaticamente no seu painel.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="px-6 py-3.5 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-[#F26526]/30 transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copiado!' : 'Copiar Link de Convite'}</span>
              </button>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-300 leading-relaxed">
                O link é único para sua agência. O cliente não precisa criar conta — apenas autorizar a conexão.
                Os dados aparecem automaticamente no painel da marca <strong className="text-white">{activeBrand?.name || 'ativa'}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
