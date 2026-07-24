'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, CalendarClock, Check, ChevronLeft,
  ChevronRight, Circle, Copy, Eye, EyeOff, Film, Image as ImageIcon, Italic,
  Layers3, Lock, MapPin, Maximize2, MessageSquareText, Minus, MoreHorizontal,
  Palette, Pause, Play, Plus, Redo2, Save, Search, Send, Settings2, Shapes,
  Smartphone, Smile, Trash2, Type, Undo2, Unlock, Upload, UserRoundPlus, X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { removeTempMedia, uploadTempMedia } from '@/lib/posts-media';
import { deleteComposerDraft, publishNow, saveDraft, schedulePost } from '@/lib/posts-actions';
import {
  COMPOSER_FORMATS, addLayer, canvasSize, cloneEditorState, fitMediaToCanvas,
  getSurface, makeComposerDocument, mediaTransformStyle, normalizeMediaTransform,
  resizeMediaFromCorner, serializeComposer, snapPosition, toApiFormat,
  validateComposer, zoomMediaAtPoint
} from '@/lib/composer-editor';
import styles from './VisualComposer.module.css';

const FORMAT_META = {
  post: ['Post', 'Imagem única'],
  carrossel: ['Carrossel', '2 a 10 slides'],
  story: ['Story', 'Vertical 9:16'],
  reel: ['Reel', 'Vídeo vertical']
};
const TOOLS = [
  ['formato', Maximize2, 'Formato'], ['midia', ImageIcon, 'Mídia'], ['texto', Type, 'Texto'],
  ['elementos', Shapes, 'Elemen.'], ['legenda', MessageSquareText, 'Legenda'],
  ['config', Settings2, 'Config.'], ['publicar', Send, 'Publicar']
];
const EMOJIS = ['✨', '🔥', '💡', '❤️', '🚀', '🎯', '👏', '😍', '📌', '✅'];
const COLORS = ['#FFFFFF', '#1D1D1F', '#007AFF', '#FF9500', '#FF375F'];
const ELEMENT_CATEGORIES = ['Formas', 'Linhas', 'Ícones', 'Stickers', 'Emojis'];
const ELEMENT_SHAPES = [
  { label: 'Retângulo', preset: { type: 'shape', text: '', w: 110, h: 90, fill: '#007AFF' } },
  { label: 'Círculo', preset: { type: 'shape', text: '', w: 90, h: 90, radius: 99, fill: '#FF9500' } },
  { label: 'Pill', preset: { type: 'button', text: 'Saiba mais', w: 130, h: 42, fs: 14, radius: 99 } }
];

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
  const [previewOpen, setPreviewOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [guide, setGuide] = useState({ v: false, h: false });
  const [scale, setScale] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [reelTime, setReelTime] = useState(0);
  const [busy, setBusy] = useState('');
  const [draftId, setDraftId] = useState(initialDraft?.id || null);
  const [contentStatus, setContentStatus] = useState(initialDraft?.status || (initialDraft?.id ? 'draft' : null));
  const regionRef = useRef(null);
  const canvasRef = useRef(null);
  const gestureRef = useRef(null);
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
  const normalizedElementSearch = elementSearch.trim().toLocaleLowerCase('pt-BR');
  const matchingShapes = ELEMENT_SHAPES.filter(({ label }) => label.toLocaleLowerCase('pt-BR').includes(normalizedElementSearch));
  const matchingEmojis = EMOJIS.filter((emoji) => emoji.includes(normalizedElementSearch));

  const flash = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    setState((current) => ({ ...current, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light' }));
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

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setReelTime((value) => value >= 23 ? 0 : value + 1), 450);
    return () => window.clearInterval(timer);
  }, [playing]);

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

  function syncMediaDimensions(width, height) {
    if (!width || !height || (surface.media?.width && surface.media?.height && surface.bg?.w && surface.bg?.h)) return;
    mutateDoc((doc, current) => {
      const targetSurface = getSurface(doc, current.format);
      if (!targetSurface.media) return;
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

  function addPreset(preset) {
    let created;
    mutateDoc((doc, current) => { created = addLayer(getSurface(doc, current.format), preset, canvasSize(current.format, current.ratio)); });
    window.setTimeout(() => setState((current) => ({ ...current, sel: created.id })), 0);
  }

  function updateLayer(id, patch, history = true) {
    mutateDoc((doc, current) => {
      const layer = getSurface(doc, current.format).layers.find((item) => item.id === id);
      if (layer) Object.assign(layer, typeof patch === 'function' ? patch(layer) : patch);
    }, history);
  }

  function deleteSelected() {
    if (state.sel === 'bg') {
      mutateDoc((doc, current) => { getSurface(doc, current.format).media = null; });
    } else if (selected) {
      mutateDoc((doc, current) => {
        const list = getSurface(doc, current.format).layers;
        list.splice(list.findIndex((item) => item.id === selected.id), 1);
      });
    }
    setState((current) => ({ ...current, sel: null }));
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = { ...cloneEditorState(selected), id: `l${Date.now().toString(36)}`, x: selected.x + 18, y: selected.y + 18 };
    mutateDoc((doc, current) => getSurface(doc, current.format).layers.push(copy));
    setState((current) => ({ ...current, sel: copy.id }));
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
            const snapped = snapPosition({ x: gesture.original.x + dx, y: gesture.original.y + dy, w: layer.w, h: layer.h, canvas: canvasSize(current.format, current.ratio) });
            layer.x = snapped.x; layer.y = snapped.y;
            setGuide({ v: snapped.guideV, h: snapped.guideH });
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
    function end() { gestureRef.current = null; setGuide({ v: false, h: false }); }
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
        share_to_feed: state.showFeed
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
        thumb_offset_ms: state.format === 'reel' ? state.doc.reel.cover * 5000 : null
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
              </>
            )}
            {uploading != null && <div className={styles.progress}><span style={{ width: `${uploading}%` }} /></div>}
            {mediaError && <div className={styles.error}>{mediaError}</div>}
          </>}
          {tool === 'texto' && <>
            <button className={styles.preset} style={{ fontSize: 19, fontWeight: 800 }} onClick={() => addPreset({ text: 'Adicionar título', fs: 32, weight: 800, h: 52 })}>Adicionar título</button>
            <button className={styles.preset} style={{ fontSize: 14, fontWeight: 600 }} onClick={() => addPreset({ text: 'Adicionar subtítulo', fs: 18, weight: 600, h: 38 })}>Adicionar subtítulo</button>
            <button className={styles.preset} onClick={() => addPreset({ text: 'Adicionar texto de corpo', fs: 13, weight: 400, h: 34 })}>Adicionar texto de corpo</button>
            <p style={{ fontSize: 11, color: 'var(--vc-faint)', lineHeight: 1.5 }}>Clique duas vezes no texto para editar. Arraste, gire e redimensione pelas alças.</p>
          </>}
          {tool === 'elementos' && <>
            <div className={styles.elementSearch}>
              <Search size={14} aria-hidden="true" />
              <input aria-label="Buscar elementos" value={elementSearch} onChange={(event) => setElementSearch(event.target.value)} placeholder="Buscar elementos" />
            </div>
            <div className={styles.elementCategories} role="tablist" aria-label="Categorias de elementos">
              {ELEMENT_CATEGORIES.map((category) => <button key={category} type="button" role="tab" aria-selected={elementCategory === category} className={elementCategory === category ? styles.elementCategoryActive : ''} onClick={() => setElementCategory(category)}>{category}</button>)}
            </div>
            {elementCategory === 'Formas' && <div className={styles.shapeGrid}>
              {matchingShapes.map(({ label, preset }) => <button key={label} className={styles.shape} aria-label={label} onClick={() => addPreset(preset)}>
                {label === 'Retângulo' && <span style={{ display: 'block', width: 24, height: 24, background: '#6E6E73', borderRadius: 4, margin: 'auto' }} />}
                {label === 'Círculo' && <Circle size={25} fill="currentColor" />}
                {label === 'Pill' && 'Pill'}
              </button>)}
            </div>}
            {elementCategory === 'Emojis' && <div className={styles.stickerGrid}>{matchingEmojis.map((emoji) => <button key={emoji} className={styles.sticker} onClick={() => addPreset({ type: 'sticker', text: emoji, fs: 44, w: 62, h: 62, fill: 'transparent' })}>{emoji}</button>)}</div>}
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
              <div ref={canvasRef} className={styles.canvas} style={{ width: cw, height: ch, transform: `scale(${scale})` }} onWheel={handleMediaWheel}>
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
                      testId="canvas-media"
                    />
                  : <label className={styles.empty} aria-label="Importar midia pelo canvas">
                      <div><Upload size={25} /><strong>Adicionar mídia</strong><small>{state.format === 'reel' ? 'MP4 ou MOV · 9:16' : state.format === 'story' ? 'JPG, PNG, WEBP, MP4 ou MOV' : 'JPG, PNG ou WEBP'}</small></div>
                      <input type="file" accept={mediaAccept(state.format)} onChange={(event) => uploadFiles(event.target.files)} />
                    </label>}
                {surface.layers.map((layer) => !layer.hidden && <div key={layer.id} className={`${styles.layer} ${state.sel === layer.id ? styles.selectedLayer : ''}`} style={{ left: layer.x, top: layer.y, width: layer.w, height: layer.h, fontSize: layer.fs, fontWeight: layer.weight, fontStyle: layer.italic ? 'italic' : 'normal', textAlign: layer.align, fontFamily: layer.font, color: layer.color, background: layer.type === 'text' || layer.type === 'sticker' ? 'transparent' : layer.fill, borderRadius: layer.radius, opacity: layer.op, transform: `rotate(${layer.rot}deg)`, cursor: layer.locked ? 'default' : 'move' }} onPointerDown={(e) => beginGesture('move', e, layer)} onDoubleClick={(e) => { e.stopPropagation(); if (layer.type === 'text' || layer.type === 'button') setState((current) => ({ ...current, editing: layer.id, sel: layer.id })); }}>
                  {state.editing === layer.id ? <textarea autoFocus value={layer.text} onChange={(e) => updateLayer(layer.id, { text: e.target.value }, false)} onBlur={() => setState((current) => ({ ...current, editing: null }))} style={{ width: '100%', height: '100%', resize: 'none', background: 'rgba(0,0,0,.2)', color: 'inherit', border: 0, textAlign: layer.align, font: 'inherit' }} /> : layer.text}
                  {state.sel === layer.id && !layer.locked && <><span className={`${styles.handle} ${styles.nw}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'nw')} /><span className={`${styles.handle} ${styles.ne}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'ne')} /><span className={`${styles.handle} ${styles.sw}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'sw')} /><span className={`${styles.handle} ${styles.se}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'se')} /><span className={styles.rotate} onPointerDown={(e) => beginGesture('rotate', e, layer)} />
                    <FloatingToolbar layer={layer} onPatch={(patch) => updateLayer(layer.id, patch)} onDuplicate={duplicateSelected} onDelete={deleteSelected} /></>}
                </div>)}
                {guide.v && <div className={styles.guideV} />}{guide.h && <div className={styles.guideH} />}
                {state.format === 'story' && <><div className={styles.safeTop}>INTERFACE DO INSTAGRAM</div><div className={styles.safeBottom}>ÁREA SEGURA</div></>}
              </div>
            </div>
            {state.format === 'carrossel' && <CarouselStrip state={state} setState={setState} onAction={carouselAction} onReorder={reorderSlide} />}
            {state.format === 'reel' && <div className={styles.reelControls}>
              <button className={styles.iconButton} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
              <input type="range" min="0" max="23" value={reelTime} onChange={(e) => { setReelTime(+e.target.value); setPlaying(false); }} />
              <span>0:{String(reelTime).padStart(2, '0')} / 0:23</span><span>Capa:</span>
              {[0, 1, 2, 3, 4].map((frame) => <button key={frame} aria-label={`Selecionar capa ${frame + 1}`} onClick={() => mutateDoc((doc) => { doc.reel.cover = frame; })} style={{ width: 25, height: 25, borderRadius: 6, border: state.doc.reel.cover === frame ? '2px solid var(--vc-accent)' : '1px solid var(--vc-border)', background: `linear-gradient(${135 + frame * 18}deg,#343438,#777)` }}>{frame + 1}</button>)}
            </div>}
          </div>
        </main>

        {previewOpen && <PreviewPanel state={state} surface={surface} brandName={brandName} />}
        {layersOpen && <LayersPanel surface={surface} selected={state.sel} onSelect={(id) => setState((current) => ({ ...current, sel: id }))} onPatch={updateLayer} />}
      </div>

      {modal === 'delete-draft'
        ? <DeleteDraftModal busy={busy} onClose={() => setModal(null)} onConfirm={confirmDraftDeletion} />
        : modal && <PublicationModal kind={modal} state={state} validation={validation} busy={busy} onClose={() => setModal(null)} onConfirm={confirmPublication} onField={updateField} />}
      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
}

