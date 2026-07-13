// Cor dominante a partir de pixels RGBA (Uint8ClampedArray). Puro/testável.
export function dominantHexFromPixels(data, step = 4) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a < 200) continue; // ignora transparente
    const r = data[i] & 0xf0, g = data[i + 1] & 0xf0, b = data[i + 2] & 0xf0;
    const key = (r << 16) | (g << 8) | b;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  let best = 0, bestKey = 0;
  for (const [k, v] of buckets) if (v > best) { best = v; bestKey = k; }
  const r = (bestKey >> 16) & 0xff, g = (bestKey >> 8) & 0xff, b = bestKey & 0xff;
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Browser: carrega imagem em canvas e devolve a cor dominante. Sem unit test.
export async function dominantColorFromImageUrl(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const canvas = document.createElement('canvas');
  const w = canvas.width = Math.min(img.naturalWidth, 128);
  const h = canvas.height = Math.min(img.naturalHeight, 128);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return dominantHexFromPixels(ctx.getImageData(0, 0, w, h).data);
}
