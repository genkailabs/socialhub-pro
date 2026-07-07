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
            setBrands(normalized);
            setActiveBrand(normalized[0]);
          }
        } else {
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
    if (!user) return null;

    const dbBrand = {
      user_id: user.id,
      name: newBrandData.name,
      logo_url: newBrandData.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      handle: newBrandData.handle || `@${newBrandData.name.toLowerCase().replace(/\s+/g, '')}`,
      category: newBrandData.category || 'Geral',
      color: newBrandData.color || '#F26526',
      followers: '0',
      engagement: '0%',
      connected_networks: []
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
        savedBrand = {
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          logo: data.logo_url,
          handle: data.handle,
          category: data.category,
          color: data.color,
          followers: data.followers,
          engagement: data.engagement,
          connectedChannels: data.connected_networks || [],
          networksMetadata: data.networks_metadata || {}
        };
      }
    } catch (e) {
      console.error('Erro ao salvar marca no Supabase:', e);
      // Fallback local caso dê erro ou não configure o banco ainda
      savedBrand = {
        id: `brand-${Date.now()}`,
        ...dbBrand,
        logo: dbBrand.logo_url,
        connectedChannels: [],
        networksMetadata: {}
      };
    }

    setBrands((prev) => [...prev, savedBrand]);
    setActiveBrand(savedBrand);
    return savedBrand;
  };

  const toggleChannelConnection = async (brandId, channelId, metadata = null) => {
    setBrands((prevBrands) =>
      prevBrands.map((b) => {
        if (b.id !== brandId) return b;
        const current = b.connectedChannels || [];
        const exists = current.includes(channelId);
        const nextChannels = exists
          ? current.filter((c) => c !== channelId)
          : [...current, channelId];
        
        const followersCount = nextChannels.length * 14200;
        const formattedFollowers = followersCount === 0 ? '0' : followersCount >= 1000 ? `${(followersCount/1000).toFixed(1)}k` : `${followersCount}`;
        const engRate = nextChannels.length === 0 ? '0%' : `${(3.5 + nextChannels.length * 0.9).toFixed(1)}%`;

        const updatedMetadata = { ...(b.networksMetadata || {}) };
        if (exists) {
          delete updatedMetadata[channelId];
        } else {
          updatedMetadata[channelId] = metadata || {
            handle: `@${b.name.toLowerCase().replace(/\s+/g, '')}.${channelId}`,
            token: `TOKEN_${channelId.toUpperCase()}_PROD`
          };
        }

        const updatedBrand = {
          ...b,
          connectedChannels: nextChannels,
          followers: formattedFollowers,
          engagement: engRate,
          networksMetadata: updatedMetadata
        };

        if (typeof brandId === 'string' && !brandId.startsWith('brand-')) {
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

        if (activeBrand && activeBrand.id === brandId) {
          setActiveBrand(updatedBrand);
        }
        return updatedBrand;
      })
    );
  };

  const updateNetworkMetadata = async (brandId, networkId, metadataUpdate) => {
    setBrands((prevBrands) =>
      prevBrands.map((b) => {
        if (b.id !== brandId) return b;
        const currentMetadata = b.networksMetadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          [networkId]: {
            ...(currentMetadata[networkId] || {}),
            ...metadataUpdate
          }
        };

        const updatedBrand = {
          ...b,
          networksMetadata: updatedMetadata
        };

        if (typeof brandId === 'string' && !brandId.startsWith('brand-')) {
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
