// api/meta/callback.js
// Endpoint Serverless da Vercel para receber o callback da Meta e salvar tokens reais no Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://geoqbbrlyepmhwgdbjmz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3FiYnJseWVwbWh3Z2Riam16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NjYzNTMsImV4cCI6MjA5OTA0MjM1M30.n7258I3YtCpF3pq6VlYkgYJ_z04fSnNVSEDKRT5tc1Q';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query;
  const baseUrl = process.env.VITE_APP_URL || 'https://socialhub-pro-steel.vercel.app';

  async function logAudit(brandId, status, msg) {
    try {
      await supabase.from('social_sync_logs').insert({
        brand_id: brandId || 'default-brand-pro',
        platform: 'instagram_oauth',
        status,
        error_message: msg,
        synced_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Falha no logAudit:', e);
    }
  }

  if (error) {
    console.error('Meta OAuth Error:', error, error_description);
    await logAudit('default-brand-pro', 'error', `Meta OAuth Error: ${error_description || error}`);
    return res.redirect(302, `${baseUrl}/connections?error=${encodeURIComponent(error_description || 'Falha na autorização do Instagram')}`);
  }
  
  if (!code) {
    await logAudit('default-brand-pro', 'error', 'Código de autorização não recebido da Meta');
    return res.redirect(302, `${baseUrl}/connections?error=${encodeURIComponent('Código de autorização não recebido da Meta')}`);
  }
  
  try {
    let brandId = 'default-brand-pro';
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (decodedState.brand_id) brandId = decodedState.brand_id;
      } catch (e) {
        console.warn('Falha ao decodificar state OAuth:', e);
      }
    }
    
    const appId = process.env.META_APP_ID || '1398041688806808';
    const appSecret = process.env.META_APP_SECRET || 'b3732c96d8da9619b6eac2f5f872e493';
    const callbackUrl = `${baseUrl}/api/meta/callback`;
    
    // 1. Trocar o authorization code por Short-Lived Access Token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Erro ao obter access token');
    }
    
    const shortToken = tokenData.access_token;
    
    // 2. Trocar Short-Lived Token por Long-Lived Token (válido por 60 dias)
    const longTokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();
    
    const longToken = longTokenData.access_token || shortToken;
    const expiresIn = longTokenData.expires_in || (60 * 60 * 24 * 60); // 60 dias em segundos
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    
    // 3. Obter contas conectadas ao usuário (Facebook Pages e Instagram Business Accounts)
    const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}&access_token=${longToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();
    
    if (accountsData.error) {
      throw new Error(accountsData.error.message || 'Erro ao buscar páginas do Facebook');
    }
    
    const pages = accountsData.data || [];

    if (pages.length === 0) {
      let debugPerms = '';
      try {
        const permsRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${longToken}`);
        const permsData = await permsRes.json();
        debugPerms = JSON.stringify(permsData.data || permsData);
      } catch(e) {}
      await logAudit(brandId, 'error', `Nenhuma Pagina retornada pela Meta (/me/accounts retornou []). Permissoes concedidas: ${debugPerms}`);
      return res.redirect(302, `${baseUrl}/connections?error=${encodeURIComponent('Nenhuma Página retornada pelo Facebook. Na janela de autorização do Facebook, clique em "Editar Configurações" e marque TODAS as caixas das suas Páginas e do Instagram.')}`);
    }

    let igAccount = null;
    let pageData = null;

    // Procura uma pagina que tenha conta do Instagram Business vinculada
    for (const page of pages) {
      if (page.instagram_business_account) {
        igAccount = page.instagram_business_account;
        pageData = page;
        break;
      }
    }

    if (!igAccount) {
      // Lista as paginas encontradas para ajudar no diagnostico
      const pageNames = pages.map(p => p.name).join(', ');
      console.log('Paginas encontradas sem IG Business:', pageNames);
      return res.redirect(302, `${baseUrl}/connections?error=${encodeURIComponent('Nenhuma conta do Instagram Business vinculada as suas Paginas do Facebook. Passos: 1) Converta seu Instagram para conta Profissional/Business. 2) No Instagram, va em Editar Perfil > Negocios > Conectar a uma Pagina do Facebook. Paginas encontradas: ' + pageNames)}`);
    }
    
    // 4. Salvar token na tabela social_tokens
    const tokenRecord = {
      brand_id: brandId,
      platform: 'instagram',
      access_token: longToken,
      token_expires_at: expiresAt,
      platform_user_id: igAccount.id,
      platform_username: igAccount.username || igAccount.name,
      platform_data: {
        page_id: pageData.id,
        page_name: pageData.name,
        profile_picture_url: igAccount.profile_picture_url || null
      },
      is_active: true,
      last_synced_at: new Date().toISOString()
    };
    
    const { error: upsertErr } = await supabase
      .from('social_tokens')
      .upsert(tokenRecord, { onConflict: 'brand_id,platform' });

    if (upsertErr) {
      console.error('Erro ao gravar token em social_tokens:', upsertErr);
      throw new Error(`Erro ao salvar token no banco: ${upsertErr.message}`);
    }
      
    // Também atualiza a tabela brands para reflexo imediato na interface
    const { data: brand } = await supabase
      .from('brands')
      .select('connected_networks, networks_metadata')
      .eq('id', brandId)
      .single();
      
    if (brand) {
      const networks = new Set(brand.connected_networks || []);
      networks.add('instagram');
      
      const meta = brand.networks_metadata || {};
      meta.instagram = {
        ...meta.instagram,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        username: igAccount.username || igAccount.name,
        profilePicture: igAccount.profile_picture_url || null,
        accountId: igAccount.id,
        isRealApi: true
      };
      
      await supabase
        .from('brands')
        .update({
          connected_networks: Array.from(networks),
          networks_metadata: meta
        })
        .eq('id', brandId);
    }
    
    await logAudit(brandId, 'success', `Token gravado com sucesso para @${igAccount.username || igAccount.name} (IG ID: ${igAccount.id})`);

    // Redireciona para a tela de conexões com sucesso
    res.redirect(302, `${baseUrl}/connections?status=success&platform=instagram&username=${encodeURIComponent(igAccount.username || igAccount.name)}`);
  } catch (err) {
    console.error('Erro no callback OAuth Meta:', err);
    await logAudit('default-brand-pro', 'error', `Exceção no callback: ${err.message || err}`);
    res.redirect(302, `${baseUrl}/connections?error=${encodeURIComponent(err.message || 'Erro interno ao processar autorização')}`);
  }
}
