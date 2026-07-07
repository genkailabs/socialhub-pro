import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext({});

export const DEMO_BRANDS = [
  {
    id: 'brand-acme',
    name: 'Acme Corp',
    handle: '@acmecorp',
    logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&auto=format&fit=crop&q=80',
    category: 'Tecnologia & Inovação',
    color: '#F26526',
    followers: '45.2k',
    engagement: '5.4%',
    connectedChannels: ['instagram', 'linkedin', 'youtube'],
    networksMetadata: {
      instagram: {
        handle: '@acmecorp',
        token: 'TOKEN_INSTAGRAM_ACTIVE',
        bio: 'Tecnologia em Nuvem e Inovação Corporativa. 🚀',
        followers: '25.0k',
        engagement: '5.8%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      },
      linkedin: {
        handle: 'Acme Corp Oficial',
        token: 'TOKEN_LINKEDIN_ACTIVE',
        bio: 'Líder em soluções de infraestrutura cloud no Brasil.',
        followers: '15.2k',
        engagement: '4.9%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      },
      youtube: {
        handle: 'AcmeTech',
        token: 'TOKEN_YOUTUBE_ACTIVE',
        bio: 'Tutoriais, webinars e novidades de tecnologia.',
        followers: '5.0k',
        engagement: '5.5%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      }
    },
    campaigns: [
      { id: 'camp-acme-1', name: 'Lançamento Cloud 3.0', status: 'active', budget: 'R$ 15.000', reach: '120.5k', conversionRate: '4.2%' },
      { id: 'camp-acme-2', name: 'Webinar IA para DevOps', status: 'active', budget: 'R$ 8.000', reach: '64.0k', conversionRate: '5.1%' }
    ]
  },
  {
    id: 'brand-starlight',
    name: 'Starlight Fashion',
    handle: '@starlightfashion',
    logo: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&auto=format&fit=crop&q=80',
    category: 'Moda & Varejo',
    color: '#1A73E8',
    followers: '128.9k',
    engagement: '6.8%',
    connectedChannels: ['instagram', 'tiktok', 'whatsapp'],
    networksMetadata: {
      instagram: {
        handle: '@starlightfashion',
        token: 'TOKEN_INSTAGRAM_ACTIVE',
        bio: 'Moda sustentável & elegância atemporal. 👗✨',
        followers: '80.5k',
        engagement: '7.1%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      },
      tiktok: {
        handle: '@starlight_trends',
        token: 'TOKEN_TIKTOK_ACTIVE',
        bio: 'Bastidores dos desfiles e tendências da temporada.',
        followers: '38.4k',
        engagement: '8.5%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      },
      whatsapp: {
        handle: '+55 (11) 99111-2222',
        expiresIn: 'Sessão Ativa (QR Code)',
        status: 'connected',
        bio: 'Atendimento VIP & Vendas Diretas.'
      }
    },
    campaigns: [
      { id: 'camp-star-1', name: 'Coleção Outono-Inverno 2026', status: 'active', budget: 'R$ 28.000', reach: '340.2k', conversionRate: '5.8%' },
      { id: 'camp-star-2', name: 'Flash Sale Sustentável', status: 'active', budget: 'R$ 12.000', reach: '145.0k', conversionRate: '6.5%' }
    ]
  },
  {
    id: 'brand-techpulse',
    name: 'TechPulse',
    handle: '@techpulse_ai',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    category: 'Inteligência Artificial',
    color: '#8B5CF6',
    followers: '89.1k',
    engagement: '4.9%',
    connectedChannels: ['linkedin', 'youtube', 'spotify', 'instagram'],
    networksMetadata: {
      linkedin: {
        handle: 'TechPulse AI',
        token: 'TOKEN_LINKEDIN_ACTIVE',
        bio: 'Inteligência Artificial aplicada e agentes autônomos.',
        followers: '42.0k',
        engagement: '5.2%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      },
      youtube: {
        handle: 'TechPulseAI',
        token: 'TOKEN_YOUTUBE_ACTIVE',
        bio: 'Podcast diário sobre IA e revolução tech.',
        followers: '35.1k',
        engagement: '4.5%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      },
      spotify: {
        handle: 'TechPulse Podcast',
        token: 'TOKEN_SPOTIFY_ACTIVE',
        bio: 'O podcast número 1 sobre Inteligência Artificial.',
        followers: '12.0k',
        engagement: '5.0%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      },
      instagram: {
        handle: '@techpulse_ai',
        token: 'TOKEN_INSTAGRAM_ACTIVE',
        bio: 'Dicas, carrosséis e resumos diários de IA. ⚡🧠',
        followers: '12.0k',
        engagement: '4.8%',
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      }
    },
    campaigns: [
      { id: 'camp-tech-1', name: 'Webinar IA Autônoma', status: 'active', budget: 'R$ 12.500', reach: '95.0k', conversionRate: '6.1%' }
    ]
  }
];

export const DEFAULT_BRAND_PRO = {
  id: 'default-brand-pro',
  user_id: null,
  name: 'GenkaiLabs PRO',
  logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  handle: '@genkailabs.pro',
  category: 'Agência & Tech',
  color: '#F26526',
  followers: '14.2k',
  engagement: '6.4%',
  reach: '85.0k',
  connectedChannels: ['instagram'],
  networksMetadata: {
    instagram: {
      handle: '@genkailabs.pro',
      token: 'TOKEN_INSTAGRAM_PROD_ACTIVE',
      bio: 'Agência de Automação, IA e Gestão de Mídias Sociais no Brasil. 🚀✨',
      followers: '14.2k',
      engagement: '6.4%',
      status: 'connected',
      lastSynced: new Date().toLocaleString('pt-BR')
    }
  },
  campaigns: [
    { id: 'camp-pro-1', name: 'Expansão SocialHub Pro 2026', status: 'active', budget: 'R$ 20.000', reach: '85.0k', conversionRate: '6.4%' }
  ]
};

// Dados iniciais de postagens abrangendo todas as marcas padrão
export const INITIAL_POSTS = [
  {
    id: 'post-pro-1',
    brand_id: 'default-brand-pro',
    title: 'Lançamento do Novo Analytics 3.0 para Redes Sociais',
    content: 'O monitoramento em tempo real do SocialHub Pro ganhou um upgrade incrível! Agora você rastreia o engajamento unificado de todas as plataformas em um painel interativo. ⚡📊 #SocialHubPro #Analytics #IA #Marketing',
    media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    status: 'published',
    networks: ['instagram', 'linkedin', 'youtube'],
    scheduled_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    likes: 428,
    comments: 64,
    shares: 32
  },
  {
    id: 'post-pro-2',
    brand_id: 'default-brand-pro',
    title: 'Automação de Atendimento via WhatsApp no E-commerce',
    content: 'Como reduzir em 70% o tempo de resposta a clientes usando nossos agentes autônomos integrados ao WhatsApp Business? Veja o carrossel explicativo! 🤖💬 #WhatsAppBusiness #Automação #Atendimento',
    media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    status: 'scheduled',
    networks: ['whatsapp', 'instagram', 'linkedin'],
    scheduled_at: new Date(Date.now() + 1 * 86400000).toISOString(),
    likes: 0,
    comments: 0,
    shares: 0
  },
  {
    id: 'post-1',
    brand_id: 'brand-acme',
    title: 'Lançamento da Nova Plataforma Cloud 3.0',
    content: 'Estamos entusiasmados em apresentar nossa nova arquitetura nativa em nuvem! Mais velocidade, estabilidade e segurança para seu negócio de ponta a ponta. 🚀💻 #AcmeCloud #Inovação #TechNews',
    media_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    status: 'published',
    networks: ['instagram', 'linkedin'],
    scheduled_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    likes: 342,
    comments: 48,
    shares: 19
  },
  {
    id: 'post-2',
    brand_id: 'brand-acme',
    title: 'Webinar: O Futuro das Redes Sociais com AI',
    content: 'Como a Inteligência Artificial está remodelando o engajamento e a automação de marketing no Brasil? Inscreva-se no webinar gratuito desta quinta-feira no link da bio! 🔥✨ #MarketingDigital #AI #SocialMedia',
    media_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
    status: 'scheduled',
    networks: ['instagram', 'linkedin', 'facebook'],
    scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    likes: 0,
    comments: 0,
    shares: 0
  },
  {
    id: 'post-3',
    brand_id: 'brand-starlight',
    title: 'Coleção Outono-Inverno 2026: Elegância Atemporal',
    content: 'Tons terrosos, tecidos sustentáveis e caimento impecável. Conheça as peças que vão definir o padrão de estilo para esta temporada. Disponível nas lojas físicas e online. 🧥🍂 #StarlightFashion #ModaConsciente',
    media_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    status: 'waiting_approval',
    networks: ['instagram', 'tiktok'],
    scheduled_at: new Date(Date.now() + 4 * 86400000).toISOString(),
    likes: 0,
    comments: 0,
    shares: 0
  },
  {
    id: 'post-4',
    brand_id: 'brand-techpulse',
    title: 'Dica Prática: Otimizando Processos com Agentes Autônomos',
    content: 'Você sabia que equipes de desenvolvimento reduzem em até 40% o tempo de refatoração ao implementar fluxos de trabalho assistidos por IA? Veja o carrossel com os 5 passos fundamentais. ⚡🧠 #DevOps #AgentesIA #TechPulse',
    media_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    status: 'draft',
    networks: ['linkedin', 'youtube'],
    scheduled_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    likes: 0,
    comments: 0,
    shares: 0
  }
];

// Enriquecedor determinístico de dados da marca: garante canais, métricas e campanhas exclusivas para cada marca
export function enrichBrandData(brand) {
  if (!brand) return null;
  const id = brand.id || `brand-${Date.now()}`;
  const name = brand.name || 'Nova Marca';
  const handle = brand.handle || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const category = brand.category || 'Geral';
  const color = brand.color || '#F26526';
  const logo = brand.logo || brand.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80';
  
  let channels = brand.connectedChannels || brand.connected_networks || [];
  if (!Array.isArray(channels) || channels.length === 0) {
    if (id === 'brand-acme' || name.toLowerCase().includes('acme')) {
      channels = ['instagram', 'linkedin', 'youtube'];
    } else if (id === 'brand-starlight' || name.toLowerCase().includes('starlight')) {
      channels = ['instagram', 'tiktok', 'whatsapp'];
    } else if (id === 'brand-techpulse' || name.toLowerCase().includes('techpulse')) {
      channels = ['linkedin', 'youtube', 'spotify', 'instagram'];
    } else if (id === 'default-brand-pro' || name.toLowerCase().includes('genkai')) {
      channels = ['instagram'];
    } else {
      channels = ['instagram', 'whatsapp', 'linkedin'];
    }
  }

  let followers = brand.followers;
  if (!followers || followers === '0' || followers === 0 || followers === '24.8k') {
    if (id === 'default-brand-pro' || name.toLowerCase().includes('genkai')) {
      followers = '14.2k';
    } else {
      const baseCount = channels.length * 14200 + (name.length * 1500);
      followers = baseCount >= 1000 ? `${(baseCount / 1000).toFixed(1)}k` : `${baseCount}`;
    }
  }

  let engagement = brand.engagement;
  if (!engagement || engagement === '0%' || engagement === 0 || engagement === '4.9%') {
    if (id === 'default-brand-pro' || name.toLowerCase().includes('genkai')) {
      engagement = '6.4%';
    } else {
      const baseEng = (3.8 + (channels.length * 0.7) + (name.length % 3) * 0.4).toFixed(1);
      engagement = `${baseEng}%`;
    }
  }

  let reach = brand.reach;
  if (id === 'default-brand-pro' || name.toLowerCase().includes('genkai')) {
    if (!reach) reach = '85.0k';
  }

  const meta = { ...(brand.networksMetadata || brand.networks_metadata || {}) };
  channels.forEach((net) => {
    if (!meta[net]) {
      meta[net] = {
        handle: `${handle}.${net}`,
        token: `TOKEN_${net.toUpperCase()}_ACTIVE`,
        bio: `Canal oficial de ${name} em ${net}. Sincronização e monitoramento em tempo real ativados.`,
        followers: net === 'instagram' ? '18.4k' : net === 'tiktok' ? '22.1k' : '10.5k',
        engagement: `${(4.0 + (net.length % 4) * 0.8).toFixed(1)}%`,
        status: 'connected',
        lastSynced: new Date().toLocaleString('pt-BR')
      };
    }
  });

  const campaigns = brand.campaigns || [
    {
      id: `camp-${id}-1`,
      name: `Campanha de Conversão - ${name}`,
      status: 'active',
      budget: `R$ ${(12 + channels.length * 4)}.500`,
      reach: `${(28 * channels.length).toFixed(1)}k`,
      conversionRate: `${(3.8 + channels.length * 0.5).toFixed(1)}%`
    }
  ];

  return {
    ...brand,
    id,
    user_id: brand.user_id || null,
    name,
    handle,
    logo,
    category,
    color,
    connectedChannels: channels,
    followers,
    engagement,
    networksMetadata: meta,
    campaigns
  };
}

function sanitizeBrandsForCache(brands) {
  if (!Array.isArray(brands)) return brands;
  return brands.map((b) => {
    const meta = b?.networksMetadata || {};
    const safeMeta = {};
    for (const key of Object.keys(meta)) {
      const { token, ...rest } = meta[key] || {};
      safeMeta[key] = rest;
    }
    return { ...b, networksMetadata: safeMeta };
  });
}

function cacheBrands(brands) {
  try {
    localStorage.setItem('socialhub_brands_cache', JSON.stringify(sanitizeBrandsForCache(brands)));
  } catch (e) {}
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchWorkspaceData() {
      setLoading(true);
      try {
        let cachedBrands = null;
        try {
          const cachedStr = localStorage.getItem('socialhub_brands_cache');
          if (cachedStr) cachedBrands = JSON.parse(cachedStr);
        } catch (e) {}

        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('*')
          .order('name');

        let dbBrands = [];
        if (!brandsError && brandsData && brandsData.length > 0) {
          dbBrands = brandsData.map(b => enrichBrandData({
            id: b.id,
            user_id: b.user_id,
            name: b.name,
            logo: b.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
            handle: b.handle || `@${b.name.toLowerCase().replace(/\s+/g, '')}`,
            category: b.category || 'Geral',
            color: b.color || '#F26526',
            followers: b.followers || '0',
            engagement: b.engagement || '0%',
            connectedChannels: b.connected_networks || [],
            networksMetadata: b.networks_metadata || {}
          }));
        }

        let cached = [];
        if (cachedBrands && Array.isArray(cachedBrands)) {
          cached = cachedBrands.map(b => enrichBrandData(b));
        }

        const baseBrands = [DEFAULT_BRAND_PRO, ...DEMO_BRANDS].map(b => enrichBrandData(b));

        // Mescla garantindo unicidade de IDs e mantendo todas as marcas disponíveis
        const mergedMap = new Map();
        baseBrands.forEach(b => mergedMap.set(b.id, b));
        cached.forEach(b => mergedMap.set(b.id, b));
        dbBrands.forEach(b => mergedMap.set(b.id, b));

        const allBrands = Array.from(mergedMap.values());

        if (mounted) {
          setBrands(allBrands);
          const savedActiveId = localStorage.getItem('socialhub_active_brand_id');
          const targetActive = allBrands.find(ab => ab.id === savedActiveId) || allBrands[0];
          const enrichedActive = enrichBrandData(targetActive);
          setActiveBrand(enrichedActive);
          cacheBrands(allBrands);
        }

        // Tenta buscar posts reais do Supabase
        let currentPosts = INITIAL_POSTS;
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('scheduled_at', { ascending: false });

        if (!postsError && postsData && postsData.length > 0) {
          currentPosts = postsData;
        }

        // Garante que toda marca em allBrands possui posts realistas
        const enrichedPosts = [...currentPosts];
        allBrands.forEach(brand => {
          const hasPosts = enrichedPosts.some(p => p.brand_id === brand.id);
          if (!hasPosts) {
            enrichedPosts.push({
              id: `post-dyn-1-${brand.id}`,
              brand_id: brand.id,
              title: `Destaques e Estratégia Digital: ${brand.name} 🚀`,
              content: `Acompanhe nossas novas métricas de engajamento e campanhas ativas em todas as plataformas interativas! #${brand.name.replace(/\s+/g, '')} #SocialMedia #Inovação`,
              media_url: brand.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
              status: 'published',
              networks: brand.connectedChannels?.length > 0 ? brand.connectedChannels.slice(0, 2) : ['instagram', 'linkedin'],
              scheduled_at: new Date(Date.now() - 3600000).toISOString(),
              likes: 215,
              comments: 34,
              shares: 18
            });
            enrichedPosts.push({
              id: `post-dyn-2-${brand.id}`,
              brand_id: brand.id,
              title: `Agendamento Especial: Bastidores da Campanha`,
              content: `Conteúdo interativo exclusivo agendado para nossa comunidade. Prepare-se para interagir conosco em tempo real! ✨🔥`,
              media_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
              status: 'scheduled',
              networks: brand.connectedChannels?.length > 0 ? brand.connectedChannels : ['instagram'],
              scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
              likes: 0,
              comments: 0,
              shares: 0
            });
          }
        });

        if (mounted) {
          setPosts(enrichedPosts);
        }
      } catch (err) {
        console.warn('⚡ [WorkspaceContext] Usando fallback local para Workspace.', err);
        const fallbackBrands = [DEFAULT_BRAND_PRO, ...DEMO_BRANDS].map(b => enrichBrandData(b));
        if (mounted) {
          setBrands(fallbackBrands);
          const savedActiveId = localStorage.getItem('socialhub_active_brand_id');
          const targetActive = fallbackBrands.find(ab => ab.id === savedActiveId) || fallbackBrands[0];
          setActiveBrand(enrichBrandData(targetActive));
          setPosts(INITIAL_POSTS);
          cacheBrands(fallbackBrands);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchWorkspaceData();

    return () => {
      mounted = false;
    };
  }, [user]);

  const switchBrand = (brandId) => {
    const selected = brands.find((b) => b.id === brandId);
    if (selected) {
      const enriched = enrichBrandData(selected);
      setActiveBrand(enriched);
      try {
        localStorage.setItem('socialhub_active_brand_id', brandId);
      } catch (e) {}
    }
  };

  const addBrand = async (newBrandData) => {
    const dbBrand = {
      user_id: user?.id || null,
      name: newBrandData.name,
      logo_url: newBrandData.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      handle: newBrandData.handle || `@${newBrandData.name.toLowerCase().replace(/\s+/g, '')}`,
      category: newBrandData.category || 'Geral',
      color: newBrandData.color || '#F26526',
      followers: '0',
      engagement: '0%',
      connected_networks: newBrandData.connectedChannels || ['instagram', 'whatsapp', 'linkedin']
    };

    let savedBrand = null;
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert([dbBrand])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        savedBrand = enrichBrandData({
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          logo: data.logo_url,
          handle: data.handle,
          category: data.category,
          color: data.color,
          followers: data.followers,
          engagement: data.engagement,
          connectedChannels: data.connected_networks || ['instagram', 'whatsapp', 'linkedin'],
          networksMetadata: data.networks_metadata || {}
        });
      }
    } catch (e) {
      console.warn('Falha offline/erro ao salvar marca no Supabase, salvando localmente:', e);
      const fakeUuid = `brand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      savedBrand = enrichBrandData({
        id: fakeUuid,
        ...dbBrand,
        logo: dbBrand.logo_url,
        connectedChannels: ['instagram', 'whatsapp', 'linkedin'],
        networksMetadata: {}
      });
    }

    setBrands((prev) => {
      const nextBrands = [...prev, savedBrand];
      cacheBrands(nextBrands);
      return nextBrands;
    });
    setActiveBrand(savedBrand);
    try {
      localStorage.setItem('socialhub_active_brand_id', savedBrand.id);
    } catch (e) {}
    return savedBrand;
  };

  const toggleChannelConnection = async (brandId, channelId, metadata = null) => {
    let targetUpdatedBrand = null;
    setBrands((prevBrands) => {
      const nextBrands = prevBrands.map((b) => {
        if (b.id !== brandId) return b;
        const current = b.connectedChannels || [];
        const exists = current.includes(channelId);
        const nextChannels = exists
          ? current.filter((c) => c !== channelId)
          : [...current, channelId];

        const followersCount = nextChannels.length * 15400 + (b.name.length * 1200);
        const formattedFollowers = followersCount === 0 ? '0' : followersCount >= 1000 ? `${(followersCount/1000).toFixed(1)}k` : `${followersCount}`;
        const engRate = nextChannels.length === 0 ? '0%' : `${(3.8 + nextChannels.length * 0.8).toFixed(1)}%`;

        const updatedMetadata = { ...(b.networksMetadata || {}) };
        if (exists) {
          delete updatedMetadata[channelId];
        } else {
          updatedMetadata[channelId] = metadata || {
            handle: `${b.handle || '@' + b.name.toLowerCase().replace(/\s+/g, '')}.${channelId}`,
            token: `TOKEN_${channelId.toUpperCase()}_PROD`,
            bio: `Canal oficial verificado no ${channelId}. Sincronização automática ativa.`,
            followers: channelId === 'instagram' ? '24.5k' : '15.2k',
            engagement: `${(4.5 + nextChannels.length * 0.5).toFixed(1)}%`,
            status: 'connected',
            lastSynced: new Date().toLocaleString('pt-BR')
          };
        }

        const updatedBrand = enrichBrandData({
          ...b,
          connectedChannels: nextChannels,
          followers: formattedFollowers,
          engagement: engRate,
          networksMetadata: updatedMetadata
        });

        targetUpdatedBrand = updatedBrand;

        if (typeof brandId === 'string') {
          supabase
            .from('brands')
            .update({
              connected_networks: nextChannels,
              followers: formattedFollowers,
              engagement: engRate,
              networks_metadata: updatedMetadata
            })
            .eq('id', brandId)
            .then(({ error }) => {
              if (error) console.error('Erro ao atualizar canais no Supabase:', error);
            });
        }

        return updatedBrand;
      });

      cacheBrands(nextBrands);
      return nextBrands;
    });

    if (targetUpdatedBrand) {
      setActiveBrand(targetUpdatedBrand);
    }
  };

  const updateNetworkMetadata = async (brandId, networkId, metadataUpdate) => {
    let targetUpdatedBrand = null;
    setBrands((prevBrands) => {
      const nextBrands = prevBrands.map((b) => {
        if (b.id !== brandId) return b;
        const currentMetadata = b.networksMetadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          [networkId]: {
            ...(currentMetadata[networkId] || {}),
            ...metadataUpdate
          }
        };

        const updatedBrand = enrichBrandData({
          ...b,
          networksMetadata: updatedMetadata
        });

        targetUpdatedBrand = updatedBrand;

        if (typeof brandId === 'string') {
          supabase
            .from('brands')
            .update({
              networks_metadata: updatedMetadata
            })
            .eq('id', brandId)
            .then(({ error }) => {
              if (error) console.error('Erro ao atualizar metadados de rede no Supabase:', error);
            });
        }

        return updatedBrand;
      });

      cacheBrands(nextBrands);
      return nextBrands;
    });

    if (targetUpdatedBrand) {
      setActiveBrand(targetUpdatedBrand);
    }
  };

  const addPost = async (newPostData) => {
    if (!activeBrand) return null;

    const dbPost = {
      brand_id: activeBrand.id,
      title: newPostData.title || 'Postagem sem título',
      content: newPostData.content,
      media_url: newPostData.media_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      status: newPostData.status || 'scheduled',
      networks: newPostData.networks || ['instagram'],
      scheduled_at: newPostData.scheduled_at || new Date().toISOString(),
      likes: 0,
      comments: 0,
      shares: 0
    };

    let savedPost = null;
    try {
      const { data, error } = await supabase.from('posts').insert([dbPost]).select().single();
      if (error) throw error;
      savedPost = data;
    } catch (e) {
      console.warn('Salvando post apenas no estado local:', e?.message || e);
      savedPost = { id: `post-${Date.now()}`, ...dbPost };
    }

    setPosts((prev) => [savedPost, ...prev]);
    return savedPost;
  };

  const updatePostStatus = async (postId, newStatus) => {
    try {
      await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    } catch (e) {
      console.warn('Atualizando status apenas no estado local');
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
    );
  };

  const activeBrandPosts = posts.filter((p) => p.brand_id === activeBrand?.id);

  const value = {
    brands,
    activeBrand,
    setActiveBrand,
    switchBrand,
    workspaces: brands,
    activeWorkspace: activeBrand,
    setActiveWorkspace: setActiveBrand,
    switchWorkspace: switchBrand,
    addBrand,
    toggleChannelConnection,
    updateNetworkMetadata,
    posts,
    activeBrandPosts,
    addPost,
    updatePostStatus,
    loading
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);

