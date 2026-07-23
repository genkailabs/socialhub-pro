import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = 'https://graph.facebook.com/v21.0';
const MAX_ATTEMPTS = 3;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function requireCronAuth(request: Request) {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(key && request.headers.get('authorization') === `Bearer ${key}`);
}

function urlsOf(post: Record<string, unknown>) {
  const many = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  return many.length ? many : post.media_url ? [post.media_url] : [];
}

function temporaryPath(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const clean = value.split('?')[0];
  if (clean.startsWith('temp/')) return clean;
  const marker = '/storage/v1/object/public/media/';
  const index = clean.indexOf(marker);
  if (index === -1) return null;
  const path = clean.slice(index + marker.length).replace(/^\/+/, '');
  return path.startsWith('temp/') ? path : null;
}

async function graphPost(path: string, params: URLSearchParams) {
  const response = await fetch(`${GRAPH}/${path}?${params}`, { method: 'POST' });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || `Meta respondeu ${response.status}`);
  return data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitContainerReady(creationId: string, accessToken: string, tries = 20, delayMs = 3000) {
  for (let i = 0; i < tries; i++) {
    await sleep(delayMs);
    const st = await (await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${accessToken}`)).json();
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR') throw new Error('A mídia não pôde ser processada pelo Instagram.');
  }
}

// Story (MVP V2): arte estatica 1080x1920 ou video curto, uma publicacao por card, na ordem.
// Story nao tem legenda — a Meta ignora `caption` em media_type=STORIES.
async function publishInstagramStories(token: Record<string, string>, urls: string[]) {
  const ids: string[] = [];
  for (const url of urls) {
    const isVideo = !!url.match(/\.(mp4|mov)(\?.*)?$/i);
    const params = new URLSearchParams({ media_type: 'STORIES', access_token: token.access_token });
    if (isVideo) {
      params.set('video_url', url);
    } else {
      params.set('image_url', url);
    }
    const container = await graphPost(`${token.platform_user_id}/media`, params);
    
    if (isVideo) {
      await waitContainerReady(container.id, token.access_token, 20, 3000);
    } else {
      await waitContainerReady(container.id, token.access_token, 6, 1500);
    }

    const published = await graphPost(`${token.platform_user_id}/media_publish`, new URLSearchParams({ creation_id: container.id, access_token: token.access_token }));
    ids.push(published.id);
  }
  return ids[0];
}

async function publishInstagramReels(token: Record<string, string>, caption: string, url: string, coverUrl?: string | null, shareToFeed?: boolean | null) {
  const params = new URLSearchParams({
    video_url: url,
    media_type: 'REELS',
    access_token: token.access_token
  });
  if (caption) params.set('caption', caption);
  if (coverUrl) params.set('cover_url', coverUrl);
  if (shareToFeed !== undefined && shareToFeed !== null) {
    params.set('share_to_feed', shareToFeed ? 'true' : 'false');
  } else {
    params.set('share_to_feed', 'true');
  }

  const container = await graphPost(`${token.platform_user_id}/media`, params);
  await waitContainerReady(container.id, token.access_token, 20, 3000);
  const published = await graphPost(`${token.platform_user_id}/media_publish`, new URLSearchParams({ creation_id: container.id, access_token: token.access_token }));
  return published.id;
}

async function publishInstagram(token: Record<string, string>, caption: string, urls: string[]) {
  if (urls.length === 1) {
    const container = await graphPost(`${token.platform_user_id}/media`, new URLSearchParams({ image_url: urls[0], caption, access_token: token.access_token }));
    const published = await graphPost(`${token.platform_user_id}/media_publish`, new URLSearchParams({ creation_id: container.id, access_token: token.access_token }));
    return published.id;
  }
  const children: string[] = [];
  for (const url of urls) {
    const item = await graphPost(`${token.platform_user_id}/media`, new URLSearchParams({ image_url: url, is_carousel_item: 'true', access_token: token.access_token }));
    children.push(item.id);
  }
  const parent = await graphPost(`${token.platform_user_id}/media`, new URLSearchParams({ media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token.access_token }));
  const published = await graphPost(`${token.platform_user_id}/media_publish`, new URLSearchParams({ creation_id: parent.id, access_token: token.access_token }));
  return published.id;
}

async function publishFacebook(token: Record<string, string>, caption: string, url: string) {
  const published = await graphPost(`${token.platform_user_id}/photos`, new URLSearchParams({ url, caption, access_token: token.access_token }));
  return published.post_id || published.id;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST' || !requireCronAuth(request)) return json({ error: 'Nao autorizado' }, 401);
  const started = Date.now();
  const runId = crypto.randomUUID();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await supabase.rpc('recover_stuck_publications', { max_attempts: MAX_ATTEMPTS });
  const { data: posts, error: claimError } = await supabase.rpc('claim_due_posts', { batch_size: 10, max_attempts: MAX_ATTEMPTS });
  if (claimError) return json({ error: claimError.message }, 500);

  const results = [];
  for (const post of posts || []) {
    const itemStarted = Date.now();
    await supabase.from('publication_job_logs').insert({ run_id: runId, post_id: post.id, status: 'started' });
    try {
      const urls = urlsOf(post);
      if (!urls.length) throw new Error('Post sem midia para publicar.');
      const networks = Array.isArray(post.networks) && post.networks.length ? post.networks : ['instagram'];
      const { data: tokens } = await supabase.from('social_tokens').select('platform, access_token, platform_user_id').eq('brand_id', post.brand_id).eq('is_active', true).in('platform', networks);
      const posted: Array<{ platform: string; id: string }> = [];
      for (const platform of networks) {
        const token = tokens?.find((row) => row.platform === platform);
        if (!token) throw new Error(`Token ativo ausente para ${platform}.`);
        // O formato decide COMO publicar: Story vertical postado como foto de
        // feed seria entregar coisa diferente da que foi aprovada.
        const isReel = post.format === 'reel' || post.format === 'reels' || String(post.format || '').toLowerCase().includes('reel');
        const isStory = post.format === 'stories' || post.format === 'story' || String(post.format || '').toLowerCase().includes('stor');
        if (isStory && platform !== 'instagram') throw new Error('Story so publica no Instagram.');
        if (isReel && platform !== 'instagram') throw new Error('Reel so publica no Instagram.');
        const id = platform === 'instagram'
          ? isReel
            ? await publishInstagramReels(token, post.content as string || '', urls[0], post.cover_url as string | null, post.share_to_feed as boolean | null | undefined)
            : isStory
              ? await publishInstagramStories(token, urls)
              : await publishInstagram(token, post.content as string || '', urls)
          : platform === 'facebook'
            ? await publishFacebook(token, post.content as string || '', urls[0])
            : (() => { throw new Error(`Plataforma nao suportada: ${platform}`); })();
        posted.push({ platform, id });
      }
      const externalPostId = posted[0]?.id || null;
      const publishedAt = new Date().toISOString();
      const temporaryPaths = [...new Set(
        [...urls, post.cover_url].map(temporaryPath).filter((value): value is string => Boolean(value))
      )];
      let cleanupPending = false;
      if (temporaryPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage.from('media').remove(temporaryPaths);
        cleanupPending = Boolean(cleanupError);
        if (cleanupError) console.error('Published media cleanup pending:', cleanupError);
      }
      const mediaLifecyclePatch = cleanupPending
        ? {
            media_url: post.media_url,
            media_urls: post.media_urls,
            cover_url: post.cover_url,
            cover_storage_path: post.cover_storage_path,
            internal_reference_url: post.internal_reference_url,
            production: post.production,
            delete_after: publishedAt
          }
        : {
            media_url: null,
            media_urls: [],
            cover_url: null,
            cover_storage_path: null,
            internal_reference_url: null,
            production: null,
            delete_after: null
          };

      await supabase.from('posts').update({
        status: 'published',
        published_at: publishedAt,
        publishing_started_at: null,
        external_post_id: externalPostId,
        ...mediaLifecyclePatch,
        publication_attempt: { source: 'supabase_edge_function', posted }
      }).eq('id', post.id).eq('status', 'publishing');
      
      try {
        await supabase.from('posts_media').update({
          delete_after: cleanupPending ? publishedAt : null,
          deleted_at: cleanupPending ? null : publishedAt,
          last_deletion_error: cleanupPending ? 'Storage cleanup pending after publish' : null
        }).eq('post_id', post.id);
      } catch (err) {
        // ignore errors on cleanup
      }

      await supabase.from('publication_job_logs').insert({ run_id: runId, post_id: post.id, status: 'success', duration_ms: Date.now() - itemStarted, response: { posted } });
      results.push({ id: post.id, status: 'published', cleanupPending });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao publicar.';
      const status = Number(post.publish_attempts) >= MAX_ATTEMPTS ? 'failed' : 'scheduled';
      await supabase.from('posts').update({ status, publishing_started_at: null, last_publish_error: message.slice(0, 1000), publication_attempt: { source: 'supabase_edge_function', error: message } }).eq('id', post.id).eq('status', 'publishing');
      await supabase.from('publication_job_logs').insert({ run_id: runId, post_id: post.id, status: 'error', duration_ms: Date.now() - itemStarted, error_message: message });
      results.push({ id: post.id, status, error: message });
    }
  }
  await supabase.from('publication_job_logs').insert({ run_id: runId, status: 'summary', duration_ms: Date.now() - started, response: { processed: results.length, results } });

  // Cleanup orphaned temp media (age > 24h)
  try {
    const { data: activePosts, error: activeError } = await supabase
      .from('posts')
      .select('media_url, media_urls, cover_url')
      .in('status', ['scheduled', 'publishing']);

    if (activeError) {
      console.error('Error fetching active posts for cleanup:', activeError);
    }

    const activeReferences: string[] = [];
    for (const post of activePosts || []) {
      if (post.media_url) activeReferences.push(post.media_url as string);
      if (post.cover_url) activeReferences.push(post.cover_url as string);
      if (post.media_urls && Array.isArray(post.media_urls)) {
        activeReferences.push(...(post.media_urls as string[]).filter(Boolean));
      }
    }

    const { data: rootItems } = await supabase.storage.from('media').list('temp');
    if (rootItems) {
      const pathsToRemove: string[] = [];
      const checkItem = async (folderPath: string, item: any) => {
        if (!item.metadata || item.id === null) {
          const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
          const { data: subItems } = await supabase.storage.from('media').list(`temp/${subPath}`);
          if (subItems) {
            for (const subItem of subItems) await checkItem(subPath, subItem);
          }
          return;
        }
        
        const fileDateStr = item.created_at || item.updated_at;
        if (!fileDateStr) return;
        
        const fileDate = new Date(fileDateStr).getTime();
        const ageHours = (Date.now() - fileDate) / (1000 * 60 * 60);
        
        if (ageHours >= 24) {
          const filePath = folderPath ? `temp/${folderPath}/${item.name}` : `temp/${item.name}`;
          
          const isReferenced = activeReferences.some(ref => typeof ref === 'string' && ref.includes(filePath));
          
          if (!isReferenced) pathsToRemove.push(filePath);
        }
      };

      for (const item of rootItems) await checkItem('', item);
      
      if (pathsToRemove.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < pathsToRemove.length; i += chunkSize) {
          const chunk = pathsToRemove.slice(i, i + chunkSize);
          const { error: removeErr } = await supabase.storage.from('media').remove(chunk);
          if (removeErr) {
            console.error('Error removing chunk in temp cleanup:', removeErr);
          }
        }
      }
    }
  } catch (cleanupErr) {
    console.error('Failed to cleanup temp media:', cleanupErr);
  }

  return json({ ok: true, runId, results });
});
