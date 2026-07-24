'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowUpRight, Bold, Check, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, Copy, Eye, EyeOff, Film, GripVertical,
  Image as ImageIcon, Italic, Layers3, Lock, MapPin, Maximize2,
  MessageSquareText, Minus, MoreHorizontal, Redo2,
  Save, Search, Send, Settings2, Shapes, Smartphone, Smile, Trash2, Type,
  Undo2, Unlock, Upload, UserRoundPlus, X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { removeTempMedia, uploadTempMedia } from '@/lib/posts-media';
import { deleteComposerDraft, publishNow, saveDraft, schedulePost } from '@/lib/posts-actions';
import {
  COMPOSER_FORMATS, addLayer, canvasSize, cloneEditorState, computeSnap,
  fitMediaToCanvas, getSurface, layerDisplayText, makeComposerDocument,
  mediaTransformStyle, moveLayerToIndex, normalizeMediaTransform, reorderLayer,
  resizeMediaFromCorner, serializeComposer, toApiFormat, validateComposer,
  zoomMediaAtPoint
} from '@/lib/composer-editor';
import { fontsByCategory } from '@/lib/composer-fonts';
import {
  ELEMENT_LINES, ELEMENT_SHAPES, SOCIALHUB_STICKERS, TEXT_STYLES
} from '@/lib/composer-text-styles';
import { ELEMENT_ICON_MAP, ELEMENT_VECTOR_ICONS, iconLayerPreset } from '@/data/element-icons';
import {
  EMOJI_CATEGORIES, RECENT_EMOJIS_KEY, RECENT_EMOJIS_LIMIT, normalizeSearch, searchEmojis
} from '@/data/emoji-catalog';
import { GRAPHIC_TYPES, isTextLayer, layerBoxStyle, layerLineBgStyle } from '@/lib/composer-layer-style';
import { clampTrim, getReelState } from '@/lib/composer-reel';
import { ArrowGraphic, IconGraphic, LineGraphic, ShapeGraphic } from './ElementGraphics';
import { ReelTimeline } from './ReelTimeline';
import { ReelVideoPanel } from './ReelVideoPanel';
import styles from './VisualComposer.module.css';
import './composer-fonts.css';

const FORMAT_META = {
  post: ['Post', 'Imagem única'],
  carrossel: ['Carrossel', '2 a 10 slides'],
  story: ['Story', 'Vertical 9:16'],
  reel: ['Reel', 'Vídeo vertical']
};
const TOOLS = [
  ['formato', Maximize2, 'Formato'], ['midia', ImageIcon, 'Mídia'], ['texto', Type, 'Texto'],
  ['elementos', Shapes, 'Elementos'], ['legenda', MessageSquareText, 'Legenda'],
  ['config', Settings2, 'Config.'], ['publicar', Send, 'Publicar']
];
const ELEMENT_CATEGORIES = ['Formas', 'Linhas e setas', 'Ícones', 'Stickers', 'Emojis'];
const FONT_GROUPS = fontsByCategory();
const ELEMENT_DRAG_TYPE = 'application/x-socialhub-element';
const LAYER_DRAG_TYPE = 'application/x-socialhub-layer';

function emojiPreset(emoji) {
  return { type: 'sticker', text: emoji, fs: 44, w: 62, h: 62, fill: 'transparent' };
}

function mediaAccept(format) {
  if (format === 'reel') return 'video/mp4,video/quicktime';
  if (format === 'story') return 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';
  return 'image/jpeg,image/png,image/webp';
}

