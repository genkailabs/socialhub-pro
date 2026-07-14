// Google OAuth 2.0 + YouTube Data/Analytics API. App é read-only: lê canal e métricas.
// Escopos: leitura do canal/uploads + relatórios do YouTube Analytics.
import { parseChannelReport, parseVideoReport } from '@/lib/youtube/analytics';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly'
].join(' ');

const OAUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
const ANALYTICS = 'https://youtubeanalytics.googleapis.com/v2/reports';

export function buildAuthUrl({ clientId, redirectUri, state }) {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',   // pede refresh_token
    prompt: 'consent',        // força retorno do refresh_token mesmo em reautorização
    include_granted_scopes: 'true',
    state
  });
  return `${OAUTH}?${p.toString()}`;
}

export async function exchangeCodeForToken({ code, clientId, clientSecret, redirectUri }) {
  const body = new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: redirectUri, grant_type: 'authorization_code'
  });
  const data = await (await fetch(TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  })).json();
  if (data.error) throw new Error(data.error_description || data.error);
  // { access_token, refresh_token, expires_in, scope, token_type }
  return data;
}

export async function refreshAccessToken({ refreshToken, clientId, clientSecret }) {
  const body = new URLSearchParams({
    refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret,
    grant_type: 'refresh_token'
  });
  const data = await (await fetch(TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  })).json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data; // { access_token, expires_in, scope, token_type }
}

// Descobre o canal do usuário autenticado (nome + handle para exibir na UI).
export async function getChannel(accessToken) {
  const url = `${API}/channels?part=snippet&mine=true`;
  const data = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (data.error) throw new Error(data.error.message || 'Erro ao buscar canal do YouTube');
  const ch = data.items?.[0];
  if (!ch) throw new Error('Nenhum canal do YouTube encontrado nesta conta Google.');
  return {
    id: ch.id,
    title: ch.snippet?.title || 'Canal',
    handle: ch.snippet?.customUrl || null,
    thumbnail: ch.snippet?.thumbnails?.default?.url || null
  };
}

// Lista os uploads do canal (id, título, data de publicação real).
export async function listChannelVideos(accessToken, max = 25) {
  const chUrl = `${API}/channels?part=contentDetails&mine=true`;
  const chData = await (await fetch(chUrl, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (chData.error) throw new Error(chData.error.message || 'Erro ao ler canal.');
  const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];
  const plUrl = `${API}/playlistItems?part=snippet,contentDetails&maxResults=${max}&playlistId=${uploads}`;
  const plData = await (await fetch(plUrl, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (plData.error) throw new Error(plData.error.message || 'Erro ao listar vídeos.');
  return (plData.items || []).map((it) => ({
    videoId: it.contentDetails?.videoId,
    title: it.snippet?.title || '',
    publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || null
  })).filter((v) => v.videoId);
}

// Agregado do canal para uma data (Analytics API). date = 'YYYY-MM-DD'.
export async function getChannelStats(accessToken, date) {
  const p = new URLSearchParams({
    ids: 'channel==MINE',
    startDate: date, endDate: date,
    metrics: 'views,estimatedMinutesWatched,subscribersGained'
  });
  const data = await (await fetch(`${ANALYTICS}?${p}`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (data.error) throw new Error(data.error.message || 'Erro no Analytics do canal.');
  return parseChannelReport(data);
}

// Métricas acumuladas de um vídeo entre startDate e endDate.
export async function getVideoStats(accessToken, videoId, startDate, endDate) {
  const p = new URLSearchParams({
    ids: 'channel==MINE',
    startDate, endDate,
    metrics: 'views,likes,comments,averageViewPercentage,estimatedMinutesWatched',
    filters: `video==${videoId}`
  });
  const data = await (await fetch(`${ANALYTICS}?${p}`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (data.error) throw new Error(data.error.message || 'Erro no Analytics do vídeo.');
  return parseVideoReport(data);
}
