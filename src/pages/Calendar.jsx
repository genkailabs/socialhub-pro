import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  Calendar as CalendarIcon, 
  Share2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Instagram,
  Linkedin,
  Facebook
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function CalendarView({ setCurrentTab }) {
  const { brands, activeBrand, posts, switchBrand } = useWorkspace();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('active'); // 'active' ou id de marca
  const [selectedPost, setSelectedPost] = useState(null);

  // Manipulação de Meses
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const todayMonth = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Seg...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Filtra as postagens do mês e pelas condições selecionadas
  const filteredPosts = posts.filter((post) => {
    const postDate = new Date(post.scheduled_at);
    const isSameMonth = postDate.getMonth() === month && postDate.getFullYear() === year;
    if (!isSameMonth) return false;

    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    
    if (brandFilter === 'active') {
      return post.brand_id === activeBrand?.id;
    } else if (brandFilter !== 'all') {
      return post.brand_id === brandFilter;
    }
    return true;
  });

  // Mapeia posts por dia para facilitar a renderização na grade
  const postsByDay = {};
  filteredPosts.forEach((post) => {
    const day = new Date(post.scheduled_at).getDate();
    if (!postsByDay[day]) postsByDay[day] = [];
    postsByDay[day].push(post);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return { label: '🔵 Publicado', bg: 'bg-blue-50 border-blue-200 text-blue-800', dot: 'bg-blue-500' };
      case 'scheduled':
        return { label: '🟢 Agendado', bg: 'bg-green-50 border-green-200 text-green-800', dot: 'bg-green-500' };
      case 'waiting_approval':
        return { label: '🟠 Aguardando', bg: 'bg-orange-50 border-orange-200 text-orange-800', dot: 'bg-orange-500' };
      case 'draft':
      default:
        return { label: '🟡 Rascunho', bg: 'bg-yellow-50 border-yellow-200 text-yellow-800', dot: 'bg-yellow-500' };
    }
  };

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300">
      {/* Header do Calendário & Controles de Filtro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-[#F26526]" />
            Calendário Editorial Interativo
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Visão de publicações para: <strong className="text-gray-800 font-bold">{monthNames[month]} de {year}</strong>
          </p>
        </div>

        {/* Barra de Controles e Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro por Marca */}
          <div className="flex items-center space-x-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-medium text-gray-700">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>Marca:</span>
            <select 
              value={brandFilter} 
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
            >
              <option value="active">Marca Ativa ({activeBrand?.name?.split(' ')[0]})</option>
              <option value="all">Todas as Marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center space-x-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-medium text-gray-700">
            <span>Status:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
            >
              <option value="all">⚡ Todos os Status</option>
              <option value="scheduled">🟢 Agendado</option>
              <option value="waiting_approval">🟠 Aguardando Aprovação</option>
              <option value="draft">🟡 Rascunho</option>
              <option value="published">🔵 Publicado</option>
            </select>
          </div>

          {/* Botão Novo Agendamento */}
          <button
            onClick={() => setCurrentTab && setCurrentTab('scheduler')}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#d9551c] hover:to-[#F26526] text-white rounded-xl shadow-md shadow-[#F26526]/25 font-bold text-xs transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Post</span>
          </button>
        </div>
      </div>

      {/* Navegador de Mês */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-md mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-extrabold text-gray-900 w-44 text-center">
            {monthNames[month]} <span className="text-[#1A73E8]">{year}</span>
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            title="Próximo Mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={todayMonth}
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
        >
          Hoje / Mês Atual
        </button>
      </div>

      {/* Grade do Calendário Editorial */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden">
        {/* Dias da Semana (Header) */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center py-3">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
            <div key={dia} className={`text-xs font-extrabold uppercase tracking-wider ${index === 0 || index === 6 ? 'text-[#F26526]' : 'text-gray-600'}`}>
              {dia}
            </div>
          ))}
        </div>

        {/* Grade de Dias */}
        <div className="grid grid-cols-7 auto-rows-[130px] divide-x divide-y divide-gray-200 bg-gray-50/30">
          {/* Espaços em branco antes do primeiro dia do mês */}
          {Array.from({ length: firstDayIndex }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-100/50 p-2 opacity-50" />
          ))}

          {/* Dias Reais do Mês */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const dayNum = index + 1;
            const dayPosts = postsByDay[dayNum] || [];
            const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div 
                key={dayNum} 
                onClick={() => {
                  if (dayPosts.length === 0 && setCurrentTab) {
                    setCurrentTab('scheduler');
                  }
                }}
                className={`p-2 transition-colors relative overflow-y-auto group ${
                  isToday ? 'bg-[#1A73E8]/5 ring-2 ring-inset ring-[#1A73E8]' : 'hover:bg-white bg-white'
                } cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isToday ? 'bg-[#1A73E8] text-white shadow-md' : 'text-gray-700 group-hover:text-[#F26526]'
                  }`}>
                    {dayNum}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-400">
                      {dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Lista de Badges / Posts no Dia */}
                <div className="space-y-1">
                  {dayPosts.map((post) => {
                    const badge = getStatusBadge(post.status);
                    return (
                      <div
                        key={post.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(post);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold truncate transition-transform hover:scale-[1.02] shadow-sm ${badge.bg}`}
                        title={`${post.title} (${badge.label})`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{post.title}</span>
                          <span className="text-[9px] shrink-0 font-normal opacity-80">
                            {new Date(post.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-90">
                          <span className="text-[9px]">{badge.label.split(' ')[0]}</span>
                          <span className="text-[9px] uppercase font-mono tracking-tighter truncate">
                            {post.networks?.join(' • ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dica de Hover se estiver vazio */}
                {dayPosts.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 pointer-events-none">
                    <span className="text-[10px] font-bold text-[#F26526] bg-[#F26526]/10 px-2 py-1 rounded-md border border-[#F26526]/20">
                      + Agendar
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Post Selecionado */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-gray-200 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A73E8]">
                  Detalhes da Publicação
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-1">{selectedPost.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <strong className="text-gray-500 uppercase block text-[10px] mb-1">Legenda:</strong>
                <p className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-800 leading-relaxed whitespace-pre-line">
                  {selectedPost.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong className="text-gray-500 uppercase block text-[10px] mb-1">Status:</strong>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedPost.status).bg}`}>
                    {getStatusBadge(selectedPost.status).label}
                  </span>
                </div>
                <div>
                  <strong className="text-gray-500 uppercase block text-[10px] mb-1">Redes:</strong>
                  <div className="flex gap-1">
                    {selectedPost.networks?.map((n) => (
                      <span key={n} className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-bold uppercase text-[10px]">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <strong className="text-gray-500 uppercase block text-[10px] mb-1">Mídia:</strong>
                <img 
                  src={selectedPost.media_url} 
                  alt="Mídia" 
                  className="w-full h-44 object-cover rounded-xl border border-gray-200"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedPost(null);
                  if (setCurrentTab) setCurrentTab('approvals_client_view');
                }}
                className="px-4 py-2 bg-[#1A73E8]/10 hover:bg-[#1A73E8]/20 text-[#1A73E8] rounded-xl font-bold transition-colors"
              >
                Gerar Link de Aprovação
              </button>
              <button
                onClick={() => setSelectedPost(null)}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
