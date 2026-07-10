import React from 'react';
import { 
  Bell, 
  Search, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  Users, 
  HelpCircle,
  CheckCircle,
  ExternalLink,
  Lock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Topbar({ currentTab, setCurrentTab, onOpenAuthModal }) {
  const { activeBrand } = useWorkspace();
  const { user } = useAuth();

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Visão Geral & Performance';
      case 'reports':
        return 'Relatórios & Analytics por Rede';
      case 'calendar':
        return 'Calendário Editorial Interativo';
      case 'scheduler':
        return 'Agendador Multi-Redes & Live Preview';
      case 'inbox':
        return 'Social Inbox Unificado';
      case 'approvals':
        return 'Gestão de Aprovações Internas';
      case 'approvals_client_view':
        return 'Portal de Aprovação Externa (Visão do Cliente)';
      default:
        return 'Painel de Gestão';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm relative z-20 select-none">
      {/* Title & Brand Active Status */}
      <div className="flex items-center space-x-6">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            {getPageTitle()}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
              Sincronizado
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            Operando marca ativa: <strong className="text-gray-800 font-semibold">{activeBrand?.name}</strong> 
            <span className="text-gray-300">|</span>
            <span className="text-[#1A73E8] font-medium flex items-center gap-1">
              <Users className="w-3 h-3" /> {activeBrand?.followers || '0'} seguidores
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-[#F26526] font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Engajamento {activeBrand?.engagement || '0%'}
            </span>
          </p>
        </div>
      </div>

      {/* Action Buttons & Search */}
      <div className="flex items-center space-x-4">
        {/* Search Input */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar posts, campanhas ou tags..." 
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 outline-none transition-all text-gray-800 placeholder-gray-400"
          />
        </div>

        {/* AI Assistant Badge / Trigger */}
        <button 
          onClick={() => alert('✨ SocialHub AI: Sugestão de melhor horário para postar hoje para ' + activeBrand?.name + ': 18:30 (Pico de engajamento).')}
          className="flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-[#1A73E8]/10 to-[#8B5CF6]/10 hover:from-[#1A73E8]/20 hover:to-[#8B5CF6]/20 border border-[#1A73E8]/30 rounded-xl transition-all duration-200 group"
        >
          <Sparkles className="w-4 h-4 text-[#1A73E8] group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold bg-gradient-to-r from-[#1A73E8] to-[#8B5CF6] bg-clip-text text-transparent">
            AI Copilot
          </span>
        </button>

        {/* Notifications */}
        <button className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#F26526] rounded-full ring-2 ring-white animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#F26526] rounded-full ring-2 ring-white" />
        </button>

        {/* Status de Conexão e Autenticação */}
        {user ? (
          <div className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-green-500/10 border border-green-500/30 text-green-600 rounded-xl text-xs font-extrabold shadow-sm select-none">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Conta Ativa ({user.email?.split('@')[0]})</span>
          </div>
        ) : activeBrand ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-green-500/10 border border-green-500/30 text-green-600 rounded-xl text-xs font-extrabold shadow-sm select-none" title="Sessão ativa operando a marca">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Conectado ({activeBrand.handle || 'Online'})</span>
            </div>
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#1F2937] hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all border border-gray-700"
              title="Vincular ou entrar em uma conta na nuvem Supabase"
            >
              <Lock className="w-3.5 h-3.5 text-[#F26526]" />
              <span className="hidden xl:inline">Vincular Supabase</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-[#1F2937] hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md transition-all border border-gray-700"
            title="Criar conta real ou fazer login no banco Supabase"
          >
            <Lock className="w-3.5 h-3.5 text-[#F26526]" />
            <span>Cadastrar / Entrar</span>
          </button>
        )}

        {/* Quick Schedule Button */}
        <button
          onClick={() => setCurrentTab('scheduler')}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#d9551c] hover:to-[#F26526] text-white rounded-xl shadow-lg shadow-[#F26526]/25 hover:shadow-xl hover:shadow-[#F26526]/35 transition-all duration-200 font-bold text-xs transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Criar Postagem</span>
        </button>
      </div>
    </header>
  );
}
