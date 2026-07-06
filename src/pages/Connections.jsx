import React, { useState } from 'react';
import { 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ExternalLink, 
  QrCode, 
  Instagram, 
  Linkedin, 
  Facebook, 
  Youtube, 
  Music, 
  MessageSquare, 
  ShieldCheck, 
  Video, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Key,
  RefreshCw
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function Connections({ setCurrentTab }) {
  const { activeBrand } = useWorkspace();
  const [openTutorial, setOpenTutorial] = useState('instagram');
  const [qrCodeModal, setQrCodeModal] = useState(false);
  const [connectingNetwork, setConnectingNetwork] = useState(null);

  const networks = [
    {
      id: 'instagram',
      name: 'Instagram (Feed, Reels & Stories)',
      icon: Instagram,
      color: 'from-purple-500 via-pink-500 to-amber-500',
      status: 'connected',
      handle: '@suamarca.oficial',
      expiresIn: '58 dias',
      tutorialTitle: 'Como conectar o Instagram Business ao SocialHub',
      steps: [
        'Sua conta do Instagram precisa estar configurada como Profissional (Criador de Conteúdo ou Empresa).',
        'Sua conta precisa estar vinculada a uma Página pública do Facebook gerida por você.',
        'Clique no botão "Gerenciar / Reconectar" abaixo, faça login com seu Facebook e marque a caixa autorizando o acesso às métricas e publicação de fotos/vídeos.',
        'Após a confirmação da Meta, seu perfil aparecerá com o selo verde de conectado!'
      ]
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API / Atendimento',
      icon: MessageSquare,
      color: 'from-green-500 to-emerald-600',
      status: 'connected',
      handle: '+55 (11) 98888-0000',
      expiresIn: 'Sessão Ativa (QR Code)',
      tutorialTitle: 'Como conectar o WhatsApp via QR Code ou Meta Cloud API',
      steps: [
        'Abra o aplicativo WhatsApp ou WhatsApp Business no celular oficial do seu negócio.',
        'Toque em "Configurações" (no iPhone) ou no menu dos 3 pontinhos > "Aparelhos Conectados" (no Android).',
        'Toque em "Conectar um aparelho" e aponte a câmera do celular para o QR Code gerado pelo nosso painel ao clicar em Conectar.',
        'Pronto! Agora suas mensagens de atendimento chegarão diretamente na aba "Social Inbox" e você poderá disparar lembretes e avisos automatizados!'
      ]
    },
    {
      id: 'youtube',
      name: 'YouTube & YouTube Shorts',
      icon: Youtube,
      color: 'from-red-600 to-red-700',
      status: 'connected',
      handle: 'Canal Oficial da Marca',
      expiresIn: '89 dias',
      tutorialTitle: 'Como vincular seu Canal do YouTube (Google OAuth)',
      steps: [
        'Clique em "Conectar Canal do YouTube". Uma janela segura do Google será aberta.',
        'Selecione a conta do Google/Gmail que administra o canal (Marca ou Pessoal).',
        'Permita que o SocialHub faça upload de vídeos, Shorts e consulte as estatísticas (visualizações, curtidas e inscritos).',
        'Assim que confirmado, você poderá agendar seus Shorts diretamente com título, descrição e tags de SEO!'
      ]
    },
    {
      id: 'tiktok',
      name: 'TikTok Video Kit (Creator / Business)',
      icon: Video,
      color: 'from-gray-900 via-purple-950 to-black',
      status: 'disconnected',
      handle: 'Não conectado',
      expiresIn: null,
      tutorialTitle: 'Como autorizar postagens automatizadas no TikTok',
      steps: [
        'No seu navegador ou celular, esteja logado na conta do TikTok onde deseja fazer as publicações.',
        'Clique no botão "Conectar TikTok" em nosso painel. Você será redirecionado para a página de autorização oficial do TikTok.',
        'Autorize a permissão "video.publish" (para envio de vídeos) e "user.info.basic" (para leitura de foto de perfil e seguidores).',
        'Retorne ao SocialHub e comece a agendar cortes virais e vídeos verticais com sons em alta!'
      ]
    },
    {
      id: 'spotify',
      name: 'Spotify for Podcasters & Músicas',
      icon: Music,
      color: 'from-[#1DB954] to-emerald-700',
      status: 'disconnected',
      handle: 'Não conectado',
      expiresIn: null,
      tutorialTitle: 'Como vincular seus Podcasts ou Lançamentos no Spotify',
      steps: [
        'Ideal para criadores, selos musicais e agências de artistas que gerenciam álbuns, playlists e podcasts.',
        'Clique em "Conectar Spotify". Na janela da Spotify Web API, faça login com sua conta de artista ou produtor.',
        'Autorize a leitura dos seus catálogos e libere a automação de links em Show Notes.',
        'Aproveite a nossa pré-visualização interativa estilo player de música na hora de agendar seus lançamentos!'
      ]
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Company Page / Perfil',
      icon: Linkedin,
      color: 'from-[#0A66C2] to-blue-700',
      status: 'connected',
      handle: 'LinkedIn da Empresa',
      expiresIn: '45 dias',
      tutorialTitle: 'Como conectar a Página de Empresa do LinkedIn',
      steps: [
        'Você deve ser Administrador (Super Admin) da Company Page no LinkedIn.',
        'Clique em "Conectar LinkedIn", faça login e conceda as permissões corporativas.',
        'O sistema vinculará sua página institucional, permitindo publicar artigos, fotos de equipe e anúncios de vagas com formatação profissional.'
      ]
    },
    {
      id: 'facebook',
      name: 'Facebook Página Comercial',
      icon: Facebook,
      color: 'from-blue-600 to-indigo-700',
      status: 'connected',
      handle: 'Página no Facebook',
      expiresIn: '58 dias',
      tutorialTitle: 'Conexão Integrada com Facebook Pages',
      steps: [
        'Geralmente é conectado de forma automática junto com o seu Instagram Business.',
        'Caso queira gerenciar páginas separadas, clique em "Conectar Facebook Page" e selecione as páginas que sua agência administra na Meta.'
      ]
    }
  ];

  const handleSimulateConnection = (net) => {
    setConnectingNetwork(net);
    if (net.id === 'whatsapp') {
      setQrCodeModal(true);
    } else {
      alert(`⚡ Simulação de Autenticação OAuth aberta para: ${net.name}\n\nEm ambiente de produção, este botão abre o pop-up seguro oficial da plataforma (Meta, Google, TikTok ou Spotify) para o usuário dar autorização com 1 clique!`);
    }
  };

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300 pb-20">
      {/* Header Central */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] text-white shadow-lg shadow-[#F26526]/20">
              <Share2 className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Canais Conectados & Tutoriais de Integração
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Gerencie as redes sociais da marca ativa (**{activeBrand?.name || 'Sua Empresa'}**). Conecte novos perfis, verifique a validade dos tokens de segurança e consulte nossos tutoriais rápidos passo a passo.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
          <div className="text-left">
            <p className="text-[11px] font-extrabold text-gray-800">5 de 7 Canais Ativos</p>
            <p className="text-[10px] text-gray-400">Tokens criptografados via Supabase</p>
          </div>
        </div>
      </div>

      {/* Grid de Redes Sociais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {networks.map((net) => {
          const Icon = net.icon;
          const isConnected = net.status === 'connected';
          const isOpenTutorial = openTutorial === net.id;

          return (
            <div 
              key={net.id} 
              className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                isConnected ? 'border-gray-200 shadow-lg hover:shadow-xl' : 'border-dashed border-gray-300 opacity-90 bg-gray-50/50'
              }`}
            >
              <div>
                {/* Header do Card com Cor Institucional */}
                <div className={`p-5 bg-gradient-to-r ${net.color} text-white flex items-center justify-between`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight leading-tight">{net.name}</h3>
                      <span className="text-[11px] text-white/80 font-mono flex items-center gap-1 mt-0.5">
                        {isConnected ? `🟢 ${net.handle}` : '⚪ Desconectado'}
                      </span>
                    </div>
                  </div>

                  {isConnected && (
                    <span className="px-2.5 py-1 rounded-full bg-white text-gray-900 text-[10px] font-extrabold uppercase shadow-sm">
                      Ativo
                    </span>
                  )}
                </div>

                {/* Status e Detalhes de Conexão */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 border-b border-gray-100 pb-3">
                    <span className="font-medium flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-gray-400" /> Validade do Token:
                    </span>
                    <span className={`font-extrabold ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                      {isConnected ? net.expiresIn : 'Nenhum token'}
                    </span>
                  </div>

                  {/* Botão Principal de Conexão */}
                  <button
                    onClick={() => handleSimulateConnection(net)}
                    className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isConnected 
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                        : 'bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white shadow-[#F26526]/20 shadow-md'
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reconectar / Atualizar Permissão</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Conectar Agora (+ 1 clique)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Botão e Acordeão de Tutorial Passo a Passo */}
              <div className="border-t border-gray-100 bg-gray-50/80">
                <button
                  onClick={() => setOpenTutorial(isOpenTutorial ? null : net.id)}
                  className="w-full p-3.5 px-5 flex items-center justify-between text-xs font-bold text-gray-700 hover:text-[#1A73E8] transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#1A73E8]" />
                    Como conectar {net.name.split(' ')[0]}?
                  </span>
                  {isOpenTutorial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isOpenTutorial && (
                  <div className="p-5 pt-2 text-xs text-gray-600 space-y-2.5 bg-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                    <h4 className="font-extrabold text-gray-800 text-[11px] uppercase tracking-wider text-[#F26526]">
                      📖 Passo a Passo Didático:
                    </h4>
                    <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                      {net.steps.map((step, idx) => (
                        <li key={idx} className="pl-1">
                          {step}
                        </li>
                      ))}
                    </ol>
                    <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2 mt-3">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>Dica Pro:</strong> Todas as conexões utilizam o protocolo OAuth 2.0 oficial ou chaves seguras do Supabase, sem nunca ter acesso direto às senhas dos seus usuários.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção Banner Ajuda Central */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-3xl p-8 text-white shadow-2xl border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="px-3 py-1 rounded-full bg-[#F26526]/20 text-[#F26526] text-xs font-extrabold border border-[#F26526]/30 uppercase tracking-wider inline-block">
            Suporte para Agências & Clientes
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">
            Seu cliente final está com dificuldades para conectar?
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Você pode enviar o nosso **Link de Convite de Conexão (White-Label)** direto para o WhatsApp do cliente. Ele clica, autoriza o Instagram ou WhatsApp dele no celular e a conta aparece conectada aqui na sua agência magicamente!
          </p>
        </div>

        <button
          onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/conectar-cliente/token-sec-999`);
            alert('✨ Link de Convite White-Label copiado!\n\nEnvie para o WhatsApp ou e-mail do seu cliente. Quando ele abrir, verá uma tela simplificada apenas para autorizar as redes da marca dele sem precisar entrar no painel da agência.');
          }}
          className="px-6 py-3.5 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-[#F26526]/30 transition-all shrink-0 flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>Copiar Link de Convite para o Cliente</span>
        </button>
      </div>

      {/* Modal Simulador de QR Code para WhatsApp */}
      {qrCodeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-gray-200 text-center space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-7 h-7 animate-pulse" />
            </div>
            
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Conectar WhatsApp via QR Code</h3>
              <p className="text-xs text-gray-500 mt-1">
                Escaneie com o celular oficial da empresa em **Aparelhos Conectados**.
              </p>
            </div>

            {/* Imagem Simulada QR Code */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 inline-block mx-auto shadow-inner">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SocialHub-WhatsApp-Connect-Demo-Token-9988&color=075E54" 
                alt="QR Code WhatsApp" 
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>O QR Code é renovado a cada 45 segundos por segurança. Mantenha a tela do celular ligada durante o escaneamento.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setQrCodeModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setQrCodeModal(false);
                  alert('🎉 Sucesso! WhatsApp conectado à sua instância com sucesso!');
                }}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-green-500/25 transition-all"
              >
                Já Escaneei (Confirmar)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
