import React, { useState } from 'react';
import { 
  Instagram, 
  Grid, 
  Video, 
  Calendar, 
  Sparkles, 
  Clock, 
  Layers, 
  HelpCircle,
  Eye,
  Trash2,
  Lock,
  ArrowRight,
  UserCheck,
  Award,
  Disc,
  MoreVertical,
  Volume2,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function VisualGridPlanner({ setCurrentTab }) {
  const { activeBrand, activeBrandPosts, updatePostScheduledDate } = useWorkspace();
  const [activeSubTab, setActiveSubTab] = useState('feed'); // 'feed' ou 'reels'
  const [selectedGridPost, setSelectedGridPost] = useState(null);
  const [draggedPostId, setDraggedPostId] = useState(null);

  // Filtra posts que pertencem à marca atual e contêm Instagram
  const instaPosts = activeBrandPosts.filter(p => 
    p.networks && p.networks.includes('instagram')
  );

  // Filtra por Reels ou Feed
  const filteredInstaPosts = instaPosts.filter(p => {
    if (activeSubTab === 'reels') {
      return p.instagram_format === 'reels';
    } else {
      return p.instagram_format !== 'reels'; // feed ou undefined
    }
  });

  // Posts fictícios/estéticos padrão de Unsplash para preencher o grid caso o usuário não tenha posts suficientes
  // Isso garante que o feed sempre pareça bonito e profissional (Fator WOW)
  const defaultGridItems = [
    { id: 'def-1', isDefault: true, media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', likes: 124, comments: 12, scheduled_at: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'published' },
    { id: 'def-2', isDefault: true, media_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80', likes: 89, comments: 5, scheduled_at: new Date(Date.now() - 86400000 * 4).toISOString(), status: 'published' },
    { id: 'def-3', isDefault: true, media_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80', likes: 215, comments: 23, scheduled_at: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'published' },
    { id: 'def-4', isDefault: true, media_url: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=600&auto=format&fit=crop&q=80', likes: 147, comments: 14, scheduled_at: new Date(Date.now() - 86400000 * 6).toISOString(), status: 'published' },
    { id: 'def-5', isDefault: true, media_url: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&auto=format&fit=crop&q=80', likes: 198, comments: 19, scheduled_at: new Date(Date.now() - 86400000 * 7).toISOString(), status: 'published' },
    { id: 'def-6', isDefault: true, media_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&auto=format&fit=crop&q=80', likes: 110, comments: 8, scheduled_at: new Date(Date.now() - 86400000 * 8).toISOString(), status: 'published' },
  ];

  // Combina posts criados pelo usuário com os estéticos para preencher a grade de 9 slots
  const combinedGridItems = [...filteredInstaPosts];
  
  // Ordena os posts de forma decrescente pela data (o mais novo/futuro fica no topo esquerdo)
  combinedGridItems.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  // Se tiver menos de 9 itens, preenche com os itens estéticos padrão
  let finalGridItems = [...combinedGridItems];
  if (finalGridItems.length < 9) {
    const needed = 9 - finalGridItems.length;
    const itemsToAdd = defaultGridItems.slice(0, needed);
    finalGridItems = [...finalGridItems, ...itemsToAdd];
  }

  // Ordena novamente para garantir que os itens padrão fiquem na base por data
  finalGridItems.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  // Funções de Drag & Drop Nativas
  const handleDragStart = (e, postId) => {
    // Só permite arrastar posts agendados do usuário (não posts padrão ou já publicados)
    const post = instaPosts.find(p => p.id === postId);
    if (!post || post.status !== 'scheduled') {
      e.preventDefault();
      return;
    }
    setDraggedPostId(postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetPostId) => {
    e.preventDefault();
    if (!draggedPostId || draggedPostId === targetPostId) return;

    // Busca os dois posts
    const postA = instaPosts.find(p => p.id === draggedPostId);
    const postB = instaPosts.find(p => p.id === targetPostId);

    // Permite trocar apenas posts agendados
    if (!postA || !postB || postA.status !== 'scheduled' || postB.status !== 'scheduled') {
      alert('⚠️ Você só pode reordenar postagens agendadas. Posts já publicados ou estáticos não podem ter sua data alterada.');
      return;
    }

    // Realiza a troca das datas de agendamento no Supabase/Estado local
    const tempDate = postA.scheduled_at;
    await updatePostScheduledDate(postA.id, postB.scheduled_at);
    await updatePostScheduledDate(postB.id, tempDate);

    setDraggedPostId(null);
  };

  // Metadados da marca conectada
  const instaMeta = activeBrand?.networksMetadata?.instagram || {};
  const followersCount = instaMeta.followers || '1.8k';
  const engagementRate = instaMeta.engagement || '4.2%';

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Grid className="w-7 h-7 text-purple-600" />
            Planejador de Feed Estético
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Harmonize as cores do perfil de <strong className="text-gray-800 font-bold">{activeBrand?.name}</strong> arrastando e soltando os posts agendados.
          </p>
        </div>

        <button
          onClick={() => setCurrentTab('scheduler')}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl shadow-md font-bold text-xs transition-all animate-in fade-in"
        >
          <Instagram className="w-4 h-4" />
          <span>Agendar para Instagram</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Celular / Simulador de Instagram (Coluna Esquerda - 7 colunas) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-[360px] bg-white border-[8px] border-gray-950 rounded-[3rem] shadow-2xl overflow-hidden aspect-[9/18.5] flex flex-col relative">
            {/* Top Bar da Câmera do Celular */}
            <div className="h-6 bg-gray-950 w-full flex items-center justify-between px-6 text-[10px] text-white shrink-0 relative z-20">
              <span>9:41</span>
              <div className="w-16 h-3 bg-black rounded-full absolute left-1/2 transform -translate-x-1/2 top-1.5" /> {/* Notch */}
              <div className="flex space-x-1">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Header de Simulação do Perfil do Instagram */}
            <div className="p-4 border-b border-gray-100 space-y-3 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-gray-900 flex items-center gap-1">
                  {activeBrand?.handle?.replace('@', '').toLowerCase() || 'suamarca'}
                  <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-extrabold">✓</span>
                </span>
                <div className="flex space-x-3 text-gray-800">
                  <span className="text-lg font-bold">+</span>
                  <span className="text-lg font-bold">☰</span>
                </div>
              </div>

              {/* Foto de Perfil & Números */}
              <div className="flex items-center justify-between gap-2">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                  <img
                    src={activeBrand?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                    alt={activeBrand?.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white"
                  />
                </div>
                <div className="flex-1 flex justify-around text-center">
                  <div>
                    <p className="text-xs font-extrabold text-gray-900">{instaPosts.length + 6}</p>
                    <p className="text-[9px] text-gray-400">Posts</p>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-gray-900">{followersCount}</p>
                    <p className="text-[9px] text-gray-400">Seguidores</p>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-gray-900">{engagementRate}</p>
                    <p className="text-[9px] text-gray-400">Engajam.</p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="text-[11px] space-y-0.5">
                <p className="font-extrabold text-gray-900 text-xs">{activeBrand?.name || 'Sua Marca'}</p>
                <p className="text-gray-400 font-medium leading-normal">{activeBrand?.category || 'SaaS Comercial'}</p>
                <p className="text-gray-700 leading-normal line-clamp-2">
                  Construindo conexões autênticas e programando nossa grade visual com o SocialHub.
                </p>
              </div>

              {/* Botões do Perfil */}
              <div className="flex gap-1.5 pt-1">
                <button type="button" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold py-1.5 rounded-lg">
                  Editar Perfil
                </button>
                <button type="button" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold py-1.5 rounded-lg">
                  Compartilhar
                </button>
              </div>

              {/* Abas do Instagram Feed */}
              <div className="flex border-t border-gray-100 pt-2 text-gray-400">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('feed')}
                  className={`flex-1 flex items-center justify-center py-1 border-b-2 transition-all ${
                    activeSubTab === 'feed' ? 'border-gray-900 text-gray-900' : 'border-transparent hover:text-gray-600'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('reels')}
                  className={`flex-1 flex items-center justify-center py-1 border-b-2 transition-all ${
                    activeSubTab === 'reels' ? 'border-gray-900 text-gray-900' : 'border-transparent hover:text-gray-600'
                  }`}
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid 3x3 */}
            <div className="flex-1 overflow-y-auto bg-white p-0.5 relative z-10">
              <div className="grid grid-cols-3 gap-0.5">
                {finalGridItems.map((item) => {
                  const isScheduled = item.status === 'scheduled';
                  const isDefault = item.isDefault;
                  const isVideo = item.instagram_format === 'reels' || item.media_url?.includes('.mp4');

                  return (
                    <div
                      key={item.id}
                      draggable={isScheduled}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, item.id)}
                      onClick={() => setSelectedGridPost(item)}
                      className={`aspect-square relative overflow-hidden group border border-transparent transition-all cursor-pointer ${
                        isScheduled 
                          ? 'ring-2 ring-purple-500/80 border-purple-500 scale-95 shadow-md shadow-purple-500/10 rounded-lg hover:scale-100 z-10' 
                          : 'hover:opacity-90'
                      }`}
                    >
                      {isVideo ? (
                        <div className="relative w-full h-full bg-black">
                          <video src={item.media_url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute top-1 right-1 bg-black/40 backdrop-blur-sm p-0.5 rounded text-white z-10">
                            <Video className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.media_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'}
                          alt="Feed post"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Badges de Status na Grade */}
                      {isScheduled && (
                        <div className="absolute inset-0 bg-purple-950/45 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center select-none">
                          <Clock className="w-3.5 h-3.5 text-white mb-0.5 drop-shadow-md animate-bounce" />
                          <span className="text-[8px] font-extrabold text-white tracking-wider uppercase drop-shadow-md">
                            {new Date(item.scheduled_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[6px] text-purple-200 mt-0.5 leading-none">Mover</span>
                        </div>
                      )}

                      {isDefault && (
                        <div className="absolute top-1 right-1 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7px] font-bold text-white select-none">
                          Histórico
                        </div>
                      )}

                      {/* Hover Overlay para detalhes rápidos */}
                      {!isScheduled && (
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-[9px] font-bold">
                          <span>❤️ {item.likes || 120}</span>
                          <span>💬 {item.comments || 15}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Bar do Celular */}
            <div className="h-10 bg-white border-t border-gray-100 w-full flex items-center justify-around text-gray-400 text-base shrink-0 select-none">
              <span>🏠</span>
              <span>🔍</span>
              <span className="text-gray-900 border border-gray-800/10 px-2 rounded bg-gray-50 text-xs">➕</span>
              <span>🎬</span>
              <span>👤</span>
            </div>
          </div>
        </div>

        {/* Painel Lateral de Controle (Coluna Direita - 5 colunas) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-200 shadow-xl space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> Como Funciona o Planner
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Arraste e solte qualquer post com a borda roxa <strong className="text-purple-600 font-bold">Agendada</strong> sobre outro post agendado para permutar suas datas. Isso otimiza o design visual do feed antes da postagem automática.
            </p>
          </div>

          {selectedGridPost ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Detalhes do Post Selecionado
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedGridPost(null)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline"
                >
                  Fechar
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                {selectedGridPost.instagram_format === 'reels' || selectedGridPost.media_url?.includes('.mp4') ? (
                  <video
                    src={selectedGridPost.media_url}
                    className="w-full h-44 rounded-xl object-cover bg-black border border-gray-200 shadow-sm"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={selectedGridPost.media_url}
                    alt="Selecionado"
                    className="w-full h-44 rounded-xl object-cover border border-gray-200 shadow-sm"
                  />
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-gray-500">Status:</span>
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase border ${
                      selectedGridPost.status === 'scheduled'
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      {selectedGridPost.status === 'scheduled' ? '🟢 Agendado' : '🔵 Publicado / Histórico'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-gray-500">Data e Hora:</span>
                    <span className="font-bold text-gray-900">
                      {new Date(selectedGridPost.scheduled_at).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-gray-500">Formato:</span>
                    <span className="font-bold text-gray-900 uppercase text-[10px]">
                      {selectedGridPost.instagram_format === 'reels' ? '🎬 Reels' : '📸 Feed'}
                    </span>
                  </div>

                  {selectedGridPost.content && (
                    <div className="pt-2 border-t border-gray-200/80">
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                        Legenda / Copy:
                      </span>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium line-clamp-4">
                        {selectedGridPost.content}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-gray-400">
              <Layers className="w-12 h-12 mx-auto mb-3 text-purple-400/40" />
              <h4 className="text-xs font-extrabold text-gray-700">Selecione uma publicação</h4>
              <p className="text-[11px] mt-1 leading-normal max-w-xs mx-auto">
                Clique em qualquer imagem do feed simulado à esquerda para inspecionar metadados, legenda e pré-visualizar a publicação completa.
              </p>
            </div>
          )}

          {/* Lista de Próximos Agendamentos */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
              Próximos na Fila (Instagram)
            </h4>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {instaPosts.filter(p => p.status === 'scheduled').length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhum post agendado na fila.</p>
              ) : (
                instaPosts
                  .filter(p => p.status === 'scheduled')
                  .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                  .map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/10 transition-colors">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {post.instagram_format === 'reels' || post.media_url?.includes('.mp4') ? (
                          <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <img src={post.media_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-200" />
                        )}
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-bold text-gray-800 truncate">{post.title}</p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {new Date(post.scheduled_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} às {new Date(post.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        {post.instagram_format === 'reels' ? 'Reels' : 'Feed'}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
