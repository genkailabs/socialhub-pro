// A legenda do post de carrossel sai do roteiro aprovado, não do canvas.
//
// Antes daqui, o Studio salvava como legenda a manchete da capa e uma lista de
// hashtags vazia: o texto que o gerador escreveu para o feed (gancho,
// aprendizado, CTA) morria dentro do editorState e a pessoa reescrevia tudo à
// mão na hora de publicar. Puro de propósito — roda no cliente, sem I/O.

export function legendaDoRoteiro(editorial, fallback = '') {
  const caption = editorial?.brief?.caption;
  if (!caption) return { caption: String(fallback || '').trim(), hashtags: [] };

  const texto = [caption.hook, caption.takeaway, caption.cta]
    .map((parte) => String(parte || '').trim())
    .filter(Boolean)
    .join('\n\n');

  return {
    // Roteiro sem nenhum dos três campos ainda é roteiro; a reserva cobre.
    caption: texto || String(fallback || '').trim(),
    // Roteiro salvo antes de a hashtag existir no schema não tem o campo.
    hashtags: Array.isArray(caption.hashtags) ? caption.hashtags : []
  };
}
