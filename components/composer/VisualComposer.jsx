'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowUpRight, Bold, Bookmark, Check, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, Copy, Eye, EyeOff, Film, GripVertical, Heart,
  Image as ImageIcon, Italic, Layers3, LayoutGrid, LayoutTemplate, Lock, MapPin,
  MessageSquareText, Minus, MoreHorizontal, Palette, Plus, Redo2,
  Save, Search, Send, Shapes, Smartphone, Smile, Sparkles,
  Square, Trash2, Type, Undo2, Unlock, Upload, UserRoundPlus, X
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
import {
  deleteLayoutTemplate, getLayoutTemplates, renameLayoutTemplate, saveLayoutTemplate
} from '@/lib/layout-actions';
import { applyLayoutTemplate } from '@/lib/layouts/templates';
import { LayoutsPanel } from './LayoutsPanel';
import { StockPanel } from './StockPanel';
import { CanvasToolbar, alignedPosition } from './CanvasToolbar';
import { LayoutLibrary } from './LayoutLibrary';
import { ArrowGraphic, IconGraphic, LineGraphic, ShapeGraphic } from './ElementGraphics';
import { ReelTimeline } from './ReelTimeline';
import { ReelVideoPanel } from './ReelVideoPanel';
import { CarouselStudioClient } from '@/components/carrossel/CarouselStudioClient';
import styles from './VisualComposer.module.css';
import './composer-fonts.css';

const FORMAT_META = {
  post: ['Post', 'Imagem única'],
  carrossel: ['Carrossel', '2 a 10 slides'],
  story: ['Story', 'Vertical 9:16'],
  reel: ['Reel', 'Vídeo vertical']
};
// Uma barra só, sete seções, na ordem em que a peça acontece (§3 da reorg).
//
// O que saiu e por quê:
// - "Criar" saiu inteira, e com ela a geração de arte no Composer de post: o
//   painel escrevia conteúdo e chamava o motor, e o post passou a ser um
//   editor manual. Quem quer peça montada por IA usa o Carrossel Studio.
// - "Formato" subiu para a barra de cima, onde já moravam formato e proporção
//   em outra fileira. Eram os mesmos controles em dois lugares.
// - "Camadas" desceu da direita para cá: dois painéis laterais disputando a
//   mesma tela era o "embolado" que se via na captura.
// - "Config." sai da barra e passa a abrir pelo chip da marca lá em cima, que
//   até aqui só decorava.
const TOOLS = [
  ['layout', LayoutTemplate, 'Layout'],
  ['midia', ImageIcon, 'Mídia'],
  ['texto', Type, 'Texto'],
  ['elementos', Shapes, 'Elementos'],
  ['camadas', Layers3, 'Camadas'],
  ['legenda', MessageSquareText, 'Legenda'],
  ['publicar', Send, 'Publicar']
];
// `config` não é botão da barra (abre pelo chip da marca), então o título dela
// não sai de TOOLS.
const PANEL_TITLES = { ...Object.fromEntries(TOOLS.map(([id, , label]) => [id, label])), config: 'Publicação' };
const ELEMENT_CATEGORIES = ['Formas', 'Linhas e setas', 'Ícones', 'Stickers', 'Emojis'];
const FONT_GROUPS = fontsByCategory();
const ELEMENT_DRAG_TYPE = 'application/x-socialhub-element';
const LAYER_DRAG_TYPE = 'application/x-socialhub-layer';

// Arte trazida do Gemini: entra como mídia comum, só com nome próprio para o
// usuário reconhecer a origem no painel de arquivo (PRD §9).
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

// Campos onde Delete/Backspace significam "apagar caractere". Só estes seguram a
// tecla: slider, seletor de cor e input de arquivo não digitam nada, e barrá-los
// deixava o usuário sem conseguir excluir a camada depois de mexer numa
// propriedade.
const TEXT_ENTRY_TYPES = new Set([
  'text', 'search', 'url', 'tel', 'email', 'password', 'number',
  'date', 'datetime-local', 'month', 'week', 'time'
]);

function isTextEntry(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName || '';
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;
  return TEXT_ENTRY_TYPES.has(String(target.type || 'text').toLowerCase());
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

function baseState(initialDraft, initialFormat = null) {
  const restored = initialDraft?.editor_state;
  const lifecycleStatus = initialDraft?.isEphemeral
    ? 'Conteúdo do dia carregado'
    : initialDraft?.status === 'scheduled' ? 'Agendado' : initialDraft ? 'Rascunho salvo' : 'Rascunho';
  return {
    theme: 'light', format: initialFormat || 'post', ratio: '1:1', doc: makeComposerDocument(),
    caption: '', hashtags: '', firstComment: '', altText: '', location: '', tags: '',
    hideLikes: false, showFeed: true,
    schedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), schedTime: '20:00',
    ...restored, status: lifecycleStatus, undoStack: [], redoStack: [], sel: null, editing: null
  };
}

function IconButton({ title, children, ...props }) {
  return <button type="button" className={styles.iconButton} title={title} aria-label={title} {...props}>{children}</button>;
}

