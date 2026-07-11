const GRAPH = 'https://graph.facebook.com/v21.0';

export function buildAuthUrl({ appId, redirectUri, state, scopes }) {
  const p = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code'
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

export async function exchangeCodeForToken({ code, appId, appSecret, redirectUri }) {
  const url = `${GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
  const data = await (await fetch(url)).json();
  if (data.error) throw new Error(data.error.message || 'Erro ao obter access token');
  return data.access_token;
}

export async function exchangeForLongLivedToken({ shortToken, appId, appSecret }) {
  const url = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
  const data = await (await fetch(url)).json();
  return {
    token: data.access_token || shortToken,
    expiresIn: data.expires_in || 60 * 60 * 24 * 60
  };
}

// Descobre a conta IG Business vinculada a alguma Página do usuário.
// Retorna { igAccount, page } ou lança erro com diagnóstico acionável.
export async function discoverInstagramAccount(longToken) {
  const url = `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}&access_token=${longToken}`;
  const data = await (await fetch(url)).json();
  if (data.error) throw new Error(data.error.message || 'Erro ao buscar páginas do Facebook');

  const pages = data.data || [];
  if (pages.length === 0) {
    throw new Error('Nenhuma Página retornada pelo Facebook. Na autorização, marque TODAS as caixas das suas Páginas e do Instagram.');
  }
  const page = pages.find((p) => p.instagram_business_account);
  if (!page) {
    const names = pages.map((p) => p.name).join(', ');
    throw new Error(`Nenhuma conta Instagram Business vinculada às suas Páginas. Converta o IG para Profissional e vincule a uma Página. Páginas: ${names}`);
  }
  return { igAccount: page.instagram_business_account, page };
}

// Métricas: cache de 10 min para não estourar rate limit da Graph API.
const METRICS_CACHE = { next: { revalidate: 600 } };

export async function fetchInstagramProfile(igId, token) {
  const url = `${GRAPH}/${igId}?fields=followers_count,media_count,name,username,profile_picture_url,biography&access_token=${token}`;
  const data = await (await fetch(url, METRICS_CACHE)).json();
  if (data.error) throw new Error(`Graph API (perfil): ${data.error.message}`);
  return data;
}

export async function fetchInstagramMedia(igId, token, limit = 15) {
  const url = `${GRAPH}/${igId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${token}`;
  const data = await (await fetch(url, METRICS_CACHE)).json();
  if (data.error) throw new Error(`Graph API (mídia): ${data.error.message}`);
  return data.data || [];
}
