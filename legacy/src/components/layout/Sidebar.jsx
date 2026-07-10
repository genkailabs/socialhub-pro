import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  LogOut,
  Building2,
  Plus,
  Share2,
  BarChart3,
  UserCheck,
  Shield,
  Lock,
  LogIn,
  LayoutGrid
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import NewBrandModal from '../workspace/NewBrandModal';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { brands, activeBrand, switchBrand } = useWorkspace();
  const { user, signOut } = useAuth();
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [newBrandModalOpen, setNewBrandModalOpen] = useState(false);

  // Verifica se há usuário autenticado no Supabase ou uma marca ativa em operação no dashboard
  const isConnected = !!user || !!activeBrand || (brands && brands.length > 0);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports', label: 'Relatórios por Rede', icon: BarChart3, badge: 'Analytics' },
    { id: 'connections', label: 'Conexões & Canais', icon: Share2, badge: 'Tutorias & QR' },
    { id: 'calendar', label: 'Calendário Editorial', icon: Calendar },
    { id: 'grid_planner', label: 'Planejador de Feed', icon: LayoutGrid, badge: 'Grid 3x3' },
    { id: 'scheduler', label: 'Agendar Post', icon: PlusCircle, badge: 'Ação Rápida' },
    { id: 'inbox', label: 'Social Inbox', icon: MessageSquare, count: '3' },
    { id: 'approvals', label: 'Aprovações', icon: CheckCircle2 }
  ];

  return (
    <aside className="w-72 bg-[#111827] text-gray-300 flex flex-col h-screen border-r border-gray-800 shadow-2xl select-none relative z-30">
      {/* Top Logo & Brand Identity */}
      <div className="p-5 border-b border-gray-800/80 bg-[#0B0F19]/60">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] flex items-center justify-center shadow-lg shadow-[#F26526]/30">
            <Share2 className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              Social<span className="text-[#F26526]">Hub</span>
              <span className="bg-[#1A73E8]/20 text-[#1A73E8] border border-[#1A73E8]/30 text-[10px] px-1.5 py-0.5 rounded font-mono">PRO</span>
            </span>
            <p className="text-[11px] text-gray-400">Marketing Suite 3.0</p>
          </div>
        </div>

        {/* Brand Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setBrandDropdownOpen(!brandDropdownOpen)}
            className="w-full bg-[#1F2937]/80 hover:bg-[#1F2937] border border-gray-700/80 hover:border-[#F26526]/50 rounded-xl p-3 flex items-center justify-between transition-all duration-200 group shadow-sm"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <img 
                src={activeBrand?.logo} 
                alt={activeBrand?.name}
                className="w-8 h-8 rounded-lg object-cover border border-gray-600 shrink-0" 
              />
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-white truncate group-hover:text-[#F26526] transition-colors">
                  {activeBrand?.name || 'Selecione uma Marca'}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{activeBrand?.handle}</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${brandDropdownOpen ? 'rotate-180 text-[#F26526]' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {brandDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1F2937] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                Alternar Marca Ativa
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-800/50">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      switchBrand(brand.id);
                      setBrandDropdownOpen(false);
                    }}
                    className={`w-full p-2.5 flex items-center justify-between hover:bg-gray-800/80 transition-colors ${
                      activeBrand?.id === brand.id ? 'bg-[#F26526]/10 border-l-2 border-[#F26526]' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <img src={brand.logo} alt={brand.name} className="w-6 h-6 rounded-md object-cover shrink-0" />
                      <div className="text-left overflow-hidden">
                        <p className={`text-xs font-medium truncate ${activeBrand?.id === brand.id ? 'text-white' : 'text-gray-300'}`}>
                          {brand.name}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">{brand.category}</p>
                      </div>
                    </div>
                    {activeBrand?.id === brand.id && (
                      <div className="w-2 h-2 rounded-full bg-[#F26526] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-2 bg-[#111827]/80 border-t border-gray-800">
                <button 
                  onClick={() => {
                    setNewBrandModalOpen(true);
                    setBrandDropdownOpen(false);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#1A73E8]/20 hover:bg-[#1A73E8]/30 text-[#1A73E8] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Nova Marca
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Gestão & Operações
        </p>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isScheduler = item.id === 'scheduler';

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-gradient-to-r from-[#F26526] to-[#FF8A50] text-white font-semibold shadow-lg shadow-[#F26526]/25 translate-x-1' 
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
              } ${isScheduler && !isActive ? 'border border-[#F26526]/30 bg-[#F26526]/5 hover:bg-[#F26526]/15 text-[#F26526]' : ''}`}
            >
              <div className="flex items-center space-x-3.5 truncate">
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : isScheduler ? 'text-[#F26526]' : 'text-gray-400 group-hover:text-[#1A73E8]'
                }`} />
                <span className="text-sm truncate">{item.label}</span>
              </div>

              {item.count && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#1A73E8] text-white shadow-sm shadow-[#1A73E8]/50 animate-pulse'
                }`}>
                  {item.count}
                </span>
              )}

              {item.badge && !isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#F26526]/20 text-[#F26526] font-medium border border-[#F26526]/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Links Externo / Cliente */}
        <div className="pt-6">
          <p className="px-3 pb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Externo / Cliente
          </p>
          {/* Portal White-Label */}
          <button
            onClick={() => setCurrentTab('whitelabel')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:bg-[#F26526]/10 hover:text-[#F26526] border border-dashed border-gray-700 hover:border-[#F26526]/50 mb-1 ${
              currentTab === 'whitelabel' ? 'bg-[#F26526]/15 text-[#F26526] border-[#F26526]' : ''
            }`}
          >
            <div className="flex items-center space-x-3.5 truncate">
              <Sparkles className="w-5 h-5 shrink-0 text-[#F26526]" />
              <span className="text-sm font-medium truncate">Portal White-Label</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          {/* Simular Tela Cliente */}
          <button
            onClick={() => setCurrentTab('approvals_client_view')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:bg-[#1A73E8]/10 hover:text-[#1A73E8] border border-dashed border-gray-700 hover:border-[#1A73E8]/50 ${
              currentTab === 'approvals_client_view' ? 'bg-[#1A73E8]/15 text-[#1A73E8] border-[#1A73E8]' : ''
            }`}
          >
            <div className="flex items-center space-x-3.5 truncate">
              <Sparkles className="w-5 h-5 shrink-0 text-[#1A73E8]" />
              <span className="text-sm font-medium truncate">Simular Tela Cliente</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* User Footer Card */}
      <div className="p-4 border-t border-gray-800 bg-[#0B0F19]">
        {isConnected ? (
          <div className="flex items-center justify-between bg-[#111827]/90 hover:bg-[#1F2937]/90 p-3 rounded-2xl border border-gray-800/80 hover:border-gray-700 transition-all duration-200 group shadow-lg">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="relative shrink-0">
                <img 
                  src={user?.user_metadata?.avatar_url || activeBrand?.logo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full border-2 border-[#F26526] object-cover shadow-md group-hover:scale-105 transition-transform duration-200"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-[#111827] animate-pulse" title="Conectado / Online"></span>
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-sm font-bold text-white truncate group-hover:text-[#F26526] transition-colors">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || activeBrand?.name || 'Gestor de Contas'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-500/15 text-green-400 border border-green-500/30 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Conectado / Online
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  {user?.email || (activeBrand ? `Operação: ${activeBrand.handle}` : 'Sessão Ativa')}
                </p>
              </div>
            </div>
            {user ? (
              <button
                onClick={signOut}
                title="Sair do Sistema"
                className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-gray-800/80 transition-all duration-200 shrink-0 self-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  const topbarAuthBtn = document.querySelector('header button[title*="Supabase"]') || document.querySelector('header button[title*="conta"]') || document.querySelector('header button[title*="Vincular"]');
                  if (topbarAuthBtn) topbarAuthBtn.click();
                }}
                title="Vincular ou gerenciar conta na nuvem (Supabase)"
                className="p-2 rounded-xl text-gray-400 hover:text-[#1A73E8] hover:bg-gray-800/80 transition-all duration-200 shrink-0 self-center"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[#111827]/90 p-3 rounded-2xl border border-gray-800/80 shadow-lg">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-300 truncate">Não Conectado</p>
                <p className="text-[10px] text-gray-500 truncate">Sessão offline</p>
              </div>
            </div>
            <button
              onClick={() => {
                const topbarAuthBtn = document.querySelector('header button[title*="Supabase"]') || document.querySelector('header button[title*="conta"]') || document.querySelector('header button[title*="Vincular"]');
                if (topbarAuthBtn) topbarAuthBtn.click();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#d9551c] hover:to-[#F26526] text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
              title="Fazer Login / Cadastrar no Supabase"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de Adicionar Nova Marca */}
      <NewBrandModal 
        isOpen={newBrandModalOpen} 
        onClose={() => setNewBrandModalOpen(false)} 
      />
    </aside>
  );
}
