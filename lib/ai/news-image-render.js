import 'server-only';
import sharp from 'sharp';

const CANVAS_SIZE = 1080;
const PADDING = 76;
const LINE_HEIGHT = 92;

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);
}

function wrapTitle(title) {
  const words = String(title).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 24 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function titleBaseline(position, lines) {
  const textHeight = Math.max(0, lines.length - 1) * LINE_HEIGHT;
  if (position === 'top') return 156;
  if (position === 'center') return Math.round((CANVAS_SIZE - textHeight) / 2);
  return CANVAS_SIZE - PADDING - textHeight;
}

function titleOverlaySvg(title, position) {
  const lines = wrapTitle(title);
  const baseline = titleBaseline(position, lines);
  const tspans = lines.map((line, index) => `<tspan x="${PADDING}" dy="${index ? LINE_HEIGHT : 0}">${escapeXml(line)}</tspan>`).join('');

  return Buffer.from(`<svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="20%" stop-color="#000000" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.82" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#shade)" />
    <text x="${PADDING}" y="${baseline}" fill="#ffffff" font-family="Arial, sans-serif" font-size="76" font-weight="800" letter-spacing="-3">${tspans}</text>
  </svg>`);
}

export async function applyNewsTitleOverlay({ source, title, position = 'bottom' }) {
  const bytes = await sharp(source)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: 'cover', position: 'centre' })
    .composite([{ input: titleOverlaySvg(title, position), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return { bytes, contentType: 'image/png' };
}

export async function renderNewsTitleOverlay({ sourceUrl, title, position = 'bottom' }) {
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível abrir a imagem escolhida.');

  return applyNewsTitleOverlay({
    source: Buffer.from(await response.arrayBuffer()),
    title,
    position
  });
}