async function readFileDimensions(file, kind) {
  if (kind === 'image' && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return dimensions;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const element = kind === 'video' ? document.createElement('video') : new Image();
      const cleanup = () => {
        element.onloadedmetadata = null;
        element.onload = null;
        element.onerror = null;
      };
      element.onerror = () => {
        cleanup();
        reject(new Error('Não foi possível ler as dimensões da mídia.'));
      };
      const done = () => {
        const width = element.videoWidth || element.naturalWidth;
        const height = element.videoHeight || element.naturalHeight;
        cleanup();
        if (!width || !height) reject(new Error('Dimensões de mídia inválidas.'));
        else resolve({ width, height });
      };
      if (kind === 'video') element.onloadedmetadata = done;
      else element.onload = done;
      element.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return 'Arquivo temporário';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function surfaceForTarget(doc, target) {
  return target.format === 'carrossel'
    ? doc.carrossel.slides[target.slide]
    : doc[target.format];
}

function activeTarget(state) {
  return {
    format: state.format,
    ratio: state.ratio,
    slide: state.format === 'carrossel' ? state.doc.carrossel.active : null
  };
}

function targetIsActive(state, target) {
  return state.format === target.format
    && (target.format !== 'carrossel' || state.doc.carrossel.active === target.slide);
}

function baseState(initialDraft) {
  const restored = initialDraft?.editor_state;
  const lifecycleStatus = initialDraft?.status === 'scheduled' ? 'Agendado' : initialDraft ? 'Rascunho salvo' : 'Rascunho';
  return {
    theme: 'light', format: 'post', ratio: '1:1', doc: makeComposerDocument(),
    caption: '', hashtags: '', firstComment: '', altText: '', location: '', tags: '',
    hideLikes: false, showFeed: true,
    schedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), schedTime: '20:00',
    ...restored, status: lifecycleStatus, undoStack: [], redoStack: [], sel: null, editing: null
  };
}

function IconButton({ title, children, ...props }) {
  return <button type="button" className={styles.iconButton} title={title} aria-label={title} {...props}>{children}</button>;
}

export function VisualComposer({ brandId, brandName = 'genkailabs', initialDraft = null }) {
  const [state, setState] = useState(() => baseState(initialDraft));
  const [tool, setTool] = useState('formato');
  const [elementCategory, setElementCategory] = useState('Formas');
  const [elementSearch, setElementSearch] = useState('');
  const [emojiCategory, setEmojiCategory] = useState('recentes');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [guides, setGuides] = useState([]);
  const [scale, setScale] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [busy, setBusy] = useState('');
  const [draftId, setDraftId] = useState(initialDraft?.id || null);
  const [contentStatus, setContentStatus] = useState(initialDraft?.status || (initialDraft?.id ? 'draft' : null));
  const regionRef = useRef(null);
  const canvasRef = useRef(null);
  const gestureRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const wheelHistoryRef = useRef(0);
  const uploadSequenceRef = useRef(new Map());
  const stateRef = useRef(state);
  stateRef.current = state;
  const [cw, ch] = canvasSize(state.format, state.ratio);
  const surface = getSurface(state.doc, state.format);
  const mediaTransform = surface.media
    ? normalizeMediaTransform(surface.bg, surface.media, [cw, ch])
    : null;
  const selected = state.sel === 'bg' ? null : surface.layers.find((item) => item.id === state.sel);
  const validation = validateComposer(state);
  const reel = getReelState(state.doc);
  const reelDuration = state.format === 'reel' ? Number(surface.media?.duration) || 0 : 0;
  // Busca (§4): por nome, categoria e palavras relacionadas, cruzando todas
  // as seções quando há termo digitado.
  const elementQuery = normalizeSearch(elementSearch);
  const bySection = (section) => (item) => !elementQuery
    || normalizeSearch(section).includes(elementQuery)
    || normalizeSearch(item.label).includes(elementQuery)
    || (item.keywords || []).some((keyword) => keyword.includes(elementQuery));
  const matchingShapes = ELEMENT_SHAPES.filter(bySection('formas'));
  const matchingLines = ELEMENT_LINES.filter(bySection('linhas e setas'));
  const matchingIcons = ELEMENT_VECTOR_ICONS.filter(bySection('icones'));
  const matchingStickers = SOCIALHUB_STICKERS.filter(bySection('stickers'));
  const matchingEmojis = elementQuery
    ? searchEmojis(elementSearch)
    : emojiCategory === 'recentes'
      ? recentEmojis
      : EMOJI_CATEGORIES.find((category) => category.id === emojiCategory)?.emojis || [];
  const selectedIsText = !!selected && isTextLayer(selected);

  const flash = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    setState((current) => ({ ...current, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light' }));
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_EMOJIS_KEY) || '[]');
      if (Array.isArray(stored)) setRecentEmojis(stored.filter((item) => typeof item === 'string').slice(0, RECENT_EMOJIS_LIMIT));
    } catch {}
  }, []);

  useEffect(() => {
    const enforceSinglePanel = () => {
      if (window.innerWidth < 1250 && tool) {
        setPreviewOpen(false);
        setLayersOpen(false);
      }
    };
    enforceSinglePanel();
    window.addEventListener('resize', enforceSinglePanel);
    return () => window.removeEventListener('resize', enforceSinglePanel);
  }, [tool]);

  useEffect(() => {
    if (initialDraft?.editor_state) return;
    try {
      const cached = localStorage.getItem(`composer:draft:${brandId}`);
      if (cached) setState((current) => ({ ...current, ...JSON.parse(cached), undoStack: [], redoStack: [], sel: null, editing: null }));
    } catch {}
  }, [brandId, initialDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(`composer:draft:${brandId}`, JSON.stringify(serializeComposer(state))); } catch {}
    }, 350);
    return () => window.clearTimeout(timer);
  }, [brandId, state]);

  useEffect(() => {
    const update = () => {
      const el = regionRef.current;
      if (!el) return;
      const availableW = Math.max(120, el.clientWidth - 50);
      const availableH = Math.max(120, el.clientHeight - (state.format === 'carrossel' || state.format === 'reel' ? 120 : 45));
      setScale(Math.min(1, Math.max(.3, Math.min(availableW / cw, availableH / ch))));
    };
    update();
    const observer = new ResizeObserver(update);
    if (regionRef.current) observer.observe(regionRef.current);
    return () => observer.disconnect();
  }, [cw, ch, state.format, previewOpen, layersOpen, tool]);

  // Relógio único do Reel: o <video> do canvas manda o tempo; timeline e
  // prévia apenas leem, então nunca divergem (§3, §6).
  useEffect(() => {
    const element = videoRef.current;
    if (!element || state.format !== 'reel') return;
    function tick() {
      const trim = clampTrim(reel.video, reelDuration);
      if (reelDuration && element.currentTime >= trim.end) element.currentTime = trim.start;
      setPlayhead(element.currentTime);
      const track = audioRef.current;
      if (track) {
        const expected = (reel.audio?.start || 0) + (element.currentTime - trim.start);
        if (Math.abs(track.currentTime - expected) > .25) track.currentTime = Math.max(0, expected);
      }
    }
    element.addEventListener('timeupdate', tick);
    return () => element.removeEventListener('timeupdate', tick);
  }, [state.format, reel.video.start, reel.video.end, reel.audio?.start, reelDuration]);

  useEffect(() => {
    const element = videoRef.current;
    const track = audioRef.current;
    if (!element) return;
    if (playing) { element.play?.()?.catch?.(() => {}); track?.play?.()?.catch?.(() => {}); }
    else { element.pause?.(); track?.pause?.(); }
  }, [playing, reel.audio?.url]);

  const pushHistory = useCallback(() => {
    setState((current) => ({
      ...current,
      undoStack: [...current.undoStack.slice(-39), JSON.stringify({ doc: current.doc, format: current.format, ratio: current.ratio })],
      redoStack: []
    }));
  }, []);

  const mutateDoc = useCallback((recipe, history = true) => {
    setState((current) => {
      const doc = cloneEditorState(current.doc);
      recipe(doc, current);
      const undoStack = history
        ? [...current.undoStack.slice(-39), JSON.stringify({ doc: current.doc, format: current.format, ratio: current.ratio })]
        : current.undoStack;
      return { ...current, doc, undoStack, redoStack: history ? [] : current.redoStack };
    });
  }, []);

  // Delete/Backspace removem a seleção do canvas (camada ou mídia), sem
  // interferir na digitação em campos ou na edição de texto de uma camada.
  useEffect(() => {
    function onDeleteKey(event) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName || ''))) return;
      const current = stateRef.current;
      if (!current.sel || current.editing) return;
      const currentSurface = getSurface(current.doc, current.format);
      const layer = currentSurface.layers.find((item) => item.id === current.sel);
      if (current.sel !== 'bg' && (!layer || layer.locked)) return;
      event.preventDefault();
      mutateDoc((doc, value) => {
        const targetSurface = getSurface(doc, value.format);
        if (value.sel === 'bg') targetSurface.media = null;
        else targetSurface.layers.splice(targetSurface.layers.findIndex((item) => item.id === value.sel), 1);
      });
      setState((value) => ({ ...value, sel: null }));
    }
    window.addEventListener('keydown', onDeleteKey);
    return () => window.removeEventListener('keydown', onDeleteKey);
  }, [mutateDoc]);

  function restoreSnapshot(value, target) {
    const parsed = JSON.parse(value);
    setState((current) => ({ ...current, ...parsed, ...target, sel: null, editing: null }));
  }

  function undo() {
    const current = stateRef.current;
    if (!current.undoStack.length) return;
    const snapshot = current.undoStack.at(-1);
    restoreSnapshot(snapshot, {
      undoStack: current.undoStack.slice(0, -1),
      redoStack: [...current.redoStack, JSON.stringify({ doc: current.doc, format: current.format, ratio: current.ratio })]
    });
  }

  function redo() {
    const current = stateRef.current;
    if (!current.redoStack.length) return;
    const snapshot = current.redoStack.at(-1);
    restoreSnapshot(snapshot, {
      redoStack: current.redoStack.slice(0, -1),
      undoStack: [...current.undoStack, JSON.stringify({ doc: current.doc, format: current.format, ratio: current.ratio })]
    });
  }

  function setFormat(format) {
    const ratio = Object.keys(COMPOSER_FORMATS[format].ratios)[0];
    setState((current) => ({ ...current, format, ratio, sel: null, editing: null }));
  }

  function updateField(key, value) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function setRatio(ratio) {
    mutateDoc((doc, current) => {
      const targetSurface = getSurface(doc, current.format);
      if (targetSurface.media) {
        targetSurface.bg = fitMediaToCanvas(
          { width: targetSurface.media.width, height: targetSurface.media.height },
          canvasSize(current.format, ratio)
        );
      }
    });
    setState((current) => ({ ...current, ratio, sel: current.sel === 'bg' ? 'bg' : null }));
  }

  async function pickMedia(url, kind = 'image', metadata = {}, target = activeTarget(stateRef.current)) {
    mutateDoc((doc, current) => {
      const targetSurface = surfaceForTarget(doc, target);
      if (!targetSurface) return;
      const effectiveRatio = current.format === target.format ? current.ratio : target.ratio;
      targetSurface.media = {
        url,
        kind,
        name: metadata.name || url.split('/').pop()?.split('?')[0] || 'Mídia',
        path: metadata.path || null,
        size: metadata.size || null,
        type: metadata.type || null,
        width: metadata.width || null,
        height: metadata.height || null
      };
      targetSurface.bg = fitMediaToCanvas(
        { width: metadata.width, height: metadata.height },
        canvasSize(target.format, effectiveRatio)
      );
    });
    setState((current) => targetIsActive(current, target)
      ? { ...current, sel: 'bg', editing: null }
      : current);
    setMediaError('');
    flash('Mídia adicionada — edição não destrutiva ativada');
  }

  async function uploadFiles(files) {
    const file = files?.[0];
    if (!file) return;
    const target = activeTarget(stateRef.current);
    const targetKey = `${target.format}:${target.slide ?? 'single'}`;
    const requestId = `${Date.now()}:${Math.random()}`;
    uploadSequenceRef.current.set(targetKey, requestId);
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const isVideo = ['video/mp4', 'video/quicktime'].includes(file.type);
    const valid = state.format === 'reel'
      ? isVideo
      : state.format === 'story'
        ? isImage || isVideo
        : isImage;
    if (!valid || /\.avi$/i.test(file.name)) {
      setMediaError(`Formato não suportado para ${FORMAT_META[state.format][0]}. Use ${state.format === 'reel' ? 'MP4 ou MOV' : state.format === 'story' ? 'JPG, PNG, WEBP, MP4 ou MOV' : 'JPG, PNG ou WEBP'}.`);
      return;
    }
    setUploading(10);
    const fake = window.setInterval(() => setUploading((value) => Math.min(90, (value || 0) + 20)), 180);
    try {
      const dimensions = await readFileDimensions(file, isVideo ? 'video' : 'image');
      const supabase = createClient();
      const uploaded = await uploadTempMedia(supabase, brandId, file);
      if (uploadSequenceRef.current.get(targetKey) !== requestId) {
        await removeTempMedia(supabase, [uploaded.path || uploaded.publicUrl]);
        return;
      }
      const previous = surfaceForTarget(stateRef.current.doc, target)?.media;
      await pickMedia(uploaded.publicUrl, isVideo ? 'video' : 'image', {
        path: uploaded.path,
        name: file.name,
        size: file.size,
        type: file.type,
        ...dimensions
      }, target);
      if (previous) await removeTempMedia(supabase, [previous.path || previous.url]);
      uploadSequenceRef.current.delete(targetKey);
      setUploading(100);
    } catch (error) {
      setMediaError(error.message || 'Não foi possível enviar o arquivo.');
    } finally {
      if (uploadSequenceRef.current.get(targetKey) === requestId) {
        uploadSequenceRef.current.delete(targetKey);
      }
      window.clearInterval(fake);
      window.setTimeout(() => setUploading(null), 350);
    }
  }

  function syncMediaDimensions(width, height, duration) {
    if (!width || !height) return;
    mutateDoc((doc, current) => {
      const targetSurface = getSurface(doc, current.format);
      if (!targetSurface.media) return;
      if (Number(duration) > 0) targetSurface.media.duration = Number(duration);
      if (targetSurface.media.width && targetSurface.media.height && targetSurface.bg?.w && targetSurface.bg?.h) return;
      targetSurface.media.width = width;
      targetSurface.media.height = height;
      targetSurface.bg = fitMediaToCanvas({ width, height }, canvasSize(current.format, current.ratio));
    }, false);
  }

  async function removeCurrentMedia() {
    const currentMedia = surface.media;
    if (!currentMedia) return;
    setBusy('remove-media');
    setMediaError('');
    try {
      const result = await removeTempMedia(createClient(), [currentMedia.path || currentMedia.url]);
      if (!result.ok) throw new Error(result.error);
      mutateDoc((doc, current) => {
        getSurface(doc, current.format).media = null;
      });
      setState((current) => ({ ...current, sel: null }));
      flash('Arquivo temporário removido');
    } catch (error) {
      setMediaError(error.message || 'Não foi possível remover o arquivo.');
    } finally {
      setBusy('');
    }
  }

  // point (opcional) = posição em coordenadas do canvas onde o elemento foi
  // solto; sem ele o elemento entra no centro, como no clique simples (§2.7).
  function addPreset(preset, point = null) {
    let created;
    mutateDoc((doc, current) => {
      const targetSurface = getSurface(doc, current.format);
      const [canvasW, canvasH] = canvasSize(current.format, current.ratio);
      created = addLayer(targetSurface, preset, [canvasW, canvasH]);
      if (point) {
        created.x = Math.round(Math.min(canvasW - 4, Math.max(4 - created.w, point.x - created.w / 2)));
        created.y = Math.round(Math.min(canvasH - 4, Math.max(4 - created.h, point.y - created.h / 2)));
      }
    });
    window.setTimeout(() => setState((current) => ({ ...current, sel: created.id })), 0);
  }

  function updateLayer(id, patch, history = true) {
    mutateDoc((doc, current) => {
      const layer = getSurface(doc, current.format).layers.find((item) => item.id === id);
      if (layer) Object.assign(layer, typeof patch === 'function' ? patch(layer) : patch);
    }, history);
  }

  function duplicateLayer(id) {
    const original = surface.layers.find((item) => item.id === id);
    if (!original) return;
    const copy = { ...cloneEditorState(original), id: `l${Date.now().toString(36)}`, x: original.x + 18, y: original.y + 18 };
    mutateDoc((doc, current) => getSurface(doc, current.format).layers.push(copy));
    setState((current) => ({ ...current, sel: copy.id }));
  }

  // Aplica um estilo pronto (§10): na camada selecionada ou em um texto novo.
  function applyTextStyle(style) {
    if (selectedIsText) updateLayer(selected.id, style.patch);
    else addPreset({ text: 'Seu texto aqui', fs: 30, h: 52, ...style.patch });
  }

  function rememberEmoji(emoji) {
    setRecentEmojis((current) => {
      const next = [emoji, ...current.filter((item) => item !== emoji)].slice(0, RECENT_EMOJIS_LIMIT);
      try { localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function addEmoji(emoji, point = null) {
    addPreset(emojiPreset(emoji), point);
    rememberEmoji(emoji);
  }

  // Arrastar da biblioteca para o canvas (§2.7): o preset viaja no
  // dataTransfer e só vira camada quando solto dentro do canvas.
  function elementDragProps(preset, emoji = null) {
    return {
      draggable: true,
      onDragStart: (event) => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData(ELEMENT_DRAG_TYPE, JSON.stringify({ preset, emoji }));
      }
    };
  }

  function handleCanvasDrop(event) {
    const raw = event.dataTransfer.getData(ELEMENT_DRAG_TYPE);
    if (!raw) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }
    if (!payload?.preset) return;
    const point = {
      x: (event.clientX - rect.left) / (scale || 1),
      y: (event.clientY - rect.top) / (scale || 1)
    };
    const droppedAt = Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
    addPreset(payload.preset, droppedAt);
    if (payload.emoji) rememberEmoji(payload.emoji);
  }

  // Estado do Reel (§1, §2, §5): vídeo, áudio próprio e capa.
  function patchReel(patch) {
    mutateDoc((doc) => { Object.assign(doc.reel, patch); });
  }

  function patchReelVideo(patch) {
    mutateDoc((doc) => { doc.reel.video = { ...getReelState(doc).video, ...patch }; });
  }

  function patchReelAudio(patch) {
    mutateDoc((doc) => {
      const current = getReelState(doc).audio;
      doc.reel.audio = patch === null
        ? null
        : { ...(current || { url: '', path: null, name: '', start: 0, volume: 1 }), ...patch };
    });
  }

  function seekReel(seconds) {
    if (videoRef.current) videoRef.current.currentTime = seconds;
    setPlayhead(seconds);
  }

  async function uploadReelAsset(file, kind) {
    if (!file) return;
    setBusy(kind);
    setMediaError('');
    try {
      const result = await uploadTempMedia(createClient(), brandId, file);
      if (kind === 'audio') patchReelAudio({ url: result.publicUrl, path: result.path, name: file.name, start: 0, volume: 1 });
      else patchReel({ cover: { mode: 'upload', url: result.publicUrl, path: result.path, name: file.name, timeMs: 0 } });
      flash(kind === 'audio' ? 'Áudio adicionado' : 'Capa adicionada');
    } catch (error) {
      setMediaError(error.message || 'Não foi possível enviar o arquivo.');
    } finally { setBusy(''); }
  }

  function fitReelCanvas() {
    mutateDoc((doc, current) => {
      const target = getSurface(doc, current.format);
      if (target.media) {
        target.bg = fitMediaToCanvas(
          { width: target.media.width, height: target.media.height },
          canvasSize(current.format, current.ratio)
        );
      }
    });
  }

  function moveLayerInStack(id, delta) {
    mutateDoc((doc, current) => { reorderLayer(getSurface(doc, current.format), id, delta); });
  }

  // Reordenação por arrasto no painel de camadas (§2.4): índice absoluto na
  // mesma lista de camadas do documento — sem estado paralelo.
  function moveLayerToStackIndex(id, index) {
    mutateDoc((doc, current) => { moveLayerToIndex(getSurface(doc, current.format), id, index); });
  }

  function deleteLayerById(id) {
    mutateDoc((doc, current) => {
      const list = getSurface(doc, current.format).layers;
      const index = list.findIndex((item) => item.id === id);
      if (index >= 0) list.splice(index, 1);
    });
    setState((current) => ({ ...current, sel: current.sel === id ? null : current.sel }));
  }

  function beginGesture(kind, event, layer, corner) {
    if (layer?.locked) return;
    event.preventDefault();
    event.stopPropagation();
    pushHistory();
    const point = { x: event.clientX / scale, y: event.clientY / scale };
    const original = layer
      ? cloneEditorState(layer)
      : cloneEditorState(normalizeMediaTransform(surface.bg, surface.media, [cw, ch]));
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const centerClient = kind === 'media-rotate' && canvasRect
      ? {
          x: canvasRect.left + (original.x + original.w * original.scale / 2) * scale,
          y: canvasRect.top + (original.y + original.h * original.scale / 2) * scale
        }
      : null;
    gestureRef.current = {
      kind, id: layer?.id || 'bg', corner, start: point,
      original,
      centerClient,
      startAngle: centerClient ? Math.atan2(event.clientY - centerClient.y, event.clientX - centerClient.x) : 0
    };
    setState((current) => ({ ...current, sel: layer?.id || 'bg', editing: null }));
  }

  function handleMediaKey(event, action, corner) {
    const arrows = {
      ArrowLeft: { dx: -8, dy: 0 },
      ArrowRight: { dx: 8, dy: 0 },
      ArrowUp: { dx: 0, dy: -8 },
      ArrowDown: { dx: 0, dy: 8 }
    };
    const delta = arrows[event.key];
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    pushHistory();
    mutateDoc((doc, current) => {
      const targetSurface = getSurface(doc, current.format);
      const transform = normalizeMediaTransform(
        targetSurface.bg,
        targetSurface.media,
        canvasSize(current.format, current.ratio)
      );
      if (action === 'move') {
        targetSurface.bg = { ...transform, x: transform.x + delta.dx, y: transform.y + delta.dy };
      } else if (action === 'resize') {
        targetSurface.bg = resizeMediaFromCorner(transform, corner, delta);
      } else if (action === 'rotate') {
        targetSurface.bg = { ...transform, rot: transform.rot + (delta.dx || delta.dy) / 2 };
      }
    });
  }

  useEffect(() => {
    function move(event) {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const dx = event.clientX / scale - gesture.start.x;
      const dy = event.clientY / scale - gesture.start.y;
      setState((current) => {
        const doc = cloneEditorState(current.doc);
        const targetSurface = getSurface(doc, current.format);
        if (gesture.kind === 'media-move') {
          targetSurface.bg.x = gesture.original.x + dx;
          targetSurface.bg.y = gesture.original.y + dy;
        } else if (gesture.kind === 'media-resize') {
          targetSurface.bg = resizeMediaFromCorner(gesture.original, gesture.corner, { dx, dy });
        } else if (gesture.kind === 'media-rotate') {
          const currentAngle = Math.atan2(
            event.clientY - gesture.centerClient.y,
            event.clientX - gesture.centerClient.x
          );
          let angle = gesture.original.rot + (currentAngle - gesture.startAngle) * 180 / Math.PI;
          for (const snap of [0, 90, -90, 180, -180]) if (Math.abs(angle - snap) < 5) angle = snap;
          targetSurface.bg.rot = Math.round(angle);
        } else {
          const layer = targetSurface.layers.find((item) => item.id === gesture.id);
          if (!layer) return current;
          if (gesture.kind === 'move') {
            const snapped = computeSnap({
              x: gesture.original.x + dx,
              y: gesture.original.y + dy,
              w: layer.w,
              h: layer.h,
              canvas: canvasSize(current.format, current.ratio),
              others: targetSurface.layers.filter((item) => item.id !== layer.id && !item.hidden)
            });
            layer.x = snapped.x; layer.y = snapped.y;
            setGuides(snapped.guides);
          } else if (gesture.kind === 'resize') {
            const signX = gesture.corner.includes('e') ? 1 : -1;
            const signY = gesture.corner.includes('s') ? 1 : -1;
            const ratio = gesture.original.w / gesture.original.h;
            const width = Math.max(28, gesture.original.w + dx * signX);
            layer.w = width;
            layer.h = Math.max(22, width / ratio);
            layer.fs = Math.max(8, gesture.original.fs * (width / gesture.original.w));
            if (signX < 0) layer.x = gesture.original.x + gesture.original.w - width;
            if (signY < 0) layer.y = gesture.original.y + gesture.original.h - layer.h;
          } else if (gesture.kind === 'rotate') {
            const cx = layer.x + layer.w / 2;
            const cy = layer.y + layer.h / 2;
            let angle = Math.atan2(event.clientY / scale - cy, event.clientX / scale - cx) * 180 / Math.PI + 90;
            for (const snap of [0, 90, -90, 180, -180]) if (Math.abs(angle - snap) < 5) angle = snap;
            layer.rot = Math.round(angle);
          }
        }
        return { ...current, doc };
      });
    }
    function end() { gestureRef.current = null; setGuides([]); }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
  }, [scale]);

  function handleMediaWheel(event) {
    if (stateRef.current.sel !== 'bg' || !surface.media) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    };
    const now = Date.now();
    const startsGesture = now - wheelHistoryRef.current > 300;
    wheelHistoryRef.current = now;
    const factor = Math.exp(-event.deltaY * .0015);
    mutateDoc((doc, current) => {
      const targetSurface = getSurface(doc, current.format);
      targetSurface.bg = zoomMediaAtPoint(
        normalizeMediaTransform(targetSurface.bg, targetSurface.media, canvasSize(current.format, current.ratio)),
        point,
        factor
      );
    }, startsGesture);
  }

  function carouselAction(action, index = state.doc.carrossel.active) {
    mutateDoc((doc) => {
      const carousel = doc.carrossel;
      if (action === 'add' && carousel.slides.length < 10) {
        carousel.slides.push({ media: null, bg: { x: 0, y: 0, scale: 1, rot: 0 }, layers: [] });
        carousel.active = carousel.slides.length - 1;
      }
      if (action === 'duplicate' && carousel.slides.length < 10) {
        carousel.slides.splice(index + 1, 0, cloneEditorState(carousel.slides[index]));
        carousel.active = index + 1;
      }
      if (action === 'delete' && carousel.slides.length > 1) {
        carousel.slides.splice(index, 1);
        carousel.active = Math.min(index, carousel.slides.length - 1);
      }
    });
    setState((current) => ({ ...current, sel: null }));
  }

  function reorderSlide(from, to) {
    if (from === to) return;
    mutateDoc((doc) => {
      const [item] = doc.carrossel.slides.splice(from, 1);
      doc.carrossel.slides.splice(to, 0, item);
      doc.carrossel.active = to;
    });
  }

  const mediaUrls = useMemo(() => state.format === 'carrossel'
    ? state.doc.carrossel.slides.map((slide) => slide.media?.url).filter(Boolean)
    : [surface.media?.url].filter(Boolean), [state.doc, state.format, surface.media]);

  async function persistDraft() {
    if (contentStatus === 'scheduled') {
      setModal('schedule');
      return;
    }
    setBusy('draft');
    try {
      const result = await saveDraft({
        brandId, draftId, caption: state.caption, hashtags: state.hashtags, firstComment: state.firstComment,
        altText: state.altText, imageUrls: mediaUrls, format: toApiFormat(state.format),
        editorState: serializeComposer(state), location: state.location, taggedPeople: state.tags,
        share_to_feed: state.showFeed,
        thumb_offset_ms: state.format === 'reel' ? reel.cover.timeMs : null,
        coverUrl: state.format === 'reel' && reel.cover.mode === 'upload' ? reel.cover.url : null
      });
      if (result?.error) throw new Error(result.error);
      if (result?.id) {
        setDraftId(result.id);
        setContentStatus('draft');
      }
      updateField('status', 'Rascunho salvo');
      flash('Rascunho salvo');
    } catch (error) { flash(error.message); }
    finally { setBusy(''); }
  }

  async function confirmPublication(kind) {
    if (!validation.ok) return flash('Resolva as pendências antes de publicar');
    setBusy(kind);
    try {
      const payload = {
        brandId, draftId, caption: state.caption, hashtags: state.hashtags, firstComment: state.firstComment,
        altText: state.altText, imageUrls: mediaUrls, format: toApiFormat(state.format),
        editorState: serializeComposer(state), location: state.location, taggedPeople: state.tags,
        share_to_feed: state.showFeed,
        thumb_offset_ms: state.format === 'reel' ? reel.cover.timeMs : null,
        coverUrl: state.format === 'reel' && reel.cover.mode === 'upload' ? reel.cover.url : null
      };
      const result = kind === 'schedule'
        ? await schedulePost({ ...payload, scheduledAt: new Date(`${state.schedDate}T${state.schedTime}`).toISOString() })
        : await publishNow(payload);
      if (result?.error) throw new Error(result.error);
      if (kind === 'schedule') {
        if (result?.id) setDraftId(result.id);
        setContentStatus('scheduled');
        updateField('status', `Agendado · ${state.schedDate.split('-').reverse().join('/')} ${state.schedTime}`);
      } else {
        localStorage.removeItem(`composer:draft:${brandId}`);
        setDraftId(null);
        setContentStatus(null);
        setState((current) => ({ ...baseState(null), theme: current.theme, status: 'Publicado ✓' }));
      }
      setModal(null);
      flash(result.warning || (kind === 'schedule' ? 'Publicação agendada' : 'Publicação enviada ao Instagram'));
    } catch (error) { flash(error.message); }
    finally { setBusy(''); }
  }

  async function confirmDraftDeletion() {
    if (!draftId) return;
    setBusy('delete-draft');
    try {
      const result = await deleteComposerDraft({ brandId, draftId });
      if (result?.error) throw new Error(result.error);
      localStorage.removeItem(`composer:draft:${brandId}`);
      setDraftId(null);
      setContentStatus(null);
      setState((current) => ({ ...baseState(null), theme: current.theme }));
      setModal(null);
      flash('Rascunho e mídias temporárias excluídos');
    } catch (error) {
      flash(error.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.title}>Composer</div>
        <div className={`${styles.chip} ${styles.brandChip}`}>{brandName} · @{brandName.replace(/^@/, '')}</div>
        <div className={`${styles.chip} ${styles.status}`}>{state.status}</div>
        <div className={styles.spacer} />
        <IconButton title="Desfazer" onClick={undo} disabled={!state.undoStack.length}><Undo2 size={16} /></IconButton>
        <IconButton title="Refazer" onClick={redo} disabled={!state.redoStack.length}><Redo2 size={16} /></IconButton>
        <div className={`${styles.segment} ${styles.themeToggle}`}>
          <button className={state.theme === 'light' ? styles.selected : ''} onClick={() => { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); setState((v) => ({ ...v, theme: 'light' })); }}>Claro</button>
          <button className={state.theme === 'dark' ? styles.selected : ''} onClick={() => { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); setState((v) => ({ ...v, theme: 'dark' })); }}>Escuro</button>
        </div>
        {draftId && contentStatus === 'draft' && <IconButton title="Excluir rascunho" onClick={() => setModal('delete-draft')}><Trash2 size={16} /></IconButton>}
        <button className={`${styles.button} ${styles.outline}`} onClick={persistDraft} disabled={!!busy}><Save size={14} /> <span>{busy === 'draft' ? 'Salvando…' : contentStatus === 'scheduled' ? 'Atualizar agendamento' : 'Salvar rascunho'}</span></button>
        <button className={`${styles.button} ${styles.soft}`} onClick={() => setModal('schedule')}>Agendar</button>
        <button className={`${styles.button} ${styles.primary}`} onClick={() => setModal('publish')}>Publicar</button>
      </header>

      <div className={styles.workspace}>
        <nav className={styles.rail} aria-label="Ferramentas do Composer">
          {TOOLS.map(([id, Icon, label]) => (
            <button key={id} className={`${styles.railButton} ${tool === id ? styles.railActive : ''}`} onClick={() => { setTool(tool === id ? null : id); if (window.innerWidth < 1250) { setPreviewOpen(false); setLayersOpen(false); } }}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
          <div className={styles.railBottom} />
          <button className={`${styles.railButton} ${previewOpen ? styles.railActive : ''}`} onClick={() => { setPreviewOpen(!previewOpen); if (window.innerWidth < 1250) { setTool(null); setLayersOpen(false); } }}><Smartphone size={17} /><span>Prévia</span></button>
          <button className={`${styles.railButton} ${layersOpen ? styles.railActive : ''}`} onClick={() => { setLayersOpen(!layersOpen); if (window.innerWidth < 1250) { setTool(null); setPreviewOpen(false); } }}><Layers3 size={17} /><span>Camadas</span></button>
        </nav>

        {tool && <aside className={styles.panel}>
          <div className={styles.panelHead}><span>{TOOLS.find(([id]) => id === tool)?.[2]}</span><IconButton title="Fechar painel" onClick={() => setTool(null)}><X size={14} /></IconButton></div>
          {tool === 'formato' && <>
            {Object.entries(FORMAT_META).map(([id, meta]) => <button key={id} className={`${styles.formatCard} ${state.format === id ? styles.activeCard : ''}`} onClick={() => setFormat(id)}><strong>{meta[0]}</strong><span>{meta[1]}</span></button>)}
            {state.format === 'post' && <><div className={styles.sectionLabel}>PROPORÇÃO</div><div className={styles.segment}>{Object.keys(COMPOSER_FORMATS.post.ratios).map((ratio) => <button key={ratio} className={state.ratio === ratio ? styles.selected : ''} onClick={() => setRatio(ratio)}>{ratio}</button>)}</div></>}
          </>}
          {tool === 'midia' && <>
            {!surface.media ? (
              <label className={styles.upload}><Upload size={22} /><strong>Adicionar mídia</strong><small>{state.format === 'reel' ? 'MP4 ou MOV · 9:16' : state.format === 'story' ? 'JPG, PNG, WEBP, MP4 ou MOV' : 'JPG, PNG ou WEBP'}</small><input type="file" accept={mediaAccept(state.format)} onChange={(event) => uploadFiles(event.target.files)} /></label>
            ) : (
              <>
                <div className={styles.sectionLabel}>ARQUIVO ATUAL</div>
                <div className={styles.currentMedia}>
                  <div className={styles.mediaPreview}>{surface.media.kind === 'video' ? <Film size={22} /> : <ImageIcon size={22} />}</div>
                  <div className={styles.mediaInfo}><strong>{surface.media.name || 'Mídia sem nome'}</strong><span>{formatFileSize(surface.media.size)}</span><small>Temporário · disponível até o fim da publicação</small></div>
                </div>
                <div className={styles.mediaActions}>
                  <label role="button" tabIndex={0} aria-label="Substituir arquivo" className={`${styles.button} ${styles.outline}`} onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.currentTarget.querySelector('input')?.click();
                    }
                  }}>
                    <Upload size={14} /> Substituir arquivo
                    <input type="file" accept={mediaAccept(state.format)} onChange={(event) => uploadFiles(event.target.files)} />
                  </label>
                  <button type="button" aria-label="Remover arquivo" className={`${styles.button} ${styles.removeMedia}`} disabled={busy === 'remove-media'} onClick={removeCurrentMedia}><Trash2 size={14} /> Remover arquivo</button>
                </div>
                {state.format === 'reel' && <ReelVideoPanel
                  duration={reelDuration}
                  current={playhead}
                  video={reel.video}
                  audio={reel.audio}
                  cover={reel.cover}
                  onVideo={patchReelVideo}
                  onAudio={patchReelAudio}
                  onCover={(patch) => patchReel({ cover: { ...reel.cover, ...patch } })}
                  onAudioFile={(file) => uploadReelAsset(file, 'audio')}
                  onCoverFile={(file) => uploadReelAsset(file, 'cover')}
                  onFitCanvas={fitReelCanvas}
                />}
              </>
            )}
            {uploading != null && <div className={styles.progress}><span style={{ width: `${uploading}%` }} /></div>}
            {mediaError && <div className={styles.error}>{mediaError}</div>}
          </>}
          {tool === 'texto' && <>
            <button className={styles.preset} style={{ fontSize: 19, fontWeight: 800 }} onClick={() => addPreset({ text: 'Adicionar título', fs: 32, weight: 800, h: 52 })}>Adicionar título</button>
            <button className={styles.preset} style={{ fontSize: 14, fontWeight: 600 }} onClick={() => addPreset({ text: 'Adicionar subtítulo', fs: 18, weight: 600, h: 38 })}>Adicionar subtítulo</button>
            <button className={styles.preset} onClick={() => addPreset({ text: 'Adicionar texto de corpo', fs: 13, weight: 400, h: 34 })}>Adicionar texto de corpo</button>
            <div className={styles.sectionLabel}>ESTILOS PRONTOS</div>
            <div className={styles.styleGrid}>
              {TEXT_STYLES.map((style) => <button key={style.id} className={styles.styleCard} onClick={() => applyTextStyle(style)}>
                <span style={{
                  fontFamily: `'${style.patch.font}', sans-serif`,
                  fontWeight: style.patch.weight,
                  textTransform: style.patch.tt === 'upper' ? 'uppercase' : 'none',
                  letterSpacing: style.patch.ls ? `${Math.min(style.patch.ls, 1)}px` : undefined,
                  background: style.patch.bgMode ? style.patch.bgFill : 'transparent',
                  color: style.patch.color === 'transparent' ? 'var(--vc-text)' : style.patch.bgMode ? style.patch.color : 'var(--vc-text)',
                  WebkitTextStroke: style.patch.color === 'transparent' ? `1px var(--vc-text)` : undefined,
                  textShadow: style.patch.shOn ? '0 2px 4px rgba(0,0,0,.5)' : undefined,
                  borderRadius: 6, padding: '2px 8px', fontSize: 13
                }}>{style.label}</span>
              </button>)}
            </div>
            {selectedIsText
              ? <TextProperties layer={selected} onPatch={(patch, history) => updateLayer(selected.id, patch, history)} onHistory={pushHistory} />
              : <p style={{ fontSize: 11, color: 'var(--vc-faint)', lineHeight: 1.5 }}>Clique duas vezes no texto para editar. Arraste, gire e redimensione pelas alças. Selecione um texto para ver todas as propriedades.</p>}
          </>}
          {tool === 'elementos' && <>
            <div className={styles.elementSearch}>
              <Search size={14} aria-hidden="true" />
              <input aria-label="Buscar elementos" value={elementSearch} onChange={(event) => setElementSearch(event.target.value)} placeholder="Buscar elementos" />
            </div>
            {!elementQuery && <div className={styles.elementCategories} role="tablist" aria-label="Categorias de elementos">
              {ELEMENT_CATEGORIES.map((category) => <button key={category} type="button" role="tab" aria-selected={elementCategory === category} className={elementCategory === category ? styles.elementCategoryActive : ''} onClick={() => setElementCategory(category)}>{category}</button>)}
            </div>}
            {(elementQuery ? matchingShapes.length > 0 : elementCategory === 'Formas') && <>
              {elementQuery && <div className={styles.sectionLabel}>FORMAS</div>}
              <div className={styles.shapeGrid}>
                {matchingShapes.map(({ label, preset }) => <button key={label} className={styles.shape} aria-label={label} title={label} {...elementDragProps(preset)} onClick={() => addPreset(preset)}>
                  {preset.type === 'button'
                    ? <span style={{ display: 'inline-block', background: preset.fill || 'var(--vc-accent)', color: preset.color || '#fff', borderRadius: Math.min(preset.radius ?? 8, 12), fontSize: 9, fontWeight: 700, padding: '3px 7px', whiteSpace: 'nowrap' }}>{preset.text}</span>
                    : <span style={{ width: 30, height: 26, display: 'block', margin: 'auto' }}><ShapeGraphic layer={{ ...preset, fill: 'currentColor' }} /></span>}
                </button>)}
              </div>
            </>}
            {(elementQuery ? matchingLines.length > 0 : elementCategory === 'Linhas e setas') && <>
              {elementQuery && <div className={styles.sectionLabel}>LINHAS E SETAS</div>}
              <div className={styles.shapeGrid}>
                {matchingLines.map(({ label, preset }) => <button key={label} className={styles.shape} aria-label={label} title={label} {...elementDragProps(preset)} onClick={() => addPreset(preset)}>
                  <span style={{ width: 34, height: 16, display: 'block', margin: 'auto' }}>
                    {preset.type === 'arrow'
                      ? <ArrowGraphic layer={{ ...preset, fill: 'currentColor' }} />
                      : <LineGraphic layer={{ ...preset, fill: 'currentColor', h: Math.max(2, Math.round(preset.h / 2)) }} />}
                  </span>
                </button>)}
              </div>
            </>}
            {(elementQuery ? matchingIcons.length > 0 : elementCategory === 'Ícones') && <>
              {elementQuery && <div className={styles.sectionLabel}>ÍCONES</div>}
              <div className={styles.stickerGrid}>
                {matchingIcons.map((icon) => <button key={icon.id} className={styles.sticker} aria-label={`Ícone ${icon.label}`} title={icon.label} {...elementDragProps(iconLayerPreset(icon))} onClick={() => addPreset(iconLayerPreset(icon))}>
                  <svg viewBox="0 0 24 24" width="20" height="20" style={{ color: 'currentColor' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.body }} />
                </button>)}
              </div>
            </>}
            {(elementQuery ? matchingStickers.length > 0 : elementCategory === 'Stickers') && <>
              {elementQuery && <div className={styles.sectionLabel}>STICKERS</div>}
              <div className={styles.stickerList}>
                {matchingStickers.map(({ label, preset }) => <button key={label} className={styles.stickerBadge} style={{ background: preset.bgFill, color: preset.color }} {...elementDragProps(preset)} onClick={() => addPreset(preset)}>{label}</button>)}
              </div>
            </>}
            {(elementQuery ? matchingEmojis.length > 0 : elementCategory === 'Emojis') && <>
              {elementQuery
                ? <div className={styles.sectionLabel}>EMOJIS</div>
                : <div className={styles.elementCategories} role="tablist" aria-label="Categorias de emojis">
                    <button type="button" role="tab" aria-selected={emojiCategory === 'recentes'} className={emojiCategory === 'recentes' ? styles.elementCategoryActive : ''} onClick={() => setEmojiCategory('recentes')}>Recentes</button>
                    {EMOJI_CATEGORIES.map((category) => <button key={category.id} type="button" role="tab" aria-selected={emojiCategory === category.id} className={emojiCategory === category.id ? styles.elementCategoryActive : ''} onClick={() => setEmojiCategory(category.id)}>{category.label}</button>)}
                  </div>}
              <div className={styles.stickerGrid}>{matchingEmojis.map((emoji) => <button key={emoji} className={styles.sticker} aria-label={`Emoji ${emoji}`} {...elementDragProps(emojiPreset(emoji), emoji)} onClick={() => addEmoji(emoji)}>{emoji}</button>)}</div>
              {!elementQuery && emojiCategory === 'recentes' && !recentEmojis.length && <p style={{ fontSize: 11, color: 'var(--vc-faint)' }}>Os emojis que você usar aparecem aqui.</p>}
            </>}
            {elementQuery && !matchingShapes.length && !matchingLines.length && !matchingIcons.length && !matchingStickers.length && !matchingEmojis.length
              && <p style={{ fontSize: 11, color: 'var(--vc-faint)' }}>Nada encontrado para “{elementSearch}”.</p>}
            {selected && GRAPHIC_TYPES.has(selected.type)
              && <ElementProperties layer={selected} onPatch={(patch, history) => updateLayer(selected.id, patch, history)} onHistory={pushHistory} />}
            {state.format === 'story' && <div className={styles.error} style={{ color: 'var(--vc-warn)' }}>GIFs, enquetes e música ficam disponíveis apenas na publicação manual pelo Instagram.</div>}
          </>}
          {tool === 'legenda' && <>
            <div className={styles.sectionLabel}>LEGENDA <span className={styles.counter}>{state.caption.length} / 2200</span></div><textarea className={styles.textarea} value={state.caption} onChange={(e) => updateField('caption', e.target.value)} placeholder="Escreva a legenda…" />
            <button className={styles.preset} onClick={() => updateField('caption', `${state.caption} 😀`)}><Smile size={14} /> Inserir emoji</button>
            <div className={styles.sectionLabel}>HASHTAGS <span className={styles.counter}>{state.hashtags.split(/[\s,]+/).filter(Boolean).length} / 30</span></div><input className={styles.field} value={state.hashtags} onChange={(e) => updateField('hashtags', e.target.value)} placeholder="marketing, social, dicas" />
            <div className={styles.sectionLabel}>PRIMEIRO COMENTÁRIO</div><textarea className={styles.textarea} value={state.firstComment} onChange={(e) => updateField('firstComment', e.target.value)} placeholder="Opcional" />
          </>}
          {tool === 'config' && <>
            <div className={styles.sectionLabel}>LOCALIZAÇÃO</div><div style={{ position: 'relative' }}><MapPin size={14} style={{ position: 'absolute', left: 9, top: 10 }} /><input className={styles.field} style={{ paddingLeft: 29 }} value={state.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Adicionar localização" /></div>
            <div className={styles.sectionLabel}>MARCAR PESSOAS</div><div style={{ position: 'relative' }}><UserRoundPlus size={14} style={{ position: 'absolute', left: 9, top: 10 }} /><input className={styles.field} style={{ paddingLeft: 29 }} value={state.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="@usuario" /></div>
            <div className={styles.sectionLabel}>ALT TEXT {state.format === 'carrossel' ? `— SLIDE ${state.doc.carrossel.active + 1}` : ''}</div><textarea className={styles.textarea} value={state.altText} onChange={(e) => updateField('altText', e.target.value)} />
            <div className={styles.toggle}><span>Ocultar contagem de curtidas</span><button className={`${styles.switch} ${state.hideLikes ? styles.switchOn : ''}`} onClick={() => updateField('hideLikes', !state.hideLikes)}><span /></button></div>
            {state.format === 'reel' && <div className={styles.toggle}><span>Mostrar também no Feed</span><button className={`${styles.switch} ${state.showFeed ? styles.switchOn : ''}`} onClick={() => updateField('showFeed', !state.showFeed)}><span /></button></div>}
          </>}
          {tool === 'publicar' && <><div className={styles.sectionLabel}>VALIDAÇÃO</div>{(validation.ok ? ['Mídia e formato prontos', 'Limites de texto válidos'] : validation.errors).map((item) => <div className={styles.check} key={item}><Check size={14} color={validation.ok ? 'var(--vc-success)' : 'var(--vc-warn)'} />{item}</div>)}<button className={`${styles.button} ${styles.primary}`} style={{ width: '100%', marginTop: 10 }} onClick={() => setModal('publish')}>Publicar agora</button><button className={`${styles.button} ${styles.soft}`} style={{ width: '100%', marginTop: 7 }} onClick={() => setModal('schedule')}>Agendar</button><button className={`${styles.button} ${styles.outline}`} style={{ width: '100%', marginTop: 7 }} onClick={persistDraft}>Salvar rascunho</button></>}
        </aside>}

        <main className={styles.stage}>
          <div className={styles.formatBar}>
            <div className={styles.segment}>{Object.entries(FORMAT_META).map(([id, meta]) => <button key={id} className={state.format === id ? styles.selected : ''} onClick={() => setFormat(id)}>{meta[0]}</button>)}</div>
            {state.format === 'post' && <div className={styles.segment}>{Object.keys(COMPOSER_FORMATS.post.ratios).map((ratio) => <button key={ratio} className={state.ratio === ratio ? styles.selected : ''} onClick={() => setRatio(ratio)}>{ratio}</button>)}</div>}
            {state.format === 'carrossel' && <span className={styles.chip}>Slide {state.doc.carrossel.active + 1} de {state.doc.carrossel.slides.length}</span>}
          </div>
          <div className={styles.canvasRegion} ref={regionRef} onPointerDown={() => setState((current) => ({ ...current, sel: null, editing: null }))}>
            <div className={styles.scaleWrap} style={{ width: cw * scale, height: ch * scale }}>
              <div
                ref={canvasRef}
                data-testid="composer-canvas"
                className={styles.canvas}
                style={{ width: cw, height: ch, transform: `scale(${scale})` }}
                onWheel={handleMediaWheel}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(ELEMENT_DRAG_TYPE)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={handleCanvasDrop}
              >
                {surface.media
                  ? <MediaBox
                      media={surface.media}
                      transform={mediaTransform}
                      canvas={[cw, ch]}
                      selected={state.sel === 'bg'}
                      onPointerDown={(event) => beginGesture('media-move', event)}
                      onResize={(event, corner) => beginGesture('media-resize', event, null, corner)}
                      onRotate={(event) => beginGesture('media-rotate', event)}
                      onMoveKey={(event) => handleMediaKey(event, 'move')}
                      onResizeKey={(event, corner) => handleMediaKey(event, 'resize', corner)}
                      onRotateKey={(event) => handleMediaKey(event, 'rotate')}
                      onFocus={() => setState((current) => ({ ...current, sel: 'bg', editing: null }))}
                      onDimensions={syncMediaDimensions}
                      videoRef={state.format === 'reel' ? videoRef : undefined}
                      muted={state.format !== 'reel' || reel.video.muted || Boolean(reel.audio?.url)}
                      volume={state.format === 'reel' ? reel.video.volume : undefined}
                      testId="canvas-media"
                    />
                  : <label className={styles.empty} aria-label="Importar midia pelo canvas">
                      <div><Upload size={25} /><strong>Adicionar mídia</strong><small>{state.format === 'reel' ? 'MP4 ou MOV · 9:16' : state.format === 'story' ? 'JPG, PNG, WEBP, MP4 ou MOV' : 'JPG, PNG ou WEBP'}</small></div>
                      <input type="file" accept={mediaAccept(state.format)} onChange={(event) => uploadFiles(event.target.files)} />
                    </label>}
                {surface.layers.map((layer) => !layer.hidden && <div key={layer.id} className={`${styles.layer} ${state.sel === layer.id ? styles.selectedLayer : ''}`} style={{ ...layerBoxStyle(layer), cursor: layer.locked ? 'default' : 'move' }} onPointerDown={(e) => beginGesture('move', e, layer)} onDoubleClick={(e) => { e.stopPropagation(); if (layer.type === 'text' || layer.type === 'button') setState((current) => ({ ...current, editing: layer.id, sel: layer.id })); }}>
                  {state.editing === layer.id
                    ? <LayerTextEditor
                        layer={layer}
                        onChange={(text) => updateLayer(layer.id, { text }, false)}
                        onGrow={(height) => updateLayer(layer.id, { h: height }, false)}
                        onFinish={() => setState((current) => ({ ...current, editing: null }))}
                      />
                    : <LayerContent layer={layer} />}
                  {state.sel === layer.id && !layer.locked && state.editing !== layer.id && <><span className={`${styles.handle} ${styles.nw}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'nw')} /><span className={`${styles.handle} ${styles.ne}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'ne')} /><span className={`${styles.handle} ${styles.sw}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'sw')} /><span className={`${styles.handle} ${styles.se}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'se')} /><span className={styles.rotate} onPointerDown={(e) => beginGesture('rotate', e, layer)} /></>}
                </div>)}
                {guides.map((line) => <div
                  key={`${line.axis}:${line.pos}`}
                  className={line.axis === 'v' ? styles.guideV : styles.guideH}
                  style={line.axis === 'v' ? { left: line.pos } : { top: line.pos }}
                />)}
                {state.format === 'story' && <><div className={styles.safeTop}>INTERFACE DO INSTAGRAM</div><div className={styles.safeBottom}>ÁREA SEGURA</div></>}
              </div>
            </div>
            {state.format === 'carrossel' && <CarouselStrip state={state} setState={setState} onAction={carouselAction} onReorder={reorderSlide} />}
            {state.format === 'reel' && <>
              <ReelTimeline
                duration={reelDuration}
                current={playhead}
                playing={playing}
                video={reel.video}
                audio={reel.audio}
                layers={surface.layers}
                onSeek={seekReel}
                onTrim={(trim) => patchReelVideo(trim)}
                onTogglePlay={() => setPlaying((value) => !value)}
              />
              {reel.audio?.url && <audio ref={audioRef} src={reel.audio.url} preload="auto" />}
            </>}
          </div>
        </main>

        {previewOpen && <PreviewPanel state={state} surface={surface} brandName={brandName} currentTime={state.format === 'reel' ? playhead : undefined} />}
        {layersOpen && <LayersPanel
          surface={surface}
          selected={state.sel}
          onSelect={(id) => setState((current) => ({ ...current, sel: id, editing: null }))}
          onPatch={updateLayer}
          onReorder={moveLayerInStack}
          onReorderTo={moveLayerToStackIndex}
          onDuplicate={duplicateLayer}
          onDelete={deleteLayerById}
        />}
      </div>

      {modal === 'delete-draft'
        ? <DeleteDraftModal busy={busy} onClose={() => setModal(null)} onConfirm={confirmDraftDeletion} />
        : modal && <PublicationModal kind={modal} state={state} validation={validation} busy={busy} onClose={() => setModal(null)} onConfirm={confirmPublication} onField={updateField} />}
      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
}

