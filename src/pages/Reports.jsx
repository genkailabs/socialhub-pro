import React, { useState, useMemo } from 'react';
import {
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Video,
  Music,
  MessageSquare,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Sparkles,
  Award,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useWorkspace } from '../contexts/WorkspaceContext';

// Config visual + métricas base (mock determinístico) por rede social
const NETWORKS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C', gradient: 'from-purple-500 via-pink-500 to-amber-500', followers: 45200, reach: 412500, engagement: 6.4, growth: 3.8 },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000', gradient: 'from-red-600 to-red-700', followers: 18700, reach: 205400, engagement: 7.5, growth: 5.2 },
  { id: 'tiktok', label: 'TikTok', icon: Video, color: '#000000', gradient: 'from-gray-900 via-purple-950 to-black', followers: 62800, reach: 984000, engagement: 8.2, growth: 12.4 },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2', gradient: 'from-[#0A66C2] to-blue-700', followers: 9400, reach: 78300, engagement: 4.8, growth: 2.1 },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2', gradient: 'from-blue-600 to-indigo-700', followers: 33100, reach: 141200, engagement: 3.1, growth: -0.9 },
  { id: 'spotify', label: 'Spotify', icon: Music, color: '#1DB954', gradient: 'from-[#1DB954] to-emerald-700', followers: 5600, reach: 42100, engagement: 5.6, growth: 4.4 },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: '#25D366', gradient: 'from-green-500 to-emerald-600', followers: 12300, reach: 68000, engagement: 9.1, growth: 6.7 },
];

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Gera série de 7 dias determinística a partir da métrica base da rede
function buildSeries(net) {
  const factors = [0.62, 0.78, 0.71, 0.9, 1.05, 1.28, 1.5];
  return DAYS.map((dia, i) => ({
    dia,
    alcance: Math.round((net.reach / 7) * factors[i]),
    interacoes: Math.round(((net.reach / 7) * factors[i]) * (net.engagement / 100)),
  }));
}

// Distribuição por tipo de conteúdo (mock por rede)
function buildContentMix(net) {
  const base = net.engagement;
  return [
    { tipo: 'Feed / Post', valor: Math.round(base * 1.4 * 10) / 10 },
    { tipo: 'Reels / Vídeo', valor: Math.round(base * 2.1 * 10) / 10 },
    { tipo: 'Stories', valor: Math.round(base * 1.1 * 10) / 10 },
    { tipo: 'Carrossel', valor: Math.round(base * 1.7 * 10) / 10 },
  ];
}

const fmt = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : `${n}`;

