import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Share2, 
  Sparkles, 
  Send, 
  ArrowLeft,
  Instagram,
  Linkedin,
  Facebook,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function ApprovalView({ setCurrentTab }) {
  const { posts, updatePostStatus, activeBrand } = useWorkspace();

  // Procura um post que esteja aguardando aprovação ou pega o primeiro
  const postToApprove = posts.find((p) => p.status === 'waiting_approval') || posts[0] || {
    id: 'demo-approve',
    title: 'Campanha Especial de Verão 2026',
    content: 'Descubra a liberdade de expressar sua verdadeira identidade com nossos novos lançamentos. Qualidade, conforto e design exclusivo para você brilhar nesta temporada! ✨ #Verão2026 #Estilo #Lançamento',
    media_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    networks: ['instagram', 'linkedin'],
    scheduled_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'waiting_approval'
  };

  const [status, setStatus] = useState(postToApprove.status);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  const handleApprove = async () => {
    setStatus('scheduled');
    setActionDone('approved');
    if (updatePostStatus && postToApprove.id) {
      await updatePostStatus(postToApprove.id, 'scheduled');
    }
  };

  const handleRequestChanges = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      alert('Por favor, descreva os ajustes necessários para orientar a equipe.');
      return;
    }
    setStatus('draft');
    setActionDone('changes_requested');
    setShowFeedbackModal(false);
    if (updatePostStatus && postToApprove.id) {
      await updatePostStatus(postToApprove.id, 'draft');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-gray-100 font-sans select-none flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#F26526]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#1A73E8]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Externo */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-8 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] flex items-center justify-center shadow-lg shadow-[#F26526]/30">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Social<span className="text-[#F26526]">Hub</span>
            </span>
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A73E8]/20 text-[#60A5FA] border border-[#1A73E8]/40 uppercase tracking-wider">
              Portal de Aprovação Externa
            </span>
          </div>
        </div>

        {setCurrentTab && (
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors bg-gray-800/60 px-3 py-2 rounded-xl border border-gray-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Painel Interno
          </button>
        )}
      </div>

      {/* Main Approval Card */}
      <div className="max-w-4xl mx-auto w-full bg-[#1E293B]/90 border border-gray-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl z-10">
        {actionDone ? (
          <div className="py-16 text-center space-y-4 animate-in zoom-in-95 duration-300">
            {actionDone === 'approved' ? (
              <>
                <div className="w-20 h-20 bg-green-500/20 text-green-400 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30 animate-bounce">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <h2 className="text-3xl font-extrabold text-white">Postagem Aprovada com Sucesso! 🎉</h2>
                <p className="text-sm text-gray-300 max-w-md mx-auto">
                  Excelente! A postagem foi confirmada e programada para ir ao ar no dia e horário estipulados pela agência/agendador.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-amber-500/20 text-amber-400 border-2 border-amber-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
                  <AlertTriangle className="w-10 h-10 stroke-[2.5]" />
                </div>
                <h2 className="text-3xl font-extrabold text-white">Solicitação de Ajuste Enviada! ⚡</h2>
                <p className="text-sm text-gray-300 max-w-md mx-auto">
                  Seus comentários foram notificados instantaneamente para a equipe criativa. Assim que os ajustes forem feitos, você receberá um novo link para revisão.
                </p>
                {feedback && (
                  <div className="max-w-md mx-auto bg-gray-900/80 p-4 rounded-xl border border-gray-700 text-left text-xs text-amber-300">
                    <strong>Seu comentário:</strong> "{feedback}"
                  </div>
                )}
              </>
            )}

            <div className="pt-6">
              <button
                onClick={() => setActionDone(false)}
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Revisar Novamente
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Esquerda: Preview da Arte/Legenda (6 Colunas) */}
            <div className="md:col-span-6 bg-[#0F172A] border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2">
                  <img src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{activeBrand?.name || 'Marca Cliente'}</h4>
                    <p className="text-[10px] text-gray-400">Revisão de Conteúdo</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {postToApprove.networks?.map((net) => (
                    <span key={net} className="px-2 py-0.5 rounded bg-gray-800 text-[10px] font-bold text-gray-300 uppercase">
                      {net}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full aspect-square bg-black rounded-xl overflow-hidden border border-gray-800">
                <img src={postToApprove.media_url} alt="Arte" className="w-full h-full object-cover" />
              </div>

              <div className="text-xs text-gray-200 leading-relaxed max-h-32 overflow-y-auto pr-1">
                <strong className="text-[#F26526] mr-1.5 font-bold">Legenda Proposta:</strong>
                {postToApprove.content}
              </div>
            </div>

            {/* Direita: Dados técnicos & Ações de Aprovação (6 Colunas) */}
            <div className="md:col-span-6 space-y-6">
              <div>
                <span className="text-[11px] font-bold text-[#F26526] uppercase tracking-wider block mb-1">
                  Solicitação de Revisão #7892
                </span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {postToApprove.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Revisão solicitada pelo gestor da agência. Verifique atentamente a arte e a legenda antes de autorizar o agendamento.
                </p>
              </div>

              {/* Informações da Publicação */}
              <div className="bg-[#0F172A]/80 p-4 rounded-2xl border border-gray-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#1A73E8]" /> Data Programada:
                  </span>
                  <span className="font-bold text-white">
                    {new Date(postToApprove.scheduled_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#F26526]" /> Horário Previsto:
                  </span>
                  <span className="font-bold text-white">
                    {new Date(postToApprove.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-green-400" /> Status do Post:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    🟠 Aguardando Sua Aprovação
                  </span>
                </div>
              </div>

              {/* Botões de Ação do Cliente */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleApprove}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-green-600/30 hover:shadow-2xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[3]" />
                  <span>Aprovar Postagem e Autorizar Publicação</span>
                </button>

                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-amber-400 hover:text-amber-300 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Solicitar Ajustes na Arte ou Legenda</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Solicitar Ajustes */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-gray-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Solicitar Ajustes Criativos
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Descreva detalhadamente as modificações que deseja na imagem ou legenda para que nossa equipe faça as correções.
            </p>

            <form onSubmit={handleRequestChanges}>
              <textarea
                rows="4"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex: Por favor, alterar a cor do fundo para azul marinho e incluir a hashtag #Promoção no final da legenda..."
                className="w-full p-4 rounded-xl bg-[#0F172A] border border-gray-700 text-white text-xs outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none mb-4"
                required
              ></textarea>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Externo */}
      <div className="text-center text-[11px] text-gray-500 max-w-xl mx-auto z-10">
        <p>Desenvolvido com tecnologia <strong className="text-gray-400">SocialHub SaaS Marketing Suite</strong>. Segurança de ponta a ponta e auditoria de aprovações em conformidade com as diretrizes das redes sociais.</p>
      </div>
    </div>
  );
}
