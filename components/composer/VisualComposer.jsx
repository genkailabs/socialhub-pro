'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, CalendarClock, Check, ChevronLeft,
  ChevronRight, Circle, Copy, Eye, EyeOff, Film, Image as ImageIcon, Italic,
  Layers3, Lock, MapPin, Maximize2, MessageSquareText, Minus, MoreHorizontal,
  Palette, Pause, Play, Plus, Redo2, RotateCw, Save, Send, Settings2, Shapes,
  Smartphone, Smile, Trash2, Type, Undo2, Unlock, Upload, UserRoundPlus, X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadTempMedia } from '@/lib/posts-media';
import { publishNow, saveDraft, schedulePost } from '@/lib/posts-actions';
import {
  COMPOSER_FORMATS, addLayer, canvasSize, cloneEditorState, getSurface,
  makeComposerDocument, serializeComposer, snapPosition, toApiFormat, validateComposer
} from '@/lib/composer-editor';
import styles from './VisualComposer.module.css';

const LIBRARY = [
  { url: '/composer/post.png', label: 'Post' },
  { url: '/composer/carrosel.png', label: 'Carrossel' },
  { url: '/composer/story.png', label: 'Story' },
  { url: '/composer/reels.png', label: 'Reel' }
];
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

function baseState(initialDraft) {
  const restored = initialDraft?.editor_state;
  return {
    theme: 'light', format: 'post', ratio: '1:1', doc: makeComposerDocument(),
    caption: '', hashtags: '', firstComment: '', altText: '', location: '', tags: '',
    hideLikes: false, showFeed: true, status: initialDraft ? 'Rascunho salvo' : 'Rascunho',
    schedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), schedTime: '20:00',
    ...restored, undoStack: [], redoStack: [], sel: null, editing: null
  };
}

function IconButton({ title, children, ...props }) {
  return <button type="button" className={styles.iconButton} title={title} aria-label={title} {...props}>{children}</button>;
}