function FontSelect({ value, onChange, ariaLabel = 'Fonte' }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>
    <optgroup label="Sistema">
      <option value="system-ui">Padrão</option>
      <option value="Georgia">Serif</option>
      <option value="ui-monospace">Mono</option>
    </optgroup>
    {FONT_GROUPS.map(({ category, fonts }) => <optgroup key={category} label={category}>
      {fonts.map((font) => <option key={font.id} value={font.family} style={{ fontFamily: `'${font.family}'` }}>{font.family}</option>)}
    </optgroup>)}
  </select>;
}

// Edição do texto no próprio canvas (§2.1): a área editável nasce com a mesma
// tipografia, largura e alinhamento da camada, cresce conforme o conteúdo e
// nunca rola por dentro — o estilo continua todo no painel lateral (§2.2).
function LayerTextEditor({ layer, onChange, onGrow, onFinish }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    const needed = Math.ceil(element.scrollHeight);
    element.style.height = `${Math.max(needed, layer.h)}px`;
    if (needed > layer.h + 0.5) onGrow(needed);
  });

  return <textarea
    ref={ref}
    aria-label="Editar texto da camada"
    value={layer.text}
    rows={1}
    onChange={(event) => onChange(event.target.value)}
    onPointerDown={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onFinish();
    }}
    onBlur={onFinish}
    style={{
      font: 'inherit',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
      fontStyle: 'inherit',
      lineHeight: 'inherit',
      letterSpacing: 'inherit',
      textAlign: 'inherit',
      textTransform: layer.tt === 'upper' ? 'uppercase' : layer.tt === 'lower' ? 'lowercase' : 'none',
      color: 'inherit',
      caretColor: layer.color === 'transparent' ? '#ffffff' : layer.color,
      width: '100%',
      minHeight: '100%',
      display: 'block',
      margin: 0,
      padding: 0,
      border: 0,
      outline: 'none',
      background: 'transparent',
      boxSizing: 'border-box',
      overflow: 'hidden',
      resize: 'none',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'break-word'
    }}
  />;
}

