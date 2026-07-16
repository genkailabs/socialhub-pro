export function buildNewsImagePrompt({ topic, caption, direction, variant }) {
  return [
    `Editorial social media image about: ${String(topic || 'current news topic').trim()}.`,
    caption && `Context: ${String(caption).trim()}.`,
    direction && `Visual direction: ${String(direction).trim()}.`,
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
