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
    engagement: '5.4%'
  },
  {
    id: 'brand-starlight',
    name: 'Starlight Fashion',
    handle: '@starlightfashion',
    logo: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&auto=format&fit=crop&q=80',
    category: 'Moda & Varejo',
    color: '#1A73E8',
    followers: '128.9k',
    engagement: '6.8%'
  },
  {
    id: 'brand-techpulse',
    name: 'TechPulse',
    handle: '@techpulse_ai',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    category: 'Inteligência Artificial',
    color: '#8B5CF6',
    followers: '89.1k',
    engagement: '4.9%'
  }
];

// Dados iniciais de postagens para enriquecer os testes de Calendário, Dashboard e Inbox
export const INITIAL_POSTS = [
  {
    id: 'post-1',
    brand_id: 'brand-acme',
    title: 'Lançamento da Nova Plataforma Cloud 3.0',
    content: 'Estamos entusiasmados em apresentar nossa nova arquitetura nativa em nuvem! Mais velocidade, estabilidade e segurança para seu negócio de ponta a ponta. 🚀💻 #AcmeCloud #Inovação #TechNews',
    media_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    status: 'published', // draft, waiting_approval, scheduled, published
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
    networks: ['instagram'],
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
    networks: ['linkedin'],
    scheduled_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    likes: 0,
    comments: 0,
    shares: 0
  }
];

export function WorkspaceProvider({ children }) {
  const { user, isDemo } = useAuth();
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchWorkspaceData() {
      if (!user) return;
      setLoading(true);

      try {
        // Tenta buscar marcas reais do Supabase
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('*')
          .order('name');

        if (!brandsError && brandsData && brandsData.length > 0) {
          if (mounted) {
            const normalized = brandsData.map(b => ({
              ...b,
              connectedChannels: b.connectedChannels || ['instagram', 'whatsapp']
            }));
            setBrands(normalized);
            setActiveBrand(normalized[0]);
          }
        } else {
          // Quando não houver marcas no banco, iniciar com lista vazia para o usuário cadastrar a sua marca real
          if (mounted) {
            setBrands([]);
            setActiveBrand(null);
          }
        }

        // Tenta buscar posts reais do Supabase
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('scheduled_at', { ascending: false });

        if (!postsError && postsData && postsData.length > 0) {
          if (mounted) setPosts(postsData);
        } else {
          if (mounted) setPosts(INITIAL_POSTS);
        }
      } catch (err) {
        console.warn('⚡ [WorkspaceContext] Usando dados locais do Workspace.', err);
        if (mounted) {
          setBrands([]);
          setActiveBrand(null);
          setPosts(INITIAL_POSTS);
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
      setActiveBrand(selected);
    }
  };

  const addBrand = async (newBrandData) => {
    const newBrand = {
      id: `brand-${Date.now()}`,
      name: newBrandData.name,
      handle: newBrandData.handle || `@${newBrandData.name.toLowerCase().replace(/\s+/g, '')}`,
      logo: newBrandData.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      category: newBrandData.category || 'Geral',
      color: newBrandData.color || '#F26526',
      followers: '0',
      engagement: '0%',
      connectedChannels: []
    };

    try {
      await supabase.from('brands').insert([newBrand]);
    } catch (e) {
      console.warn('Salvando nova marca apenas no estado local');
    }

    setBrands((prev) => [...prev, newBrand]);
    setActiveBrand(newBrand);
    return newBrand;
  };

  const toggleChannelConnection = (brandId, channelId) => {
    setBrands((prevBrands) =>
      prevBrands.map((b) => {
        if (b.id !== brandId) return b;
        const current = b.connectedChannels || [];
        const exists = current.includes(channelId);
        const nextChannels = exists
          ? current.filter((c) => c !== channelId)
          : [...current, channelId];
        
        // Recalcula seguidores e engajamento com base nos canais ativos da marca
        const followersCount = nextChannels.length * 14200;
        const formattedFollowers = followersCount === 0 ? '0' : followersCount >= 1000 ? `${(followersCount/1000).toFixed(1)}k` : `${followersCount}`;
        const engRate = nextChannels.length === 0 ? '0%' : `${(3.5 + nextChannels.length * 0.9).toFixed(1)}%`;

        const updatedBrand = {
          ...b,
          connectedChannels: nextChannels,
          followers: formattedFollowers,
          engagement: engRate
        };
        if (activeBrand && activeBrand.id === brandId) {
          setActiveBrand(updatedBrand);
        }
        return updatedBrand;
      })
    );
  };

  const addPost = async (newPostData) => {
    if (!activeBrand) return null;
    const newPost = {
      id: `post-${Date.now()}`,
      brand_id: activeBrand.id,
      title: newPostData.title || 'Postagem sem título',
      content: newPostData.content,
      media_url: newPostData.media_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      status: newPostData.status || 'scheduled',
      networks: newPostData.networks || ['instagram'],
      scheduled_at: newPostData.scheduled_at || new Date().toISOString(),
      likes: 0,
      comments: 0,
      shares: 0,
      ...newPostData
    };

    try {
      await supabase.from('posts').insert([newPost]);
    } catch (e) {
      console.warn('Salvando novo post apenas no estado local');
    }

    setPosts((prev) => [newPost, ...prev]);
    return newPost;
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

  // Filtra posts pela marca ativa
  const activeBrandPosts = posts.filter((p) => p.brand_id === activeBrand?.id);

  const value = {
    brands,
    activeBrand,
    setActiveBrand,
    switchBrand,
    addBrand,
    toggleChannelConnection,
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
