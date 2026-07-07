import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/Calendar';
import Scheduler from './pages/Scheduler';
import Inbox from './pages/Inbox';
import ApprovalView from './pages/ApprovalView';
import Connections from './pages/Connections';
import Reports from './pages/Reports';
import AuthModal from './components/auth/AuthModal';
import { 
  Share2, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

// Painel Interno de Gestão de Aprovações para agências
function InternalApprovalsPanel({ setCurrentTab }) {
  const { posts } = useWorkspace();
  const waitingPosts = posts.filter((p) => p.status === 'waiting_approval');

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Gestão Interna de Aprovações
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Controle de fluxos, envios de links para clientes e histórico de auditoria.
          </p>
        </div>

        <button
          onClick={() => setCurrentTab('approvals_client_view')}
          className="px-5 py-2.5 bg-gradient-to-r from-[#1A73E8] to-[#60A5FA] hover:from-[#1557b0] hover:to-[#1A73E8] text-white rounded-xl font-extrabold text-xs shadow-lg shadow-[#1A73E8]/25 transition-all flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Abrir Portal do Cliente (Simulador)</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F26526]" /> Posts Aguardando Aprovação do Cliente ({waitingPosts.length})
          </h3>
          <span className="text-xs text-gray-400">Links ativos de validade de 7 dias</span>
        </div>

        {waitingPosts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShieldCheck className="w-16 h-16 mx-auto mb-3 text-green-500/40" />
            <h4 className="text-base font-extrabold text-gray-700">Tudo limpo por aqui!</h4>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              Nenhuma publicação está pendente de aprovação externa no momento. Agende novas publicações para enviar ao cliente.
            </p>
            <button
              onClick={() => setCurrentTab('scheduler')}
              className="mt-4 px-4 py-2 bg-[#F26526] text-white text-xs font-bold rounded-xl"
            >
              Criar Post e Solicitar Aprovação
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {waitingPosts.map((post) => (
              <div key={post.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-extrabold text-[10px] uppercase">
                      🟠 Pendente
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(post.scheduled_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <img 
                    src={post.media_url} 
                    alt="Capa" 
                    className="w-full h-36 rounded-xl object-cover mb-3 border border-gray-200"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                    }}
                  />

                  <h4 className="text-xs font-extrabold text-gray-900 line-clamp-1">{post.title}</h4>
                  <p className="text-[11px] text-gray-600 line-clamp-2 mt-1 leading-relaxed">{post.content}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      alert('✨ Link de aprovação copiado para a área de transferência! Envie para o WhatsApp ou e-mail do cliente.');
                    }}
                    className="text-[11px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
                  >
                    Copiar Link
                  </button>
                  <button
                    onClick={() => setCurrentTab('approvals_client_view')}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    Simular Visão <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente principal que coordena abas e layout
function MainAppContent() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { loading } = useAuth();

  // Permite simular a tela do cliente direto através da URL /aprovar
  useEffect(() => {
    if (window.location.pathname.includes('/aprovar')) {
      setCurrentTab('approvals_client_view');
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0F172A] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] flex items-center justify-center shadow-2xl shadow-[#F26526]/50 animate-bounce mb-4">
          <Share2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">
          Social<span className="text-[#F26526]">Hub</span> <span className="text-[#1A73E8]">PRO</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1 animate-pulse">Sincronizando Workspace & Supabase...</p>
      </div>
    );
  }

  // Se a aba ativa for a visão externa do cliente, renderiza sem Sidebar/Topbar
  if (currentTab === 'approvals_client_view') {
    return <ApprovalView setCurrentTab={setCurrentTab} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Sidebar de Navegação Premium */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Dinâmico */}
        <Topbar currentTab={currentTab} setCurrentTab={setCurrentTab} onOpenAuthModal={() => setAuthModalOpen(true)} />

        {/* Corpo Dinâmico conforme Aba Ativa */}
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">
          {currentTab === 'dashboard' && <Dashboard setCurrentTab={setCurrentTab} />}
          {currentTab === 'reports' && <Reports setCurrentTab={setCurrentTab} />}
          {currentTab === 'connections' && <Connections setCurrentTab={setCurrentTab} />}
          {currentTab === 'calendar' && <CalendarView setCurrentTab={setCurrentTab} />}
          {currentTab === 'scheduler' && <Scheduler setCurrentTab={setCurrentTab} />}
          {currentTab === 'inbox' && <Inbox setCurrentTab={setCurrentTab} />}
          {currentTab === 'approvals' && <InternalApprovalsPanel setCurrentTab={setCurrentTab} />}
        </main>
      </div>

      {/* Modal de Cadastro Real e Autenticação Supabase */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <MainAppContent />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
