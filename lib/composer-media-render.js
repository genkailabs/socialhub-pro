import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import {
  canvasSize,
  getSurface,
  normalizeMediaTransform
} from '@/lib/composer-editor';

const CANVAS_BACKGROUND = '#202024';
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MEDIA_FETCH_TIMEOUT_MS = 30_000;
const FFMPEG_TIMEOUT_MS = 180_000;
const MAX_VIDEO_SECONDS = 300;

export function composerOutputSize(format, ratio) {
  if (format === 'story' || format === 'reel') return [1080, 1920];
  if (ratio === '4:5') return [1080, 1350];
  if (ratio === '1.91:1') return [1080, 566];
  return [1080, 1080];
}

export function composerSurfaces(editorState) {
  if (!editorState?.doc || !editorState?.format) return [];
  if (editorState.format === 'carrossel') return editorState.doc.carrossel?.slides || [];
  const surface = getSurface(editorState.doc, editorState.format);
  return surface ? [surface] : [];
}

export function hasEditableMediaTransform(surface) {
  return Boolean(
    surface?.media
    && Number(surface?.bg?.w) > 0
    && Number(surface?.bg?.h) > 0
  );
}

function safeImageContentType(value) {
  const type = String(value || '').toLowerCase();
  if (type.includes('png')) return 'image/png';
  if (type.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapLayerText(value, width, fontSize) {
  const maxCharacters = Math.max(1, Math.floor(width / Math.max(1, fontSize * .55)));
  return String(value || '').split(/\r?\n/).flatMap((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    for (const word of words) {
      const current = lines.at(-1);
      if (!current || `${current} ${word}`.length > maxCharacters) lines.push(word);
      else lines[lines.length - 1] = `${current} ${word}`;
    }
    return lines;
  });
}

export function buildComposerLayersSvg(layers = []) {
  return layers
    .filter((layer) => layer && !layer.hidden)
    .map((layer) => {
      const x = Number(layer.x) || 0;
      const y = Number(layer.y) || 0;
      const width = Math.max(1, Number(layer.w) || 1);
      const height = Math.max(1, Number(layer.h) || 1);
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const rotation = Number(layer.rot) || 0;
      const opacityValue = Number(layer.op);
      const opacity = Number.isFinite(opacityValue)
        ? Math.min(1, Math.max(0, opacityValue))
        : 1;
      const transform = `translate(${centerX} ${centerY}) rotate(${rotation}) translate(${-centerX} ${-centerY})`;
      if (layer.type === 'shape') {
        return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${Math.max(0, Number(layer.radius) || 0)}" fill="${escapeXml(layer.fill || 'transparent')}" opacity="${opacity}" transform="${transform}"/>`;
      }
      const anchor = layer.align === 'right' ? 'end' : layer.align === 'left' ? 'start' : 'middle';
      const textX = layer.align === 'right' ? x + width : layer.align === 'left' ? x : centerX;
      const fontSize = Math.max(1, Number(layer.fs) || 16);
      const lines = wrapLayerText(layer.text, width, fontSize);
      const lineHeight = fontSize * 1.05;
      const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
      const text = lines.map((line, index) => `<tspan x="${textX}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`).join('');
      const background = layer.type === 'button'
        ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${Math.max(0, Number(layer.radius) || 0)}" fill="${escapeXml(layer.fill || 'transparent')}" opacity="${opacity}" transform="${transform}"/>`
        : '';
      return `${background}<text text-anchor="${anchor}" dominant-baseline="middle" font-family="${escapeXml(layer.font || 'Arial, sans-serif')}" font-size="${fontSize}" font-weight="${Number(layer.weight) || 400}" font-style="${layer.italic ? 'italic' : 'normal'}" fill="${escapeXml(layer.color || '#FFFFFF')}" opacity="${opacity}" transform="${transform}">${text}</text>`;
    })
    .join('\n');
}

function layersOverlaySvg(layers, canvas, output) {
  const [cw, ch] = canvas;
  const [outputWidth, outputHeight] = output;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${cw} ${ch}" preserveAspectRatio="none">${buildComposerLayersSvg(layers)}</svg>`;
}

export function buildComposerFrameSvg({
  source,
  contentType,
  transform,
  canvas,
  output,
  layers = [],
  background = CANVAS_BACKGROUND
}) {
  const [cw, ch] = canvas;
  const [outputWidth, outputHeight] = output;
  const media = normalizeMediaTransform(transform, null, canvas);
  const renderedWidth = media.w * media.scale;
  const renderedHeight = media.h * media.scale;
  const centerX = media.x + renderedWidth / 2;
  const centerY = media.y + renderedHeight / 2;
  const href = `data:${safeImageContentType(contentType)};base64,${Buffer.from(source).toString('base64')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${cw} ${ch}" preserveAspectRatio="none">
    <rect width="${cw}" height="${ch}" fill="${background}"/>
    <g transform="translate(${centerX} ${centerY}) rotate(${media.rot})">
      <image href="${href}" x="${-renderedWidth / 2}" y="${-renderedHeight / 2}" width="${renderedWidth}" height="${renderedHeight}" preserveAspectRatio="none"/>
    </g>
    ${buildComposerLayersSvg(layers)}
  </svg>`;
}

export async function renderComposerImage({
  source,
  contentType,
  transform,
  canvas,
  output,
  layers = []
}) {
  const svg = buildComposerFrameSvg({ source, contentType, transform, canvas, output, layers });
  return sharp(Buffer.from(svg))
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

export function buildComposerVideoFilter({ transform, canvas, output }) {
  const [cw, ch] = canvas;
  const [outputWidth, outputHeight] = output;
  const media = normalizeMediaTransform(transform, null, canvas);
  const scaleX = outputWidth / cw;
  const scaleY = outputHeight / ch;
  const renderedWidth = Math.max(2, Math.round(media.w * media.scale * scaleX / 2) * 2);
  const renderedHeight = Math.max(2, Math.round(media.h * media.scale * scaleY / 2) * 2);
  const centerX = (media.x + media.w * media.scale / 2) * scaleX;
  const centerY = (media.y + media.h * media.scale / 2) * scaleY;
  const radians = Number(media.rot || 0) * Math.PI / 180;
  return [
    `color=c=0x202024:s=${outputWidth}x${outputHeight}:r=30[bg]`,
    `[0:v]scale=${renderedWidth}:${renderedHeight},setsar=1,rotate=${radians}:ow=rotw(iw):oh=roth(ih):c=none[media]`,
    `[bg][media]overlay=x='${centerX}-w/2':y='${centerY}-h/2':shortest=1[v]`
  ].join(';');
}

async function runFfmpeg(args) {
  if (!ffmpegPath) throw new Error('FFmpeg não está disponível no servidor.');
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(reject, new Error('O processamento do vídeo excedeu o tempo seguro.'));
    }, FFMPEG_TIMEOUT_MS);
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-6000);
    });
    child.on('error', (error) => finish(reject, error));
    child.on('close', (code) => {
      if (code === 0) finish(resolve);
      else finish(reject, new Error(`Falha ao preparar o vídeo (${code}): ${stderr.slice(-1200)}`));
    });
  });
}

