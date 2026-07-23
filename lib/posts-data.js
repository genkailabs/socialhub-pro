import { createClient } from '@/lib/supabase/server';

export async function listPostsForBrand(brandId) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('id, title, content, media_url, media_urls, status, scheduled_at, published_at, publish_attempts, last_publish_error, external_post_id, approval_token, created_at, deleted_at, delete_after')
    .eq('brand_id', brandId)
    .order('scheduled_at', { ascending: false });
  return data || [];
}

export async function getLatestComposerDraft(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, production')
    .eq('brand_id', brandId)
    .eq('status', 'draft')
    .contains('production', { source: 'visual-composer' })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return error || !data ? null : { id: data.id, editor_state: data.production?.editorState || null };
}

export async function getPostComments(postId) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('approval_comments')
    .select('author_name, comment, action_taken, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return data || [];
}
