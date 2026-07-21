const GRAPH = 'https://graph.facebook.com/v21.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Lista as Páginas do usuário (cada uma com seu próprio page access token).
export async function discoverPages(longToken) {
  const url = `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}&access_token=${longToken}`;
  const data = await (await fetch(url)).json();
  if (data.error) throw new Error(data.error.message || 'Erro ao buscar páginas do Facebook');

  const pages = data.data || [];
  if (pages.length === 0) {
    throw new Error('Nenhuma Página retornada pelo Facebook. Na autorização, marque TODAS as caixas das suas Páginas.');
  }
  // Prioriza a Página que tem IG Business vinculado (permite conectar IG + FB de uma vez).
  const page = pages.find((p) => p.instagram_business_account) || pages[0];
  return { page, pages };
}

// Descobre a conta IG Business vinculada a alguma Página do usuário.
export async function discoverInstagramAccount(longToken) {
  const { page, pages } = await discoverPages(longToken);
  if (!page.instagram_business_account) {
    const names = pages.map((p) => p.name).join(', ');
    throw new Error(`Nenhuma conta Instagram Business vinculada às suas Páginas. Converta o IG para Profissional e vincule a uma Página. Páginas: ${names}`);
  }
  return { igAccount: page.instagram_business_account, page };
}

// Publica uma foto no feed de uma Página do Facebook (usa o page access token).
export async function publishFacebookPhoto({ pageId, pageToken, message, imageUrl }) {
  const params = new URLSearchParams({ url: imageUrl, access_token: pageToken });
  if (message != null) params.set('caption', message);
  const res = await (await fetch(`${GRAPH}/${pageId}/photos?${params}`, { method: 'POST' })).json();
  if (res.error) throw new Error(`Facebook: ${res.error.message}`);
  return res.post_id || res.id;
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

// ---- Publicação (containers → status → media_publish) ----

async function createImageContainer({ igId, token, imageUrl, caption, isCarouselItem }) {
  const params = new URLSearchParams({ image_url: imageUrl, access_token: token });
  if (caption != null) params.set('caption', caption);
  if (isCarouselItem) params.set('is_carousel_item', 'true');
  const res = await (await fetch(`${GRAPH}/${igId}/media?${params}`, { method: 'POST' })).json();
  if (res.error) throw new Error(`Container: ${res.error.message}`);
  return res.id;
}

async function waitContainerReady({ containerId, token, tries = 6, delay = 1500 }) {
  for (let i = 0; i < tries; i++) {
    await sleep(delay);
    const st = await (await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${token}`)).json();
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('A mídia não pôde ser processada pelo Instagram.');
  }
  // imagens costumam ficar prontas rápido; segue e deixa o media_publish (com retry) resolver
}

async function publishContainer({ igId, token, creationId }) {
  const pubUrl = `${GRAPH}/${igId}/media_publish?${new URLSearchParams({ creation_id: creationId, access_token: token })}`;
  let pub = null;
  for (let i = 0; i < 3; i++) {
    pub = await (await fetch(pubUrl, { method: 'POST' })).json();
    if (!pub.error) break;
    await sleep(3000);
  }
  if (pub?.error) throw new Error(`Publicação: ${pub.error.message}`);
  return pub.id;
}

// Publica uma imagem única no feed do Instagram.
export async function publishInstagramImage({ igId, token, caption, imageUrl }) {
  const containerId = await createImageContainer({ igId, token, imageUrl, caption });
  await waitContainerReady({ containerId, token });
  return publishContainer({ igId, token, creationId: containerId });
}

// Publica um carrossel (2 a 10 imagens) no feed do Instagram.
export async function publishInstagramCarousel({ igId, token, caption, imageUrls }) {
  const urls = (imageUrls || []).filter(Boolean);
  if (urls.length < 2) throw new Error('Carrossel exige ao menos 2 imagens.');

  const children = [];
  for (const url of urls) {
    children.push(await createImageContainer({ igId, token, imageUrl: url, isCarouselItem: true }));
  }
  for (const id of children) await waitContainerReady({ containerId: id, token });

  const params = new URLSearchParams({ media_type: 'CAROUSEL', children: children.join(','), access_token: token });
  if (caption != null) params.set('caption', caption);
  const parent = await (await fetch(`${GRAPH}/${igId}/media?${params}`, { method: 'POST' })).json();
  if (parent.error) throw new Error(`Carrossel: ${parent.error.message}`);

  await waitContainerReady({ containerId: parent.id, token });
  return publishContainer({ igId, token, creationId: parent.id });
}

// Publica o "primeiro comentário" (hashtags/links) logo após o post.
export async function publishInstagramComment({ token, mediaId, comment }) {
  if (!comment || !comment.trim()) return null;
  const url = `${GRAPH}/${mediaId}/comments?${new URLSearchParams({ message: comment, access_token: token })}`;
  const res = await (await fetch(url, { method: 'POST' })).json();
  if (res.error) throw new Error(`Comentário: ${res.error.message}`);
  return res.id;
}