function FloatingToolbar({ layer, onPatch, onDuplicate, onDelete }) {
  const align = layer.align === 'left' ? 'center' : layer.align === 'center' ? 'right' : 'left';
  return <div className={styles.floating} onPointerDown={(e) => e.stopPropagation()}>
    {(layer.type === 'text' || layer.type === 'button') && <>
      <select value={layer.font} onChange={(e) => onPatch({ font: e.target.value })}><option value="system-ui">SF</option><option value="Georgia">Serif</option><option value="ui-monospace">Mono</option></select>
      <button onClick={() => onPatch({ fs: Math.max(8, layer.fs - 2) })}><Minus size={12} /></button><span style={{ fontSize: 10 }}>{Math.round(layer.fs)}</span><button onClick={() => onPatch({ fs: layer.fs + 2 })}><Plus size={12} /></button>
      <button onClick={() => onPatch({ weight: layer.weight >= 700 ? 400 : 800 })}><Bold size={13} /></button><button onClick={() => onPatch({ italic: !layer.italic })}><Italic size={13} /></button>
      <button onClick={() => onPatch({ align })}>{layer.align === 'left' ? <AlignLeft size={13} /> : layer.align === 'center' ? <AlignCenter size={13} /> : <AlignRight size={13} />}</button>
    </>}
    {COLORS.map((color) => <button key={color} aria-label={`Cor ${color}`} className={styles.colorDot} style={{ background: color }} onClick={() => onPatch(layer.type === 'text' || layer.type === 'sticker' ? { color } : { fill: color })} />)}
    <input aria-label="Opacidade" type="range" min=".2" max="1" step=".1" value={layer.op} onChange={(e) => onPatch({ op: +e.target.value })} style={{ width: 52 }} />
    <button onClick={onDuplicate}><Copy size={13} /></button><button style={{ color: 'var(--vc-danger)' }} onClick={onDelete}><Trash2 size={13} /></button>
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

function PreviewPanel({ state, surface, brandName }) {
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
        <PreviewSurface surface={surface} cw={cw} ch={ch} scale={previewScale} />
        {state.format === 'story' && <div className={styles.storyChrome}><div className={styles.storyProgress} /><strong>{brandName.replace(/^@/, '')}</strong> · 2 min <X size={15} style={{ float: 'right' }} /><div style={{ position: 'absolute', bottom: 17, left: 12, right: 12, border: '1px solid #fff', borderRadius: 99, padding: 8 }}>Enviar mensagem…</div></div>}
        {state.format === 'reel' && <div className={styles.storyChrome}><div style={{ position: 'absolute', right: 12, bottom: 76, display: 'grid', gap: 13, textAlign: 'center' }}>♡<span style={{ fontSize: 8 }}>1,2k</span>◯<span style={{ fontSize: 8 }}>86</span>⌁</div><div style={{ position: 'absolute', left: 11, bottom: 24 }}><strong>@{brandName.replace(/^@/, '')}</strong> · Seguir<br />{state.caption || 'Sua legenda aparece aqui'}<br />♫ Áudio original</div></div>}
      </div>
      {!vertical && <><div className={styles.phoneActions}>♡ <MessageSquareText size={16} /> <Send size={16} /><span style={{ marginLeft: 'auto' }}>⌑</span></div><div className={styles.phoneCaption}>{!state.hideLikes && <strong>1.284 curtidas<br /></strong>}<strong>{brandName.replace(/^@/, '')}</strong> {state.caption || 'Sua legenda aparece aqui'}<br /><span style={{ color: '#00376b' }}>{state.hashtags}</span><br /><small>HÁ 2 MINUTOS</small></div></>}
    </div>
    <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--vc-faint)', lineHeight: 1.45 }}>Prévia fiel ao enquadramento. O Instagram pode aplicar compressão ao arquivo publicado.</p>
  </aside>;
}