export function VisualComposer({ brandId, brandName = 'genkailabs', initialDraft = null }) {
  const [state, setState] = useState(() => baseState(initialDraft));
  const [tool, setTool] = useState('formato');
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
  const regionRef = useRef(null);
  const gestureRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [cw, ch] = canvasSize(state.format, state.ratio);
  const surface = getSurface(state.doc, state.format);
  const selected = state.sel === 'bg' ? null : surface.layers.find((item) => item.id === state.sel);
  const validation = validateComposer(state);

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

  async function pickMedia(url, kind = 'image') {
    mutateDoc((doc, current) => {
      getSurface(doc, current.format).media = { url, kind, name: url.split('/').pop() };
      getSurface(doc, current.format).bg = { x: 0, y: 0, scale: 1, rot: 0 };
    });
    setMediaError('');
    flash('Mídia adicionada — edição não destrutiva ativada');
  }

  async function uploadFiles(files) {
    const file = files?.[0];
    if (!file) return;
    const valid = state.format === 'reel' ? file.type.startsWith('video/') : file.type.startsWith('image/') || state.format === 'story';
    if (!valid || /\.avi$/i.test(file.name)) {
      setMediaError(`Formato não suportado para ${FORMAT_META[state.format][0]}. Use JPG, PNG, WEBP${state.format === 'reel' ? ', MP4 ou MOV' : ''}.`);
      return;
    }
    setUploading(10);
    const fake = window.setInterval(() => setUploading((value) => Math.min(90, (value || 0) + 20)), 180);
    try {
      const supabase = createClient();
      const uploaded = await uploadTempMedia(supabase, brandId, file);
      await pickMedia(uploaded.publicUrl, file.type.startsWith('video/') ? 'video' : 'image');
      setUploading(100);
    } catch {
      await pickMedia(URL.createObjectURL(file), file.type.startsWith('video/') ? 'video' : 'image');
      flash('Mídia mantida nesta sessão; o upload remoto falhou');
    } finally {
      window.clearInterval(fake);
      window.setTimeout(() => setUploading(null), 350);
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
    gestureRef.current = {
      kind, id: layer?.id || 'bg', corner, start: point,
      original: layer ? cloneEditorState(layer) : cloneEditorState(surface.bg)
    };
    setState((current) => ({ ...current, sel: layer?.id || 'bg', editing: null }));
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
        if (gesture.kind === 'bg') {
          targetSurface.bg.x = gesture.original.x + dx;
          targetSurface.bg.y = gesture.original.y + dy;
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

  function resetBackground() {
    mutateDoc((doc, current) => { getSurface(doc, current.format).bg = { x: 0, y: 0, scale: 1, rot: 0 }; });
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
    setBusy('draft');
    try {
      const result = await saveDraft({
        brandId, draftId, caption: state.caption, hashtags: state.hashtags, firstComment: state.firstComment,
        altText: state.altText, imageUrls: mediaUrls, format: toApiFormat(state.format),
        editorState: serializeComposer(state), location: state.location, taggedPeople: state.tags,
        share_to_feed: state.showFeed
      });
      if (result?.error) throw new Error(result.error);
      if (result?.id) setDraftId(result.id);
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
        brandId, caption: state.caption, hashtags: state.hashtags, firstComment: state.firstComment,
        altText: state.altText, imageUrls: mediaUrls, format: toApiFormat(state.format),
        editorState: serializeComposer(state), location: state.location, taggedPeople: state.tags,
        share_to_feed: state.showFeed,
        thumb_offset_ms: state.format === 'reel' ? state.doc.reel.cover * 5000 : null
      };
      const result = kind === 'schedule'
        ? await schedulePost({ ...payload, scheduledAt: new Date(`${state.schedDate}T${state.schedTime}`).toISOString() })
        : await publishNow(payload);
      if (result?.error) throw new Error(result.error);
      updateField('status', kind === 'schedule'
        ? `Agendado · ${state.schedDate.split('-').reverse().join('/')} ${state.schedTime}`
        : 'Publicado ✓');
      setModal(null);
      flash(kind === 'schedule' ? 'Publicação agendada' : 'Publicação enviada ao Instagram');
    } catch (error) { flash(error.message); }
    finally { setBusy(''); }
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
        <button className={`${styles.button} ${styles.outline}`} onClick={persistDraft} disabled={!!busy}><Save size={14} /> <span>{busy === 'draft' ? 'Salvando…' : 'Salvar rascunho'}</span></button>
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
            {state.format === 'post' && <><div className={styles.sectionLabel}>PROPORÇÃO</div><div className={styles.segment}>{Object.keys(COMPOSER_FORMATS.post.ratios).map((ratio) => <button key={ratio} className={state.ratio === ratio ? styles.selected : ''} onClick={() => updateField('ratio', ratio)}>{ratio}</button>)}</div></>}
          </>}
          {tool === 'midia' && <>
            <label className={styles.upload}><Upload size={22} /><strong> Enviar mídia</strong><small>{state.format === 'reel' ? 'MP4, MOV · 9:16' : 'JPG, PNG, WEBP'}</small><input type="file" accept={state.format === 'reel' ? 'video/mp4,video/quicktime,image/*' : 'image/*'} onChange={(event) => uploadFiles(event.target.files)} /></label>
            {uploading != null && <div className={styles.progress}><span style={{ width: `${uploading}%` }} /></div>}
            {mediaError && <div className={styles.error}>{mediaError}</div>}
            <div className={styles.sectionLabel}>DA BIBLIOTECA</div><div className={styles.library}>{LIBRARY.map((item) => <button key={item.url} aria-label={`Usar ${item.label}`} className={styles.libraryItem} style={{ backgroundImage: `url("${item.url}")` }} onClick={() => pickMedia(item.url)} />)}</div>
            <button className={styles.preset} style={{ marginTop: 10 }} onClick={() => setMediaError('Formato .avi não suportado. Use JPG, PNG, WEBP, MP4 ou MOV.')}>video-final.avi · 214MB</button>
          </>}
          {tool === 'texto' && <>
            <button className={styles.preset} style={{ fontSize: 19, fontWeight: 800 }} onClick={() => addPreset({ text: 'Adicionar título', fs: 32, weight: 800, h: 52 })}>Adicionar título</button>
            <button className={styles.preset} style={{ fontSize: 14, fontWeight: 600 }} onClick={() => addPreset({ text: 'Adicionar subtítulo', fs: 18, weight: 600, h: 38 })}>Adicionar subtítulo</button>
            <button className={styles.preset} onClick={() => addPreset({ text: 'Adicionar texto de corpo', fs: 13, weight: 400, h: 34 })}>Adicionar texto de corpo</button>
            <p style={{ fontSize: 11, color: 'var(--vc-faint)', lineHeight: 1.5 }}>Clique duas vezes no texto para editar. Arraste, gire e redimensione pelas alças.</p>
          </>}
          {tool === 'elementos' && <>
            <div className={styles.sectionLabel}>FORMAS</div><div className={styles.shapeGrid}>
              <button className={styles.shape} onClick={() => addPreset({ type: 'shape', text: '', w: 110, h: 90, fill: '#007AFF' })}><span style={{ display: 'block', width: 24, height: 24, background: '#6E6E73', borderRadius: 4, margin: 'auto' }} /></button>
              <button className={styles.shape} onClick={() => addPreset({ type: 'shape', text: '', w: 90, h: 90, radius: 99, fill: '#FF9500' })}><Circle size={25} fill="currentColor" /></button>
              <button className={styles.shape} onClick={() => addPreset({ type: 'button', text: 'Saiba mais', w: 130, h: 42, fs: 14, radius: 99 })}>Pill</button>
            </div><div className={styles.sectionLabel}>FIGURINHAS</div><div className={styles.stickerGrid}>{EMOJIS.map((emoji) => <button key={emoji} className={styles.sticker} onClick={() => addPreset({ type: 'sticker', text: emoji, fs: 44, w: 62, h: 62, fill: 'transparent' })}>{emoji}</button>)}</div>
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
            {state.format === 'post' && <div className={styles.segment}>{Object.keys(COMPOSER_FORMATS.post.ratios).map((ratio) => <button key={ratio} className={state.ratio === ratio ? styles.selected : ''} onClick={() => updateField('ratio', ratio)}>{ratio}</button>)}</div>}
            {state.format === 'carrossel' && <span className={styles.chip}>Slide {state.doc.carrossel.active + 1} de {state.doc.carrossel.slides.length}</span>}
          </div>
          <div className={styles.canvasRegion} ref={regionRef} onPointerDown={() => setState((current) => ({ ...current, sel: null, editing: null }))}>
            <div className={styles.scaleWrap} style={{ width: cw * scale, height: ch * scale }}>
              <div className={styles.canvas} style={{ width: cw, height: ch, transform: `scale(${scale})` }} onPointerDown={(e) => { if (surface.media) beginGesture('bg', e); }}>
                {surface.media ? (surface.media.kind === 'video'
                  ? <video className={styles.media} src={surface.media.url} muted autoPlay loop style={{ transform: `translate(${surface.bg.x}px,${surface.bg.y}px) scale(${surface.bg.scale}) rotate(${surface.bg.rot}deg)` }} />
                  : <img className={styles.media} alt="" src={surface.media.url} style={{ transform: `translate(${surface.bg.x}px,${surface.bg.y}px) scale(${surface.bg.scale}) rotate(${surface.bg.rot}deg)` }} />)
                  : <div className={styles.empty}><div><Upload size={25} /><strong>Adicionar mídia</strong><small>{state.format === 'reel' ? 'MP4 ou MOV · 9:16' : 'JPG, PNG ou WEBP'}</small></div></div>}
                {surface.layers.map((layer) => !layer.hidden && <div key={layer.id} className={`${styles.layer} ${state.sel === layer.id ? styles.selectedLayer : ''}`} style={{ left: layer.x, top: layer.y, width: layer.w, height: layer.h, fontSize: layer.fs, fontWeight: layer.weight, fontStyle: layer.italic ? 'italic' : 'normal', textAlign: layer.align, fontFamily: layer.font, color: layer.color, background: layer.type === 'text' || layer.type === 'sticker' ? 'transparent' : layer.fill, borderRadius: layer.radius, opacity: layer.op, transform: `rotate(${layer.rot}deg)`, cursor: layer.locked ? 'default' : 'move' }} onPointerDown={(e) => beginGesture('move', e, layer)} onDoubleClick={(e) => { e.stopPropagation(); if (layer.type === 'text' || layer.type === 'button') setState((current) => ({ ...current, editing: layer.id, sel: layer.id })); }}>
                  {state.editing === layer.id ? <textarea autoFocus value={layer.text} onChange={(e) => updateLayer(layer.id, { text: e.target.value }, false)} onBlur={() => setState((current) => ({ ...current, editing: null }))} style={{ width: '100%', height: '100%', resize: 'none', background: 'rgba(0,0,0,.2)', color: 'inherit', border: 0, textAlign: layer.align, font: 'inherit' }} /> : layer.text}
                  {state.sel === layer.id && !layer.locked && <><span className={`${styles.handle} ${styles.nw}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'nw')} /><span className={`${styles.handle} ${styles.ne}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'ne')} /><span className={`${styles.handle} ${styles.sw}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'sw')} /><span className={`${styles.handle} ${styles.se}`} onPointerDown={(e) => beginGesture('resize', e, layer, 'se')} /><span className={styles.rotate} onPointerDown={(e) => beginGesture('rotate', e, layer)} />
                    <FloatingToolbar layer={layer} onPatch={(patch) => updateLayer(layer.id, patch)} onDuplicate={duplicateSelected} onDelete={deleteSelected} /></>}
                </div>)}
                {guide.v && <div className={styles.guideV} />}{guide.h && <div className={styles.guideH} />}
                {state.format === 'story' && <><div className={styles.safeTop}>INTERFACE DO INSTAGRAM</div><div className={styles.safeBottom}>ÁREA SEGURA</div></>}
                {state.sel === 'bg' && surface.media && <div className={styles.floating} style={{ top: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); mutateDoc((doc, current) => { getSurface(doc, current.format).bg.scale = Math.max(.5, surface.bg.scale - .1); }); }}>−</button>
                  <span style={{ fontSize: 10 }}>{Math.round(surface.bg.scale * 100)}%</span>
                  <button onClick={(e) => { e.stopPropagation(); mutateDoc((doc, current) => { getSurface(doc, current.format).bg.scale = Math.min(3, surface.bg.scale + .1); }); }}>+</button>
                  <button onClick={(e) => { e.stopPropagation(); mutateDoc((doc, current) => { getSurface(doc, current.format).bg.rot += 90; }); }}><RotateCw size={13} /></button>
                  <button onClick={(e) => { e.stopPropagation(); resetBackground(); }}>Centralizar</button>
                  <button onClick={(e) => { e.stopPropagation(); resetBackground(); }}>Resetar</button>
                  <button style={{ color: 'var(--vc-danger)' }} onClick={(e) => { e.stopPropagation(); deleteSelected(); }}><Trash2 size={13} /></button>
                </div>}
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

      {modal && <PublicationModal kind={modal} state={state} validation={validation} busy={busy} onClose={() => setModal(null)} onConfirm={confirmPublication} onField={updateField} />}
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
  const phoneW = 242;
  const previewScale = vertical ? 242 / cw : 242 / cw;
  const previewH = vertical ? 520 : Math.min(242, ch * previewScale);
  return <aside className={styles.rightPanel}>
    <div className={styles.rightTitle}>PRÉVIA NO INSTAGRAM</div>
    <div className={`${styles.phone} ${state.format === 'story' ? styles.storyPhone : ''} ${state.format === 'reel' ? styles.reelPhone : ''}`}>
      <div className={styles.notch} />
      {!vertical && <div className={styles.phoneHead}><span className={styles.avatar} /><strong>{brandName.replace(/^@/, '')}</strong><span style={{ marginLeft: 'auto' }}><MoreHorizontal size={14} /></span></div>}
      <div className={styles.phoneMedia} style={{ height: vertical ? 520 : previewH }}>
        <PreviewSurface surface={surface} cw={cw} ch={ch} scale={previewScale} />
        {state.format === 'story' && <div className={styles.storyChrome}><div className={styles.storyProgress} /><strong>{brandName.replace(/^@/, '')}</strong> · 2 min <X size={15} style={{ float: 'right' }} /><div style={{ position: 'absolute', bottom: 17, left: 12, right: 12, border: '1px solid #fff', borderRadius: 99, padding: 8 }}>Enviar mensagem…</div></div>}
        {state.format === 'reel' && <div className={styles.storyChrome}><div style={{ position: 'absolute', right: 12, bottom: 76, display: 'grid', gap: 13, textAlign: 'center' }}>♡<span style={{ fontSize: 8 }}>1,2k</span>◯<span style={{ fontSize: 8 }}>86</span>⌁</div><div style={{ position: 'absolute', left: 11, bottom: 24 }}><strong>@{brandName.replace(/^@/, '')}</strong> · Seguir<br />{state.caption || 'Sua legenda aparece aqui'}<br />♫ Áudio original</div></div>}
      </div>
      {!vertical && <><div className={styles.phoneActions}>♡ <MessageSquareText size={16} /> <Send size={16} /><span style={{ marginLeft: 'auto' }}>⌑</span></div><div className={styles.phoneCaption}>{!state.hideLikes && <strong>1.284 curtidas<br /></strong>}<strong>{brandName.replace(/^@/, '')}</strong> {state.caption || 'Sua legenda aparece aqui'}<br /><span style={{ color: '#00376b' }}>{state.hashtags}</span><br /><small>HÁ 2 MINUTOS</small></div></>}
    </div>
    <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--vc-faint)', lineHeight: 1.45 }}>Simulação aproximada. O corte final é processado pelo Instagram.</p>
  </aside>;
}

function PreviewSurface({ surface, cw, ch, scale }) {
  return <div className={styles.phoneSurface} style={{ width: cw, height: ch, transform: `scale(${scale})` }}>
    {surface.media && (surface.media.kind === 'video' ? <video className={styles.media} src={surface.media.url} muted autoPlay loop style={{ transform: `translate(${surface.bg.x}px,${surface.bg.y}px) scale(${surface.bg.scale}) rotate(${surface.bg.rot}deg)` }} /> : <img className={styles.media} src={surface.media.url} alt="" style={{ transform: `translate(${surface.bg.x}px,${surface.bg.y}px) scale(${surface.bg.scale}) rotate(${surface.bg.rot}deg)` }} />)}
    {surface.layers.map((layer) => !layer.hidden && <div key={layer.id} className={styles.layer} style={{ left: layer.x, top: layer.y, width: layer.w, height: layer.h, fontSize: layer.fs, fontWeight: layer.weight, fontStyle: layer.italic ? 'italic' : 'normal', textAlign: layer.align, fontFamily: layer.font, color: layer.color, background: layer.type === 'text' || layer.type === 'sticker' ? 'transparent' : layer.fill, borderRadius: layer.radius, opacity: layer.op, transform: `rotate(${layer.rot}deg)` }}>{layer.text}</div>)}
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
