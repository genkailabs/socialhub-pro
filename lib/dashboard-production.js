// Traduz uma linha de `posts` no que a lista de produção da Visão geral mostra.
// Puro, sem I/O: a página busca, isto interpreta, e o teste cobre a
// interpretação sem subir banco.

const FORMAT_LABEL = { post: 'Post', story: 'Story', reel: 'Reel', carrossel: 'Carrossel' };

/** Primeira linha aproveitável da legenda, para quando o post não tem título. */
function firstLine(content) {
  const line = String(content || '')
    .split('\n')
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return '';
  return line.length > 70 ? `${line.slice(0, 70)}…` : line;
}

/**
 * "Carrossel · 8 slides" — o formato vem do editor que produziu a peça, e a
 * contagem só aparece quando existe de verdade. Post antigo, criado antes do
 * Composer visual, não tem `editorState`: cai em "Post", que é o que ele é.
 */
export function formatLabelOf(post) {
  const state = post?.production?.editorState || null;
  const format = state?.format || 'post';
  const label = FORMAT_LABEL[format] || 'Post';
  const slides = format === 'carrossel'
    ? state?.doc?.carrossel?.slides?.length || post?.production?.editorState?.doc?.slides?.length || 0
    : 0;
  return slides > 1 ? `${label} · ${slides} slides` : label;
}

/** Para onde o clique leva: o que ainda dá para editar abre no editor certo. */
export function hrefOf(post) {
  const finished = post?.status === 'published' || post?.status === 'posted_manually';
  if (finished) return `/content/${post.id}/review`;
  const format = post?.production?.editorState?.format;
  return format === 'carrossel'
    ? `/composer?format=carrossel&post=${post.id}`
    : `/composer?post=${post.id}`;
}

export function toProductionItem(post) {
  return {
    id: post.id,
    title: post.title || firstLine(post.content) || 'Sem título',
    status: post.status || 'draft',
    formatLabel: formatLabelOf(post),
    href: hrefOf(post),
    mediaUrl: post.media_url || post.media_urls?.[0] || null,
    scheduledAt: post.scheduled_at || null,
    // `posts` não expõe updated_at na listagem; o agendamento é a data mais
    // recente que se conhece, e na falta dela vale a criação.
    updatedAt: post.scheduled_at || post.published_at || post.created_at || null
  };
}

/**
 * O que o hero conta. Rascunho, revisão e agendado são os três estados em que
 * ainda há trabalho a fazer; publicado entra só para saber se a marca já rodou
 * o ciclo alguma vez.
 */
export function productionCounts(posts = []) {
  const by = (status) => posts.filter((post) => post.status === status).length;
  return {
    drafts: by('draft'),
    review: by('waiting_approval'),
    scheduled: by('scheduled') + by('ready_to_post'),
    published: by('published') + by('posted_manually')
  };
}

/**
 * Ordem da lista: primeiro o que está mais perto de sair (agendado), depois o
 * que espera gente, depois o rascunho. Dentro do mesmo estado, o mais recente
 * primeiro. Publicado não entra — ele já saiu da produção.
 */
const RANK = { scheduled: 0, ready_to_post: 0, waiting_approval: 1, draft: 2 };

export function productionQueue(posts = []) {
  return posts
    .filter((post) => RANK[post.status] !== undefined)
    .sort((a, b) => {
      const rank = RANK[a.status] - RANK[b.status];
      if (rank !== 0) return rank;
      const dateA = new Date(a.scheduled_at || a.created_at || 0).getTime();
      const dateB = new Date(b.scheduled_at || b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .map(toProductionItem);
}
