import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  ThumbsUp, 
  ThumbsDown,
  Share2, 
  Repeat, 
  Globe, 
  Instagram, 
  Linkedin,
  Facebook,
  Sparkles,
  CheckCircle2,
  Video,
  Music,
  MessageSquare,
  Play,
  Youtube,
  Disc,
  CheckCheck,
  Clock,
  User,
  Share,
  MoreVertical,
  Volume2,
  Pause,
  SkipBack,
  SkipForward,
  PlayCircle
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export default function LivePreview({ title, content, mediaUrl, mediaType = 'image', instagramFormat = 'feed', selectedNetworks = ['instagram'] }) {
  const { activeBrand } = useWorkspace();
  const [activeTab, setActiveTab] = useState(
    selectedNetworks && selectedNetworks.length > 0 ? selectedNetworks[0] : 'instagram'
  );

  // Configuração das redes disponíveis para pré-visualização com cores e ícones oficiais
  const NETWORKS_CONFIG = [
    { id: 'instagram', label: 'Instagram', icon: Instagram, activeClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white shadow-sm' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, activeClass: 'bg-[#0A66C2] text-white shadow-sm' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, activeClass: 'bg-[#1877F2] text-white shadow-sm' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, activeClass: 'bg-[#FF0000] text-white shadow-sm' },
    { id: 'tiktok', label: 'TikTok', icon: Video, activeClass: 'bg-[#000000] text-white shadow-sm ring-1 ring-gray-700' },
    { id: 'spotify', label: 'Spotify', icon: Music, activeClass: 'bg-[#1DB954] text-white shadow-sm' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, activeClass: 'bg-[#25D366] text-white shadow-sm' },
  ];

  // Sincroniza a aba ativa caso a rede atual seja desmarcada pelo usuário no Scheduler
  useEffect(() => {
    if (selectedNetworks && selectedNetworks.length > 0 && !selectedNetworks.includes(activeTab)) {
      setActiveTab(selectedNetworks[0]);
    }
  }, [selectedNetworks, activeTab]);

  // Formata o texto realçando hashtags em azul e formatações básicas
  const renderFormattedText = (text) => {
    if (!text) return <span className="text-gray-400 italic">Sua legenda aparecerá aqui em tempo real...</span>;
    
    // Separa por palavras preservando quebras de linha e pontuação simples
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#') && part.length > 1) {
        return (
          <span key={index} className="text-[#1A73E8] font-medium hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Filtra as abas para exibir prioritariamente as redes selecionadas ou todas se nenhuma estiver selecionada
  const displayedNetworks = NETWORKS_CONFIG.filter(net => 
    selectedNetworks && selectedNetworks.length > 0 ? selectedNetworks.includes(net.id) : true
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-full select-none">
      {/* Header do Preview com Abas Dinâmicas */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F26526] animate-pulse"></span>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            Live Preview
            <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded font-normal">Realtime</span>
          </h3>
        </div>

        {/* Abas de Rede Selecionáveis */}
        <div className="flex flex-wrap bg-gray-200/80 p-1 rounded-xl gap-1 max-w-full overflow-x-auto">
          {displayedNetworks.map((net) => {
            const Icon = net.icon;
            const isActive = activeTab === net.id;
            return (
              <button
                key={net.id}
                onClick={() => setActiveTab(net.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? net.activeClass
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{net.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Corpo da Visualização no Estilo da Plataforma Ativa */}
      <div className="p-6 bg-[#F8FAFC] flex-1 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-[360px] transition-all duration-300">
          {/* 1. INSTAGRAM PREVIEW */}
          {activeTab === 'instagram' && (
            instagramFormat === 'reels' ? (
              /* INSTAGRAM REELS (VERTICAL 9:16) */
              <div className="bg-black border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden font-sans relative aspect-[9/16] w-full max-w-[320px] select-none text-white animate-in fade-in duration-200 mx-auto">
                {/* Reels Header */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 text-white drop-shadow-md">
                  <span className="text-xs font-extrabold flex items-center gap-1 bg-black/35 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                    <Video className="w-3 h-3 text-pink-500" /> Reels
                  </span>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 bg-black/35 backdrop-blur-sm p-1.5 rounded-full border border-white/10" />
                    <MoreVertical className="w-4 h-4 text-white cursor-pointer" />
                  </div>
                </div>

                {/* Reels Media Container */}
                <div className="absolute inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
                  {mediaUrl ? (
                    mediaType === 'video' ? (
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <div 
                          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110" 
                          style={{ backgroundImage: `url(${mediaUrl})` }}
                        />
                        <img
                          src={mediaUrl}
                          alt="Mídia"
                          className="w-full h-full object-contain relative z-10"
                        />
                      </div>
                    )
                  ) : (
                    <div className="text-center p-6 text-gray-500 flex flex-col items-center justify-center">
                      <Sparkles className="w-8 h-8 mb-2 text-pink-500 animate-bounce" />
                      <p className="text-xs font-bold text-gray-400">Nenhum vídeo selecionado</p>
                    </div>
                  )}
                  {/* Play Overlay */}
                  {mediaUrl && (
                    <div className="absolute inset-0 bg-black/10 hover:bg-black/25 transition-all flex items-center justify-center z-10 cursor-pointer group">
                      <Play className="w-12 h-12 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity bg-black/35 p-3 rounded-full border border-white/20" />
                    </div>
                  )}
                </div>

                {/* Right Floating Actions */}
                <div className="absolute bottom-20 right-3.5 flex flex-col items-center space-y-4.5 z-20 text-white drop-shadow-lg">
                  {/* Profile Pic with "+" */}
                  <div className="flex flex-col items-center relative">
                    <img
                      src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                      alt={activeBrand?.name}
                      className="w-8.5 h-8.5 rounded-full object-cover border-2 border-white"
                    />
                    <div className="absolute -bottom-1 bg-red-500 rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white text-[8px] font-extrabold leading-none text-white select-none">
                      +
                    </div>
                  </div>

                  {/* Likes */}
                  <div className="flex flex-col items-center cursor-pointer group">
                    <Heart className="w-6 h-6 text-white hover:text-red-500 hover:fill-red-500 transition-colors" />
                    <span className="text-[10px] font-extrabold mt-1">12.4k</span>
                  </div>

                  {/* Comments */}
                  <div className="flex flex-col items-center cursor-pointer">
                    <MessageCircle className="w-6 h-6 text-white hover:text-gray-200 transition-colors" />
                    <span className="text-[10px] font-extrabold mt-1">382</span>
                  </div>

                  {/* Share */}
                  <div className="flex flex-col items-center cursor-pointer">
                    <Send className="w-6 h-6 text-white -rotate-12 hover:text-gray-200 transition-colors" />
                    <span className="text-[10px] font-bold mt-1">Partilhar</span>
                  </div>

                  {/* Bookmark */}
                  <div className="flex flex-col items-center cursor-pointer">
                    <Bookmark className="w-6 h-6 text-white hover:text-gray-200 transition-colors" />
                  </div>

                  {/* Spinning Audio Disk */}
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center animate-spin animate-duration-[4000ms] overflow-hidden">
                    <Disc className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Bottom Overlay Text */}
                <div className="absolute bottom-4 left-4 right-14 z-20 text-left text-white drop-shadow-md space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold truncate max-w-[140px] tracking-wide">
                      {activeBrand?.handle || '@suamarca'}
                    </span>
                    <span className="px-2.5 py-0.5 border border-white/30 rounded-lg text-[9px] font-extrabold uppercase bg-white/15 backdrop-blur-sm select-none">
                      Seguir
                    </span>
                  </div>

                  {/* Reels Caption */}
                  <div className="text-[11px] text-gray-100 line-clamp-3 leading-relaxed font-normal">
                    {content ? renderFormattedText(content) : <span className="text-gray-300 italic">Escreva a legenda do seu Reels...</span>}
                  </div>

                  {/* Audio Track marquee */}
                  <div className="flex items-center space-x-1.5 text-[9px] font-bold text-gray-200 bg-black/35 backdrop-blur-sm py-1 px-2 rounded-lg max-w-[180px] overflow-hidden whitespace-nowrap">
                    <Music className="w-2.5 h-2.5 text-pink-500 shrink-0" />
                    <span className="animate-pulse">Áudio original - {activeBrand?.name || 'SocialHub'}</span>
                  </div>
                </div>

                {/* Vignette Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
              </div>
            ) : (
              /* INSTAGRAM FEED PREVIEW */
              <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden font-sans animate-in fade-in duration-200 mx-auto w-full max-w-[340px]">
                {/* Top Bar Simulação Insta */}
                <div className="p-3.5 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                      <img
                        src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                        alt={activeBrand?.name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-gray-900 leading-none">
                          {activeBrand?.handle?.replace('@', '') || 'suamarca'}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-[#1A73E8] fill-[#1A73E8] text-white" />
                      </div>
                      <span className="text-[10px] text-gray-400 leading-none block mt-0.5">Patrocinado • São Paulo</span>
                    </div>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-500 cursor-pointer" />
                </div>

                {/* Mídia do Post */}
                <div className="w-full aspect-square bg-gray-100 overflow-hidden relative group flex items-center justify-center">
                  {mediaUrl ? (
                    mediaType === 'video' ? (
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 bg-black"
                        muted
                        controls
                        playsInline
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Mídia"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                    )
                  ) : (
                    <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-200 w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <Sparkles className="w-10 h-10 mb-2 text-[#F26526] animate-bounce" />
                      <p className="text-xs font-medium">Nenhuma imagem ou vídeo carregado</p>
                    </div>
                  )}
                </div>

                {/* Ações / Ícones Insta */}
                <div className="p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-4">
                      <Heart className="w-6 h-6 text-gray-800 hover:text-red-500 hover:fill-red-500 transition-colors cursor-pointer" />
                      <MessageCircle className="w-6 h-6 text-gray-800 hover:text-gray-600 transition-colors cursor-pointer" />
                      <Send className="w-6 h-6 text-gray-800 hover:text-gray-600 transition-colors cursor-pointer -rotate-12" />
                    </div>
                    <Bookmark className="w-6 h-6 text-gray-800 hover:text-gray-600 transition-colors cursor-pointer" />
                  </div>

                  {/* Curtidas */}
                  <p className="text-xs font-bold text-gray-900 mb-1.5">
                    Curtido por <span className="underline">mariana_marketing</span> e <span className="underline">outras 1.482 pessoas</span>
                  </p>

                  {/* Legenda com Hashtags formatadas */}
                  <div className="text-xs text-gray-800 leading-relaxed max-h-28 overflow-y-auto pr-1">
                    <span className="font-bold text-gray-900 mr-1.5">
                      {activeBrand?.handle?.replace('@', '') || 'suamarca'}
                    </span>
                    {renderFormattedText(content)}
                  </div>

                  <p className="text-[10px] text-gray-400 mt-2 uppercase">Há 2 minutos • Ver tradução</p>
                </div>
              </div>
            )
          )}

          {/* 2. LINKEDIN PREVIEW */}
          {activeTab === 'linkedin' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden font-sans animate-in fade-in duration-200">
              {/* Header LinkedIn */}
              <div className="p-4 flex items-start justify-between border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <img
                    src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                    alt={activeBrand?.name}
                    className="w-11 h-11 rounded-lg object-cover border border-gray-200 shadow-sm"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                      {activeBrand?.name || 'Sua Empresa'}
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded font-normal">Empresa</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      {activeBrand?.category || 'Geral'} • {activeBrand?.followers || '0'} seguidores
                    </p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <span>Agora mesmo</span> • <Globe className="w-3 h-3" />
                    </p>
                  </div>
                </div>
                <button className="text-[#0A66C2] font-bold text-xs hover:bg-[#0A66C2]/10 px-2 py-1 rounded transition-colors">
                  + Seguir
                </button>
              </div>

              {/* Título (Se houver no LinkedIn) */}
              {title && (
                <div className="px-4 pt-3 text-xs font-bold text-gray-900">
                  {title}
                </div>
              )}

              {/* Legenda LinkedIn */}
              <div className="p-4 pt-2 text-xs text-gray-800 leading-relaxed max-h-32 overflow-y-auto">
                {renderFormattedText(content)}
              </div>

              {/* Mídia LinkedIn */}
              <div className="w-full aspect-[16/10] bg-gray-100 overflow-hidden relative border-y border-gray-100">
                {mediaUrl ? (
                  mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      className="w-full h-full object-cover bg-black"
                      muted
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Mídia LinkedIn"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                  )
                ) : (
                  <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-200 w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Linkedin className="w-10 h-10 mb-2 text-[#0A66C2] opacity-40" />
                    <p className="text-xs font-medium">Preview de Mídia LinkedIn</p>
                  </div>
                )}
              </div>

              {/* Reações / Estatísticas LinkedIn */}
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <div className="flex items-center space-x-1">
                  <span className="w-4 h-4 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-[9px] font-bold">👍</span>
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold -ml-1">❤️</span>
                  <span className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[9px] font-bold -ml-1">💡</span>
                  <span className="ml-1">428</span>
                </div>
                <span>34 comentários • 12 repostagens</span>
              </div>

              {/* Barra de Botões LinkedIn */}
              <div className="px-2 py-1 flex items-center justify-around bg-white">
                <button className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors">
                  <ThumbsUp className="w-4 h-4 text-gray-500" />
                  <span>Gostei</span>
                </button>
                <button className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <span>Comentar</span>
                </button>
                <button className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors">
                  <Repeat className="w-4 h-4 text-gray-500" />
                  <span>Repostar</span>
                </button>
                <button className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors">
                  <Send className="w-4 h-4 text-gray-500" />
                  <span>Enviar</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. FACEBOOK PREVIEW */}
          {activeTab === 'facebook' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden font-sans animate-in fade-in duration-200">
              {/* Header Facebook */}
              <div className="p-3.5 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center space-x-2.5">
                  <img
                    src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                    alt={activeBrand?.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      {activeBrand?.name || 'Sua Página Oficial'}
                      <CheckCircle2 className="w-3 h-3 text-[#1877F2] fill-[#1877F2] text-white" />
                    </h4>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span>Agora mesmo</span> • <Globe className="w-3 h-3" />
                    </p>
                  </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-500 cursor-pointer" />
              </div>

              {/* Título e Legenda Facebook */}
              <div className="p-3.5 text-xs text-gray-800 leading-relaxed max-h-32 overflow-y-auto">
                {title && <p className="font-bold text-gray-900 mb-1">{title}</p>}
                {renderFormattedText(content)}
              </div>

              {/* Mídia Facebook */}
              <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden relative border-y border-gray-100">
                {mediaUrl ? (
                  mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      className="w-full h-full object-cover bg-black"
                      muted
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Mídia Facebook"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                  )
                ) : (
                  <div className="text-center p-6 bg-gray-50 w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Facebook className="w-10 h-10 mb-2 text-[#1877F2] opacity-40" />
                    <p className="text-xs font-medium">Preview de Mídia Facebook</p>
                  </div>
                )}
              </div>

              {/* Reações Facebook */}
              <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <div className="flex items-center space-x-1">
                  <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[9px] font-bold">👍</span>
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold -ml-1">❤️</span>
                  <span className="ml-1">1.2k</span>
                </div>
                <span>48 comentários • 19 compartilhamentos</span>
              </div>

              {/* Ações Facebook */}
              <div className="px-2 py-1 flex items-center justify-around bg-white">
                <button className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors">
                  <ThumbsUp className="w-4 h-4 text-gray-500" />
                  <span>Curtir</span>
                </button>
                <button className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <span>Comentar</span>
                </button>
                <button className="flex items-center space-x-1.5 py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors">
                  <Share2 className="w-4 h-4 text-gray-500" />
                  <span>Compartilhar</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. YOUTUBE / SHORTS PREVIEW */}
          {activeTab === 'youtube' && (
            <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden font-sans animate-in fade-in duration-200">
              {/* Player do YouTube Simulação */}
              <div className="w-full aspect-video bg-black relative group flex items-center justify-center overflow-hidden">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="YouTube Video Thumbnail"
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                ) : (
                  <div className="text-center p-6 bg-neutral-900 w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Youtube className="w-12 h-12 mb-2 text-[#FF0000] animate-pulse" />
                    <p className="text-xs font-medium">Player do YouTube</p>
                  </div>
                )}
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-all">
                  <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>
                {/* Tempo e Badge */}
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                  10:24
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#FF0000] text-white text-[9px] font-extrabold tracking-widest uppercase rounded shadow">
                  Shorts / Vídeo
                </div>
              </div>

              {/* Informações do Vídeo */}
              <div className="p-4">
                {/* Título do vídeo em negrito */}
                <h4 className="text-sm font-extrabold text-gray-900 leading-snug line-clamp-2">
                  {title || 'Título do Vídeo no YouTube - Dicas Práticas & Inovação'}
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  14.820 visualizações • Há 2 horas
                </p>

                {/* Canal Info & Botão Inscrever-se */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                      alt={activeBrand?.name}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm shrink-0"
                    />
                    <div className="min-w-0">
                      <h5 className="text-xs font-extrabold text-gray-900 truncate flex items-center gap-1">
                        {activeBrand?.name || 'Canal Oficial'}
                        <CheckCircle2 className="w-3 h-3 text-gray-600 fill-gray-600 text-white shrink-0" />
                      </h5>
                      <p className="text-[10px] text-gray-400 truncate">142 mil inscritos</p>
                    </div>
                  </div>
                  <button className="bg-gradient-to-r from-black to-neutral-800 hover:from-[#FF0000] hover:to-red-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-full shadow-md transition-all shrink-0">
                    Inscrever-se
                  </button>
                </div>

                {/* Barra de Curtidas e Compartilhamento */}
                <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1">
                  <div className="flex items-center bg-gray-100 rounded-full text-xs font-bold text-gray-700 shrink-0">
                    <button className="flex items-center space-x-1 px-3 py-1.5 hover:bg-gray-200 rounded-l-full transition-colors border-r border-gray-300/60">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>1,4 mil</span>
                    </button>
                    <button className="px-2 py-1.5 hover:bg-gray-200 rounded-r-full transition-colors">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-bold text-gray-700 transition-colors shrink-0">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartilhar</span>
                  </button>
                  <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-bold text-gray-700 transition-colors shrink-0">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Remix</span>
                  </button>
                </div>

                {/* Descrição do Vídeo */}
                <div className="mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-200/60 text-xs text-gray-700 max-h-24 overflow-y-auto">
                  <span className="font-bold text-gray-900 block mb-1">Descrição:</span>
                  {renderFormattedText(content)}
                </div>
              </div>
            </div>
          )}

          {/* 5. TIKTOK PREVIEW */}
          {activeTab === 'tiktok' && (
            <div className="w-full max-w-[280px] mx-auto aspect-[9/16] max-h-[500px] bg-[#0F172A] rounded-[32px] overflow-hidden relative shadow-2xl font-sans text-white border-4 border-neutral-900 flex flex-col justify-between animate-in fade-in duration-200">
              {/* Mídia Vertical de Fundo */}
              {mediaUrl ? (
                <img
                  src={mediaUrl}
                  alt="TikTok Video"
                  className="absolute inset-0 w-full h-full object-cover opacity-85"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-800 to-black flex flex-col items-center justify-center text-gray-500">
                  <Video className="w-12 h-12 mb-2 text-white/40 animate-pulse" />
                  <p className="text-xs font-medium text-white/60">TikTok Vertical Feed</p>
                </div>
              )}

              {/* Overlay Topo: Seguindo | Para Você */}
              <div className="relative z-10 pt-4 pb-2 flex items-center justify-center space-x-3 text-xs font-bold drop-shadow-md">
                <span className="text-white/60 hover:text-white cursor-pointer">Seguindo</span>
                <span className="text-white/40">|</span>
                <span className="text-white border-b-2 border-white pb-0.5 cursor-pointer">Para você</span>
              </div>

              {/* Barra Lateral Direita de Ícones */}
              <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-4 z-20">
                {/* Avatar com badge */}
                <div className="relative mb-1">
                  <img
                    src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                    alt={activeBrand?.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                  <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-[#FE2C55] text-white flex items-center justify-center text-[11px] font-extrabold leading-none shadow">
                    +
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:text-[#FE2C55] transition-colors">
                    <Heart className="w-6 h-6 fill-white" />
                  </button>
                  <span className="text-[10px] font-extrabold mt-0.5 drop-shadow">87.4K</span>
                </div>

                <div className="flex flex-col items-center">
                  <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                    <MessageCircle className="w-6 h-6 fill-white" />
                  </button>
                  <span className="text-[10px] font-extrabold mt-0.5 drop-shadow">1.2K</span>
                </div>

                <div className="flex flex-col items-center">
                  <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                    <Bookmark className="w-6 h-6 fill-white" />
                  </button>
                  <span className="text-[10px] font-extrabold mt-0.5 drop-shadow">4.5K</span>
                </div>

                <div className="flex flex-col items-center">
                  <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                    <Share2 className="w-6 h-6 fill-white" />
                  </button>
                  <span className="text-[10px] font-extrabold mt-0.5 drop-shadow">12.8K</span>
                </div>
              </div>

              {/* Rodapé TikTok: Nome, Legenda e Disco de Áudio */}
              <div className="relative z-10 p-4 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent pr-16">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-1 drop-shadow">
                  @{activeBrand?.handle?.replace('@', '') || 'suamarca_oficial'}
                </h4>

                <div className="text-xs text-gray-100 leading-snug line-clamp-3 mt-1 pr-2 drop-shadow">
                  {renderFormattedText(content)}
                </div>

                {/* Disco girando de som */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2 overflow-hidden max-w-[150px]">
                    <Music className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
                    <span className="text-[11px] text-gray-200 truncate">
                      Som original - {activeBrand?.name || 'SocialHub Áudio'}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center animate-spin shadow-lg shrink-0">
                    <Disc className="w-4 h-4 text-[#25F4EE]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. SPOTIFY PREVIEW */}
          {activeTab === 'spotify' && (
            <div className="bg-gradient-to-b from-[#1E293B] via-[#181818] to-[#121212] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-white p-5 animate-in fade-in duration-200">
              {/* Header Spotify */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Music className="w-5 h-5 text-[#1DB954]" />
                  <span className="text-[11px] font-extrabold tracking-widest uppercase text-gray-300">
                    Spotify Podcast & Áudio
                  </span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
              </div>

              {/* Capa Quadrada do Episódio */}
              <div className="aspect-square w-full max-w-[200px] mx-auto my-4 rounded-xl overflow-hidden shadow-2xl border border-white/10 relative group">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="Spotify Podcast Cover"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex flex-col items-center justify-center text-gray-500">
                    <Disc className="w-12 h-12 mb-2 text-[#1DB954] animate-spin" />
                    <span className="text-xs font-bold text-gray-400">Capa do Áudio</span>
                  </div>
                )}
              </div>

              {/* Título e Criador */}
              <div className="text-center my-3">
                <h4 className="text-base font-extrabold text-white leading-tight truncate">
                  {title || 'Episódio #42 - O Futuro Digital'}
                </h4>
                <p className="text-xs font-bold text-[#1DB954] mt-1">
                  {activeBrand?.name || 'Canal Oficial do Criador'}
                </p>
              </div>

              {/* Barra de Reprodução (Slider) Verde */}
              <div className="mt-4 px-1">
                <div className="w-full bg-neutral-700 h-1.5 rounded-full overflow-hidden relative cursor-pointer">
                  <div className="bg-[#1DB954] w-[45%] h-full rounded-full"></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 font-mono">
                  <span>15:24</span>
                  <span>34:12</span>
                </div>
              </div>

              {/* Botões do Player */}
              <div className="flex items-center justify-between px-2 my-3">
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Repeat className="w-4 h-4" />
                </button>
                <button className="text-gray-300 hover:text-white transition-colors">
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>
                <button className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                  <Play className="w-6 h-6 fill-black ml-0.5" />
                </button>
                <button className="text-gray-300 hover:text-white transition-colors">
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Área de Show Notes / Descrição */}
              <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/10 text-xs text-gray-300 max-h-24 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-[#1DB954] tracking-wider">Show Notes / Descrição</span>
                  <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">Episódio Completo</span>
                </div>
                <div className="text-xs leading-relaxed text-gray-200">
                  {renderFormattedText(content)}
                </div>
              </div>
            </div>
          )}

          {/* 7. WHATSAPP PREVIEW */}
          {activeTab === 'whatsapp' && (
            <div className="bg-[#E5DDD5] border border-gray-300 rounded-3xl shadow-2xl overflow-hidden font-sans flex flex-col h-[500px] max-w-[320px] mx-auto animate-in fade-in duration-200 relative">
              {/* Padrão de Fundo Sutil */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

              {/* Header WhatsApp */}
              <div className="bg-[#075E54] text-white p-3 flex items-center justify-between shadow-md relative z-10">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                      alt={activeBrand?.name}
                      className="w-9 h-9 rounded-full object-cover border border-white/20"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25D366] border-2 border-[#075E54]"></span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                      {activeBrand?.name || 'Canal / Atendimento'}
                      <CheckCircle2 className="w-3 h-3 text-[#25D366] fill-[#25D366] text-white shrink-0" />
                    </h4>
                    <p className="text-[10px] text-green-200 truncate">visto hoje às 14:28 • online</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 shrink-0 text-white/90">
                  <Video className="w-4 h-4 cursor-pointer" />
                  <MoreVertical className="w-4 h-4 cursor-pointer" />
                </div>
              </div>

              {/* Corpo de Conversa */}
              <div className="p-3 flex-1 overflow-y-auto flex flex-col justify-end space-y-3 relative z-10">
                {/* Etiqueta de Data */}
                <div className="text-center">
                  <span className="bg-[#E1F3FB] text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-blue-100">
                    HOJE
                  </span>
                </div>

                {/* Bolha de Mensagem Enviada (Estilo WhatsApp) */}
                <div className="self-end bg-[#DCF8C6] rounded-2xl rounded-tr-none p-2 shadow-md border border-[#c4eab0] max-w-[88%] text-gray-800 transition-all">
                  {/* Mídia Anexada na Bolha */}
                  {mediaUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 max-h-[180px] w-full bg-black/5 relative group border border-black/5">
                      <img
                        src={mediaUrl}
                        alt="WhatsApp Media"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                      {title && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] font-bold p-1 truncate">
                          {title}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Texto da Legenda */}
                  <div className="text-xs leading-relaxed px-1 whitespace-pre-wrap word-break">
                    {renderFormattedText(content)}
                  </div>

                  {/* Horário no rodapé e dois checks azuis */}
                  <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 mt-1 pr-1 font-mono">
                    <span>14:30</span>
                    <CheckCheck className="w-4 h-4 text-[#53bdeb]" title="Lido" />
                  </div>
                </div>
              </div>

              {/* Simulação da Barra Inferior de Digitação */}
              <div className="p-2 bg-[#F0F0F0] border-t border-gray-300 flex items-center space-x-2 relative z-10">
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 border border-gray-300 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>Mensagem...</span>
                  <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="w-8 h-8 rounded-full bg-[#008069] text-white flex items-center justify-center shadow">
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Dica do Live Preview */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#F26526]" />
          Visualização fiel aos algoritmos visuais e players das plataformas conectadas.
        </p>
      </div>
    </div>
  );
}
