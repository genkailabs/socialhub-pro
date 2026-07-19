import { NextResponse } from 'next/server';
import { approvalUpdate } from '@/lib/approval-flow';
import { createAdmin } from '@/lib/supabase/admin';

const VALID_ACTIONS = new Set(['approved', 'changes_requested', 'comment_only']);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados de aprovacao invalidos.' }, { status: 400 });
  }

  const token = String(body?.token || '');
  const action = VALID_ACTIONS.has(body?.action) ? body.action : 'comment_only';
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(token)) {
    return NextResponse.json({ error: 'Link de aprovacao invalido.' }, { status: 400 });
  }

  const admin = createAdmin();
  const { data: post, error: postError } = await admin
    .from('posts')
    .select('id, brand_id, status, recommendation_id')
    .eq('approval_token', token)
    .maybeSingle();

  if (postError || !post || post.status !== 'waiting_approval') {
    return NextResponse.json({ error: 'Este post ja foi processado ou o link expirou.' }, { status: 409 });
  }

  const { data: plan } = await admin
    .from('content_plans')
    .select('preferred_times')
    .eq('brand_id', post.brand_id)
    .maybeSingle();
  const update = approvalUpdate({ action, preferredTimes: plan?.preferred_times || [] });

  if (update.status) {
    const { error } = await admin
      .from('posts')
      .update({ status: update.status, scheduled_at: update.scheduledAt })
      .eq('id', post.id)
      .eq('status', 'waiting_approval');
    if (error) return NextResponse.json({ error: 'Nao foi possivel agendar o post.' }, { status: 500 });
    if (post.recommendation_id) await admin.from('marketing_recommendations').update({ status: 'scheduled' }).eq('id', post.recommendation_id);
  }

  const { error: commentError } = await admin.from('approval_comments').insert({
    post_id: post.id,
    author_name: String(body?.author || '').trim() || 'Cliente',
    comment: String(body?.comment || '').trim() || '(sem comentario)',
    action_taken: action
  });
  if (commentError) return NextResponse.json({ error: 'Nao foi possivel registrar a resposta.' }, { status: 500 });

  return NextResponse.json({ ok: true, scheduledAt: update.scheduledAt });
}