export async function renderComposerVideo({ source, extension, transform, canvas, output, layers = [] }) {
  const tempRoot = path.join(os.tmpdir(), `socialhub-composer-${randomUUID()}`);
  await mkdir(tempRoot, { recursive: true });
  const inputPath = path.join(tempRoot, `source.${extension || 'mp4'}`);
  const overlayPath = path.join(tempRoot, 'layers.png');
  const outputPath = path.join(tempRoot, 'composed.mp4');
  try {
    await writeFile(inputPath, source);
    const visibleLayers = layers.filter((layer) => layer && !layer.hidden);
    if (visibleLayers.length) {
      await sharp(Buffer.from(layersOverlaySvg(visibleLayers, canvas, output))).png().toFile(overlayPath);
    }
    const baseFilter = buildComposerVideoFilter({ transform, canvas, output });
    await runFfmpeg([
      '-y',
      '-i', inputPath,
      ...(visibleLayers.length ? ['-loop', '1', '-i', overlayPath] : []),
      '-t', String(MAX_VIDEO_SECONDS),
      '-filter_complex', visibleLayers.length ? `${baseFilter};[v][1:v]overlay=0:0:shortest=1[out]` : baseFilter,
      '-map', visibleLayers.length ? '[out]' : '[v]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-threads', '2',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      '-shortest',
      outputPath
    ]);
    return await readFile(outputPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export function assertAllowedMediaUrl(value) {
  const mediaUrl = new URL(value);
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseBase) throw new Error('A origem segura de mídia não está configurada.');
  const allowed = new URL(supabaseBase);
  if (
    mediaUrl.protocol !== 'https:'
    || mediaUrl.host !== allowed.host
    || !mediaUrl.pathname.startsWith('/storage/v1/object/public/media/')
  ) {
    throw new Error('A mídia precisa estar no armazenamento seguro do SocialHub.');
  }
  return mediaUrl.toString();
}

async function fetchMedia(url, { maxBytes }) {
  const safeUrl = assertAllowedMediaUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(safeUrl, { redirect: 'error', signal: controller.signal });
    if (!response.ok) throw new Error(`Não foi possível baixar a mídia para preparar a publicação (${response.status}).`);
    const declaredSize = Number(response.headers.get('content-length')) || 0;
    if (declaredSize > maxBytes) throw new Error('A mídia excede o limite permitido para processamento.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('A mídia não retornou conteúdo para processamento.');
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('A mídia excede o limite permitido para processamento.');
      }
      chunks.push(Buffer.from(value));
    }
    return {
      bytes: Buffer.concat(chunks, size),
      contentType: response.headers.get('content-type') || ''
    };
  } finally {
    clearTimeout(timer);
  }
}

