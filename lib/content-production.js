// Regras puras da produção de conteúdo (PRD Etapas 10/11). Sem I/O.
//
// Ponto de encontro de dois eixos que o produto tinha misturados:
//   formato  = o container do Instagram (image, carousel, reel, stories)
//   template = o tratamento editorial do render (news, quote, tips_carousel...)
// São coisas diferentes: "carrossel" diz quantas telas, "tips_carousel" diz que
// cara elas têm. Só imagem e carrossel têm arte renderizada — Reel e Stories
// saem como roteiro para o usuário gravar.
import { formatById, isPublishable, needsManualPosting } from '@/lib/formats';
import { composeCaption } from '@/lib/posts-media';

// Formato -> template do render (lib/ai/render.jsx).
const TEMPLATE_BY_FORMAT = {
  image: 'news',
  carousel: 'tips_carousel'
};

export function templateForFormat(format) {
  return TEMPLATE_BY_FORMAT[format] || null;
}

// Formato que rende arte pelo pipeline atual.
export function rendersArtwork(format) {
  return Boolean(TEMPLATE_BY_FORMAT[format]);
}

// Status inicial do conteúdo recém-produzido.
//
// Publicável entra na fila de aprovação normal. Não publicável (Reel, Stories)
// também precisa de aprovação — o que muda é o destino depois dela.
export function initialStatus() {
  return 'waiting_approval';
}

// Para onde o conteúdo vai depois de aprovado.
//
// Publicável = agendar/publicar. Não publicável = entregar para o usuário postar.
// É aqui que §5.1 vira comportamento: o sistema nunca diz ter publicado o que
// não publicou.
export function statusAfterApproval(format) {
  return needsManualPosting(format) ? 'ready_to_post' : 'scheduled';
}

// Bloqueado pela revisão não vai para aprovação: volta para o usuário decidir.
export function statusAfterReview(review) {
  return review?.decision === 'bloqueado' ? 'draft' : initialStatus();
}

// Texto que a revisão precisa olhar, por formato. A revisão lê palavras — não
// importa se elas vieram de um slide, de um card ou de uma cena.
export function reviewableContent(format, production) {
  const p = production || {};

  if (format === 'stories') {
    return {
      hook: p.cards?.[0]?.screenText || '',
      caption: (p.cards || []).map((c) => c.screenText).join(' | '),
      cta: (p.cards || []).map((c) => c.cta).filter(Boolean).join(' '),
      hashtags: [],
      slides: (p.cards || []).map((c) => `[${c.type}] ${c.screenText}`)
    };
  }

  if (format === 'reel') {
    return {
      hook: p.spokenHook || '',
      caption: p.caption || '',
      cta: p.cta || '',
      hashtags: p.hashtags || [],
      slides: (p.scenes || []).map((s) => `${s.speech} ${s.screenText || ''}`.trim())
    };
  }

  return {
    hook: p.hook || '',
    caption: p.caption || '',
    cta: p.cta || '',
    hashtags: p.hashtags || [],
    slides: (p.slides || []).map((s) => `${s.title} — ${s.body}`)
  };
}

// Título curto para calendário e listas.
export function contentTitle(format, production, fallback = 'Conteudo') {
  const p = production || {};
  const bruto = format === 'reel' ? p.spokenHook
    : format === 'stories' ? p.objective
    : p.hook;
  return String(bruto || fallback).slice(0, 60);
}

// Legenda final gravada em posts.content. Stories não tem legenda: o texto vive
// nos cards, então guardamos o objetivo para a lista não ficar vazia.
export function contentBody(format, production) {
  const p = production || {};
  if (format === 'stories') return p.objective || '';
  return composeCaption(p.caption || '', p.hashtags || []);
}

// Quantas imagens o pipeline precisa gerar.
export function artworkCount(format, production) {
  if (!rendersArtwork(format)) return 0;
  if (format === 'carousel') return Math.max(1, (production?.slides || []).length);
  return 1;
}

export function formatLabel(format) {
  return formatById(format)?.label || format;
}

export { isPublishable, needsManualPosting };