// Painel completo de propriedades de texto (PRD Story §8-§9).
function TextProperties({ layer, onPatch, onHistory }) {
  const slider = (patch) => onPatch(patch, false);
  return <div className={styles.textProps}>
    <div className={styles.sectionLabel}>FONTE</div>
    <FontSelect value={layer.font} onChange={(font) => onPatch({ font })} ariaLabel="Fonte do texto selecionado" />
    <div className={styles.propRow}><span>Tamanho</span>
      <input type="range" min="8" max="96" step="1" value={layer.fs} aria-label="Tamanho da fonte" onPointerDown={onHistory} onChange={(e) => slider({ fs: +e.target.value })} /><em>{Math.round(layer.fs)}</em></div>
    <div className={styles.segment}>
      <button className={layer.weight >= 700 ? styles.selected : ''} aria-label="Negrito" onClick={() => onPatch({ weight: layer.weight >= 700 ? 400 : 700 })}><Bold size={13} /></button>
      <button className={layer.italic ? styles.selected : ''} aria-label="Itálico" onClick={() => onPatch({ italic: !layer.italic })}><Italic size={13} /></button>
      <button className={layer.align === 'left' ? styles.selected : ''} aria-label="Alinhar à esquerda" onClick={() => onPatch({ align: 'left' })}><AlignLeft size={13} /></button>
      <button className={layer.align === 'center' ? styles.selected : ''} aria-label="Centralizar" onClick={() => onPatch({ align: 'center' })}><AlignCenter size={13} /></button>
      <button className={layer.align === 'right' ? styles.selected : ''} aria-label="Alinhar à direita" onClick={() => onPatch({ align: 'right' })}><AlignRight size={13} /></button>
    </div>
    <div className={styles.segment}>
      <button className={layer.tt === 'upper' ? styles.selected : ''} onClick={() => onPatch({ tt: layer.tt === 'upper' ? 'none' : 'upper' })}>AA</button>
      <button className={layer.tt === 'lower' ? styles.selected : ''} onClick={() => onPatch({ tt: layer.tt === 'lower' ? 'none' : 'lower' })}>aa</button>
    </div>
    <div className={styles.propRow}><span>Cor</span>
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(layer.color) ? layer.color : '#ffffff'} aria-label="Cor do texto" onChange={(e) => onPatch({ color: e.target.value })} /></div>
    <div className={styles.propRow}><span>Letras</span>
      <input type="range" min="-2" max="12" step="0.5" value={layer.ls ?? 0} aria-label="Espaçamento entre letras" onPointerDown={onHistory} onChange={(e) => slider({ ls: +e.target.value })} /><em>{layer.ls ?? 0}</em></div>
    <div className={styles.propRow}><span>Linhas</span>
      <input type="range" min="0.8" max="2" step="0.05" value={layer.lh ?? 1.05} aria-label="Espaçamento entre linhas" onPointerDown={onHistory} onChange={(e) => slider({ lh: +e.target.value })} /><em>{(layer.lh ?? 1.05).toFixed(2)}</em></div>
    <div className={styles.propRow}><span>Opacidade</span>
      <input type="range" min="0.1" max="1" step="0.05" value={layer.op} aria-label="Opacidade do texto" onPointerDown={onHistory} onChange={(e) => slider({ op: +e.target.value })} /><em>{Math.round(layer.op * 100)}%</em></div>

    <div className={styles.sectionLabel}>FUNDO</div>
    <div className={styles.segment}>
      <button className={(layer.bgMode ?? 'none') === 'none' ? styles.selected : ''} onClick={() => onPatch({ bgMode: 'none' })}>Sem fundo</button>
      <button className={layer.bgMode === 'box' ? styles.selected : ''} onClick={() => onPatch({ bgMode: 'box' })}>Caixa</button>
      <button className={layer.bgMode === 'line' ? styles.selected : ''} onClick={() => onPatch({ bgMode: 'line' })}>Por linha</button>
    </div>
    {layer.bgMode && layer.bgMode !== 'none' && <>
      <div className={styles.propRow}><span>Cor do fundo</span>
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(layer.bgFill) ? layer.bgFill : '#111111'} aria-label="Cor do fundo" onChange={(e) => onPatch({ bgFill: e.target.value })} /></div>
      <div className={styles.propRow}><span>Arredondamento</span>
        <input type="range" min="0" max="40" step="1" value={layer.bgRadius ?? 8} aria-label="Arredondamento do fundo" onPointerDown={onHistory} onChange={(e) => slider({ bgRadius: +e.target.value })} /><em>{layer.bgRadius ?? 8}</em></div>
    </>}

    <div className={styles.sectionLabel}>CONTORNO</div>
    <div className={styles.propRow}><span>Espessura</span>
      <input type="range" min="0" max="6" step="0.5" value={layer.strokeW ?? 0} aria-label="Espessura do contorno" onPointerDown={onHistory} onChange={(e) => slider({ strokeW: +e.target.value })} /><em>{layer.strokeW ?? 0}</em></div>
    {Number(layer.strokeW) > 0 && <div className={styles.propRow}><span>Cor do contorno</span>
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(layer.strokeColor) ? layer.strokeColor : '#111111'} aria-label="Cor do contorno" onChange={(e) => onPatch({ strokeColor: e.target.value })} /></div>}

    <div className={styles.sectionLabel}>SOMBRA</div>
    <div className={styles.toggle}><span>Aplicar sombra</span>
      <button className={`${styles.switch} ${layer.shOn ? styles.switchOn : ''}`} aria-label="Aplicar sombra" onClick={() => onPatch({ shOn: !layer.shOn })}><span /></button></div>
  </div>;
}

