import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Share2, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Sparkles, 
  Eye, 
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  Cell
} from 'recharts';
import { useWorkspace } from '../contexts/WorkspaceContext';

// Dados base de alcance e engajamento para cada canal disponível
const CHANNEL_BASE_DATA = {
  instagram: { name: 'Instagram', reach: 85000, interactions: 5440, engagement: 6.4, color: '#E1306C' },
  whatsapp: { name: 'WhatsApp', reach: 68000, interactions: 6188, engagement: 9.1, color: '#25D366' },
  youtube: { name: 'YouTube', reach: 92000, interactions: 6900, engagement: 7.5, color: '#FF0000' },
  tiktok: { name: 'TikTok', reach: 110000, interactions: 9020, engagement: 8.2, color: '#000000' },
  spotify: { name: 'Spotify', reach: 25000, interactions: 1400, engagement: 5.6, color: '#1DB954' },
  linkedin: { name: 'LinkedIn', reach: 20000, interactions: 960, engagement: 4.8, color: '#0A66C2' },
  facebook: { name: 'Facebook', reach: 12500, interactions: 387, engagement: 3.1, color: '#1877F2' },
};

export default function Dashboard({ setCurrentTab }) {
  const { activeBrand, activeBrandPosts } = useWorkspace();

  const connectedList = activeBrand?.connectedChannels || [];
  const hasChannels = connectedList.length > 0;

  const dynamicReachData = React.useMemo(() => {
    if (!hasChannels) {
      return [
        { dia: 'Seg', alcance: 0, interacoes: 0 },
        { dia: 'Ter', alcance: 0, interacoes: 0 },
        { dia: 'Qua', alcance: 0, interacoes: 0 },
        { dia: 'Qui', alcance: 0, interacoes: 0 },
        { dia: 'Sex', alcance: 0, interacoes: 0 },
        { dia: 'Sáb', alcance: 0, interacoes: 0 },
        { dia: 'Dom', alcance: 0, interacoes: 0 },
      ];
    }
    let totalWeeklyReach = 0;
    let totalWeeklyInteractions = 0;
    connectedList.forEach(cId => {
      const info = CHANNEL_BASE_DATA[cId];
      if (info) {
        totalWeeklyReach += info.reach;
        totalWeeklyInteractions += info.interactions;
      }
    });
    const factors = [0.35, 0.45, 0.40, 0.60, 0.70, 0.85, 1.0];
    const intFactors = [0.28, 0.38, 0.33, 0.58, 0.68, 0.82, 1.0];
    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia, idx) => ({
      dia,
      alcance: Math.round((totalWeeklyReach / 4.35) * factors[idx]),
      interacoes: Math.round((totalWeeklyInteractions / 4.35) * intFactors[idx]),
    }));
  }, [connectedList, hasChannels]);

  const dynamicEngagementData = React.useMemo(() => {
    if (!hasChannels) {
      return [];
    }
    return connectedList.map(cId => {
      const info = CHANNEL_BASE_DATA[cId] || { name: cId, engagement: 4.0, color: '#64748B' };
      return { rede: info.name, engajamento: info.engagement, cor: info.color };
    }).sort((a, b) => b.engajamento - a.engajamento);
  }, [connectedList, hasChannels]);

  const totalReachNum = dynamicReachData.reduce((acc, curr) => acc + curr.alcance, 0);
  const formattedReach = totalReachNum === 0 ? '0' : totalReachNum >= 1000 ? `${(totalReachNum / 1000).toFixed(1)}k` : `${totalReachNum}`;
  const avgEngRate = !hasChannels ? '0%' : `${(dynamicEngagementData.reduce((acc, c) => acc + c.engajamento, 0) / connectedList.length).toFixed(1)}%`;

  const kpis = [
    {
      title: 'Alcance Total',
      value: formattedReach,
      change: hasChannels ? '+24.5%' : '0%',
      isPositive: hasChannels,
      icon: Eye,
      color: 'from-[#F26526] to-[#FF8A50]',
      shadow: 'shadow-[#F26526]/20'
    },
    {
      title: 'Engajamento Médio',
      value: avgEngRate,
      change: hasChannels ? '+1.8%' : '0%',
      isPositive: hasChannels,
      icon: Activity,
      color: 'from-[#1A73E8] to-[#60A5FA]',
      shadow: 'shadow-[#1A73E8]/20'
    },
    {
      title: 'Seguidores Ativos',
      value: activeBrand?.followers || '0',
      change: hasChannels ? '+3.8%' : '0%',
      isPositive: hasChannels,
      icon: Users,
      color: 'from-[#8B5CF6] to-[#A78BFA]',
      shadow: 'shadow-[#8B5CF6]/20'
    },
    {
      title: 'Canais Conectados',
      value: `${connectedList.length} Redes`,
      change: hasChannels ? '100% Ativo' : 'Aguardando',
      isPositive: hasChannels,
      icon: Share2,
      color: 'from-[#10B981] to-[#34D399]',
      shadow: 'shadow-[#10B981]/20'
    }
  ];

  if (!activeBrand) {
    return (
      <div className="p-8 bg-[#F9FAFB] min-h-full flex items-center justify-center font-sans select-none animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-10 max-w-xl w-full border border-gray-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#F26526]/30">
            <Sparkles className="w-8 h-8 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Bem-vindo ao SocialHub PRO! 🚀
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Você está logado no seu ambiente real de trabalho. Cadastre a sua primeira marca ou empresa clicando no seletor de marcas à esquerda para começar a monitorar suas métricas em tempo real!
            </p>
          </div>
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 text-left space-y-2.5">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Primeiros passos recomendados:
            </p>
            <ul className="text-xs text-gray-600 space-y-1.5 pl-5 list-disc">
              <li>Clique na caixa de marcas na barra lateral e selecione <strong>+ Adicionar Nova Marca</strong></li>
              <li>Preencha o nome da sua empresa, identificador social (@) e categoria</li>
              <li>Navegue até a aba <strong>Conexões & Canais</strong> para vincular o WhatsApp, Instagram ou YouTube</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-full overflow-y-auto font-sans select-none animate-in fade-in duration-300">
      {/* Banner de Boas-Vindas & Ações Rápidas */}
      <div className="bg-gradient-to-r from-[#111827] via-[#1F2937] to-[#111827] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-gray-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#F26526]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-[#1A73E8]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#F26526]/20 text-[#FF8A50] border border-[#F26526]/30">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Performance Multi-Canal em Tempo Real
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Olá! Sua marca <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F26526] to-[#FF8A50]">{activeBrand?.name}</span> está com {connectedList.length} {connectedList.length === 1 ? 'canal conectado' : 'canais conectados'}.
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {hasChannels 
                ? `O alcance total é de ${formattedReach} e a taxa de engajamento média está em ${avgEngRate}. Acompanhe abaixo o desempenho diário dos canais ativos.`
                : 'Você ainda não conectou nenhuma rede social a esta marca. Conecte canais para visualizar gráficos dinâmicos de alcance e engajamento.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentTab('calendar')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all backdrop-blur-sm"
            >
              <Calendar className="w-4 h-4 text-[#FF8A50]" />
              Ver Calendário
            </button>
            <button
              onClick={() => setCurrentTab('scheduler')}
              className="px-6 py-3 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#d9551c] hover:to-[#F26526] text-white rounded-xl font-extrabold text-xs shadow-lg shadow-[#F26526]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              Agendar Novo Post
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={index}
              className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-md hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-lg ${kpi.shadow} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {kpi.value}
                </h3>
                <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                  kpi.isPositive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {kpi.isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                  {kpi.change}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Versus período de 7 dias anterior</p>
            </div>
          );
        })}
      </div>

      {/* Seção de Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico 1: Evolução de Alcance (2 Colunas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                Evolução do Alcance & Impressões
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">Últimos 7 dias</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitoramento diário de alcance orgânico e pago nas redes ativas.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="flex items-center text-xs font-bold text-[#F26526]">
                <span className="w-3 h-3 rounded-full bg-[#F26526] mr-1.5"></span> Alcance
              </span>
              <span className="flex items-center text-xs font-bold text-[#1A73E8]">
                <span className="w-3 h-3 rounded-full bg-[#1A73E8] mr-1.5"></span> Interações
              </span>
            </div>
          </div>

          {!hasChannels ? (
            <div className="h-[340px] w-full flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-300 text-center p-6 space-y-3">
              <Share2 className="w-10 h-10 text-gray-400 animate-pulse" />
              <p className="text-sm font-bold text-gray-700">Nenhum canal social conectado à marca {activeBrand?.name}</p>
              <p className="text-xs text-gray-500 max-w-md">
                Conecte seu Instagram, WhatsApp, YouTube ou outras redes na aba <strong>Conexões & Canais</strong> para visualizar as curvas reais de crescimento e interações!
              </p>
              <button
                onClick={() => setCurrentTab('connections')}
                className="px-5 py-2.5 bg-[#F26526] hover:bg-[#d9551c] text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Conectar Canais Agora
              </button>
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dynamicReachData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F26526" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F26526" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="dia" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                    formatter={(value, name) => [value.toLocaleString('pt-BR'), name === 'alcance' ? 'Alcance Total' : 'Interações']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="alcance" 
                    stroke="#F26526" 
                    strokeWidth={3.5} 
                    dot={{ r: 5, fill: '#F26526', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#F26526' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="interacoes" 
                    stroke="#1A73E8" 
                    strokeWidth={2.5} 
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#1A73E8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico 2: Engajamento por Rede (1 Coluna) */}
        <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
              Engajamento por Canal
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-4">
              Comparativo de conversão nas redes ativas.
            </p>
          </div>

          {!hasChannels ? (
            <div className="h-[340px] w-full flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-300 text-center p-6 space-y-3">
              <Activity className="w-10 h-10 text-gray-400" />
              <p className="text-xs font-bold text-gray-600">Sem dados para comparar</p>
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicEngagementData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <YAxis type="category" dataKey="rede" stroke="#1E293B" fontSize={12} fontStyle="bold" tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(value) => [`${value}%`, 'Taxa de Engajamento']}
                  />
                  <Bar 
                    dataKey="engajamento" 
                    fill="#1A73E8" 
                    radius={[0, 6, 6, 0]} 
                    barSize={20}
                  >
                    {dynamicEngagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor || '#1A73E8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Lista Rápida de Postagens Recentes / Próximas */}
      <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
              Cronograma de Postagens da Marca
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Últimas atividades e postagens agendadas para {activeBrand?.name}
            </p>
          </div>
          <button 
            onClick={() => setCurrentTab('calendar')}
            className="text-xs font-bold text-[#1A73E8] hover:text-[#1557b0] flex items-center gap-1 hover:underline"
          >
            Ver Todas no Calendário <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-gray-100 overflow-x-auto">
          {activeBrandPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Share2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum post encontrado para esta marca.</p>
              <button
                onClick={() => setCurrentTab('scheduler')}
                className="mt-3 px-4 py-2 bg-[#F26526] text-white text-xs font-bold rounded-xl"
              >
                Criar Primeiro Post
              </button>
            </div>
          ) : (
            activeBrandPosts.slice(0, 4).map((post) => (
              <div key={post.id} className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 px-3 rounded-2xl transition-colors">
                <div className="flex items-center space-x-4 min-w-[280px]">
                  <img 
                    src={post.media_url} 
                    alt="Capa" 
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{post.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{post.content}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {post.networks?.map((net) => (
                    <span key={net} className="px-2 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-700 uppercase">
                      {net}
                    </span>
                  ))}
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    post.status === 'published' ? 'bg-blue-100 text-blue-800' :
                    post.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                    post.status === 'waiting_approval' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {post.status === 'published' && '🔵 Publicado'}
                    {post.status === 'scheduled' && '🟢 Agendado'}
                    {post.status === 'waiting_approval' && '🟠 Aguardando'}
                    {post.status === 'draft' && '🟡 Rascunho'}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {new Date(post.scheduled_at).toLocaleDateString('pt-BR')} às {new Date(post.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
