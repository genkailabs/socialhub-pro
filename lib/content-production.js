// Regras puras da produção de conteúdo (PRD Etapas 10/11). Sem I/O.
//
// O que o formato decide aqui: quantas artes gerar, em que tamanho e com que
// texto em cada uma. Como a arte fica (layout, paleta, tipografia) é assunto de
// lib/ai/art — este módulo só traduz "conteúdo produzido" para "conteúdo da
// arte".
//
// MVP V2: Story entrou na lista de quem tem arte renderizada, em 1080x1920.
// Reel continua fora — é o único formato que ainda sai como roteiro (§12).
import { formatById, isPublishable, needsManualPosting } from '@/lib/formats';
import { composeCaption } from '@/lib/posts-media';

// Formato -> tamanho da arte (lib/ai/art/palette.js ART_SIZES).
//
// A regra proporcional pelo lado menor é o que permite feed e story dividirem
// escala, layouts e validação: mudar de tamanho aqui não cria um renderizador
// paralelo, só troca a moldura.
const ART_SIZE_BY_FORMAT = {
  image: 'square',
  carousel: 'square',
  stories: 'story'
};

export function artSizeForFormat(format) {
  return ART_SIZE_BY_FORMAT[format] || null;
}

// Formato que rende arte pelo pipeline atual.
export function rendersArtwork(format) {
  return Boolean(ART_SIZE_BY_FORMAT[format]);
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
    const cards = p.cards || [];
    return {
      hook: cards[0]?.title || '',
      caption: cards.map((c) => [c.title, c.support].filter(Boolean).join(' — ')).join(' | '),
      cta: cards.map((c) => c.cta).filter(Boolean).join(' '),
      hashtags: [],
      slides: cards.map((c) => `[${c.type}] ${[c.title, c.support].filter(Boolean).join(' — ')}`)
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
  // Story é sequência: uma arte por card, senão o arco se perde.
  if (format === 'stories') return Math.max(1, (production?.cards || []).length);
  return 1;
}

// Primeira frase de um texto, para virar apoio sem repetir a legenda inteira na
// arte. Legenda cabe no Instagram; arte não.
function firstSentence(texto, limite) {
  const s = String(texto || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  const corte = s.search(/[.!?](\s|$)/);
  const frase = corte > 0 ? s.slice(0, corte + 1) : s;
  return frase.length <= limite ? frase : `${frase.slice(0, limite - 1).replace(/[\s,;:.-]+$/, '')}…`;
}

/**
 * Texto de UMA arte, a partir do conteúdo produzido.
 *
 * É a tradução entre o que a skill escreveu e o que lib/ai/art entende. Fica
 * aqui, puro, porque é regra de produto (o que aparece em cada tela) e não de
 * composição visual.
 *
 * @param {string} format     image | carousel | stories
 * @param {object} production Saída da skill produtora.
 * @param {number} index      Qual arte da sequência (0 = primeira).
 * @param {string} brandHandle Arroba da marca, para a assinatura.
 */
export function artContentFor(format, production, index = 0, brandHandle = '') {
  const p = production || {};
  const total = artworkCount(format, p);
  const vazio = { title: '', subtitle: '', eyebrow: '', bullets: [], cta: '', brand: brandHandle };

  if (format === 'stories') {
    const card = (p.cards || [])[index];
    if (!card) return vazio;
    return {
      ...vazio,
      // A pessoa entra no meio da sequência: dizer em que ponto ela está é
      // informação, não enfeite.
      eyebrow: total > 1 ? `${index + 1}/${total}` : '',
      title: card.title || '',
      subtitle: card.support || '',
      cta: card.cta || ''
    };
  }

  if (format === 'carousel') {
    const slide = (p.slides || [])[index];
    if (!slide) return vazio;
    return {
      ...vazio,
      eyebrow: total > 1 ? `${index + 1}/${total}` : '',
      title: slide.title || '',
      subtitle: firstSentence(slide.body, 160),
      // O CTA fecha o carrossel; repeti-lo em toda tela vira insistência.
      cta: index === total - 1 ? p.cta || '' : ''
    };
  }

  // image: a arte é uma só, então carrega o gancho e os títulos dos slides.
  return {
    ...vazio,
    title: p.hook || '',
    subtitle: firstSentence(p.caption, 160),
    bullets: (p.slides || []).map((s) => s.title).filter(Boolean),
    cta: p.cta || ''
  };
}

// O que está gravado em posts.media_type. Story não é "carrossel de imagens":
// são várias artes que sobem uma a uma, e quem lê a linha depois precisa saber
// disso para não tratar a sequência como feed.
export function mediaTypeFor(format, imageUrls = []) {
  if (!imageUrls.length) return null;
  if (format === 'stories') return 'story';
  return imageUrls.length > 1 ? 'carousel' : 'image';
}

export function formatLabel(format) {
  return formatById(format)?.label || format;
}

export { isPublishable, needsManualPosting };