// Propriedades dos elementos gráficos (PRD Elementos §6, §7, §9).
function ElementProperties({ layer, onPatch, onHistory }) {
  const slider = (patch) => onPatch(patch, false);
  const isShape = layer.type === 'shape';
  const isLine = layer.type === 'line';
  const isArrow = layer.type === 'arrow';
  const colorKey = layer.type === 'icon' ? 'color' : 'fill';
  const colorValue = layer[colorKey];
  return <div className={styles.textProps}>
    <div className={styles.sectionLabel}>ELEMENTO SELECIONADO</div>
    <div className={styles.propRow}><span>Cor</span>
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(colorValue) ? colorValue : '#ffffff'} aria-label="Cor do elemento" onChange={(event) => onPatch({ [colorKey]: event.target.value })} /></div>
    {isShape && <>
      {(layer.shape || 'rect') === 'rect' && <div className={styles.propRow}><span>Arredondamento</span>
        <input type="range" min="0" max="60" step="1" value={layer.radius ?? 0} aria-label="Arredondamento da forma" onPointerDown={onHistory} onChange={(event) => slider({ radius: +event.target.value })} /><em>{layer.radius ?? 0}</em></div>}
      <div className={styles.propRow}><span>Borda</span>
        <input type="range" min="0" max="10" step="0.5" value={layer.strokeW ?? 0} aria-label="Espessura da borda" onPointerDown={onHistory} onChange={(event) => slider({ strokeW: +event.target.value })} /><em>{layer.strokeW ?? 0}</em></div>
      {Number(layer.strokeW) > 0 && <div className={styles.propRow}><span>Cor da borda</span>
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(layer.strokeColor) ? layer.strokeColor : '#111111'} aria-label="Cor da borda" onChange={(event) => onPatch({ strokeColor: event.target.value })} /></div>}
      <div className={styles.toggle}><span>Sombra</span>
        <button className={`${styles.switch} ${layer.shOn ? styles.switchOn : ''}`} aria-label="Aplicar sombra na forma" onClick={() => onPatch({ shOn: !layer.shOn })}><span /></button></div>
    </>}
    {(isLine || isArrow) && <div className={styles.propRow}><span>Espessura</span>
      <input type="range" min="2" max={isArrow ? 80 : 24} step="1" value={Math.round(layer.h)} aria-label="Espessura da linha" onPointerDown={onHistory} onChange={(event) => slider({ h: +event.target.value })} /><em>{Math.round(layer.h)}</em></div>}
    {isLine && <div className={styles.segment}>
      <button className={(layer.dash || 'solid') === 'solid' ? styles.selected : ''} onClick={() => onPatch({ dash: 'solid' })}>Sólida</button>
      <button className={layer.dash === 'dashed' ? styles.selected : ''} onClick={() => onPatch({ dash: 'dashed' })}>Tracejada</button>
      <button className={layer.dash === 'dotted' ? styles.selected : ''} onClick={() => onPatch({ dash: 'dotted', cap: 'round' })}>Pontilhada</button>
    </div>}
    {isArrow && <div className={styles.segment}>
      <button className={(Number(layer.heads) || 1) === 1 && !layer.curve ? styles.selected : ''} onClick={() => onPatch({ heads: 1, curve: false })}>Simples</button>
      <button className={Number(layer.heads) === 2 ? styles.selected : ''} onClick={() => onPatch({ heads: 2, curve: false })}>Dupla</button>
      <button className={layer.curve ? styles.selected : ''} onClick={() => onPatch({ heads: 1, curve: !layer.curve })}>Curva</button>
    </div>}
    <div className={styles.propRow}><span>Rotação</span>
      <input type="range" min="-180" max="180" step="1" value={Math.round(layer.rot) || 0} aria-label="Rotação do elemento" onPointerDown={onHistory} onChange={(event) => slider({ rot: +event.target.value })} /><em>{Math.round(layer.rot) || 0}°</em></div>
    <div className={styles.propRow}><span>Opacidade</span>
      <input type="range" min="0.1" max="1" step="0.05" value={layer.op} aria-label="Opacidade do elemento" onPointerDown={onHistory} onChange={(event) => slider({ op: +event.target.value })} /><em>{Math.round(layer.op * 100)}%</em></div>
  </div>;
}

