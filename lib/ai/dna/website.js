// Extrai texto legível de HTML (sem lib externa). Server e teste-friendly.
export function htmlToText(html, limit = 8000) {
  const noScript = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return noScript.slice(0, Math.max(0, limit));
}
