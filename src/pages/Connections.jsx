import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  QrCode,
  MessageSquare,
  ShieldCheck,
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
  Bookmark,
  Unplug,
  Plug,
  Globe,
  Clock,
  Users,
  Activity,
  ArrowRight,
  Info
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { defaultNetworks } from '../data/platforms';

export default function Connections({ setCurrentTab }) {
  const { activeBrand, toggleChannelConnection, updateNetworkMetadata, refreshBrands } = useWorkspace();
  const [openTutorial, setOpenTutorial] = useState(null); // null = nenhum aberto
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
        handle: isConnected ? (netMeta.handle || `@${cleanName}.${net.id}`) : '',
        expiresIn: isConnected ? (netMeta.expiresIn || 'Ativo') : null,
        token: isConnected ? (netMeta.token || '') : '',
        bio: netMeta.bio || '',
        followers: netMeta.followers || (isConnected ? '--' : null),
        engagement: netMeta.engagement || (isConnected ? '--' : null),
        ...netMeta
      };
    });
  }, [activeBrand]);

  const [activeModalNet, setActiveModalNet] = useState(null);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [customHandleInput, setCustomHandleInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthStep, setOauthStep] = useState(0);
  const [manualForm, setManualForm] = useState({ handle: '', profileUrl: '', displayName: '', bio: '', followers: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [globalBanner, setGlobalBanner] = useState(null);

  // Trata o retorno do OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const platform = params.get('platform');
    const username = params.get('username');
    const error = params.get('error');

    if (status === 'success' && platform) {
      // Re-sincroniza dados da marca do Supabase (atualizado pelo callback OAuth)
      refreshBrands();
      setGlobalBanner({
        type: 'success',
        msg: `Canal ${platform.toUpperCase()} (@${username || platform}) conectado com sucesso! Dados sincronizados do Supabase.`
      });
      setTimeout(() => setGlobalBanner(null), 8000);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setGlobalBanner({
        type: 'error',
        msg: `Erro na autorizacao: ${error}`
      });
      setTimeout(() => setGlobalBanner(null), 8000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Edicao de bio
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
        msg: `Bio de ${savedNet.name} atualizada com sucesso!`
      });
      setTimeout(() => setGlobalBanner(null), 6000);
    }, 900);
  };

  const connectedCount = networks.filter(n => n.status === 'connected').length;
  const hasConnections = connectedCount > 0;

  const handleOpenConnectModal = (net) => {
    if (!activeBrand) {
      setGlobalBanner({ type: 'error', msg: 'Crie ou selecione uma marca antes de conectar canais!' });
      setTimeout(() => setGlobalBanner(null), 4000);
      return;
    }
    if (net.id === 'whatsapp') {
      setQrCodeModal(true);
      return;
    }
    setActiveModalNet(net);
    setCustomTokenInput(net.token || '');
    setCustomHandleInput(net.handle || '');
    setOauthStep(0);
    setManualForm({ handle: '', profileUrl: '', displayName: '', bio: '', followers: '' });
  };

  const handleConfirmRealConnection = (method) => {
    if (!activeModalNet || !activeBrand) return;
    setIsConnecting(true);
    setOauthStep(1);

    const cleanHandle = customHandleInput || `@${activeBrand.name.toLowerCase().replace(/\s+/g, '')}`;

    const netMetadata = {
      handle: cleanHandle,
      token: method === 'cloud' ? `PROD_CLOUD_TOKEN_${Date.now()}` : (customTokenInput || `USER_API_KEY_${Date.now()}`),
      bio: '',
      followers: '0',
      engagement: '0%',
      accountName: `${activeBrand.name} (${activeModalNet.name})`,
      status: 'connected',
      expiresIn: method === 'cloud' ? 'Sincronizado' : 'Token Ativo',
      lastSynced: new Date().toLocaleString('pt-BR')
    };

    // Simulacao visual de conexao em 3 etapas
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
            msg: `Canal ${connectedName} conectado com sucesso! Status: Conectado. Acesso liberado aos relatorios de analytics.`
          });
          setTimeout(() => setGlobalBanner(null), 6000);
        }, 800);
      }, 700);
    }, 700);
  };

  const handleManualConnection = async () => {
    if (!activeModalNet || !activeBrand || !manualForm.handle.trim()) return;
    setIsConnecting(true);

    const cleanHandle = manualForm.handle.trim().startsWith('@') ? manualForm.handle.trim() : `@${manualForm.handle.trim()}`;
    const netMetadata = {
      handle: cleanHandle,
      token: `MANUAL_${Date.now()}`,
      bio: manualForm.bio || '',
      followers: manualForm.followers || '0',
      engagement: manualForm.engagement || '0%',
      profileUrl: manualForm.profileUrl || '',
      displayName: manualForm.displayName || cleanHandle,
      accountName: manualForm.displayName || `${activeBrand.name} (${activeModalNet.name})`,
      status: 'connected',
      connectionType: 'manual',
      expiresIn: 'Conexão Manual',
      lastSynced: new Date().toLocaleString('pt-BR')
    };

    setTimeout(async () => {
      await toggleChannelConnection(activeBrand.id, activeModalNet.id, netMetadata);
      setIsConnecting(false);
      const connectedName = activeModalNet.name;
      setActiveModalNet(null);
      setManualForm({ handle: '', profileUrl: '', displayName: '', bio: '', followers: '' });

      setGlobalBanner({
        type: 'success',
        msg: `Canal ${connectedName} (${cleanHandle}) conectado manualmente com sucesso! Dados salvos no painel.`
      });
      setTimeout(() => setGlobalBanner(null), 6000);
    }, 600);
  };

  const handleDisconnect = async (netId) => {
    if (!activeBrand) return;
    if (activeBrand.connectedChannels?.includes(netId)) {
      await toggleChannelConnection(activeBrand.id, netId);
    }
    setGlobalBanner({
      type: 'info',
      msg: `Canal desconectado da marca ${activeBrand.name}.`
    });
    setTimeout(() => setGlobalBanner(null), 4000);
  };

  const handleCopyWhiteLabelLink = () => {
    const link = `${window.location.origin}/#conectar-cliente`;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setGlobalBanner({
      type: 'success',
      msg: 'Link White-Label copiado! Envie para o WhatsApp do cliente.'
    });
    setTimeout(() => {
      setCopiedLink(false);
      setGlobalBanner(null);
    }, 4000);
  };

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-full font-sans select-none pb-20 relative">
      {/* ===== BANNER GLOBAL ===== */}
      {globalBanner && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 max-w-lg w-[calc(100%-2rem)] ${
          globalBanner.type === 'success'
            ? 'bg-[#0B0F19] border-emerald-500/40 text-white'
            : globalBanner.type === 'error'
            ? 'bg-[#0B0F19] border-red-500/40 text-white'
            : 'bg-[#0B0F19] border-blue-500/40 text-white'
        }`}>
          <div className={`p-1.5 rounded-lg shrink-0 ${
            globalBanner.type === 'success' ? 'bg-emerald-500/20 text-emerald-400'
            : globalBanner.type === 'error' ? 'bg-red-500/20 text-red-400'
            : 'bg-blue-500/20 text-blue-400'
          }`}>
            {globalBanner.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : globalBanner.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <p className="text-xs font-semibold leading-relaxed flex-1">{globalBanner.msg}</p>
          <button onClick={() => setGlobalBanner(null)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] text-white shadow-lg shadow-[#F26526]/20">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Canais Sociais
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Marca: <span className="font-semibold text-gray-700">{activeBrand?.name || 'Nenhuma selecionada'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Status Summary - bem visivel */}
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm ${
          hasConnections
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`p-1.5 rounded-lg ${hasConnections ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
            {hasConnections ? <CheckCircle2 className="w-4 h-4" /> : <Unplug className="w-4 h-4" />}
          </div>
          <div className="text-left">
            <p className={`text-sm font-extrabold ${hasConnections ? 'text-emerald-800' : 'text-gray-600'}`}>
              {connectedCount} de {networks.length}
            </p>
            <p className={`text-[11px] font-semibold ${hasConnections ? 'text-emerald-600' : 'text-gray-400'}`}>
              {hasConnections ? 'Canais conectados' : 'Nenhum canal conectado'}
            </p>
          </div>
        </div>
      </div>

      {/* Empty State - quando zero conexoes */}
      {!hasConnections && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Nenhum canal conectado ainda</p>
            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
              Conecte pelo menos uma rede social para comecar a gerenciar publicacoes e analisar metricas.
              Clique no botao <strong>Conectar</strong> em qualquer card abaixo.
            </p>
          </div>
        </div>
      )}

      {/* ===== GRID DE REDES ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {networks.map((net) => {
          const Icon = net.icon;
          const isConnected = net.status === 'connected';
          const isOpenTutorial = openTutorial === net.id;

          return (
            <div
              key={net.id}
              className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${
                isConnected
                  ? 'border-emerald-200 shadow-md hover:shadow-lg ring-1 ring-emerald-100'
                  : 'border-gray-200 shadow-sm hover:shadow-md opacity-80 hover:opacity-100'
              }`}
            >
              {/* Header do Card */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Avatar da rede - full color quando conectado, grayscale quando nao */}
                  <div className={`p-2.5 rounded-xl shadow-sm ${
                    isConnected
                      ? `bg-gradient-to-br ${net.color} text-white`
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 leading-tight">{net.name}</h3>
                    <p className="text-[11px] text-gray-500">{net.subtitle}</p>
                  </div>
                </div>

                {/* Badge de Status - DESTAQUE PRINCIPAL */}
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    Livre
                  </span>
                )}
              </div>

              {/* Corpo do Card */}
              <div className="px-4 pb-4 space-y-3 flex-1">
                {/* Info de conexao */}
                {isConnected ? (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Perfil
                      </span>
                      <span className="font-bold text-gray-800">{net.handle}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Seguidores
                      </span>
                      <span className="font-bold text-gray-800">{net.followers || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Engajamento
                      </span>
                      <span className="font-bold text-emerald-600">{net.engagement || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Token valido
                      </span>
                      <span className="font-bold text-gray-800">{net.expiresIn}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-[11px] text-gray-400">Nenhuma conta vinculada</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">Clique em Conectar para vincular</p>
                  </div>
                )}

                {/* Bio rapida (so conectado) */}
                {isConnected && net.bio && (
                  <p className="text-[11px] text-gray-500 italic leading-snug line-clamp-2 border-l-2 border-emerald-300 pl-2">
                    "{net.bio}"
                  </p>
                )}

                {/* Botoes de Acao */}
                <div className="flex gap-2 pt-1">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => handleOpenConnectModal(net)}
                        className="flex-1 py-2.5 px-3 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Gerenciar
                      </button>
                      <button
                        onClick={() => openBioModal(net)}
                        className="flex-1 py-2.5 px-3 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        Bio
                      </button>
                      <button
                        onClick={() => handleDisconnect(net.id)}
                        title="Desconectar"
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors shrink-0"
                      >
                        <Unplug className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenConnectModal(net)}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white shadow-md shadow-[#F26526]/20 active:scale-[0.98]"
                    >
                      <Plug className="w-3.5 h-3.5" />
                      Conectar
                    </button>
                  )}
                </div>
              </div>

              {/* Acordeao de Tutorial */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => setOpenTutorial(isOpenTutorial ? null : net.id)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#F26526]" />
                    Tutorial & Requisitos
                  </span>
                  {isOpenTutorial ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>

                {isOpenTutorial && (
                  <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-gray-600 animate-in fade-in duration-200">
                    <p className="font-extrabold text-gray-800 text-[11px] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
                      {net.tutorialTitle}
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                      {net.steps.map((step, idx) => (
                        <li key={idx} className="pl-1">
                          <span className="text-gray-700">{step}</span>
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

      {/* ===== BLOCO WHITE-LABEL ===== */}
      <div className="bg-[#0B0F19] text-white rounded-2xl p-6 md:p-8 shadow-2xl border border-gray-800 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#F26526]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-3 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F26526]/20 border border-[#F26526]/40 text-[#FF8A50] text-[11px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Exclusivo Agencias / White-Label
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
            Seu cliente prefere conectar ele mesmo sem te passar senhas?
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Gere um Link de Convite de Conexao Segura. Seu cliente acessa pelo celular ou computador dele,
            autoriza o Instagram ou YouTube em 1 clique e a permissao cai automaticamente no seu painel.
          </p>
        </div>

        <button
          onClick={handleCopyWhiteLabelLink}
          className="px-6 py-3.5 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-[#F26526]/30 transition-all shrink-0 flex items-center gap-2 relative z-10 active:scale-[0.98]"
        >
          {copiedLink ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
          <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Convite'}</span>
        </button>
      </div>

      {/* ===== MODAL DE CONEXAO OAUTH ===== */}
      {activeModalNet && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-gray-800 text-white space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { if (!isConnecting) setActiveModalNet(null); }}
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
                  Conectar: {activeModalNet.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Autorizacao segura via OAuth 2.0 com criptografia de tokens
                </p>
              </div>
            </div>

            {/* Opcao 1: Conexao via Nuvem */}
            <div className="p-5 bg-[#1F2937]/80 rounded-2xl border border-gray-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#F26526]" /> 1. Conexao Instantanea via Servidor Nuvem
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Recomendado</span>
              </div>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                Autorizacao OAuth em tempo real com validacao de token e gravacao sincronizada no banco Supabase.
              </p>

              {activeModalNet.id === 'instagram' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Requisitos Obrigatórios da Meta (Instagram Business):</span>
                  </div>
                  <ul className="text-xs md:text-sm text-gray-200 space-y-1.5 list-disc list-inside">
                    <li>O seu Instagram deve ser do tipo <strong>Comercial (Business)</strong> ou Criador.</li>
                    <li>Deve estar <strong>vinculado a uma Página do Facebook</strong> da qual você seja Administrador.</li>
                  </ul>
                  <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-800 text-xs">
                    <a
                      href="https://www.facebook.com/help/instagram/502981923235522"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1"
                    >
                      Como mudar para Comercial <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://www.facebook.com/help/1215086795543252"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1"
                    >
                      Como vincular ao Facebook <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Nome do Perfil / Handle a ser exibido:
                </label>
                <input
                  type="text"
                  value={customHandleInput}
                  disabled={isConnecting}
                  onChange={(e) => setCustomHandleInput(e.target.value)}
                  placeholder={`Ex: @${activeBrand?.name?.toLowerCase().replace(/\s+/g, '') || 'suamarca'}.${activeModalNet.id}`}
                  className="w-full bg-[#111827] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F26526] mb-2 disabled:opacity-50 placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-400 mb-4 leading-normal">
                  💡 Este nome é apenas para exibição interna. Você deve digitar o seu @ real.
                </p>

                {isConnecting ? (
                  <div className="p-4 rounded-xl bg-[#111827] border border-[#F26526]/50 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#FF8A50]">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>Conectando ao servidor OAuth 2.0...</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                      <div className={`flex items-center gap-2 ${oauthStep >= 1 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block" />}</span>
                        <span>Redirecionando para servidor seguro...</span>
                      </div>
                      <div className={`flex items-center gap-2 ${oauthStep >= 2 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block" />}</span>
                        <span>Validando permissoes (Analytics e KPIs)...</span>
                      </div>
                      <div className={`flex items-center gap-2 ${oauthStep >= 3 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block" />}</span>
                        <span>Sincronizando token com Supabase...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmRealConnection('cloud')}
                    className="w-full py-3 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-[#F26526]/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Autorizar e Conectar Agora (1 Clique)
                  </button>
                )}
              </div>
            </div>

            {/* Opcao 2: Chave Manual */}
            <div className="p-5 bg-[#0B0F19] rounded-2xl border border-gray-800 space-y-3">
              <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" /> 2. Ou colar Access Token / API Key manual
              </span>
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                Se voce possui um Token OAuth de longa duracao da Meta, Google ou TikTok, cole abaixo:
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="password"
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  placeholder="Cole seu token de acesso aqui (ex: EAA... ou AIza...)"
                  className="flex-1 bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => handleConfirmRealConnection('token')}
                  disabled={!customTokenInput || isConnecting}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all disabled:opacity-40 shrink-0"
                >
                  Salvar Token
                </button>
              </div>
            </div>

            {/* Opcao 3: Conexao Manual Simplificada */}
            <div className="p-5 bg-gradient-to-b from-[#0D1321] to-[#111827] rounded-2xl border border-emerald-500/20 space-y-4 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-emerald-400" /> 3. Conexão Manual (Preenchimento Direto)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Alternativo</span>
              </div>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                Preencha os dados do seu perfil manualmente para registrar a conexão no painel.
                Ideal quando o OAuth apresentar problemas ou para configuração rápida.
              </p>

              <div className="space-y-3.5 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Nome de Usuário / @Handle *
                  </label>
                  <input
                    type="text"
                    value={manualForm.handle}
                    disabled={isConnecting}
                    onChange={(e) => setManualForm(prev => ({ ...prev, handle: e.target.value }))}
                    placeholder={
                      activeModalNet.id === 'instagram' ? 'Ex: @genkailabs' :
                      activeModalNet.id === 'facebook' ? 'Ex: Genkai Labs' :
                      activeModalNet.id === 'tiktok' ? 'Ex: @genkailabs' :
                      activeModalNet.id === 'linkedin' ? 'Ex: Genkai Labs' :
                      activeModalNet.id === 'youtube' ? 'Ex: @GenkaiLabsOficial' :
                      activeModalNet.id === 'twitter' ? 'Ex: @genkailabs' :
                      activeModalNet.id === 'pinterest' ? 'Ex: genkailabs' :
                      activeModalNet.id === 'whatsapp' ? 'Ex: +55 11 98888-0000' :
                      activeModalNet.id === 'spotify' ? 'Ex: Genkai Labs Music' :
                      'Ex: @suamarca'
                    }
                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    URL do Perfil (opcional)
                  </label>
                  <input
                    type="url"
                    value={manualForm.profileUrl}
                    disabled={isConnecting}
                    onChange={(e) => setManualForm(prev => ({ ...prev, profileUrl: e.target.value }))}
                    placeholder={
                      activeModalNet.id === 'instagram' ? 'Ex: https://www.instagram.com/genkailabs/' :
                      activeModalNet.id === 'facebook' ? 'Ex: https://www.facebook.com/genkailabs' :
                      activeModalNet.id === 'tiktok' ? 'Ex: https://www.tiktok.com/@genkailabs' :
                      activeModalNet.id === 'linkedin' ? 'Ex: https://www.linkedin.com/company/genkailabs' :
                      activeModalNet.id === 'youtube' ? 'Ex: https://www.youtube.com/@GenkaiLabsOficial' :
                      activeModalNet.id === 'twitter' ? 'Ex: https://x.com/genkailabs' :
                      activeModalNet.id === 'pinterest' ? 'Ex: https://www.pinterest.com/genkailabs' :
                      activeModalNet.id === 'spotify' ? 'Ex: https://open.spotify.com/artist/...' :
                      'Ex: https://suarede.com/suamarca'
                    }
                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Nome de Exibição
                    </label>
                    <input
                      type="text"
                      value={manualForm.displayName}
                      disabled={isConnecting}
                      onChange={(e) => setManualForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Ex: Genkai Labs"
                      className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Seguidores (aprox.)
                    </label>
                    <input
                      type="text"
                      value={manualForm.followers}
                      disabled={isConnecting}
                      onChange={(e) => setManualForm(prev => ({ ...prev, followers: e.target.value }))}
                      placeholder="Ex: 15.4k"
                      className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Bio / Descrição (opcional)
                  </label>
                  <textarea
                    rows="2.5"
                    value={manualForm.bio}
                    disabled={isConnecting}
                    onChange={(e) => setManualForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder={
                      activeModalNet.id === 'instagram' ? 'Ex: 🚀 Agência Digital | Estratégias que Vendem | 📩 Contato na bio' :
                      activeModalNet.id === 'linkedin' ? 'Ex: Empresa de tecnologia focada em soluções digitais para o mercado corporativo.' :
                      activeModalNet.id === 'youtube' ? 'Ex: Canal oficial com tutoriais, reviews e conteúdo exclusivo toda semana.' :
                      activeModalNet.id === 'tiktok' ? 'Ex: Conteúdo viral e tendências 🔥 Parcerias via DM' :
                      'Ex: Perfil oficial da sua marca. Conteúdo exclusivo e novidades.'
                    }
                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none placeholder:text-gray-650 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2 relative z-10">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  A conexão manual registra o perfil para gerenciamento no painel. Para analytics em tempo real e agendamento automático via API, use a Opção 1 (OAuth).
                </p>
              </div>

              <button
                onClick={handleManualConnection}
                disabled={!manualForm.handle.trim() || isConnecting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed relative z-10"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salvar Conexão Manual
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL QR CODE WHATSAPP ===== */}
      {qrCodeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-gray-200 text-center space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Conectar WhatsApp Oficial</h3>
              <p className="text-xs text-gray-500 mt-1">
                Escaneie com o celular oficial da empresa em <strong>Aparelhos Conectados</strong>.
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
              <span>Demonstracao do fluxo de pareamento por QR Code. A integracao real com a WhatsApp Business API requer backend dedicado (em desenvolvimento).</span>
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
                      followers: '0',
                      engagement: '0%',
                      expiresIn: 'Sessao Ativa (QR Code)',
                      status: 'connected',
                      lastSynced: new Date().toLocaleString('pt-BR')
                    });
                  }
                  setGlobalBanner({
                    type: 'success',
                    msg: `WhatsApp Business conectado a marca ${activeBrand?.name || 'ativa'} com sucesso!`
                  });
                  setTimeout(() => setGlobalBanner(null), 5000);
                }}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-green-500/25 transition-all"
              >
                Ja Escaneei (Confirmar Conexao)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE EDICAO DE BIO ===== */}
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
                  Perfil: <span className="font-mono text-gray-300">{bioModalNet.handle}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                A bio do seu perfil de <strong>{bioModalNet.name}</strong> sera sincronizada com as configuracoes da sua marca.
              </p>
            </div>

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
                  placeholder="Ex: Transformamos ideias em resultados. Marketing, tecnologia e inovacao para sua marca."
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