export default function Reports({ setCurrentTab }) {
  const { activeBrand, activeBrandPosts } = useWorkspace();
  const [activeNet, setActiveNet] = useState('instagram');
  const [exported, setExported] = useState(false);

  const connectedChannels = activeBrand?.connectedChannels || [];
  const activeNetworks = useMemo(() => {
    if (!activeBrand || connectedChannels.length === 0) {
      return [];
    }
    return NETWORKS.filter((n) => connectedChannels.includes(n.id));
  }, [activeBrand, connectedChannels]);

  React.useEffect(() => {
    if (activeNetworks.length > 0 && !activeNetworks.find(n => n.id === activeNet)) {
      setActiveNet(activeNetworks[0].id);
    }
  }, [activeNetworks, activeNet]);

  const exportToCSV = () => {
    const headers = 'Rede,Seguidores,Alcance,Engajamento (%),Crescimento (%)\n';
    const rows = (activeNetworks.length > 0 ? activeNetworks : NETWORKS).map(n => 
      `"${n.label}",${n.followers},${n.reach},${n.engagement},${n.growth}`
    ).join('\n');
    
    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'relatorio_metricas_socialhub.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  if (!activeBrand || activeNetworks.length === 0) {
    return (
      <div className="p-8 bg-[#F9FAFB] min-h-full flex items-center justify-center font-sans select-none animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-10 max-w-lg w-full border border-gray-200 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1A73E8] to-[#60A5FA] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#1A73E8]/30">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Relatórios de Performance
            </h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              {!activeBrand 
                ? 'Selecione ou crie uma marca na barra lateral para visualizar seus relatórios gerenciais e métricas.'
                : `A marca "${activeBrand.name}" ainda não possui canais sociais conectados. Conecte ao menos um canal para gerar relatórios comparativos e exportar planilhas CSV.`}
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('connections')}
            className="px-5 py-2.5 bg-[#F26526] hover:bg-[#d9551c] text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Conectar Redes Sociais
          </button>
        </div>
      </div>
    );
  }

  const net = activeNetworks.find((n) => n.id === activeNet) || activeNetworks[0];
  const Icon = net.icon;

  const series = useMemo(() => buildSeries(net), [net]);
  const contentMix = useMemo(() => buildContentMix(net), [net]);

  // Posts da marca ativa que incluem esta rede
  const netPosts = useMemo(
    () => activeBrandPosts.filter((p) => p.networks?.includes(net.id)),
    [activeBrandPosts, net.id]
  );

  const totalInteractions = series.reduce((acc, d) => acc + d.interacoes, 0);

  const kpis = [
    { title: 'Seguidores', value: fmt(net.followers), change: net.growth, icon: Users, color: 'from-[#8B5CF6] to-[#A78BFA]' },
    { title: 'Alcance (7d)', value: fmt(net.reach), change: net.growth + 4.2, icon: Eye, color: 'from-[#F26526] to-[#FF8A50]' },
    { title: 'Engajamento', value: `${net.engagement}%`, change: net.growth - 1.1, icon: Heart, color: 'from-[#EC4899] to-[#F472B6]' },
    { title: 'Interações (7d)', value: fmt(totalInteractions), change: net.growth + 1.8, icon: MessageCircle, color: 'from-[#1A73E8] to-[#60A5FA]' },
  ];

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#F26526]" />
            Relatórios por Rede Social
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Desempenho detalhado de cada canal para a marca:{' '}
            <strong className="text-gray-800 font-bold">{activeBrand?.name}</strong>
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className={`px-4 py-2.5 bg-white border rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
            exported
              ? 'border-green-500 text-green-700 bg-green-50'
              : 'border-gray-200 hover:border-[#F26526]/50 hover:bg-[#F26526]/5 text-gray-700'
          }`}
        >
          <Download className={`w-4 h-4 ${exported ? 'text-green-600' : 'text-[#F26526]'}`} />
          {exported ? 'Exportado! ✓' : 'Exportar Relatório'}
        </button>
      </div>

      {/* Seletor de Rede */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {activeNetworks.map((n) => {
          const NIcon = n.icon;
          const isActive = n.id === activeNet;
          return (
            <button
              key={n.id}
              onClick={() => setActiveNet(n.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-xs transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-lg scale-105 border-transparent'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
              }`}
              style={isActive ? { backgroundColor: n.color } : undefined}
            >
              <NIcon className="w-4 h-4 shrink-0" />
              <span>{n.label}</span>
            </button>
          );
        })}
      </div>

      {/* Faixa de destaque da rede ativa */}
      <div className={`bg-gradient-to-r ${net.gradient} rounded-3xl p-6 text-white shadow-xl mb-8 relative overflow-hidden`}>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">{net.label}</h3>
              <p className="text-xs text-white/80 mt-0.5">
                {netPosts.length} publicaç{netPosts.length === 1 ? 'ão' : 'ões'} desta marca neste canal
              </p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold ${
            net.growth >= 0 ? 'bg-white/20 text-white' : 'bg-black/25 text-white'
          }`}>
            {net.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {net.growth >= 0 ? '+' : ''}{net.growth}% de crescimento (7d)
          </div>
        </div>
      </div>

      {/* KPIs da Rede */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, i) => {
          const KIcon = kpi.icon;
          const positive = kpi.change >= 0;
          return (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</span>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                  <KIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{kpi.value}</h3>
                <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                  positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {positive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                  {positive ? '+' : ''}{kpi.change.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Alcance x Interações */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-gray-200/80 shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Alcance & Interações no {net.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Evolução diária nos últimos 7 dias</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="netReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={net.color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={net.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="dia" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(v, name) => [v.toLocaleString('pt-BR'), name === 'alcance' ? 'Alcance' : 'Interações']}
                />
                <Area type="monotone" dataKey="alcance" stroke={net.color} strokeWidth={3} fill="url(#netReach)" />
                <Area type="monotone" dataKey="interacoes" stroke="#1A73E8" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engajamento por tipo de conteúdo */}
        <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Engajamento por Formato</h3>
            <p className="text-xs text-gray-500 mt-0.5">Taxa média (%) por tipo de conteúdo</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentMix} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                <YAxis type="category" dataKey="tipo" stroke="#1E293B" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(v) => [`${v}%`, 'Engajamento']}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={22}>
                  {contentMix.map((_, i) => (
                    <Cell key={i} fill={net.color} fillOpacity={0.55 + i * 0.15} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top posts da rede */}
      <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-[#F26526]" />
              Publicações no {net.label}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Postagens da marca {activeBrand?.name} neste canal</p>
          </div>
          <button
            onClick={() => setCurrentTab && setCurrentTab('scheduler')}
            className="text-xs font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> Criar novo post
          </button>
        </div>

        {netPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhuma publicação desta marca no {net.label} ainda.</p>
            <button
              onClick={() => setCurrentTab && setCurrentTab('scheduler')}
              className="mt-3 px-4 py-2 bg-[#F26526] text-white text-xs font-bold rounded-xl"
            >
              Agendar Publicação
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {netPosts.map((post) => {
              // Métricas mock estáveis por post (usa likes reais quando houver)
              const likes = post.likes || Math.round(net.followers * 0.02);
              const comments = post.comments || Math.round(likes * 0.12);
              const shares = post.shares || Math.round(likes * 0.05);
              return (
                <div key={post.id} className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 px-3 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4 min-w-[240px] flex-1">
                    <img
                      src={post.media_url}
                      alt="Capa"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'; }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{post.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{post.content}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-600 shrink-0">
                    <span className="flex items-center gap-1 font-bold"><Heart className="w-3.5 h-3.5 text-pink-500" /> {fmt(likes)}</span>
                    <span className="flex items-center gap-1 font-bold"><MessageCircle className="w-3.5 h-3.5 text-blue-500" /> {fmt(comments)}</span>
                    <span className="flex items-center gap-1 font-bold"><Share2 className="w-3.5 h-3.5 text-green-500" /> {fmt(shares)}</span>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