export function VisualComposer({
  brandId,
  brandName = 'genkailabs',
  brandKit = null,
  brandLabel = '',
  initialDraft = null,
  studioBrand = null,
  studioDraft = null,
  initialFormat = null
}) {
  const [state, setState] = useState(() => baseState(initialDraft, initialFormat));
  // Abre em "Layout": sem a seção "Criar" a primeira porta é a forma da peça —
  // o formato mora na barra de cima e está sempre visível.
  const [tool, setTool] = useState('layout');
  const [elementCategory, setElementCategory] = useState('Formas');
  const [elementSearch, setElementSearch] = useState('');
  const [emojiCategory, setEmojiCategory] = useState('recentes');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [guides, setGuides] = useState([]);
  // Zoom (§9): 'fit' deixa o canvas se ajustar à área; um número é o zoom que o
  // usuário escolheu na toolbar e vale até ele pedir "Ajustar" de novo.
  const [fitScale, setFitScale] = useState(1);
  const [zoomMode, setZoomMode] = useState('fit');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
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
  const scale = zoomMode === 'fit' ? fitScale : zoomMode / 100;
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
  // Rótulo da toolbar: "Título principal · 2 de 5". A contagem é de cima para
  // baixo, igual à ordem exibida no painel de camadas.
  const selectionLabel = selected
    ? `${layerRowLabel(selected)} · ${surface.layers.length - surface.layers.indexOf(selected)} de ${surface.layers.length}`
    : state.sel === 'bg' && surface.media
      ? `${surface.media.kind === 'video' ? 'Vídeo' : 'Imagem'} de fundo`
      : '';
  const canvasIsEmpty = !surface.media && !surface.layers.length;

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
      // Camadas virou seção da barra única, então não há mais um segundo painel
      // lateral para fechar aqui — sobrou só a prévia. A chamada a
      // `setLayersOpen` ficou para trás na reorg e quebrava a tela abaixo de
      // 1250px com ReferenceError.
      if (window.innerWidth < 1250 && tool) setPreviewOpen(false);
    };
    enforceSinglePanel();
    window.addEventListener('resize', enforceSinglePanel);
    return () => window.removeEventListener('resize', enforceSinglePanel);
  }, [tool]);

  useEffect(() => {
    if (initialDraft?.editor_state || initialFormat === 'carrossel') return;
    try {
      const cached = localStorage.getItem(`composer:draft:${brandId}`);
      if (cached) setState((current) => ({ ...current, ...JSON.parse(cached), undoStack: [], redoStack: [], sel: null, editing: null }));
    } catch {}
  }, [brandId, initialDraft, initialFormat]);

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
      // O teto era 1: em Full HD a peça ficava com 430px no meio da maior área
      // da tela. O handoff pede um artboard de até ~560px, então o ajuste pode
      // passar de 100% — o limite existe só para o texto não virar borrão.
      setFitScale(Math.min(1.4, Math.max(.3, Math.min(availableW / cw, availableH / ch))));
    };
    update();
    const observer = new ResizeObserver(update);
    if (regionRef.current) observer.observe(regionRef.current);
    return () => observer.disconnect();
  }, [cw, ch, state.format, previewOpen, selected, tool]);

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
    // Depender de `reel.video` inteiro reinscreveria o listener a cada mutação
    // do Reel (volume, mudo, capa). O `tick` só lê start/end, então são esses
    // os campos que importam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (isTextEntry(event.target)) return;
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

  // A geração automática (PRD §16) entrega a peça já montada AQUI, não como
  // imagem: as camadas entram no documento e continuam editáveis. A mídia atual
  // é preservada — quem escolheu a foto foi o usuário.
  function applyLayoutSurfaces(surfaces = []) {
    if (!surfaces.length) return;
    mutateDoc((doc, current) => {
      if (current.format === 'carrossel') {
        const built = surfaces.slice(0, 10).map((item, index) => ({
          ...item,
          media: item.media || doc.carrossel.slides[index]?.media || null
        }));
        // Carrossel exige no mínimo dois slides; uma peça só não pode zerar o
        // documento do usuário.
        doc.carrossel.slides = built.length >= 2
          ? built
          : [...built, ...doc.carrossel.slides.slice(built.length)];
        doc.carrossel.active = 0;
        return;
      }
      const target = getSurface(doc, current.format);
      const [built] = surfaces;
      target.layers = built.layers;
      // Só reenquadra quando a peça foi montada COM a mídia: sem isso, montar
      // uma arte sem foto zerava o enquadramento que o usuário tinha ajustado.
      if (built.media) {
        target.media = built.media;
        target.bg = built.bg;
      }
    });
    setState((current) => ({ ...current, sel: null, editing: null }));
  }

  // ---- Layouts salvos (PRD §6, §7, §12) -----------------------------------
  // A geração de arte saiu do Composer de post junto com a seção "Criar": o
  // que resta aqui é aplicar layout salvo, que é montado no cliente e não
  // depende do motor.
  useEffect(() => {
    let alive = true;
    getLayoutTemplates(brandId)
      .then((result) => { if (alive) setTemplates(result?.templates || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [brandId]);

  // Sem a seção "Criar" não existem mais campos de conteúdo: o único texto que
  // o Composer conhece é a legenda. Primeira linha vale como título e a segunda
  // como apoio — a mesma leitura que o painel fazia ao "preencher com a
  // legenda". Elemento dinâmico sem texto correspondente o template descarta.
  function contentFromCaption() {
    const lines = String(state.caption || '').split('\n').map((line) => line.trim()).filter(Boolean);
    return {
      title: lines[0] || '',
      subtitle: lines[1] || '',
      bullets: [],
      cta: '',
      highlight: '',
      source: '',
      date: '',
      brand: brandName,
      caption: state.caption
    };
  }

  function applyTemplateFromLibrary(template) {
    const built = applyLayoutTemplate(template.template, {
      content: contentFromCaption(),
      canvas: [cw, ch],
      media: surface?.media || null
    });
    applyLayoutSurfaces([built]);
    setLibraryOpen(false);
    flash(`Layout "${template.name}" aplicado`);
  }

  async function saveCurrentAsLayout() {
    const name = window.prompt('Nome do layout', contentFromCaption().title || 'Meu layout');
    if (name === null) return;
    setBusy('save-layout');
    try {
      const result = await saveLayoutTemplate({
        brandId, name, surface, canvas: [cw, ch], format: state.format, ratio: state.ratio,
        // Estrutura e estilo eram escolhas do fluxo de geração, que saiu junto
        // com "Criar": o layout salvo agora é só a peça como ela está.
        structureId: null, styleId: null
      });
      if (result.error) throw new Error(result.error);
      setTemplates((current) => [result.template, ...current]);
      flash('Layout salvo');
    } catch (error) {
      flash(error.message);
    } finally { setBusy(''); }
  }

  async function renameTemplate(templateId, name) {
    const result = await renameLayoutTemplate({ brandId, templateId, name });
    if (result.error) return flash(result.error);
    setTemplates((current) => current.map((item) => (item.id === templateId ? { ...item, name: result.name } : item)));
    return undefined;
  }

  async function removeTemplate(templateId) {
    const result = await deleteLayoutTemplate({ brandId, templateId });
    if (result.error) return flash(result.error);
    setTemplates((current) => current.filter((item) => item.id !== templateId));
    return undefined;
  }

  // ---- Toolbar do canvas (§9) ---------------------------------------------
  function applyZoom(percent) {
    setZoomMode(Math.min(400, Math.max(25, Math.round(percent))));
  }

  /**
   * Reenquadra a foto na moldura em que ela vive (§3 da reorg).
   *
   * `cover` preenche e corta a sobra; `contain` mostra a foto inteira e deixa
   * respiro. A moldura é `surface.bgClip` quando a estrutura reservou um quadro
   * e o canvas quando a foto é livre — a mesma conta dos dois lados.
   */
  function fitMediaMode(mode) {
    mutateDoc((doc, current) => {
      const target = getSurface(doc, current.format);
      const media = target?.media;
      if (!media?.width || !media?.height) return;
      const canvas = canvasSize(current.format, current.ratio);
      const frame = target.bgClip || { x: 0, y: 0, w: canvas[0], h: canvas[1] };
      const factor = mode === 'cover'
        ? Math.max(frame.w / media.width, frame.h / media.height)
        : Math.min(frame.w / media.width, frame.h / media.height);
      const w = Math.max(1, Math.round(media.width * factor));
      const h = Math.max(1, Math.round(media.height * factor));
      target.bg = {
        x: Math.round(frame.x + (frame.w - w) / 2),
        y: Math.round(frame.y + (frame.h - h) / 2),
        w, h, scale: 1, rot: 0
      };
    });
  }

  function alignSelected(mode) {
    if (!selected) return;
    updateLayer(selected.id, alignedPosition(selected, [cw, ch], mode));
  }

  function sendSelectedTo(edge) {
    if (!selected) return;
    moveLayerToStackIndex(selected.id, edge === 'front' ? surface.layers.length - 1 : 0);
  }

  function setRatio(ratio) {
    mutateDoc((doc, current) => {
      const canvas = canvasSize(current.format, ratio);
      // Carrossel usa uma proporção só para todos os slides — reenquadra cada
      // um; nos demais formatos só existe a superfície ativa.
      const surfaces = current.format === 'carrossel' ? doc.carrossel.slides : [getSurface(doc, current.format)];
      for (const item of surfaces) {
        if (item?.media) {
          item.bg = fitMediaToCanvas({ width: item.media.width, height: item.media.height }, canvas);
        }
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
        height: metadata.height || null,
        // §13: imagem de fora carrega de onde veio e sob qual licença. Só entra
        // quando existe — upload do usuário continua sem esses campos.
        ...(metadata.source ? {
          source: metadata.source,
          sourceUrl: metadata.sourceUrl || null,
          photographer: metadata.photographer || null,
          license: metadata.license || null
        } : {})
      };
      // O enquadramento por estrutura saiu com a seção "Criar": não há mais
      // estrutura escolhida no post. A foto entra inteira e centralizada, e
      // quem quiser outra coisa reenquadra à mão no canvas.
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
      {/* Barra superior: formato, proporção, histórico, zoom e as três ações de
          saída. Nada mais. Título "Composer" e chip de status saíram — a tela
          inteira já é o Composer, e o status voltou para o botão de rascunho,
          que é onde ele muda. */}
      <header className={styles.topbar}>
        <div className={styles.segment} role="group" aria-label="Formato">
          {Object.entries(FORMAT_META).map(([id, meta]) => <button
            key={id}
            className={state.format === id ? styles.selected : ''}
            title={meta[1]}
            onClick={() => setFormat(id)}
          >{meta[0]}</button>)}
        </div>
        {state.format === 'carrossel' ? <>
          <div className={styles.spacer} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vc-sub)', whiteSpace: 'nowrap' }}>Editor visual do Carrossel Studio</span>
        </> : <>
        {Object.keys(COMPOSER_FORMATS[state.format].ratios).length > 1 && <div className={styles.ratioChips} role="group" aria-label="Proporção">
          {Object.keys(COMPOSER_FORMATS[state.format].ratios).map((ratio) => <button
            key={ratio}
            type="button"
            className={state.ratio === ratio ? styles.chipActive : styles.chip2}
            onClick={() => setRatio(ratio)}
          >{ratio}</button>)}
        </div>}
        <span className={styles.barDivider} aria-hidden="true" />
        <IconButton title="Desfazer" disabled={!state.undoStack.length} onClick={undo}><Undo2 size={16} /></IconButton>
        <IconButton title="Refazer" disabled={!state.redoStack.length} onClick={redo}><Redo2 size={16} /></IconButton>
        <span className={styles.barDivider} aria-hidden="true" />
        <IconButton title="Reduzir zoom" onClick={() => applyZoom(Math.round(scale * 100) - 10)}><Minus size={16} /></IconButton>
        <span className={styles.tbZoom} data-testid="canvas-zoom">{Math.round(scale * 100)}%</span>
        <IconButton title="Aumentar zoom" onClick={() => applyZoom(Math.round(scale * 100) + 10)}><Plus size={16} /></IconButton>
        <button type="button" className={styles.tbTextButton} onClick={() => setZoomMode('fit')}>Ajustar</button>
        <div className={styles.spacer} />
        {/* O chip da marca vira a porta da configuração da publicação e do
            Brand Kit: era rótulo decorativo e agora é o único lugar deles. */}
        <button
          type="button"
          className={`${styles.chip} ${styles.brandChip}`}
          onClick={() => setTool(tool === 'config' ? null : 'config')}
          title={brandKit ? 'Brand Kit aplicado · abrir opções da publicação' : 'Sem Brand Kit · abrir opções da publicação'}
        ><Palette size={12} /> @{brandName.replace(/^@/, '')}</button>
        {draftId && contentStatus === 'draft' && <IconButton title="Excluir rascunho" onClick={() => setModal('delete-draft')}><Trash2 size={16} /></IconButton>}
        <button className={`${styles.button} ${styles.outline}`} onClick={persistDraft} disabled={!!busy}><Save size={14} /> <span>{busy === 'draft' ? 'Salvando…' : contentStatus === 'scheduled' ? 'Atualizar agendamento' : 'Salvar'}</span></button>
        <button className={`${styles.button} ${styles.soft}`} onClick={() => setModal('schedule')}>Agendar</button>
        <button className={`${styles.button} ${styles.primary}`} onClick={() => setModal('publish')}>Publicar</button>
        </>}
      </header>

      {state.format === 'carrossel' ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <CarouselStudioClient
            brandId={brandId}
            brand={studioBrand}
            draft={studioDraft}
            embedded
            onClose={() => setFormat('post')}
          />
        </div>
      ) : <div className={styles.workspace}>
        <nav className={styles.rail} aria-label="Ferramentas do Composer">
          {TOOLS.map(([id, Icon, label]) => (
            <button key={id} className={`${styles.railButton} ${tool === id ? styles.railActive : ''}`} onClick={() => { setTool(tool === id ? null : id); if (window.innerWidth < 1250) setPreviewOpen(false); }}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
          <div className={styles.railBottom} />
          {/* Camadas saiu daqui e virou seção da barra. Sobra a prévia, que é a
              única coisa que a direita mostra por conta própria. */}
          <button className={`${styles.railButton} ${previewOpen ? styles.railActive : ''}`} onClick={() => { setPreviewOpen(!previewOpen); if (window.innerWidth < 1250) setTool(null); }}><Smartphone size={17} /><span>Prévia</span></button>
        </nav>

        {tool && <aside className={styles.panel}>
          <div className={styles.panelHead}>
            <span>
              <strong>{PANEL_TITLES[tool]}</strong>
              {tool === 'layout' && <small>Layouts salvos por você</small>}
              {tool === 'config' && <small>Opções da publicação</small>}
            </span>
            <IconButton title="Fechar painel" onClick={() => setTool(null)}><X size={14} /></IconButton>
          </div>
          {tool === 'layout' ? <LayoutsPanel
            onOpenLibrary={() => setLibraryOpen(true)}
            onSaveCurrent={saveCurrentAsLayout}
            canSaveCurrent={Boolean(surface.layers.length) && busy !== 'save-layout'}
            busy={busy === 'save-layout'}
          /> : tool === 'camadas' ? <LayersPanel
            surface={surface}
            selected={state.sel}
            onSelect={(id) => setState((current) => ({ ...current, sel: id, editing: null }))}
            onPatch={updateLayer}
            onReorder={moveLayerInStack}
            onReorderTo={moveLayerToStackIndex}
            onDuplicate={duplicateLayer}
            onDelete={deleteLayerById}
            onAddText={() => addPreset({ text: 'Adicionar título', fs: 32, weight: 800, h: 52 })}
            onAddImage={() => setTool('midia')}
            onAddShape={() => addPreset(ELEMENT_SHAPES[0]?.preset || { type: 'shape', shape: 'rect', w: 160, h: 90, fill: '#3b82f6' })}
            onAddEmoji={() => { setTool('elementos'); setElementCategory('Emojis'); }}
          /> : <div className={styles.panelScroll}>
          {tool === 'midia' && <>
            {!surface.media ? (
              <label className={styles.upload} aria-label="Importar mídia"><Upload size={22} /><strong>Adicionar mídia</strong><small>{state.format === 'reel' ? 'MP4 ou MOV · 9:16' : state.format === 'story' ? 'JPG, PNG, WEBP, MP4 ou MOV' : 'JPG, PNG ou WEBP'}</small><input type="file" accept={mediaAccept(state.format)} onChange={(event) => uploadFiles(event.target.files)} /></label>
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
            {state.format === 'reel' && <p style={{ fontSize: 10.5, color: 'var(--vc-faint)', marginTop: 6, lineHeight: 1.45 }}>
              No Reel o canvas é vídeo: a arte gerada entra como capa.
            </p>}
            {uploading != null && <div className={styles.progress}><span style={{ width: `${uploading}%` }} /></div>}
            {mediaError && <div className={styles.error}>{mediaError}</div>}
            {/* Vídeo não vem de banco de foto: no Reel o canvas é o vídeo. */}
            {state.format !== 'reel' && <StockPanel
              format={state.format}
              subject={contentFromCaption().title}
              onPick={(photo) => pickMedia(photo.full, 'image', {
                name: photo.alt || `Foto de ${photo.photographer}`,
                width: photo.width,
                height: photo.height,
                type: 'image/jpeg',
                source: photo.source,
                sourceUrl: photo.sourceUrl,
                photographer: photo.photographer,
                license: photo.license
              })}
            />}
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
            {/* As propriedades moraram aqui e agora moram na direita, junto da
                prévia: mudar a cor de um texto não pode exigir voltar para a
                seção que o criou. Esta seção só ADICIONA. */}
            <p className={styles.panelHintText}>Clique duas vezes no texto para editar. Ajustes rápidos ficam na barra acima do canvas; o resto, no painel da direita.</p>
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
            {state.format === 'story' && <div className={styles.error} style={{ color: 'var(--vc-warn)' }}>GIFs, enquetes e música ficam disponíveis apenas na publicação manual pelo Instagram.</div>}
          </>}
          {tool === 'legenda' && <>
            <div className={styles.sectionLabel}>LEGENDA <span className={styles.counter}>{state.caption.length} / 2200</span></div><textarea className={styles.textarea} value={state.caption} onChange={(e) => updateField('caption', e.target.value)} placeholder="Escreva a legenda…" />
            <button className={styles.preset} onClick={() => updateField('caption', `${state.caption} 😀`)}><Smile size={14} /> Inserir emoji</button>
            <div className={styles.sectionLabel}>HASHTAGS <span className={styles.counter}>{state.hashtags.split(/[\s,]+/).filter(Boolean).length} / 30</span></div><input className={styles.field} value={state.hashtags} onChange={(e) => updateField('hashtags', e.target.value)} placeholder="marketing, social, dicas" />
            <div className={styles.sectionLabel}>PRIMEIRO COMENTÁRIO</div><textarea className={styles.textarea} value={state.firstComment} onChange={(e) => updateField('firstComment', e.target.value)} placeholder="Opcional" />
          </>}
          {tool === 'config' && <>
            {/* O resumo do Brand Kit vinha grudado no topo da coluna da direita,
                acima da prévia, em todo momento. Ele pertence a este painel: é
                configuração, não é a peça. */}
            <BrandKitSummary brandName={brandName} brandLabel={brandLabel} brandKit={brandKit} />
            <div className={styles.sectionLabel}>APARÊNCIA DO EDITOR</div>
            <div className={styles.segment}>
              <button className={state.theme === 'light' ? styles.selected : ''} onClick={() => { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); setState((v) => ({ ...v, theme: 'light' })); }}>Claro</button>
              <button className={state.theme === 'dark' ? styles.selected : ''} onClick={() => { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); setState((v) => ({ ...v, theme: 'dark' })); }}>Escuro</button>
            </div>
            <div className={styles.sectionLabel}>LOCALIZAÇÃO</div><div style={{ position: 'relative' }}><MapPin size={14} style={{ position: 'absolute', left: 9, top: 10 }} /><input className={styles.field} style={{ paddingLeft: 29 }} value={state.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Adicionar localização" /></div>
            <div className={styles.sectionLabel}>MARCAR PESSOAS</div><div style={{ position: 'relative' }}><UserRoundPlus size={14} style={{ position: 'absolute', left: 9, top: 10 }} /><input className={styles.field} style={{ paddingLeft: 29 }} value={state.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="@usuario" /></div>
            <div className={styles.sectionLabel}>ALT TEXT {state.format === 'carrossel' ? `— SLIDE ${state.doc.carrossel.active + 1}` : ''}</div><textarea className={styles.textarea} value={state.altText} onChange={(e) => updateField('altText', e.target.value)} />
            <div className={styles.toggle}><span>Ocultar contagem de curtidas</span><button className={`${styles.switch} ${state.hideLikes ? styles.switchOn : ''}`} onClick={() => updateField('hideLikes', !state.hideLikes)}><span /></button></div>
            {state.format === 'reel' && <div className={styles.toggle}><span>Mostrar também no Feed</span><button className={`${styles.switch} ${state.showFeed ? styles.switchOn : ''}`} onClick={() => updateField('showFeed', !state.showFeed)}><span /></button></div>}
          </>}
          {tool === 'publicar' && <><div className={styles.sectionLabel}>VALIDAÇÃO</div>{(validation.ok ? ['Mídia e formato prontos', 'Limites de texto válidos'] : validation.errors).map((item) => <div className={styles.check} key={item}><Check size={14} color={validation.ok ? 'var(--vc-success)' : 'var(--vc-warn)'} />{item}</div>)}<button className={`${styles.button} ${styles.primary}`} style={{ width: '100%', marginTop: 10 }} onClick={() => setModal('publish')}>Publicar agora</button><button className={`${styles.button} ${styles.soft}`} style={{ width: '100%', marginTop: 7 }} onClick={() => setModal('schedule')}>Agendar</button><button className={`${styles.button} ${styles.outline}`} style={{ width: '100%', marginTop: 7 }} onClick={persistDraft}>Salvar rascunho</button></>}
          </div>}
        </aside>}

        <main className={styles.stage}>
          {/* Formato e proporção subiram para a barra de cima: eram os mesmos
              controles em duas fileiras, uma acima da outra. Sobra aqui o que é
              da peça aberta — a posição no carrossel. */}
          {state.format === 'carrossel' && <div className={styles.formatBar} role="group" aria-label="Slide aberto">
            <span className={styles.chip}>Slide {state.doc.carrossel.active + 1} de {state.doc.carrossel.slides.length}</span>
          </div>}
          {/* Barra contextual: só aparece com algo selecionado, e mostra o que
              serve àquele algo. Antes era uma fileira fixa de botões cinzas. */}
          <CanvasToolbar
            selection={{ layer: selected, label: selectionLabel }}
            onPatch={(patch, history) => selected && updateLayer(selected.id, patch, history)}
            onHistory={pushHistory}
            onDuplicate={() => selected && duplicateLayer(selected.id)}
            onAlign={alignSelected}
            onToggleLock={() => selected && updateLayer(selected.id, { locked: !selected.locked })}
            onBringToFront={() => sendSelectedTo('front')}
            onSendToBack={() => sendSelectedTo('back')}
            onDelete={() => selected && deleteLayerById(selected.id)}
            mediaSelected={state.sel === 'bg' && surface.media ? surface.media : null}
            mediaActions={{
              onFitCover: () => fitMediaMode('cover'),
              onFitContain: () => fitMediaMode('contain'),
              onReposition: () => setState((current) => ({ ...current, sel: 'bg' })),
              onOpacity: () => {},
              onReplace: () => setTool('midia'),
              repositioning: state.sel === 'bg'
            }}
          />
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
                      clip={surface.bgClip}
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
                  : null}
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
            {canvasIsEmpty && <CanvasEmptyState
              format={FORMAT_META[state.format][0]}
              ratio={state.ratio}
              size={`${cw} × ${ch} px`}
              onMedia={() => setTool('midia')}
              onLayout={() => setLibraryOpen(true)}
              onText={() => setTool('texto')}
            />}
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

        {/* Direita: prévia e propriedades do que está selecionado. Só isso.
            Camadas foi para a barra da esquerda e o resumo do Brand Kit para o
            chip da marca — eram três coisas disputando uma coluna. */}
        {(previewOpen || selected) && <aside className={styles.rightPanel} aria-label="Prévia e propriedades">
          {previewOpen && <PreviewPanel state={state} surface={surface} brandName={brandName} currentTime={state.format === 'reel' ? playhead : undefined} />}
          {selected && <section className={styles.panelSection} aria-label="Propriedades do elemento">
            <div className={styles.rightHead}><span className={styles.rightTitle}>PROPRIEDADES</span><span className={styles.chip}>{selectionLabel}</span></div>
            {selectedIsText
              ? <TextProperties layer={selected} onPatch={(patch, history) => updateLayer(selected.id, patch, history)} onHistory={pushHistory} />
              : GRAPHIC_TYPES.has(selected.type)
                ? <ElementProperties layer={selected} onPatch={(patch, history) => updateLayer(selected.id, patch, history)} onHistory={pushHistory} />
                : <p className={styles.panelHintText}>Este elemento não tem propriedades editáveis.</p>}
          </section>}
        </aside>}
      </div>}

      {libraryOpen && <LayoutLibrary
        templates={templates}
        onClose={() => setLibraryOpen(false)}
        onApplyTemplate={applyTemplateFromLibrary}
        onRename={renameTemplate}
        onDelete={removeTemplate}
        onSaveCurrent={saveCurrentAsLayout}
        canSaveCurrent={Boolean(surface.layers.length)}
      />}

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

// Resumo do Brand Kit (§13): faixa compacta no topo do painel direito. Mostra
// só o que existe de verdade no kit — sem inventar logo ou fonte que a marca
// ainda não configurou.
function brandPaletteColors(brandKit) {
  const palette = brandKit?.palette;
  if (!palette || typeof palette !== 'object') return [];
  return Object.values(palette)
    .filter((value) => typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value))
    .slice(0, 4);
}

function BrandKitSummary({ brandName, brandLabel, brandKit }) {
  const name = brandLabel || brandName || 'Marca';
  const initials = name.replace(/^@/, '').slice(0, 2).toUpperCase();
  const colors = brandPaletteColors(brandKit);
  return <div className={styles.brandKitBar}>
    <span className={styles.brandKitLogo} aria-hidden="true">{initials}</span>
    <span className={styles.brandKitInfo}>
      <strong>{name}</strong>
      <small>{brandKit?.visual_style || 'Estilo definido pela IA'}</small>
    </span>
    <span className={styles.brandKitDots} aria-hidden="true">
      {colors.length
        ? colors.map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)
        : <i style={{ background: 'var(--vc-accent)' }} />}
    </span>
  </div>;
}

// Estado vazio do canvas (§7): as três portas de entrada, cada uma abrindo a
// função que já existe. Some assim que a primeira camada ou mídia entra.
//
// A porta "Escrever conteúdo" saiu com a seção "Criar": não existe mais
// geração de arte no post, então prometer isso aqui seria mentir. Sobram as
// portas que fazem o que dizem — mídia, layout salvo e texto.
function CanvasEmptyState({ format, ratio, size, onMedia, onLayout, onText }) {
  return <div className={styles.emptyOverlay} data-testid="composer-empty-state">
    <div className={styles.emptyCard}>
      <span className={styles.emptyBadge}><Sparkles size={24} /></span>
      <h2>Comece sua criação</h2>
      <p>Comece de uma mídia, de um layout que você salvou ou de um texto no canvas.</p>
      <div className={styles.emptyActions}>
        <button type="button" className={`${styles.button} ${styles.primary} ${styles.emptyPrimary}`} onClick={onMedia}>
          <ImageIcon size={16} /> Adicionar mídia
        </button>
        <div className={styles.emptyRow}>
          <button type="button" className={`${styles.button} ${styles.outline}`} onClick={onLayout}><LayoutGrid size={14} /> Layout</button>
          <button type="button" className={`${styles.button} ${styles.outline}`} onClick={onText}><Type size={14} /> Texto</button>
        </div>
      </div>
      <small>{format} · {ratio} · {size}</small>
    </div>
  </div>;
}

function PreviewPanel({ state, surface, brandName, currentTime }) {
  const [cw, ch] = canvasSize(state.format, state.ratio);
  const vertical = state.format === 'story' || state.format === 'reel';
  const handle = brandName.replace(/^@/, '');
  const previewScale = 268 / cw;
  const previewH = ch * previewScale;
  return <section className={styles.panelSection} aria-label="Prévia no Instagram">
    <div className={styles.sectionHead}>
      <span className={styles.rightTitle}>PRÉVIA NO INSTAGRAM</span>
      <span className={styles.previewMode}><Smartphone size={12} /> {vertical ? 'Tela cheia' : 'Feed'}</span>
    </div>
    <div className={`${styles.igCard} ${vertical ? styles.igVertical : ''}`}>
      <div className={styles.igHead}>
        <span className={styles.igAvatar} aria-hidden="true"><i>{handle.slice(0, 2).toUpperCase()}</i></span>
        <span className={styles.igName}><strong>{handle}</strong><small>{state.location || 'Publicação'}</small></span>
        <MoreHorizontal size={15} aria-hidden="true" />
      </div>
      <div className={styles.igMedia} style={{ height: previewH }}>
        <PreviewSurface surface={surface} cw={cw} ch={ch} scale={previewScale} currentTime={currentTime} />
        {state.format === 'story' && <div className={styles.storyChrome}><div className={styles.storyProgress} /><strong>{handle}</strong> · 2 min <X size={15} style={{ float: 'right' }} /><div style={{ position: 'absolute', bottom: 17, left: 12, right: 12, border: '1px solid #fff', borderRadius: 99, padding: 8 }}>Enviar mensagem…</div></div>}
        {state.format === 'reel' && <div className={styles.storyChrome}><div style={{ position: 'absolute', right: 12, bottom: 76, display: 'grid', gap: 13, textAlign: 'center' }}>♡<span style={{ fontSize: 8 }}>1,2k</span>◯<span style={{ fontSize: 8 }}>86</span>⌁</div><div style={{ position: 'absolute', left: 11, bottom: 24 }}><strong>@{handle}</strong> · Seguir<br />{state.caption || 'Sua legenda aparece aqui'}<br />♫ Áudio original</div></div>}
      </div>
      <div className={styles.igActions}>
        <Heart size={19} aria-hidden="true" />
        <MessageSquareText size={19} aria-hidden="true" />
        <Send size={19} aria-hidden="true" />
        <Bookmark size={19} aria-hidden="true" style={{ marginLeft: 'auto' }} />
      </div>
      <div className={styles.igCaption}>
        {/* Números de interação são enfeite da prévia — nunca viram métrica. */}
        {!state.hideLikes && <strong className={styles.igLikes}>1.284 curtidas</strong>}
        <p><strong>{handle}</strong> {state.caption || 'Sua legenda aparece aqui'}</p>
        {state.hashtags && <p className={styles.igTags}>{state.hashtags.split(/[\s,]+/).filter(Boolean).map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')}</p>}
        <small>Há 2 minutos</small>
      </div>
    </div>
    <p className={styles.previewNote}>Prévia fiel ao enquadramento. O Instagram aplica compressão ao publicar.</p>
  </section>;
}

function PreviewSurface({ surface, cw, ch, scale, currentTime }) {
  // A prévia espelha o tempo do canvas e roda muda: o som já sai de lá, tocar
  // duas vezes daria eco (§6).
  const previewVideoRef = useRef(null);
  return <div className={styles.phoneSurface} style={{ width: cw, height: ch, transform: `scale(${scale})` }}>
    {surface.media && <MediaBox
      media={surface.media}
      transform={surface.bg}
      clip={surface.bgClip}
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
  clip = null,
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
  const style = mediaTransformStyle(transform, media, canvas, clip);
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

// Subtítulo da camada (§15 do handoff): tipo + o detalhe que diferencia duas
// camadas do mesmo tipo — a fonte de um texto, o formato de uma forma.
const SHAPE_LABEL = { rect: 'Retângulo', circle: 'Círculo', ellipse: 'Elipse', triangle: 'Triângulo', star: 'Estrela' };

function layerRowType(layer) {
  const base = LAYER_TYPE_LABEL[layer.type] || 'Elemento';
  if (layer.type === 'shape') return `${base} · ${SHAPE_LABEL[layer.shape || 'rect'] || 'Personalizada'}`;
  if (isTextLayer(layer) && layer.font) return `${base} · ${layer.font}`;
  return base;
}

function layerRowLabel(layer) {
  if (layer.type === 'icon') return ELEMENT_ICON_MAP[layer.icon]?.label || 'Ícone';
  if (isEmojiLayer(layer)) return `Emoji ${layer.text}`;
  const text = String(layer.text || '').trim();
  return text || LAYER_TYPE_LABEL[layer.type] || 'Elemento';
}

function LayersPanel({
  surface, selected, onSelect, onPatch, onReorder, onReorderTo, onDuplicate, onDelete,
  onAddText, onAddImage, onAddShape, onAddEmoji
}) {
  const [dragId, setDragId] = useState(null);
  const [dropAt, setDropAt] = useState(null);
  const total = surface.layers.length;
  const mediaLabel = surface.media?.kind === 'video' ? 'Vídeo' : 'Imagem';
  const endDrag = () => { setDragId(null); setDropAt(null); };
  return <section className={styles.panelSection} aria-label="Camadas">
    <div className={styles.sectionHead}>
      <span className={styles.rightTitle}>CAMADAS</span>
      <IconButton title="Adicionar texto" onClick={onAddText}><Plus size={14} /></IconButton>
    </div>
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
      <span className={styles.layerName}>
        <b>{layerRowLabel(layer)}</b>
        <small>{layerRowType(layer)}</small>
      </span>
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
    {!surface.layers.length && !surface.media && <>
      <div className={styles.layersEmpty}>
        <strong>Nenhum elemento adicionado</strong>
        <span>Adicione um elemento ao canvas</span>
      </div>
      <div className={styles.layerShortcuts}>
        <button type="button" onClick={onAddText}><Type size={14} /> Texto</button>
        <button type="button" onClick={onAddImage}><ImageIcon size={14} /> Imagem</button>
        <button type="button" onClick={onAddShape}><Square size={14} /> Forma</button>
        <button type="button" onClick={onAddEmoji}><Smile size={14} /> Emoji</button>
      </div>
    </>}
  </section>;
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
