import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Instagram, 
  Linkedin, 
  Facebook, 
  Search, 
  CheckCheck, 
  Clock, 
  User, 
  Sparkles, 
  Filter,
  MoreVertical,
  Smile,
  Paperclip,
  Heart,
  Youtube,
  Video,
  Music
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

// Conversas simuladas expandidas com todos os canais conectados
const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-wa-1',
    user: 'Juliana Castro - Comercial',
    handle: '+55 11 98765-4321',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    network: 'whatsapp',
    type: 'Cliente solicitou orçamento via WhatsApp',
    postTitle: 'Atendimento Comercial - WhatsApp Direct',
    preview: 'Olá! Acompanho as publicações da marca e gostaria de solicitar um orçamento formal para a gestão da nossa empresa via WhatsApp.',
    time: 'Há 5 min',
    unread: true,
    messages: [
      { sender: 'client', text: 'Olá! Acompanho as publicações da marca e gostaria de solicitar um orçamento formal para a gestão da nossa empresa via WhatsApp.', time: '17:15' },
      { sender: 'client', text: 'Temos preferência por iniciar o projeto no próximo mês com atendimento integral.', time: '17:16' }
    ]
  },
  {
    id: 'conv-yt-1',
    user: 'Gabriel Martins',
    handle: '@gabrieltrends',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    network: 'youtube',
    type: 'Comentário no Short do Canal',
    postTitle: '3 Dicas de Crescimento Orgânico em 2026',
    preview: 'Como faço para aplicar essa técnica no meu negócio local? Adorei a explicação clara e rápida!',
    time: 'Há 15 min',
    unread: true,
    messages: [
      { sender: 'client', text: 'Como faço para aplicar essa técnica no meu negócio local? Adorei a explicação clara e rápida!', time: '17:05' }
    ]
  },
  {
    id: 'conv-tk-1',
    user: 'Lucas Vibes',
    handle: '@lucas_vibes',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    network: 'tiktok',
    type: '@lucas vibes comentou no vídeo',
    postTitle: 'Bastidores de Produção Viral #Shorts #TikTok',
    preview: 'Ficou insano o ritmo desse corte! Mandaram muito bem na edição e na graduação de cores 🔥👏',
    time: 'Há 30 min',
    unread: true,
    messages: [
      { sender: 'client', text: 'Ficou insano o ritmo desse corte! Mandaram muito bem na edição e na graduação de cores 🔥👏', time: '16:45' }
    ]
  },
  {
    id: 'conv-sp-1',
    user: 'Fernando Silva',
    handle: '@fernandopodcast',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
    network: 'spotify',
    type: 'Comentário no Podcast / Faixa',
    postTitle: 'Episódio #42 - O Futuro das Redes com AI',
    preview: 'Sensacional essa discussão sobre Inteligência Artificial! Vocês vão disponibilizar o e-book citado no minuto 18?',
    time: 'Há 1 hora',
    unread: false,
    messages: [
      { sender: 'client', text: 'Sensacional essa discussão sobre Inteligência Artificial! Vocês vão disponibilizar o e-book citado no minuto 18?', time: '16:10' },
      { sender: 'agent', text: 'Olá, Fernando! Que bom que gostou do episódio! O e-book já está disponível diretamente nas Show Notes do episódio ou em nosso site oficial. Um grande abraço! 🎧💚', time: '16:25' }
    ]
  },
  {
    id: 'conv-1',
    user: 'Maria Oliveira',
    handle: '@maria_oli',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    network: 'instagram',
    type: 'Comentário em Post',
    postTitle: 'Coleção Outono-Inverno 2026',
    preview: 'Amei as peças! Vocês entregam para todo o Brasil? Qual o prazo médio para o Sul?',
    time: 'Há 2 horas',
    unread: false,
    messages: [
      { sender: 'client', text: 'Amei as peças! Vocês entregam para todo o Brasil? Qual o prazo médio para o Sul?', time: '15:50' }
    ]
  },
  {
    id: 'conv-2',
    user: 'Carlos Eduardo Santos',
    handle: 'carlos-santos-dev',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    network: 'linkedin',
    type: 'Mensagem Direta (DM)',
    postTitle: 'Lançamento Plataforma Cloud 3.0',
    preview: 'Olá, equipe! Gostaria de agendar uma demonstração técnica com nosso CTO na próxima quinta-feira.',
    time: 'Há 3 horas',
    unread: false,
    messages: [
      { sender: 'client', text: 'Olá, equipe! Vi o post sobre a Plataforma Cloud 3.0.', time: '14:15' },
      { sender: 'client', text: 'Gostaria de agendar uma demonstração técnica com nosso CTO na próxima quinta-feira. Temos disponibilidade à tarde.', time: '14:16' }
    ]
  },
  {
    id: 'conv-4',
    user: 'Roberto Mendes & Cia',
    handle: 'roberto-mendes',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    network: 'facebook',
    type: 'Comentário na Página',
    postTitle: 'Webinar: O Futuro das Redes com AI',
    preview: 'O certificado de participação será enviado por e-mail no final da live?',
    time: 'Ontem',
    unread: false,
    messages: [
      { sender: 'client', text: 'O certificado de participação será enviado por e-mail no final da live?', time: 'Ontem às 18:20' }
    ]
  }
];

