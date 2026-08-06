import { notFound } from 'next/navigation';
import { ContentReview } from '@/components/content/ContentReview';
import { QualAprovacao } from '@/components/approvals/QualAprovacao';
import { createClient } from '@/lib/supabase/server';
import { formatLabel } from '@/lib/content-production';
import { statusMeta } from '@/lib/calendar';
import { postTitle } from '@/lib/post-title';

export default async function ContentReviewPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS resolve a posse: se o post não é de uma marca do usuário, não vem.
  const { data: post } = await supabase
    .from('posts')
    .select('id, brand_id, title, content, format, production, review, media_url, media_urls, status, scheduled_at')
    .eq('id', id)
    .maybeSingle();

  if (!post) notFound();

  const meta = statusMeta(post.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
            {formatLabel(post.format)}
          </span>
          <span className="text-[11px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        {/* Rascunho vindo do Studio não tem título: cai para a legenda em vez
            de mostrar um cabeçalho vazio. */}
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {post.title || postTitle(post.content, 80, 'Revisar conteúdo')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Revise, edite o que quiser e decida. Editar não consome IA.
        </p>
      </div>

      {/* Esta é a revisão interna, não a aprovação do cliente. As duas se
          chamavam aprovação e nenhuma tela dizia que eram duas. */}
      <QualAprovacao atual="interna" postId={post.id} />

      <ContentReview post={post} />
    </div>
  );
}