function CarouselStrip({ state, setState, onAction, onReorder }) {
  const [drag, setDrag] = useState(null);
  return <div className={styles.thumbs}>
    <button className={styles.iconButton} onClick={() => setState((current) => ({ ...current, doc: { ...current.doc, carrossel: { ...current.doc.carrossel, active: Math.max(0, current.doc.carrossel.active - 1) } } }))}><ChevronLeft size={15} /></button>
    {state.doc.carrossel.slides.map((slide, index) => <button key={index} draggable className={`${styles.thumb} ${state.doc.carrossel.active === index ? styles.thumbActive : ''}`} style={{ backgroundImage: slide.media ? `url("${slide.media.url}")` : 'none' }} onClick={() => setState((current) => ({ ...current, sel: null, doc: { ...current.doc, carrossel: { ...current.doc.carrossel, active: index } } }))} onDragStart={() => setDrag(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { onReorder(drag, index); setDrag(null); }}>
      <span>{index + 1}</span>
      {state.doc.carrossel.active === index && <div style={{ position: 'absolute', right: 2, bottom: 2, display: 'flex' }}><Copy size={12} onClick={(e) => { e.stopPropagation(); onAction('duplicate', index); }} /><Trash2 size={12} onClick={(e) => { e.stopPropagation(); onAction('delete', index); }} /></div>}
    </button>)}
    {state.doc.carrossel.slides.length < 10 && <button className={`${styles.thumb} ${styles.thumbAdd}`} onClick={() => onAction('add')}>+</button>}
    <button className={styles.iconButton} onClick={() => setState((current) => ({ ...current, doc: { ...current.doc, carrossel: { ...current.doc.carrossel, active: Math.min(current.doc.carrossel.slides.length - 1, current.doc.carrossel.active + 1) } } }))}><ChevronRight size={15} /></button>
  </div>;
}

function PreviewPanel({ state, surface, brandName, currentTime }) {
  const [cw, ch] = canvasSize(state.format, state.ratio);
  const vertical = state.format === 'story' || state.format === 'reel';
  const previewScale = 242 / cw;
  const previewH = ch * previewScale;
  return <aside className={styles.rightPanel}>
    <div className={styles.rightTitle}>PRÉVIA NO INSTAGRAM</div>
    <div className={`${styles.phone} ${state.format === 'story' ? styles.storyPhone : ''} ${state.format === 'reel' ? styles.reelPhone : ''}`} style={vertical ? { height: previewH + 16 } : undefined}>
      <div className={styles.notch} />
      {!vertical && <div className={styles.phoneHead}><span className={styles.avatar} /><strong>{brandName.replace(/^@/, '')}</strong><span style={{ marginLeft: 'auto' }}><MoreHorizontal size={14} /></span></div>}
      <div className={styles.phoneMedia} style={{ height: previewH }}>
        <PreviewSurface surface={surface} cw={cw} ch={ch} scale={previewScale} currentTime={currentTime} />
        {state.format === 'story' && <div className={styles.storyChrome}><div className={styles.storyProgress} /><strong>{brandName.replace(/^@/, '')}</strong> · 2 min <X size={15} style={{ float: 'right' }} /><div style={{ position: 'absolute', bottom: 17, left: 12, right: 12, border: '1px solid #fff', borderRadius: 99, padding: 8 }}>Enviar mensagem…</div></div>}
        {state.format === 'reel' && <div className={styles.storyChrome}><div style={{ position: 'absolute', right: 12, bottom: 76, display: 'grid', gap: 13, textAlign: 'center' }}>♡<span style={{ fontSize: 8 }}>1,2k</span>◯<span style={{ fontSize: 8 }}>86</span>⌁</div><div style={{ position: 'absolute', left: 11, bottom: 24 }}><strong>@{brandName.replace(/^@/, '')}</strong> · Seguir<br />{state.caption || 'Sua legenda aparece aqui'}<br />♫ Áudio original</div></div>}
      </div>
      {!vertical && <><div className={styles.phoneActions}>♡ <MessageSquareText size={16} /> <Send size={16} /><span style={{ marginLeft: 'auto' }}>⌑</span></div><div className={styles.phoneCaption}>{!state.hideLikes && <strong>1.284 curtidas<br /></strong>}<strong>{brandName.replace(/^@/, '')}</strong> {state.caption || 'Sua legenda aparece aqui'}<br /><span style={{ color: '#00376b' }}>{state.hashtags}</span><br /><small>HÁ 2 MINUTOS</small></div></>}
    </div>
    <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--vc-faint)', lineHeight: 1.45 }}>Prévia fiel ao enquadramento. O Instagram pode aplicar compressão ao arquivo publicado.</p>
  </aside>;
}

