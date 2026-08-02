const MIN_BLOCKS = 6;
const MAX_BLOCKS = 20;
const MAX_SCRIPT_LENGTH = 12_000;

function unwrapMarkdownFence(value) {
  const match = /^```[^\n]*\n([\s\S]*?)\n```\s*$/.exec(value.trim());
  return match ? match[1].trim() : value.trim();
}

function numberedMarkers(raw) {
  const markerPattern = /(?:^|\n)\s*(?:\*\*)?texto\s*(\d+)(?:\*\*)?/gi;
  return [...raw.matchAll(markerPattern)].map((match) => Number(match[1]));
}

function numberedFields(raw) {
  const fieldPattern = /(?:^|\n)\s*(?:\*\*)?texto\s*(\d+)(?:\*\*)?\s*[-–—:]\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*)?texto\s*\d+(?:\*\*)?\s*[-–—:])|$)/gi;
  return [...raw.matchAll(fieldPattern)]
    .map((match) => ({ number: Number(match[1]), content: match[2].trim() }))
    .filter((item) => item.content);
}

function looseBlocks(raw) {
  return raw
    .split(/\n{2,}|\n\s*[-•]\s*/)
    .map((block) => block.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean);
}

export function preparePastedCarouselScript(value) {
  const raw = unwrapMarkdownFence(String(value || '').replace(/\r/g, ''));
  if (!raw) return { ok: false, error: 'Cole o roteiro antes de aplicar.' };

  const markers = numberedMarkers(raw);
  const numbered = numberedFields(raw);
  if (markers.length > 0) {
    if (numbered.length !== markers.length) {
      return { ok: false, error: 'Revise o formato dos campos: use texto 1 - conteúdo, texto 2 - conteúdo…' };
    }
    const invalidOrder = numbered.find((item, index) => item.number !== index + 1);
    if (invalidOrder) {
      return { ok: false, error: 'Numere os campos em sequência: texto 1, texto 2, texto 3…' };
    }
  }

  const blocks = markers.length > 0 ? numbered.map((item) => item.content) : looseBlocks(raw);
  if (blocks.length < MIN_BLOCKS) {
    return { ok: false, error: 'O roteiro precisa ter pelo menos 3 slides (6 campos de texto).' };
  }
  if (blocks.length > MAX_BLOCKS) {
    return { ok: false, error: 'Este Studio aceita até 10 slides (20 campos de texto) por carrossel.' };
  }
  if (blocks.length % 2 !== 0) {
    return { ok: false, error: 'O roteiro precisa ter campos em pares: título e texto de cada slide.' };
  }

  const script = blocks.map((block, index) => `texto ${index + 1} - ${block}`).join('\n\n');
  if (script.length > MAX_SCRIPT_LENGTH) {
    return { ok: false, error: 'O roteiro passou do limite de 12 mil caracteres. Encurte o texto antes de aplicar.' };
  }

  return {
    ok: true,
    blocks,
    blockCount: blocks.length,
    slideCount: blocks.length / 2,
    script
  };
}

export function serializeCarouselBrief(brief) {
  if (!Array.isArray(brief?.slides) || !brief.slides.length) return '';
  const blocks = brief.slides.flatMap((slide) => {
    const body = String(slide?.body || '').trim();
    return [
      String(slide?.headline || '').trim(),
      body || String(slide?.readerTakeaway || '').trim()
    ];
  });
  return blocks.map((block, index) => `texto ${index + 1} - ${block}`).join('\n\n');
}
