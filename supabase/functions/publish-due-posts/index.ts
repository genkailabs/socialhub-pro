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

async function graphPost(path: string, params: URLSearchParams) {
  const response = await fetch(`${GRAPH}/${path}?${params}`, { method: 'POST' });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || `Meta respondeu ${response.status}`);
  return data;
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
        const id = platform === 'instagram'
          ? await publishInstagram(token, post.content || '', urls)
          : platform === 'facebook'
            ? await publishFacebook(token, post.content || '', urls[0])
            : (() => { throw new Error(`Plataforma nao suportada: ${platform}`); })();
        posted.push({ platform, id });
      }
      const externalPostId = posted[0]?.id || null;
      await supabase.from('posts').update({ status: 'published', published_at: new Date().toISOString(), publishing_started_at: null, external_post_id: externalPostId, publication_attempt: { source: 'supabase_edge_function', posted } }).eq('id', post.id).eq('status', 'publishing');
      await supabase.from('publication_job_logs').insert({ run_id: runId, post_id: post.id, status: 'success', duration_ms: Date.now() - itemStarted, response: { posted } });
      results.push({ id: post.id, status: 'published' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao publicar.';
      const status = Number(post.publish_attempts) >= MAX_ATTEMPTS ? 'failed' : 'scheduled';
      await supabase.from('posts').update({ status, publishing_started_at: null, last_publish_error: message.slice(0, 1000), publication_attempt: { source: 'supabase_edge_function', error: message } }).eq('id', post.id).eq('status', 'publishing');
      await supabase.from('publication_job_logs').insert({ run_id: runId, post_id: post.id, status: 'error', duration_ms: Date.now() - itemStarted, error_message: message });
      results.push({ id: post.id, status, error: message });
    }
  }
  await supabase.from('publication_job_logs').insert({ run_id: runId, status: 'summary', duration_ms: Date.now() - started, response: { processed: results.length, results } });
  return json({ ok: true, runId, results });
});
