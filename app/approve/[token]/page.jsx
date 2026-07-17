import { Sparkles, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ApprovalForm } from '@/components/approve/ApprovalForm';

export default async function ApprovePage({ params }) {
  const { token } = await params;
  const supabase = await createClient(); // revisor anônimo
  const { data, error } = await supabase.rpc('get_post_by_approval_token', { p_token: token });
  const post = Array.isArray(data) ? data[0] : data;

  if (error || !post) {
    return (
      <div className="grid min-h-screen place-items-center bg-app px-4">
        <div className="rounded-2xl glass p-8 text-center shadow-soft">
          <p className="text-sm font-bold text-ink">Link inválido ou expirado</p>
          <p className="mt-1 text-xs text-muted">Peça um novo link de aprovação para a agência.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-soft text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold">SocialHub</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> Aprovação segura
          </span>
        </div>

        <div className="animate-rise overflow-hidden rounded-2xl glass shadow-soft">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent-soft" />
            <div>
              <p className="text-xs font-bold text-ink">Prévia da publicação</p>
              <p className="text-[11px] text-muted">Revise e responda abaixo</p>
            </div>
          </div>
          {post.media_url && <img src={post.media_url} alt="" className="max-h-80 w-full object-cover" />}
          <div className="p-4">
            <p className="whitespace-pre-wrap text-sm text-ink">{post.content || '(sem legenda)'}</p>
          </div>
        </div>

        <div className="rounded-2xl glass p-5 shadow-soft">
          <p className="mb-3 text-sm font-extrabold text-ink">O que você achou?</p>
          <ApprovalForm approvalToken={token} />
        </div>

        <p className="text-center text-[11px] text-faint">Suas respostas voltam em tempo real para a agência.</p>
      </div>
    </div>
  );
}