function extensionOf(url, fallback) {
  const value = String(url || '').split('?')[0];
  const extension = value.includes('.') ? value.split('.').pop().toLowerCase() : '';
  return /^[a-z0-9]{2,5}$/.test(extension) ? extension : fallback;
}

export async function prepareComposerMedia({
  supabase,
  brandId,
  imageUrls,
  editorState
}) {
  const sourceUrls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
  const surfaces = composerSurfaces(editorState).filter((surface) => surface?.media);
  if (!supabase?.storage || !brandId || !sourceUrls.length || !surfaces.length) {
    return { urls: sourceUrls, sourceUrls, rendered: false };
  }
  if (!surfaces.some(hasEditableMediaTransform)) {
    return { urls: sourceUrls, sourceUrls, rendered: false };
  }

  const canvas = canvasSize(editorState.format, editorState.ratio);
  const output = composerOutputSize(editorState.format, editorState.ratio);
  const renderedUrls = [];
  const renderedPaths = [];

  try {
    for (let index = 0; index < sourceUrls.length; index++) {
      const surface = surfaces[index] || surfaces[0];
      const url = sourceUrls[index];
      if (!hasEditableMediaTransform(surface)) {
        renderedUrls.push(url);
        continue;
      }
      const video = surface.media?.kind === 'video' || /\.(mp4|mov)(\?.*)?$/i.test(url);
      const downloaded = await fetchMedia(url, { maxBytes: video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES });
      const bytes = video
        ? await renderComposerVideo({
            source: downloaded.bytes,
            extension: extensionOf(url, 'mp4'),
            transform: surface.bg,
            canvas,
            output,
            layers: surface.layers
          })
        : await renderComposerImage({
            source: downloaded.bytes,
            contentType: surface.media?.type || downloaded.contentType,
            transform: surface.bg,
            canvas,
            output,
            layers: surface.layers
          });
      const extension = video ? 'mp4' : 'jpg';
      const contentType = video ? 'video/mp4' : 'image/jpeg';
      const storagePath = `temp/${brandId}/${Date.now()}-${randomUUID()}-composer.${extension}`;
      const { error } = await supabase.storage.from('media').upload(storagePath, bytes, {
        upsert: false,
        contentType
      });
      if (error) throw new Error(`Não foi possível salvar a mídia enquadrada: ${error.message}`);
      const { data } = supabase.storage.from('media').getPublicUrl(storagePath);
      renderedUrls.push(data.publicUrl);
      renderedPaths.push(storagePath);
    }
  } catch (error) {
    if (renderedPaths.length) {
      await supabase.storage.from('media').remove(renderedPaths);
    }
    throw error;
  }

  return {
    urls: renderedUrls,
    paths: renderedPaths,
    sourceUrls,
    rendered: renderedPaths.length > 0
  };
}
