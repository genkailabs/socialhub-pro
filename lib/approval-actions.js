'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Dono: marca o post para aprovação e devolve o token do link público.
export async function requestApproval(postId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const { data, error } = await supabase
    .from('posts')
    .update({ status: 'waiting_approval' })
    .eq('id', postId)
    .select('approval_token')
    .single();
  if (error) return { error: error.message };

  revalidatePath('/calendar');
  return { ok: true, token: data.approval_token };
}

// Revisor (anon): registra decisão + comentário via approval_comments.
export async function submitApproval({ postId, author, action, comment }) {
  const supabase = await createClient(); // sessão anônima do revisor
  const clean = String(author || '').trim() || 'Cliente';
  const validAction = ['approved', 'changes_requested', 'comment_only'].includes(action) ? action : 'comment_only';

  const { error } = await supabase.from('approval_comments').insert({
    post_id: postId,
    author_name: clean,
    comment: String(comment || '').trim() || '(sem comentário)',
    action_taken: validAction
  });
  if (error) return { error: error.message };
  return { ok: true };
}