function PreviewSurface({ surface, cw, ch, scale, currentTime }) {
  // A prévia espelha o tempo do canvas e roda muda: o som já sai de lá, tocar
  // duas vezes daria eco (§6).
  const previewVideoRef = useRef(null);
  return <div className={styles.phoneSurface} style={{ width: cw, height: ch, transform: `scale(${scale})` }}>
    {surface.media && <MediaBox
      media={surface.media}
      transform={surface.bg}
      canvas={[cw, ch]}
      videoRef={typeof currentTime === 'number' ? previewVideoRef : undefined}
      currentTime={currentTime}
      testId="preview-media"
    />}
    {surface.layers.map((layer) => !layer.hidden && <div key={layer.id} className={styles.layer} style={layerBoxStyle(layer)}><LayerContent layer={layer} /></div>)}
  </div>;
}

// Conteúdo interno de uma camada — idêntico no canvas e na prévia (§16).
function LayerContent({ layer }) {
  if (layer.type === 'shape') return <ShapeGraphic layer={layer} />;
  if (layer.type === 'line') return <LineGraphic layer={layer} />;
  if (layer.type === 'arrow') return <ArrowGraphic layer={layer} />;
  if (layer.type === 'icon') return <IconGraphic layer={layer} />;
  const lineBg = layerLineBgStyle(layer);
  const text = layerDisplayText(layer);
  return lineBg ? <span style={lineBg}>{text}</span> : text;
}

