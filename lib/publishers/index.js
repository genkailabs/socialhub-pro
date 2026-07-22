// Publicadores por plataforma (PRD Fase 6). A rota de cron so orquestra a fila;
// COMO cada plataforma publica mora aqui, num ponto que da para testar sem rede.
//
// Duas regras do dominio moram neste modulo:
//   1. Formato manda em publicabilidade (lib/formats.js) E em COMO se publica.
//      Reel nunca chega como 'scheduled' — statusAfterApproval o manda para
//      'ready_to_post' —, mas o publicador recusa por garantia: o sistema nao
//      pode alegar ter publicado o que so entregou como roteiro (§5.1).
//      Story chega, sim, e publica por um caminho proprio da Graph API.
//   2. Falha de rede na Graph API e transitoria. Republicar a MESMA linha depois
//      de reivindicada e seguro (a idempotencia esta na fila, nao aqui), entao
//      vale um retry curto antes de marcar erro.
import {
  publishInstagramImage,
  publishInstagramCarousel,
  publishInstagramStory,
  publishInstagramReel,
  publishFacebookPhoto
} from '@/lib/meta/graph';
import { isPublishable } from '@/lib/formats';

// Graph real por padrao; testes injetam um fake sem tocar na rede.
const defaultGraph = { publishInstagramImage, publishInstagramCarousel, publishInstagramStory, publishInstagramReel, publishFacebookPhoto };

// Erros da Graph que valem nova tentativa. Rede/timeout/limite momentaneo sao
// transitorios; "midia invalida" ou "sem permissao" nao melhoram com retry.
const TRANSIENT = /(rate limit|timeout|timed out|ETIMEDOUT|ECONNRESET|ENOTFOUND|network|fetch failed|temporar|try again|503|502|500|429)/i;

export function isTransientError(err) {
  return TRANSIENT.test(err?.message || '');
}

// Retry com backoff linear. Puro na parte de decisao; o unico I/O e o sleep,
// injetavel para o teste nao esperar de verdade.
export async function withRetry(fn, { retries = 2, baseDelayMs = 300, isTransient = isTransientError, sleep = defaultSleep } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransient(err)) throw err;
      await sleep(baseDelayMs * (attempt + 1));
    }
  }
  throw lastErr;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Publicadores por plataforma. Recebem o token ja resolvido e as urls prontas.
const PLATFORM = {
  instagram: async ({ token, caption, urls, format, graph, post }) => {
    // Story e uma SEQUENCIA: cada arte vira um Story proprio, na ordem. Mandar
    // as artes como carrossel colocaria a sequencia no feed — outro lugar,
    // outro formato, outra intencao.
    if (format === 'stories') {
      const ids = [];
      for (const url of urls) {
        const isVideo = !!url.match(/\.(mp4|mov)(\?.*)?$/i);
        ids.push(await graph.publishInstagramStory({
          igId: token.platform_user_id,
          token: token.access_token,
          imageUrl: isVideo ? undefined : url,
          videoUrl: isVideo ? url : undefined,
          isVideo
        }));
      }
      // O primeiro card e o que abre a sequencia: e ele que a marca divulga.
      return ids[0];
    }
    if (format === 'reel') {
      return graph.publishInstagramReel({
        igId: token.platform_user_id,
        token: token.access_token,
        videoUrl: urls[0],
        coverUrl: post?.cover_url || undefined,
        caption,
        shareToFeed: post?.share_to_feed !== undefined ? Boolean(post.share_to_feed) : true
      });
    }
    if (urls.length > 1) {
      return graph.publishInstagramCarousel({ igId: token.platform_user_id, token: token.access_token, caption, imageUrls: urls });
    }
    return graph.publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption, imageUrl: urls[0] });
  },
  facebook: async ({ token, caption, urls, format, graph }) => {
    // Story do Facebook e outra API (e outro produto). Postar a arte vertical
    // como foto de feed seria entregar coisa diferente do que foi aprovado.
    if (format === 'stories') throw new Error('Story so publica no Instagram.');
    return graph.publishFacebookPhoto({ pageId: token.platform_user_id, pageToken: token.access_token, message: caption, imageUrl: urls[0] });
  }
};

export function canPublishPlatform(platform) {
  return Object.prototype.hasOwnProperty.call(PLATFORM, platform);
}

// Publica um post numa plataforma. Lanca em falha definitiva; retenta as
// transitorias. Devolve o mediaId da plataforma.
//
// `format` opcional: quando vier, recusa formato nao publicavel (§5.1). Sem ele,
// segue como antes — a fila so contem publicaveis, mas a checagem e barata.
export async function publishPostTo({ platform, token, caption, urls, format, graph = defaultGraph, retryOptions, post } = {}) {
  if (!canPublishPlatform(platform)) throw new Error(`Plataforma sem publicador: ${platform}`);
  if (format != null && !isPublishable(format)) throw new Error(`Formato nao publicavel automaticamente: ${format}`);
  if (!token) throw new Error('sem token');
  if (!urls || !urls.length) throw new Error('sem midia');

  const mediaId = await withRetry(() => PLATFORM[platform]({ token, caption: caption || '', urls, format, graph, post }), retryOptions || {});
  return mediaId;
}

// Redes que sabemos publicar de um post. Fonte unica para a rota nao repetir a
// regra de "instagram|facebook".
export function publishableNetworks(post) {
  const nets = post?.networks && post.networks.length ? post.networks : ['instagram'];
  return nets.filter(canPublishPlatform);
}

// Urls de midia do post, na ordem: media_urls (carrossel) ou media_url (uma so).
export function mediaUrlsOf(post) {
  if (post?.media_urls && post.media_urls.length) return post.media_urls.filter(Boolean);
  return post?.media_url ? [post.media_url] : [];
}
