import { createClient } from '@/lib/supabase/server';
import { ApprovalForm } from '@/components/approve/ApprovalForm';

export default async function ApprovePage({ params }) {
  const { token } = await params;
  const supabase = await createClient(); // revisor anônimo
  const { data, error } = await supabase.rpc('get_post_by_approval_token', { p_token: token });
  const post = Array.isArray(data) ? data[0] : data;

  if (error || !post) {
    return (
      <div className="min-h-screen grid place-items-center bg-app px-4">
        <p className="text-sm text-muted">Link de aprovação inválido ou expirado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app px-4 py-10">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent to-accent-soft" />
          <span className="text-sm font-extrabold">SocialHub · Aprovação</span>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft space-y-4">
          {post.media_url && <img src={post.media_url} alt="" className="max-h-72 w-full rounded-xl border border-line object-cover" />}
          <p className="text-sm text-ink whitespace-pre-wrap">{post.content || '(sem legenda)'}</p>
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs font-bold text-ink">O que você achou?</p>
            <ApprovalForm postId={post.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