function PreviewSurface({ surface, cw, ch, scale }) {
  return <div className={styles.phoneSurface} style={{ width: cw, height: ch, transform: `scale(${scale})` }}>
    {surface.media && <MediaBox media={surface.media} transform={surface.bg} canvas={[cw, ch]} testId="preview-media" />}
    {surface.layers.map((layer) => !layer.hidden && <div key={layer.id} className={styles.layer} style={{ left: layer.x, top: layer.y, width: layer.w, height: layer.h, fontSize: layer.fs, fontWeight: layer.weight, fontStyle: layer.italic ? 'italic' : 'normal', textAlign: layer.align, fontFamily: layer.font, color: layer.color, background: layer.type === 'text' || layer.type === 'sticker' ? 'transparent' : layer.fill, borderRadius: layer.radius, opacity: layer.op, transform: `rotate(${layer.rot}deg)` }}>{layer.text}</div>)}
  </div>;
}

function MediaBox({
  media,
  transform,
  canvas,
  selected = false,
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
    onDimensions?.(element.videoWidth || element.naturalWidth, element.videoHeight || element.naturalHeight);
  };
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
      ? <video className={styles.media} src={media.url} muted autoPlay loop playsInline onLoadedMetadata={dimensions} />
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

function LayersPanel({ surface, selected, onSelect, onPatch }) {
  return <aside className={`${styles.rightPanel} ${styles.layersPanel}`}><div className={styles.rightTitle}>CAMADAS</div>
    {[...surface.layers].reverse().map((layer) => <div key={layer.id} className={`${styles.layerRow} ${selected === layer.id ? styles.layerSelected : ''}`} onClick={() => onSelect(layer.id)}>
      <span className={styles.layerIcon}>{layer.type === 'text' ? <Type size={13} /> : layer.type === 'sticker' ? <Smile size={13} /> : <Shapes size={13} />}</span><span className={styles.layerName}>{layer.text || 'Forma'}</span>
      <button aria-label={layer.hidden ? 'Mostrar camada' : 'Ocultar camada'} onClick={(e) => { e.stopPropagation(); onPatch(layer.id, { hidden: !layer.hidden }); }}>{layer.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
      <button aria-label={layer.locked ? 'Desbloquear camada' : 'Bloquear camada'} onClick={(e) => { e.stopPropagation(); onPatch(layer.id, { locked: !layer.locked }); }}>{layer.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
    </div>)}
    {!surface.layers.length && <p style={{ fontSize: 11, color: 'var(--vc-faint)' }}>Adicione textos, formas ou figurinhas ao canvas.</p>}
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