export default function Inbox() {
  const { activeBrand } = useWorkspace();
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState(INITIAL_CONVERSATIONS[0].id);
  const [replyText, setReplyText] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  const filteredConversations = conversations.filter((c) => {
    if (networkFilter === 'all') return true;
    return c.network === networkFilter;
  });

  const handleSendReply = (e) => {
    e?.preventDefault();
    if (!replyText.trim()) return;

    const newMessage = {
      sender: 'agent',
      text: replyText,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === selectedConvId) {
          return {
            ...conv,
            unread: false,
            preview: `Você: ${replyText}`,
            messages: [...conv.messages, newMessage]
          };
        }
        return conv;
      })
    );

    setReplyText('');
  };

  const generateAiReply = () => {
    if (!selectedConv) return;
    let aiSuggestion = 'Olá! Agradecemos muito pelo seu contato e pelo interesse em nossa marca.';
    
    if (selectedConv.network === 'linkedin') {
      aiSuggestion = `Olá, ${selectedConv.user.split(' ')[0]}! Agradecemos o interesse em nossa tecnologia. Vamos agendar sim! Nossa equipe comercial enviará um convite na sua caixa de entrada ainda hoje. 🚀`;
    } else if (selectedConv.network === 'whatsapp') {
      aiSuggestion = `Olá, ${selectedConv.user.split(' ')[0]}! Que ótimo receber sua mensagem no WhatsApp! Nossa consultora comercial já está preparando uma proposta personalizada para sua empresa. Podemos ligar ou enviar o PDF por aqui ainda hoje? 💼✨`;
    } else if (selectedConv.network === 'youtube') {
      aiSuggestion = `Oi, ${selectedConv.user.split(' ')[0]}! Muito obrigado por acompanhar os nossos Shorts! Em média, nossos parceiros notam crescimento expressivo já nas primeiras 4 a 6 semanas aplicando essa consistência. Se inscreva e ative o sininho para mais conteúdos! 🎥🚀`;
    } else if (selectedConv.network === 'tiktok') {
      aiSuggestion = `Valeu demais pelo carinho, ${selectedConv.user.split(' ')[0]}! 🔥 Na edição nós utilizamos uma combinação de color grading e transições dinâmicas. Continua ligadinho que semana que vem tem tutorial de bastidores! 🎬✨`;
    } else if (selectedConv.network === 'spotify') {
      aiSuggestion = `Olá, ${selectedConv.user.split(' ')[0]}! Que maravilha ter você ouvinte de nosso podcast! Sim, o link para o e-book do minuto 18 já está disponível nas Show Notes do episódio e no nosso portal. Boa leitura e até o próximo ep! 🎧💚`;
    } else if (selectedConv.type.includes('Comentário')) {
      aiSuggestion = `Oi, ${selectedConv.user.split(' ')[0]}! Muito obrigado por comentar! Sim, enviamos para todo o Brasil com código de rastreio em tempo real. Qualquer dúvida, chame no Direct! ✨`;
    }

    setReplyText(aiSuggestion);
  };

  const getNetworkIcon = (net) => {
    switch (net) {
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-600" />;
      case 'linkedin':
        return <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />;
      case 'facebook':
        return <Facebook className="w-3.5 h-3.5 text-blue-600" />;
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-red-600" />;
      case 'tiktok':
        return <Video className="w-3.5 h-3.5 text-slate-900" />;
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'spotify':
        return <Music className="w-3.5 h-3.5 text-[#1DB954]" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  // Badges coloridas para identificação do canal na lista
  const getNetworkBadge = (net) => {
    switch (net) {
      case 'instagram':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-pink-100 text-pink-700 border border-pink-200 uppercase tracking-wider flex items-center gap-1 shrink-0"><Instagram className="w-2.5 h-2.5" /> Insta</span>;
      case 'linkedin':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider flex items-center gap-1 shrink-0"><Linkedin className="w-2.5 h-2.5" /> LinkedIn</span>;
      case 'facebook':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-100 text-sky-700 border border-sky-200 uppercase tracking-wider flex items-center gap-1 shrink-0"><Facebook className="w-2.5 h-2.5" /> Facebook</span>;
      case 'youtube':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider flex items-center gap-1 shrink-0"><Youtube className="w-2.5 h-2.5" /> YouTube</span>;
      case 'tiktok':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-200 text-slate-900 border border-slate-300 uppercase tracking-wider flex items-center gap-1 shrink-0"><Video className="w-2.5 h-2.5" /> TikTok</span>;
      case 'whatsapp':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider flex items-center gap-1 shrink-0"><MessageSquare className="w-2.5 h-2.5" /> WhatsApp</span>;
      case 'spotify':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-green-100 text-[#1DB954] border border-green-200 uppercase tracking-wider flex items-center gap-1 shrink-0"><Music className="w-2.5 h-2.5" /> Spotify</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gray-100 text-gray-700 uppercase shrink-0">{net}</span>;
    }
  };

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300 flex flex-col">
      {/* Header Inbox */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Social Inbox Unificado Multi-Canal
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Central de atendimento em tempo real para: <strong className="text-gray-800 font-bold">{activeBrand?.name}</strong>
          </p>
        </div>

        {/* Filtros de Rede Expansíveis */}
        <div className="flex flex-wrap items-center bg-white border border-gray-200 p-1.5 rounded-2xl shadow-sm gap-1 max-w-full overflow-x-auto">
          <button
            onClick={() => setNetworkFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              networkFilter === 'all' ? 'bg-[#1A73E8] text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Todas ({conversations.length})
          </button>
          {[
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-600' },
            { id: 'instagram', label: 'Insta', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
            { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'bg-red-600' },
            { id: 'tiktok', label: 'TikTok', icon: Video, color: 'bg-slate-900' },
            { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-[#0A66C2]' },
            { id: 'spotify', label: 'Spotify', icon: Music, color: 'bg-[#1DB954]' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setNetworkFilter(item.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0 ${
                  networkFilter === item.id ? `${item.color} text-white shadow` : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3 h-3" /> <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de 2 Colunas do Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-3xl border border-gray-200/80 shadow-2xl overflow-hidden flex-1 min-h-[640px]">
        {/* Coluna 1: Lista de Conversas (5 Colunas) */}
        <div className="lg:col-span-5 border-r border-gray-200 flex flex-col bg-gray-50/50">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar por nome, @handle ou conteúdo..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-xs text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#1A73E8]/20 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    setConversations((prev) =>
                      prev.map((c) => (c.id === conv.id ? { ...c, unread: false } : c))
                    );
                  }}
                  className={`p-4 flex items-start space-x-3.5 cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-[#1A73E8]/10 border-l-4 border-[#1A73E8]' 
                      : conv.unread 
                        ? 'bg-white font-semibold hover:bg-gray-50' 
                        : 'bg-gray-50/40 hover:bg-gray-100/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={conv.avatar} alt={conv.user} className="w-11 h-11 rounded-full object-cover border border-gray-200" />
                    <span className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow">
                      {getNetworkIcon(conv.network)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-extrabold text-gray-900 truncate pr-1">{conv.user}</h4>
                      <span className="text-[10px] text-gray-400 shrink-0">{conv.time}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      {getNetworkBadge(conv.network)}
                      <span className="text-[10px] text-gray-500 font-bold truncate">
                        {conv.type}
                      </span>
                    </div>

                    <p className={`text-xs truncate ${conv.unread ? 'text-gray-900 font-extrabold' : 'text-gray-500'}`}>
                      {conv.preview}
                    </p>
                  </div>

                  {conv.unread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F26526] shrink-0 self-center animate-pulse"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Painel de Chat da Conversa Selecionada (7 Colunas) */}
        <div className="lg:col-span-7 flex flex-col bg-white h-full">
          {/* Header do Chat */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/40">
            <div className="flex items-center space-x-3">
              <img src={selectedConv?.avatar} alt={selectedConv?.user} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                    {selectedConv?.user}
                  </h3>
                  {getNetworkBadge(selectedConv?.network)}
                </div>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <span className="font-semibold text-gray-700">{selectedConv?.type}</span> • {selectedConv?.postTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={generateAiReply}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-[#1A73E8]/10 to-[#8B5CF6]/10 hover:from-[#1A73E8]/20 hover:to-[#8B5CF6]/20 border border-[#1A73E8]/30 text-[#1A73E8] rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Sugerir resposta profissional usando IA"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Copilot IA</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Área de Histórico de Mensagens */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F8FAFC]">
            {/* Box de Contexto do Post */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-center max-w-md mx-auto shadow-sm mb-6">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Contexto da Interação</span>
              <p className="text-xs font-bold text-gray-800">{selectedConv?.postTitle}</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                {getNetworkBadge(selectedConv?.network)}
                <span className="text-[10px] text-gray-500 font-semibold">{selectedConv?.handle}</span>
              </div>
            </div>

            {selectedConv?.messages.map((msg, idx) => {
              const isAgent = msg.sender === 'agent';
              return (
                <div key={idx} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md rounded-2xl p-4 shadow-sm ${
                    isAgent 
                      ? 'bg-gradient-to-r from-[#1A73E8] to-[#1557b0] text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 ${isAgent ? 'text-blue-100' : 'text-gray-400'}`}>
                      <span>{msg.time}</span>
                      {isAgent && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Área de Envio de Resposta */}
          <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-300 focus-within:border-[#1A73E8] focus-within:ring-2 focus-within:ring-[#1A73E8]/20 rounded-2xl p-2 transition-all">
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600 rounded-xl">
                <Smile className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600 rounded-xl -ml-2">
                <Paperclip className="w-5 h-5" />
              </button>

              <input 
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Responder em ${selectedConv?.network.toUpperCase()} como ${activeBrand?.name}...`}
                className="flex-1 bg-transparent border-none text-xs text-gray-800 outline-none px-2"
              />

              <button
                type="submit"
                disabled={!replyText.trim()}
                className={`p-2.5 rounded-xl font-bold transition-all flex items-center justify-center ${
                  replyText.trim() 
                    ? 'bg-[#F26526] hover:bg-[#d9551c] text-white shadow-md shadow-[#F26526]/30 scale-105' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between px-2 mt-2">
              <span className="text-[10px] text-gray-400">Pressione Enter ou clique no botão para enviar resposta</span>
              <button 
                type="button" 
                onClick={() => alert(`❤️ Reação registrada no canal original (${selectedConv?.network.toUpperCase()})!`)}
                className="text-[11px] font-bold text-[#F26526] flex items-center gap-1 hover:underline"
              >
                <Heart className="w-3 h-3" /> Curtir interativa no canal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
