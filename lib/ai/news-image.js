// A imagem vai por GET /image/{prompt} — a URL tem limite (~2048). A caption
// pode ter até 2200 chars, então entra só um trecho: o modelo de imagem não
// ganha nada com a legenda inteira e a URL estouraria (400 Bad Request).
const clamp = (s, n) => String(s || '').trim().slice(0, n);

export function buildNewsImagePrompt({ topic, caption, direction, basePrompt, variant }) {
  const context = clamp(caption, 200);
  return [
    `Editorial social media image about: ${clamp(topic, 120) || 'current news topic'}.`,
    basePrompt && `Creative direction from the content writer: ${clamp(basePrompt, 200)}.`,
    context && `Context: ${context}.`,
    direction && `Visual direction: ${clamp(direction, 120)}.`,
    `Create variation ${Number(variant) || 1} with a distinct composition and subject framing.`,
    'Square 1:1 composition. No text, no letters, no logos, no watermark.'
  ].filter(Boolean).join(' ');
}

export function titleAlignment(position) {
  return { top: 'flex-start', center: 'center', bottom: 'flex-end' }[position] || 'center';
}

export function titleOverlayNeeded({ textEnabled, title }) {
  return Boolean(textEnabled && String(title || '').trim());
}

export function pickPublishedImage({ selectedUrl, finalUrl }) {
  const imageUrl = finalUrl || selectedUrl;
  return imageUrl ? [imageUrl] : [];
}