function MediaBox({
  media,
  transform,
  canvas,
  selected = false,
  videoRef,
  muted = true,
  volume,
  currentTime,
  onPointerDown,
  onResize,
  onRotate,
  onMoveKey,
  onResizeKey,
  onRotateKey,
  onFocus,
  onDimensions,
  testId
}) {
  const style = mediaTransformStyle(transform, media, canvas);
  const dimensions = (event) => {
    const element = event.currentTarget;
    onDimensions?.(element.videoWidth || element.naturalWidth, element.videoHeight || element.naturalHeight, element.duration);
  };

  // Volume não existe como atributo do JSX e o tempo da prévia precisa
  // acompanhar o relógio do canvas sem virar um segundo player (§6).
  useEffect(() => {
    const element = videoRef?.current;
    if (!element) return;
    if (typeof volume === 'number') element.volume = Math.min(1, Math.max(0, volume));
  }, [volume, videoRef]);

  useEffect(() => {
    const element = videoRef?.current;
    if (!element || typeof currentTime !== 'number') return;
    if (Math.abs(element.currentTime - currentTime) > .25) element.currentTime = currentTime;
  }, [currentTime, videoRef]);
  return <div
    data-testid={testId}
    className={`${styles.mediaBox} ${selected ? styles.selectedMedia : ''}`}
    style={style}
    role={onMoveKey ? 'group' : undefined}
    tabIndex={onMoveKey ? 0 : undefined}
    aria-label={onMoveKey ? 'Mídia editável; use as setas para mover' : undefined}
    onPointerDown={onPointerDown}
    onKeyDown={onMoveKey}
    onFocus={onFocus}
  >
    {media.kind === 'video'
      ? <video ref={videoRef} className={styles.media} src={media.url} muted={muted} autoPlay={!videoRef} loop playsInline onLoadedMetadata={dimensions} />
      : <img className={styles.media} src={media.url} alt="" crossOrigin="anonymous" onLoad={dimensions} />}
    {selected && <>
      {['nw', 'ne', 'sw', 'se'].map((corner) => <span
        key={corner}
        role="button"
        tabIndex={0}
        aria-label={`Redimensionar midia ${corner}`}
        className={`${styles.handle} ${styles[corner]}`}
        onPointerDown={(event) => onResize(event, corner)}
        onKeyDown={(event) => onResizeKey(event, corner)}
      />)}
      <span
        role="button"
        tabIndex={0}
        aria-label="Girar midia"
        className={styles.rotate}
        onPointerDown={onRotate}
        onKeyDown={onRotateKey}
      />
    </>}
  </div>;
}

// Painel de camadas (§2.3, §2.4): espelha exatamente surface.layers e a mídia
// da superfície — nenhuma lista paralela. A ordem do array é a ordem do canvas
// (última camada por cima), por isso a lista é exibida invertida.
const LAYER_TYPE_LABEL = {
  text: 'Texto', button: 'Botão', sticker: 'Sticker',
  shape: 'Forma', line: 'Linha', arrow: 'Seta', icon: 'Ícone'
};

function isEmojiLayer(layer) {
  return layer.type === 'sticker' && /\p{Extended_Pictographic}/u.test(String(layer.text || ''));
}

function LayerTypeIcon({ layer }) {
  if (layer.type === 'icon') {
    const body = ELEMENT_ICON_MAP[layer.icon]?.body;
    return body
      ? <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} />
      : <Shapes size={13} />;
  }
  if (layer.type === 'line') return <Minus size={13} />;
  if (layer.type === 'arrow') return <ArrowUpRight size={13} />;
  if (layer.type === 'shape') return <Shapes size={13} />;
  if (layer.type === 'sticker') return <Smile size={13} />;
  return <Type size={13} />;
}

function layerRowLabel(layer) {
  if (layer.type === 'icon') return ELEMENT_ICON_MAP[layer.icon]?.label || 'Ícone';
  if (isEmojiLayer(layer)) return `Emoji ${layer.text}`;
  const text = String(layer.text || '').trim();
  return text || LAYER_TYPE_LABEL[layer.type] || 'Elemento';
}

function LayersPanel({ surface, selected, onSelect, onPatch, onReorder, onReorderTo, onDuplicate, onDelete }) {
  const [dragId, setDragId] = useState(null);
  const [dropAt, setDropAt] = useState(null);
  const total = surface.layers.length;
  const mediaLabel = surface.media?.kind === 'video' ? 'Vídeo' : 'Imagem';
  const endDrag = () => { setDragId(null); setDropAt(null); };
  return <aside className={`${styles.rightPanel} ${styles.layersPanel}`}><div className={styles.rightTitle}>CAMADAS</div>
    {[...surface.layers].reverse().map((layer, position) => <div
      key={layer.id}
      draggable
      className={`${styles.layerRow} ${selected === layer.id ? styles.layerSelected : ''} ${dragId === layer.id ? styles.layerDragging : ''} ${dropAt === position && dragId !== layer.id ? styles.layerDropTarget : ''}`}
      onClick={() => onSelect(layer.id)}
      onDragStart={(event) => {
        event.dataTransfer?.setData(LAYER_DRAG_TYPE, layer.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        setDragId(layer.id);
      }}
      onDragOver={(event) => {
        if (!dragId) return;
        event.preventDefault();
        setDropAt(position);
      }}
      onDragEnd={endDrag}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer?.getData(LAYER_DRAG_TYPE) || dragId;
        if (id) onReorderTo(id, total - 1 - position);
        endDrag();
      }}
    >
      <span className={styles.layerGrip} aria-hidden="true"><GripVertical size={12} /></span>
      <span className={styles.layerIcon}><LayerTypeIcon layer={layer} /></span>
      <span className={styles.layerName}>{layerRowLabel(layer)}</span>
      <span className={styles.layerActions}>
        <button aria-label="Trazer para frente" disabled={position === 0} onClick={(e) => { e.stopPropagation(); onReorder(layer.id, 1); }}><ChevronUp size={13} /></button>
        <button aria-label="Enviar para trás" disabled={position === total - 1} onClick={(e) => { e.stopPropagation(); onReorder(layer.id, -1); }}><ChevronDown size={13} /></button>
        <button aria-label={layer.hidden ? 'Mostrar camada' : 'Ocultar camada'} onClick={(e) => { e.stopPropagation(); onPatch(layer.id, { hidden: !layer.hidden }); }}>{layer.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
        <button aria-label={layer.locked ? 'Desbloquear camada' : 'Bloquear camada'} onClick={(e) => { e.stopPropagation(); onPatch(layer.id, { locked: !layer.locked }); }}>{layer.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
        <button aria-label="Duplicar camada" onClick={(e) => { e.stopPropagation(); onDuplicate(layer.id); }}><Copy size={13} /></button>
        <button aria-label="Excluir camada" onClick={(e) => { e.stopPropagation(); onDelete(layer.id); }}><Trash2 size={13} /></button>
      </span>
    </div>)}
    {surface.media && <div className={`${styles.layerRow} ${styles.layerMediaRow} ${selected === 'bg' ? styles.layerSelected : ''}`} onClick={() => onSelect('bg')}>
      <span className={styles.layerGrip} aria-hidden="true" />
      <span className={styles.layerIcon}>{surface.media.kind === 'video' ? <Film size={13} /> : <ImageIcon size={13} />}</span>
      <button type="button" className={styles.layerName} aria-label={`Selecionar camada ${mediaLabel}`} style={{ border: 0, background: 'transparent', textAlign: 'left', padding: 0 }} onClick={() => onSelect('bg')}>{surface.media.name || mediaLabel}</button>
      <span className={styles.layerActions}><span className={styles.layerBadge}>{mediaLabel}</span></span>
    </div>}
    {!surface.layers.length && !surface.media && <p style={{ fontSize: 11, color: 'var(--vc-faint)' }}>Adicione textos, formas ou figurinhas ao canvas.</p>}
  </aside>;
}

function PublicationModal({ kind, state, validation, busy, onClose, onConfirm, onField }) {
  return <div className={styles.modalScrim} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className={styles.modal}>
    <h2>{kind === 'schedule' ? 'Agendar publicação' : validation.ok ? 'Pronto para publicar' : 'Quase lá'}</h2>
    <p>{kind === 'schedule' ? 'Escolha a data e a hora. Sexta às 20h costuma ser um bom ponto de partida.' : 'Confira os itens antes de enviar ao Instagram.'}</p>
    {kind === 'schedule' ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}><input className={styles.field} type="date" value={state.schedDate} onChange={(e) => onField('schedDate', e.target.value)} /><input className={styles.field} type="time" value={state.schedTime} onChange={(e) => onField('schedTime', e.target.value)} /></div> : (validation.ok ? ['Mídia adicionada', 'Formato validado', 'Textos dentro dos limites'] : validation.errors).map((item) => <div className={styles.check} key={item}><Check size={14} color={validation.ok ? 'var(--vc-success)' : 'var(--vc-warn)'} />{item}</div>)}
    <div className={styles.modalActions}><button className={`${styles.button} ${styles.outline}`} onClick={onClose}>Cancelar</button><button className={`${styles.button} ${styles.primary}`} disabled={!!busy || !validation.ok} style={!validation.ok ? { opacity: .45 } : {}} onClick={() => onConfirm(kind)}>{busy ? 'Processando…' : kind === 'schedule' ? 'Agendar' : 'Publicar'}</button></div>
  </div></div>;
}

function DeleteDraftModal({ busy, onClose, onConfirm }) {
  return <div className={styles.modalScrim} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="delete-draft-title">
      <h2 id="delete-draft-title">Excluir rascunho?</h2>
      <p>Esta ação remove imediatamente as mídias temporárias e não pode ser desfeita.</p>
      <div className={styles.modalActions}>
        <button className={`${styles.button} ${styles.outline}`} onClick={onClose}>Cancelar</button>
        <button aria-label="Confirmar exclusão" className={`${styles.button} ${styles.removeMedia}`} disabled={busy === 'delete-draft'} onClick={onConfirm}>{busy === 'delete-draft' ? 'Excluindo…' : 'Excluir rascunho'}</button>
      </div>
    </div>
  </div>;
}
