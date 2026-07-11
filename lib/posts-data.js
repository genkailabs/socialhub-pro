import { createClient } from '@/lib/supabase/server';

export async function listPostsForBrand(brandId) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('id, title, content, media_url, status, scheduled_at, approval_token, created_at')
    .eq('brand_id', brandId)
    .order('scheduled_at', { ascending: false });
  return data || [];
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
