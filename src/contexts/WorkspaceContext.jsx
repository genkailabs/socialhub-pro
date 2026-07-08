import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext({});

// Função utilitária para normalizar dados de marca vindos do DB ou criados pelo usuário
export function enrichBrandData(brand) {
  if (!brand) return null;
  const id = brand.id || `brand-${Date.now()}`;
  const name = brand.name || 'Nova Marca';
  const handle = brand.handle || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const category = brand.category || 'Geral';
  const color = brand.color || '#F26526';
  const logo = brand.logo || brand.logo_url || '';

  const channels = brand.connectedChannels || brand.connected_networks || [];
  const followers = brand.followers || '0';
  const engagement = brand.engagement || '0%';
  const reach = brand.reach || '0';
  const meta = brand.networksMetadata || brand.networks_metadata || {};
  const campaigns = brand.campaigns || [];

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
    reach,
    networksMetadata: meta,
    campaigns
  };
}

function cacheBrands(brands) {
  try {
    localStorage.setItem('socialhub_brands_cache', JSON.stringify(brands));
  } catch (e) {}
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchWorkspaceData() {
      setLoading(true);
      try {
        // Busca marcas do Supabase (apenas dados reais do usuário)
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
            logo: b.logo_url || '',
            handle: b.handle || `@${b.name.toLowerCase().replace(/\s+/g, '')}`,
            category: b.category || 'Geral',
            color: b.color || '#F26526',
            followers: b.followers || '0',
            engagement: b.engagement || '0%',
            connectedChannels: b.connected_networks || [],
            networksMetadata: b.networks_metadata || {}
          }));
        }

        if (mounted) {
          setBrands(dbBrands);
          
          if (dbBrands.length > 0) {
            const savedActiveId = localStorage.getItem('socialhub_active_brand_id');
            const targetActive = dbBrands.find(ab => ab.id === savedActiveId) || dbBrands[0];
            setActiveBrand(enrichBrandData(targetActive));
          } else {
            setActiveBrand(null);
          }
          
          cacheBrands(dbBrands);
        }

        // Busca posts reais do Supabase
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('scheduled_at', { ascending: false });

        if (mounted) {
          setPosts(!postsError && postsData ? postsData : []);
        }
      } catch (err) {
        console.warn('⚡ [WorkspaceContext] Erro ao buscar dados:', err);
        if (mounted) {
          setBrands([]);
          setActiveBrand(null);
          setPosts([]);
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
      logo_url: newBrandData.logo || '',
      handle: newBrandData.handle || `@${newBrandData.name.toLowerCase().replace(/\s+/g, '')}`,
      category: newBrandData.category || 'Geral',
      color: newBrandData.color || '#F26526',
      followers: '0',
      engagement: '0%',
      connected_networks: [],
      networks_metadata: {}
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
          followers: data.followers || '0',
          engagement: data.engagement || '0%',
          connectedChannels: data.connected_networks || [],
          networksMetadata: data.networks_metadata || {}
        });
      }
    } catch (e) {
      console.warn('Falha ao salvar marca no Supabase, salvando localmente:', e);
      const fakeUuid = `brand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      savedBrand = enrichBrandData({
        id: fakeUuid,
        ...dbBrand,
        logo: dbBrand.logo_url,
        connectedChannels: [],
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

        const updatedMetadata = { ...(b.networksMetadata || {}) };
        if (exists) {
          delete updatedMetadata[channelId];
        } else {
          updatedMetadata[channelId] = metadata || {
            handle: `${b.handle || '@' + b.name.toLowerCase().replace(/\s+/g, '')}.${channelId}`,
            token: '',
            bio: `Canal oficial no ${channelId}.`,
            followers: '0',
            engagement: '0%',
            status: 'connected',
            lastSynced: new Date().toLocaleString('pt-BR')
          };
        }

        const updatedBrand = enrichBrandData({
          ...b,
          connectedChannels: nextChannels,
          networksMetadata: updatedMetadata
        });

        targetUpdatedBrand = updatedBrand;

        if (typeof brandId === 'string') {
          supabase
            .from('brands')
            .update({
              connected_networks: nextChannels,
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
      media_url: newPostData.media_url || '',
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
