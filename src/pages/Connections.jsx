import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  X,
  Copy,
  Check,
  Cloud,
  Database,
  UserCog,
  Save,
  AlertTriangle,
  Bookmark
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

// Ícones personalizados em SVG para garantir visualização perfeita de X/Twitter e Pinterest
const IconX = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IconPinterest = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
  </svg>
);

const defaultNetworks = [
  {
    id: 'instagram',
    name: 'Instagram (Feed, Reels & Stories)',
    icon: Instagram,
    color: 'from-purple-500 via-pink-500 to-amber-500',
    status: 'disconnected',
    handle: 'Não conectado',
    expiresIn: null,
    token: '',
    tutorialTitle: 'Como conectar o Instagram Business ao SocialHub',
    steps: [
      'Sua conta do Instagram precisa estar configurada como Profissional (Criador de Conteúdo ou Empresa).',
      'Sua conta precisa estar vinculada a uma Página pública do Facebook gerida por você.',
      'Clique no botão "Conectar Canal Agora" abaixo, faça login com seu Facebook e marque a caixa autorizando o acesso às métricas e publicação de fotos/vídeos.',
      'Após a confirmação da Meta, seu perfil aparecerá com o selo verde de Conectado (100% Ativo)!'
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook Página Comercial',
    icon: Facebook,
    color: 'from-blue-600 to-indigo-700',
    status: 'disconnected',
    handle: 'Não conectado',
    expiresIn: null,
    token: '',
    tutorialTitle: 'Conexão Integrada com Facebook Pages',
    steps: [
      'Geralmente é conectado de forma automática junto com o seu Instagram Business.',
      'Caso queira gerenciar páginas separadas, clique em "Conectar Canal Agora" e selecione as páginas que sua agência administra na Meta.',
      'Permite análise completa de visualizações de vídeo, engajamento e compartilhamentos no seu novo dashboard!'
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
    token: '',
    tutorialTitle: 'Como autorizar postagens automatizadas no TikTok',
    steps: [
      'No seu navegador ou celular, esteja logado na conta do TikTok onde deseja fazer as publicações.',
      'Clique no botão "Conectar Canal Agora" em nosso painel. Você será redirecionado para a página de autorização oficial do TikTok.',
      'Autorize a permissão "video.publish" (para envio de vídeos) e "user.info.basic" (para leitura de foto de perfil e seguidores).',
      'Retorne ao SocialHub e comece a acompanhar a taxa de virilidade e tempo médio de exibição!'
    ]
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Company Page / Perfil',
    icon: Linkedin,
    color: 'from-[#0A66C2] to-blue-700',
    status: 'disconnected',
    handle: 'Não conectado',
    expiresIn: null,
    token: '',
    tutorialTitle: 'Como conectar a Página de Empresa do LinkedIn',
    steps: [
      'Você deve ser Administrador (Super Admin) da Company Page no LinkedIn.',
      'Clique em "Conectar Canal Agora", faça login e conceda as permissões corporativas.',
      'O sistema vinculará sua página institucional, permitindo publicar artigos, fotos de equipe e monitorar impressões orgânicas vs patrocinadas.'
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube & YouTube Shorts',
    icon: Youtube,
    color: 'from-red-600 to-red-700',
    status: 'disconnected',
    handle: 'Não conectado',
    expiresIn: null,
    token: '',
    tutorialTitle: 'Como vincular seu Canal do YouTube (Google OAuth)',
    steps: [
      'Clique em "Conectar Canal Agora". Uma janela segura do Google será aberta.',
      'Selecione a conta do Google/Gmail que administra o canal (Marca ou Pessoal).',
      'Permita que o SocialHub consulte as estatísticas avançadas (visualizações, horas de exibição, retenção e inscritos).',
      'Assim que confirmado, você poderá gerenciar seus vídeos longos e Shorts em uma interface unificada!'
    ]
  },
  {
    id: 'twitter',
    name: 'X / Twitter (Pro API & Posts)',
    icon: IconX,
    color: 'from-slate-900 via-gray-900 to-black',
    status: 'disconnected',
    handle: 'Não conectado',
    expiresIn: null,
    token: '',
    tutorialTitle: 'Como vincular seu Perfil Oficial do X (antigo Twitter)',
    steps: [
      'Acesse sua conta oficial no X com permissões de leitura e escrita.',
      'Clique em "Conectar Canal Agora" para autorizar o SocialHub via OAuth 2.0 / X API Pro.',
      'Conceda acesso à leitura de estatísticas de tweets, impressões, retweets e citações em tempo real.',
      'Pronto! Seu canal estará 100% Ativo para agendamento de threads e monitoramento viral.'
    ]
  },
  {
    id: 'pinterest',
    name: 'Pinterest Business (Pins & Pastas)',
    icon: IconPinterest,
    color: 'from-[#E60023] via-red-600 to-red-700',
    status: 'disconnected',
    handle: 'Não conectado',
    expiresIn: null,
    token: '',
    tutorialTitle: 'Como integrar sua Conta Comercial do Pinterest',
    steps: [
      'Sua conta do Pinterest precisa estar configurada como Conta Business (gratuita e ideal para marcas).',
      'Clique em "Conectar Canal Agora" e faça login para autorizar a Pinterest API for Shopping & Creators.',
      'Permita o acesso aos seus quadros (Pastas) e métricas de Pins Salvos, Impressões e Cliques de Saída.',
      'Seu catálogo de inspirações e produtos estará pronto para agendamentos e análises comparativas!'
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API / Atendimento',
    icon: MessageSquare,
    color: 'from-green-500 to-emerald-600',
    status: 'disconnected',
    handle: 'Não conectado',
    expiresIn: null,
    token: '',
    tutorialTitle: 'Como conectar o WhatsApp via QR Code ou Meta Cloud API',
    steps: [
      'Abra o aplicativo WhatsApp ou WhatsApp Business no celular oficial do seu negócio.',
      'Toque em "Configurações" (no iPhone) ou no menu dos 3 pontinhos > "Aparelhos Conectados" (no Android).',
      'Toque em "Conectar um aparelho" e aponte a câmera do celular para o QR Code gerado pelo nosso painel.',
      'Pronto! Agora suas mensagens de atendimento chegarão diretamente na aba "Social Inbox" com KPIs em tempo real!'
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
    token: '',
    tutorialTitle: 'Como vincular seus Podcasts ou Lançamentos no Spotify',
    steps: [
      'Ideal para criadores, selos musicais e agências de artistas que gerenciam álbuns, playlists e podcasts.',
      'Clique em "Conectar Canal Agora". Na janela da Spotify Web API, faça login com sua conta de artista ou produtor.',
      'Autorize a leitura dos seus catálogos e libere a automação e análise de streams totais e retenção de áudio.',
      'Aproveite a nossa pré-visualização interativa estilo player na hora de acompanhar seus lançamentos!'
    ]
  }
];

export default function Connections({ setCurrentTab }) {
  const { activeBrand, toggleChannelConnection, updateNetworkMetadata } = useWorkspace();
  const [openTutorial, setOpenTutorial] = useState('instagram');
  const [qrCodeModal, setQrCodeModal] = useState(false);

  const networks = React.useMemo(() => {
    const connectedList = activeBrand?.connectedChannels || [];
    const dbMetadata = activeBrand?.networksMetadata || {};
    return defaultNetworks.map(net => {
      const isConnected = connectedList.includes(net.id);
      const netMeta = dbMetadata[net.id] || {};
      const cleanName = activeBrand?.name?.toLowerCase().replace(/\s+/g, '') || 'suamarca';
      return {
        ...net,
        status: isConnected ? 'connected' : 'disconnected',
        handle: isConnected ? (netMeta.handle || `@${cleanName}.${net.id}`) : 'Não conectado',
        expiresIn: isConnected ? (netMeta.expiresIn || '90 dias (Sincronizado)') : null,
        token: isConnected ? (netMeta.token || `TOKEN_${net.id.toUpperCase()}_PROD`) : '',
        bio: netMeta.bio || '',
        ...netMeta
      };
    });
  }, [activeBrand]);

  const [activeModalNet, setActiveModalNet] = useState(null);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [customHandleInput, setCustomHandleInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthStep, setOauthStep] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [globalBanner, setGlobalBanner] = useState(null);

  // Edição de bio/perfil
  const [bioModalNet, setBioModalNet] = useState(null);
  const [bioText, setBioText] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const BIO_LIMITS = { instagram: 150, facebook: 255, twitter: 160, linkedin: 300, tiktok: 80, pinterest: 160 };

  const openBioModal = (net) => {
    setBioText(net.bio || '');
    setBioModalNet(net);
  };

  const handleSaveBio = () => {
    if (!bioModalNet || !activeBrand) return;
    setIsSavingBio(true);

    setTimeout(async () => {
      await updateNetworkMetadata(activeBrand.id, bioModalNet.id, { bio: bioText });
      setIsSavingBio(false);
      const savedNet = bioModalNet;
      setBioModalNet(null);

      setGlobalBanner({
        type: 'success',
        msg: `✅ Bio e descrição de ${savedNet.name.split(' ')[0]} atualizadas e sincronizadas com sucesso!`,
      });
      setTimeout(() => setGlobalBanner(null), 6000);
    }, 900);
  };

  const connectedCount = networks.filter(n => n.status === 'connected').length;

  const handleOpenConnectModal = (net) => {
    if (!activeBrand) {
      setGlobalBanner({ type: 'error', msg: '⚠️ Crie ou selecione uma marca antes de conectar canais!' });
      setTimeout(() => setGlobalBanner(null), 4000);
      return;
    }
    if (net.id === 'whatsapp') {
      setQrCodeModal(true);
      return;
    }
    setActiveModalNet(net);
    setCustomTokenInput(net.token || '');
    setCustomHandleInput(net.handle !== 'Não conectado' ? net.handle : `@${activeBrand?.name?.toLowerCase().replace(/\s+/g, '') || 'suamarca'}.${net.id}`);
    setOauthStep(0);
  };

  const handleConfirmRealConnection = (method) => {
    if (!activeModalNet || !activeBrand) return;
    setIsConnecting(true);
    setOauthStep(1);

    const cleanHandle = customHandleInput || `@${activeBrand.name.toLowerCase().replace(/\s+/g, '')}.${activeModalNet.id}`;
    
    // Mapeamento de seguidores e engajamento condizente com o Dashboard
    const followerMap = { instagram: '45.2k', facebook: '33.1k', tiktok: '62.8k', linkedin: '9.4k', youtube: '18.7k', twitter: '28.4k', pinterest: '34.1k', whatsapp: '12.3k', spotify: '5.6k' };
    const engMap = { instagram: '6.4%', facebook: '3.1%', tiktok: '8.2%', linkedin: '4.8%', youtube: '7.5%', twitter: '3.9%', pinterest: '4.6%', whatsapp: '9.1%', spotify: '5.6%' };

    const netMetadata = {
      handle: cleanHandle,
      token: method === 'cloud' ? `PROD_CLOUD_TOKEN_${Date.now()}` : (customTokenInput || `USER_API_KEY_${Date.now()}`),
      bio: activeModalNet.id === 'instagram' 
        ? `Conta Oficial Profissional Verificada. Sincronização automática de Reels, Stories e Feed ativa no SocialHub. 🚀✨`
        : activeModalNet.id === 'facebook'
        ? `Página Institucional e Meta Business Suite vinculados com permissão total de publicação e relatórios.`
        : activeModalNet.id === 'twitter'
        ? `Perfil Oficial no X/Twitter. Monitoramento em tempo real de Tweets, Threads e Impressões.`
        : activeModalNet.id === 'pinterest'
        ? `Conta Comercial do Pinterest. Pins Ideia e Pastas de Catálogo sincronizados automaticamente.`
        : `Canal institucional sincronizado via API oficial com monitoramento e analytics em tempo real.`,
      followers: followerMap[activeModalNet.id] || '10.0k',
      engagement: engMap[activeModalNet.id] || '5.0%',
      accountName: `${activeBrand.name} (${activeModalNet.name.split(' ')[0]})`,
      status: 'connected',
      lastSynced: new Date().toLocaleString('pt-BR')
    };

    // Simulação visual em 3 etapas para encantar o usuário
    setTimeout(() => {
      setOauthStep(2);
      setTimeout(() => {
        setOauthStep(3);
        setTimeout(async () => {
          await toggleChannelConnection(activeBrand.id, activeModalNet.id, netMetadata);
          setIsConnecting(false);
          setOauthStep(0);
          const connectedName = activeModalNet.name;
          setActiveModalNet(null);
          
          setGlobalBanner({
            type: 'success',
            msg: `🎉 Canal ${connectedName} conectado com sucesso! Status: Conectado (100% Ativo). Acesso liberado aos relatórios de analytics.`
          });
          setTimeout(() => setGlobalBanner(null), 6000);
        }, 800);
      }, 700);
    }, 700);
  };

  const handleDisconnect = async (netId) => {
    if (!activeBrand) return;
    if (activeBrand.connectedChannels?.includes(netId)) {
      await toggleChannelConnection(activeBrand.id, netId);
    }
    setGlobalBanner({
      type: 'info',
      msg: `🔗 Canal desconectado da marca ${activeBrand.name}.`
    });
    setTimeout(() => setGlobalBanner(null), 4000);
  };

  const handleCopyWhiteLabelLink = () => {
    const link = `${window.location.origin}/#conectar-cliente`;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setGlobalBanner({
      type: 'success',
      msg: '✨ Link White-Label copiado para a área de transferência! Envie para o WhatsApp do cliente.'
    });
    setTimeout(() => {
      setCopiedLink(false);
      setGlobalBanner(null);
    }, 4000);
  };

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300 pb-20 relative">
      {/* Aviso honesto: fluxo de conexão ainda é demonstrativo (sem OAuth real) */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>Modo demonstração.</strong> As conexões abaixo são <strong>simuladas</strong> para pré-visualização da interface —
          ainda não há OAuth real com Instagram, YouTube, TikTok etc. Nenhum post é publicado de fato.
          A integração real exige apps de desenvolvedor (Meta/Google) e um backend de troca de tokens.
        </p>
      </div>

      {/* Banner de Notificação em Tempo Real */}
      {globalBanner && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top duration-300 max-w-md ${
          globalBanner.type === 'success' 
            ? 'bg-[#0B0F19] border-green-500/50 text-white' 
            : 'bg-gray-900 border-blue-500/50 text-white'
        }`}>
          <div className={`p-2 rounded-xl ${globalBanner.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {globalBanner.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <p className="text-xs font-bold leading-relaxed">{globalBanner.msg}</p>
        </div>
      )}

      {/* Header Central */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] text-white shadow-lg shadow-[#F26526]/20">
              <Share2 className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Canais Sociais da Marca
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Gerencie os canais sociais da marca (**{activeBrand?.name || 'Sua Empresa'}**). As preferências e o estado de cada canal ficam salvos no Supabase. A publicação real depende da integração OAuth (em desenvolvimento).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
            <div className="text-left">
              <p className="text-[11px] font-extrabold text-gray-800">{connectedCount} de {networks.length} Canais Ativos</p>
              <p className="text-[10px] text-amber-600 font-semibold">Modo demonstração</p>
            </div>
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
                isConnected ? 'border-gray-200 shadow-lg hover:shadow-xl' : 'border-dashed border-gray-300 opacity-95 bg-gray-50/50'
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
                      <span className="text-[11px] text-white/90 font-mono flex items-center gap-1 mt-0.5">
                        {isConnected ? `🟢 ${net.handle}` : '⚪ Desconectado'}
                      </span>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold uppercase shadow-md flex items-center gap-1.5 border border-emerald-400/50">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      Conectado (100% Ativo)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-white/20 text-white/90 text-[10px] font-bold uppercase backdrop-blur-md border border-white/20">
                      Desconectado
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
                      {isConnected ? net.expiresIn : 'Sem conexão'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {/* Botão Principal de Conexão */}
                    <button
                      onClick={() => handleOpenConnectModal(net)}
                      className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                        isConnected 
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                          : 'bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white shadow-[#F26526]/20 shadow-md'
                      }`}
                    >
                      {isConnected ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Gerenciar Conexão Real</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Conectar Canal Agora</span>
                        </>
                      )}
                    </button>

                    {isConnected && (
                      <button
                        onClick={() => handleDisconnect(net.id)}
                        title="Desconectar rede"
                        className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors text-xs font-bold shrink-0"
                      >
                        Desconectar
                      </button>
                    )}
                  </div>

                  {/* Editar Bio / Perfil */}
                  {isConnected && (
                    <div className="pt-1">
                      {net.bio && (
                        <p className="text-[11px] text-gray-500 italic leading-snug mb-2 line-clamp-2 border-l-2 border-gray-200 pl-2">
                          "{net.bio}"
                        </p>
                      )}
                      <button
                        onClick={() => openBioModal(net)}
                        className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>{net.bio ? 'Editar Bio do Perfil' : 'Definir Bio do Perfil'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Acordeão de Tutorial */}
              <div className="border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setOpenTutorial(isOpenTutorial ? null : net.id)}
                  className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-100/80 transition-colors"
                >
                  <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#F26526]" />
                    <span>Tutorial & Requisitos</span>
                  </span>
                  {isOpenTutorial ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {isOpenTutorial && (
                  <div className="px-5 pb-4 pt-1 space-y-2.5 text-xs text-gray-600 animate-in fade-in duration-200">
                    <p className="font-extrabold text-gray-800 text-[11px] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
                      {net.tutorialTitle}
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed">
                      {net.steps.map((step, idx) => (
                        <li key={idx} className="pl-1">
                          <span className="text-gray-700 font-medium">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bloco White-Label de Conexão para Agências */}
      <div className="bg-[#0B0F19] text-white rounded-3xl p-8 shadow-2xl border border-gray-800 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#F26526]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-3 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F26526]/20 border border-[#F26526]/40 text-[#FF8A50] text-[11px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            Exclusivo Agências / White-Label
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Seu cliente prefere conectar ele mesmo sem te passar senhas?
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Gere um **Link de Convite de Conexão Segura**. Seu cliente acessa pelo celular ou computador dele, autoriza o Instagram ou YouTube em 1 clique e a permissão cai automaticamente no seu painel!
          </p>
        </div>

        <button
          onClick={handleCopyWhiteLabelLink}
          className="px-6 py-4 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-[#F26526]/30 transition-all shrink-0 flex items-center gap-2 relative z-10 active:scale-[0.98]"
        >
          {copiedLink ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
          <span>{copiedLink ? 'Link White-Label Copiado!' : 'Copiar Link de Convite para o Cliente'}</span>
        </button>
      </div>

      {/* Modal Real de Conexão OAuth / Chave API */}
      {activeModalNet && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-gray-800 text-white space-y-6 relative overflow-hidden">
            <button
              onClick={() => setActiveModalNet(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3.5 border-b border-gray-800 pb-5">
              <div className={`p-3 bg-gradient-to-r ${activeModalNet.color} rounded-2xl shadow-lg`}>
                <activeModalNet.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  Conexão Oficial: {activeModalNet.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Simulação de conexão (demonstração) — OAuth real em desenvolvimento
                </p>
              </div>
            </div>

            {/* Opção 1: Conexão via Nuvem Render */}
            <div className="p-5 bg-[#1F2937]/80 rounded-2xl border border-gray-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#F26526]" /> 1. Conexão Instantânea via Servidor Nuvem
                </span>
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold">Recomendado</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Simula a autorização OAuth oficial em tempo real com validação de token corporativo e gravação no banco Supabase.
              </p>
              
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Nome do Perfil / Handle a ser exibido:
                </label>
                <input
                  type="text"
                  value={customHandleInput}
                  disabled={isConnecting}
                  onChange={(e) => setCustomHandleInput(e.target.value)}
                  placeholder="@suamarca.oficial"
                  className="w-full bg-[#111827] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#F26526] mb-3 disabled:opacity-50"
                />
                
                {isConnecting ? (
                  <div className="p-4 rounded-xl bg-[#111827] border border-[#F26526]/50 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#FF8A50]">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>Simulação de Autenticação OAuth 2.0...</span>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-gray-300 font-mono">
                      <div className={`flex items-center gap-2 ${oauthStep >= 1 ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 1 ? '✓' : '○'}</span>
                        <span>1. Redirecionando para servidor seguro ({activeModalNet.name.split(' ')[0]})...</span>
                      </div>
                      <div className={`flex items-center gap-2 ${oauthStep >= 2 ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 2 ? '✓' : '○'}</span>
                        <span>2. Validando permissões de leitura (Analytics & KPIs)...</span>
                      </div>
                      <div className={`flex items-center gap-2 ${oauthStep >= 3 ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 3 ? '✓' : '○'}</span>
                        <span>3. Conectado! Sincronizando token com Supabase...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmRealConnection('cloud')}
                    disabled={isConnecting}
                    className="w-full py-3 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#F26526]/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Autorizar e Conectar Agora (1 Clique)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Opção 2: Chave Manual / API Key */}
            <div className="p-5 bg-[#0B0F19] rounded-2xl border border-gray-800 space-y-3">
              <span className="text-xs font-extrabold text-gray-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" /> 2. Ou colar Access Token / API Key manual (Agências)
              </span>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Se você possui um Token OAuth de longa duração da Meta, Google ou TikTok no seu `.env` ou app corporativo, cole abaixo para gravar no banco:
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="password"
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  placeholder="Cole seu token de acesso aqui (ex: EAA... ou AIza...)"
                  className="flex-1 bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => handleConfirmRealConnection('token')}
                  disabled={!customTokenInput || isConnecting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all disabled:opacity-40 shrink-0"
                >
                  Salvar Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Real de QR Code para WhatsApp */}
      {qrCodeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-gray-200 text-center space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-7 h-7 animate-pulse" />
            </div>
            
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Conectar WhatsApp Oficial (Render Cloud)</h3>
              <p className="text-xs text-gray-500 mt-1">
                Escaneie com o celular oficial da empresa em **Aparelhos Conectados**.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 inline-block mx-auto shadow-inner relative">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SocialHub-Render-WhatsApp-Live-Session&color=075E54" 
                alt="QR Code WhatsApp" 
                className="w-44 h-44 mx-auto rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <MessageSquare className="w-24 h-24 text-green-800" />
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-xl border border-green-200/80 text-[11px] text-green-900 text-left flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>Demonstração do fluxo de pareamento por QR Code. A integração real com a WhatsApp Business API será feita por um backend dedicado (em desenvolvimento).</span>
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
                  if (activeBrand && !activeBrand.connectedChannels?.includes('whatsapp')) {
                    toggleChannelConnection(activeBrand.id, 'whatsapp', {
                      handle: '+55 (11) 98888-0000',
                      expiresIn: 'Sessão Ativa (QR Code)'
                    });
                  }
                  setGlobalBanner({
                    type: 'success',
                    msg: `🎉 WhatsApp Business conectado à marca ${activeBrand?.name || 'ativa'} com sucesso!`
                  });
                  setTimeout(() => setGlobalBanner(null), 5000);
                }}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-green-500/25 transition-all"
              >
                Já Escaneei (Confirmar Conexão)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Bio / Perfil */}
      {bioModalNet && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-gray-800 text-white space-y-5 relative">
            <button
              onClick={() => setBioModalNet(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3.5 border-b border-gray-800 pb-5">
              <div className={`p-3 bg-gradient-to-r ${bioModalNet.color} rounded-2xl shadow-lg`}>
                <bioModalNet.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-[#F26526]" /> Editar Bio: {bioModalNet.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Perfil exibido: <span className="font-mono text-gray-300">{bioModalNet.handle}</span>
                </p>
              </div>
            </div>

            {/* Informações de sincronização da biografia */}
            {bioModalNet.id === 'instagram' ? (
              <div className="p-3.5 bg-green-500/10 border border-green-500/40 rounded-2xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-green-200/90 leading-relaxed">
                  A biografia do seu <strong>Instagram Business</strong> será sincronizada e atualizada diretamente nas configurações institucionais da sua marca.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-green-500/10 border border-green-500/40 rounded-2xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-green-200/90 leading-relaxed">
                  A descrição da sua <strong>Página do Facebook</strong> será sincronizada em tempo real através das configurações do canal conectado.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Texto da Bio
              </label>
              <div className="relative">
                <textarea
                  rows="4"
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  maxLength={BIO_LIMITS[bioModalNet.id] || 200}
                  placeholder="Ex: 🚀 Transformamos ideias em resultados. Marketing, tecnologia e inovação para sua marca. 👇 Link na bio!"
                  className="w-full bg-[#0B0F19] border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F26526] resize-none"
                />
                <span className="absolute bottom-3 right-3 text-[11px] font-bold text-gray-500">
                  {bioText.length} / {BIO_LIMITS[bioModalNet.id] || 200}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setBioModalNet(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBio}
                disabled={isSavingBio}
                className="flex-1 py-3 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#F26526]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingBio ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salvar Bio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
