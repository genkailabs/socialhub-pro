'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coins, GripVertical, Pencil, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatLabel } from '@/lib/content-production';
import { availablePlanningItemActions, itemDetails } from '@/components/planning/PlanningSummary';
import { PLANNING_COLUMNS, columnForPlanningItem, groupPlanningItemsByColumn } from '@/lib/planning-status';
import { planningColumnDragState, planningDropAction, planningDropTargets } from '@/lib/planning-board';
import { planTimeHasPassed } from '@/lib/planning-times';
import { cn } from '@/lib/utils';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const STATUS = { idea: 'Ideia', approved: 'Aprovado', in_production: 'Em produção', ready: 'Pronto', rejected: 'Removido' };
const STATUS_TONE = { idea: 'muted', approved: 'success', in_production: 'accent', ready: 'success' };

// Mouse arrasta depois de 6px; no toque o gesto só vira arrasto depois de uma
// pressão longa, senão rolar a coluna com o dedo arrastaria o card junto.
const DRAG_THRESHOLD = 6;
const TOUCH_HOLD_MS = 320;
const EDGE_ZONE = 84;   // px da borda do trilho onde o auto-scroll liga
const EDGE_STEP = 16;   // px por quadro

export function dataCurta(iso) {
  if (!iso) return 'Sem data';
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return `${DIAS[date.getUTCDay()]}, ${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function horarioSugerido(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || '')) ? time : 'A definir';
}

// Selo pequeno junto de cada ação que gasta IA, para o custo ficar visível no
// momento da decisão (RF-04). Sem UI nova grande — apenas o aviso.
export function CreditHint({ className = '', label = 'usa 1 crédito' }) {
  return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold text-muted ${className}`}><Coins className="h-3 w-3 shrink-0" aria-hidden="true" />{label}</span>;
}

function StatusBadge({ status }) {
  // `shrink-0` + `whitespace-nowrap`: dentro do card estreito do quadro, "Em
  // produção" quebrava em duas linhas e desalinhava o cabeçalho.
  return <Badge className="shrink-0 whitespace-nowrap" tone={STATUS_TONE[status] || 'muted'}>{STATUS[status] || status}</Badge>;
}

function CardHeader({ item }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">{formatLabel(item.format)}</span>
          <span className="text-[11px] text-muted">• {dataCurta(item.date)}</span>
        </div>
        <h4 className="mt-2 text-sm font-semibold leading-snug text-ink">{item.title || item.topic}</h4>
        <p className="mt-1 text-[11px] text-muted">Pilar: {item.pillar || 'Não informado'}</p>
      </div>
      <StatusBadge status={item.status} />
    </div>
  );
}

function PlanningItemCard({ item, busy, dragging, movable, onApprove, onEdit, onProduce, onRemove, onReplace, onDragStart, onKeyMove }) {
  const [expanded, setExpanded] = useState(false);
  const details = itemDetails(item);
  const actions = availablePlanningItemActions(item);
  const isBusy = busy === item.id;
  const primaryAction = ['approve', 'produce', 'viewContent'].some((action) => actions.includes(action));
  const secondaryActions = ['edit', 'replace', 'remove'].filter((action) => actions.includes(action));
  const creditActions = [actions.includes('produce') && 'Gerar conteúdo', actions.includes('replace') && 'Trocar'].filter(Boolean);
  // Só avisa em card que o usuário ainda pode reagendar: em "Pronto"/publicado o
  // horário passado é história, não pendência. A conta depende do relógio, então
  // só roda depois de montar — no servidor daria hidratação divergente.
  const reagendavel = actions.includes('edit');
  const [vencido, setVencido] = useState(false);
  useEffect(() => {
    setVencido(reagendavel && planTimeHasPassed(item.date, item.suggested_time));
  }, [reagendavel, item.date, item.suggested_time]);

  return (
    <article
      data-card-id={item.id}
      tabIndex={movable ? 0 : undefined}
      aria-roledescription={movable ? 'cartão arrastável' : undefined}
      onPointerDown={movable ? (event) => onDragStart(event, item) : undefined}
      onKeyDown={movable ? (event) => onKeyMove(event, item) : undefined}
      className={cn(
        'group/card relative rounded-2xl border border-line bg-surface-2 p-3.5 transition-[opacity,box-shadow,border-color] duration-150',
        movable && 'cursor-grab touch-pan-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 hover:border-line-strong',
        dragging && 'opacity-35'
      )}
    >
      {movable && (
        <GripVertical
          aria-hidden="true"
          className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-faint opacity-0 transition-opacity duration-150 group-hover/card:opacity-100"
        />
      )}
      <CardHeader item={item} />
      {/* `flex` (não `inline-flex`): como <p> inline-level, esta linha colava no
          botão "Ver detalhes" logo abaixo, sem espaço entre os dois textos. */}
      {/* O horário mostrado é o que está gravado — inclusive quando o usuário o
          escolheu à mão. Se já passou, o card diz; trocar em silêncio fazia a
          edição parecer que não pegou. */}
      <p className={cn('mt-2 flex flex-wrap items-center gap-1 text-[11px] font-semibold', vencido ? 'text-warning' : 'text-accent')}>
        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />Melhor horario: {horarioSugerido(item.suggested_time)}
        {vencido && <span className="font-normal text-muted">— já passou, edite para reagendar</span>}
      </p>

      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-ink">Ver detalhes {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}</button>
      {expanded && <dl className="mt-3 grid gap-2 rounded-xl bg-surface p-3 text-xs"><div><dt className="font-bold text-ink">Objetivo</dt><dd className="mt-0.5 text-muted">{details.objective}</dd></div><div><dt className="font-bold text-ink">Resumo</dt><dd className="mt-0.5 text-muted">{details.summary}</dd></div><div><dt className="font-bold text-ink">Gancho</dt><dd className="mt-0.5 text-muted">{details.hook}</dd></div><div className="grid grid-cols-2 gap-2"><div><dt className="font-bold text-ink">CTA</dt><dd className="mt-0.5 text-muted">{details.cta}</dd></div><div><dt className="font-bold text-ink">Público</dt><dd className="mt-0.5 text-muted">{details.audience}</dd></div></div><div><dt className="font-bold text-ink">Duração</dt><dd className="mt-0.5 text-muted">{details.duration}</dd></div></dl>}

      {/* Uma ação principal ocupa a linha inteira e as secundárias ficam numa
          linha compacta abaixo. Antes as quatro dividiam a mesma linha e
          quebravam no meio do grupo, apertando o card. O custo continua visível
          na hora da decisão (RF-04), só que numa linha própria em vez de roubar
          largura do botão. */}
      <div className="mt-3 space-y-2">
        {primaryAction && <div className="flex">
          {actions.includes('approve') && <Button size="sm" className="w-full" disabled={isBusy} onClick={() => onApprove(item.id)}><Check className="h-3.5 w-3.5" aria-hidden="true" />Aprovar</Button>}
          {actions.includes('produce') && <Button size="sm" className="w-full" disabled={isBusy} onClick={() => onProduce(item.id)}><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />{isBusy ? 'Gerando...' : 'Gerar conteúdo'}</Button>}
          {actions.includes('viewContent') && <Link href={`/content/${item.post_id}/review`} className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-full bg-accent/10 px-3 text-xs font-bold text-accent transition-colors hover:bg-accent/15">Ver conteúdo</Link>}
        </div>}
        {secondaryActions.length > 0 && <div className="flex flex-wrap gap-1.5">
          {actions.includes('edit') && <Button size="sm" variant="ghost" className="gap-1.5 px-2.5" disabled={isBusy} onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</Button>}
          {actions.includes('replace') && <Button size="sm" variant="ghost" className="gap-1.5 px-2.5" disabled={isBusy} onClick={() => onReplace(item)}><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />Trocar</Button>}
          {actions.includes('remove') && <Button size="sm" variant="ghost" className="gap-1.5 px-2.5" disabled={isBusy} onClick={() => onRemove(item)}><X className="h-3.5 w-3.5" aria-hidden="true" />Remover</Button>}
        </div>}
        {creditActions.length > 0 && <CreditHint label={`${creditActions.join(' e ')} ${creditActions.length > 1 ? 'usam' : 'usa'} 1 crédito`} />}
      </div>
    </article>
  );
}

// O card que segue o cursor. Só o cabeçalho: durante o arrasto o que importa é
// reconhecer qual tema está na mão, não reler o card inteiro.
function DragGhost({ drag, ghostRef }) {
  return createPortal(
    // O transform da caixa externa é escrito direto pelo ponteiro (sem
    // re-render por quadro); a inclinação fica numa caixa interna para os dois
    // não brigarem pela mesma propriedade.
    <div
      ref={ghostRef}
      aria-hidden="true"
      style={{ width: drag.width, transform: `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0)` }}
      className="pointer-events-none fixed left-0 top-0 z-50 origin-top-left"
    >
      <div className="rounded-2xl border border-accent/40 bg-surface-2 p-3.5 shadow-modal motion-safe:rotate-[1.5deg]">
        <CardHeader item={drag.item} />
      </div>
    </div>,
    document.body
  );
}

export function PlanningBoard({ items, busy, onApprove, onEdit, onProduce, onRemove, onReplace, onDropAction }) {
  const grupos = groupPlanningItemsByColumn(items);
  const scrollerRef = useRef(null);
  const ghostRef = useRef(null);
  const gesture = useRef(null);
  const autoScroll = useRef({ direction: 0, frame: 0 });

  const [drag, setDrag] = useState(null);      // { item, width, offsetX, offsetY }
  const [over, setOver] = useState(null);      // coluna sob o ponteiro
  const [edges, setEdges] = useState({ left: false, right: false });
  const [announcement, setAnnouncement] = useState('');

  const updateEdges = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setEdges({ left: node.scrollLeft > 4, right: node.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    updateEdges();
    const node = scrollerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    return () => observer.disconnect();
  }, [updateEdges, items.length]);

  const stopAutoScroll = useCallback(() => {
    if (autoScroll.current.frame) cancelAnimationFrame(autoScroll.current.frame);
    autoScroll.current = { direction: 0, frame: 0 };
  }, []);

  const finish = useCallback(() => {
    const current = gesture.current;
    if (current?.holdTimer) clearTimeout(current.holdTimer);
    gesture.current = null;
    stopAutoScroll();
    document.body.style.removeProperty('user-select');
    document.body.style.removeProperty('cursor');
    setDrag(null);
    setOver(null);
  }, [stopAutoScroll]);

  useEffect(() => finish, [finish]);

  const placeGhost = useCallback((x, y) => {
    const current = gesture.current;
    if (!ghostRef.current || !current) return;
    ghostRef.current.style.transform = `translate3d(${x - current.offsetX}px, ${y - current.offsetY}px, 0)`;
  }, []);

  const columnAt = useCallback((x, y) => {
    const element = document.elementFromPoint(x, y);
    return element?.closest('[data-column-key]')?.dataset.columnKey || null;
  }, []);

  // Perto das bordas do trilho o quadro rola sozinho: sem isso é impossível
  // levar um card para uma coluna que está fora da tela.
  const runAutoScroll = useCallback(() => {
    const node = scrollerRef.current;
    const current = gesture.current;
    if (!node || !current || !autoScroll.current.direction) return;
    node.scrollLeft += autoScroll.current.direction * EDGE_STEP;
    setOver(columnAt(current.x, current.y));
    updateEdges();
    autoScroll.current.frame = requestAnimationFrame(runAutoScroll);
  }, [columnAt, updateEdges]);

  const updateAutoScroll = useCallback((x) => {
    const node = scrollerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const max = node.scrollWidth - node.clientWidth;
    let direction = 0;
    if (x < rect.left + EDGE_ZONE && node.scrollLeft > 0) direction = -1;
    else if (x > rect.right - EDGE_ZONE && node.scrollLeft < max) direction = 1;
    if (direction === autoScroll.current.direction) return;
    stopAutoScroll();
    autoScroll.current.direction = direction;
    if (direction) autoScroll.current.frame = requestAnimationFrame(runAutoScroll);
  }, [runAutoScroll, stopAutoScroll]);

  const activate = useCallback((x, y) => {
    const current = gesture.current;
    if (!current || current.active) return;
    current.active = true;
    current.offsetX = x - current.rect.left;
    current.offsetY = y - current.rect.top;
    document.body.style.setProperty('user-select', 'none');
    document.body.style.setProperty('cursor', 'grabbing');
    setDrag({ item: current.item, width: current.rect.width, x, y, offsetX: current.offsetX, offsetY: current.offsetY });
    setOver(columnAt(x, y));
  }, [columnAt]);

  const handlePointerDown = useCallback((event, item) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // Botões, links e campos dentro do card continuam clicáveis: o arrasto só
    // começa quando o gesto nasce numa área "vazia" do card.
    if (event.target.closest('button, a, input, textarea, select, [role="button"]')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    gesture.current = {
      item,
      rect,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetX: 0,
      offsetY: 0,
      active: false,
      holdTimer: null
    };

    if (event.pointerType !== 'mouse') {
      gesture.current.holdTimer = setTimeout(() => {
        const current = gesture.current;
        if (current) activate(current.x, current.y);
      }, TOUCH_HOLD_MS);
    }
  }, [activate]);

  useEffect(() => {
    function onMove(event) {
      const current = gesture.current;
      if (!current) return;
      current.x = event.clientX;
      current.y = event.clientY;
      const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);

      if (!current.active) {
        // No toque, mover antes da pressão longa significa rolar a lista.
        if (event.pointerType !== 'mouse') { if (distance > 10) finish(); return; }
        if (distance < DRAG_THRESHOLD) return;
        activate(event.clientX, event.clientY);
      }

      event.preventDefault();
      placeGhost(event.clientX, event.clientY);
      setOver(columnAt(event.clientX, event.clientY));
      updateAutoScroll(event.clientX);
    }

    function onUp() {
      const current = gesture.current;
      if (!current) return;
      const { item, active } = current;
      const target = active ? columnAt(current.x, current.y) : null;
      finish();
      if (active && target) {
        const action = planningDropAction(item, target);
        if (action) onDropAction(item, action);
      }
    }

    function onKey(event) {
      if (event.key === 'Escape' && gesture.current) { event.preventDefault(); finish(); }
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('keydown', onKey);
    };
  }, [activate, columnAt, finish, onDropAction, placeGhost, updateAutoScroll]);

  // Alternativa de teclado ao arrasto: Ctrl/Cmd + ← → move o card em foco para
  // a coluna vizinha permitida. Arrastar não pode ser o único caminho.
  const handleKeyMove = useCallback((event, item) => {
    if (!(event.ctrlKey || event.metaKey) || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const order = PLANNING_COLUMNS.map((column) => column.key);
    const targets = planningDropTargets(item);
    const from = order.indexOf(columnForPlanningItem(item));
    const destination = step > 0
      ? targets.find((key) => order.indexOf(key) > from)
      : [...targets].reverse().find((key) => order.indexOf(key) < from);
    if (!destination) return;
    event.preventDefault();
    const action = planningDropAction(item, destination);
    if (action) {
      const coluna = PLANNING_COLUMNS.find((column) => column.key === destination);
      setAnnouncement(`${item.title || item.topic} movido para ${coluna?.title || destination}.`);
      onDropAction(item, action);
    }
  }, [onDropAction]);

  function scrollByColumn(direction) {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.6, 280), behavior: 'smooth' });
  }

  const draggingItem = drag?.item || null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          Arraste um card para mover de etapa — ou, com o card em foco, use <kbd className="rounded border border-line bg-surface-2 px-1 font-sans text-[10px] font-semibold text-ink-2">Ctrl</kbd> + <kbd className="rounded border border-line bg-surface-2 px-1 font-sans text-[10px] font-semibold text-ink-2">←</kbd> <kbd className="rounded border border-line bg-surface-2 px-1 font-sans text-[10px] font-semibold text-ink-2">→</kbd>.
        </p>
        {(edges.left || edges.right) && (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => scrollByColumn(-1)} disabled={!edges.left} aria-label="Ver etapas anteriores" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-35"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => scrollByColumn(1)} disabled={!edges.right} aria-label="Ver próximas etapas" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-35"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        )}
      </div>

      <div className="relative">
        {/* As bordas esmaecidas dizem que o quadro continua para o lado — sem
            elas a última coluna parecia cortada por engano. */}
        {edges.left && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-app to-transparent" />}
        {edges.right && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-app to-transparent" />}

        {/* Cada etapa tem altura fixa e rola por dentro: a página para de crescer
            junto com a coluna mais cheia e a barra horizontal fica logo abaixo
            do quadro, não no fim da página. */}
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="flex snap-x snap-proximity gap-3 overflow-x-auto overflow-y-hidden scroll-px-1 px-0.5 pb-3 [scrollbar-color:rgb(var(--c-line-strong))_transparent] [scrollbar-width:thin]"
        >
          {PLANNING_COLUMNS.map((column) => {
            const columnItems = grupos[column.key] || [];
            const state = planningColumnDragState(column.key, draggingItem);
            const isOver = state === 'target' && over === column.key;
            return (
              <section
                key={column.key}
                data-column-key={column.key}
                aria-label={`${column.title} — ${columnItems.length} ${columnItems.length === 1 ? 'item' : 'itens'}`}
                className={cn(
                  'flex h-[min(70vh,44rem)] w-[19rem] min-w-[15.5rem] flex-1 shrink-0 snap-start flex-col rounded-2xl border transition-colors duration-150',
                  state === 'blocked' ? 'border-line bg-surface opacity-50' : 'border-line bg-surface',
                  state === 'target' && 'border-accent/45',
                  isOver && 'border-accent bg-accent-tint/70'
                )}
              >
                <header className="flex shrink-0 items-start justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-ink">{column.title}</h3>
                    <p className="mt-0.5 text-[11px] text-muted">{column.hint}</p>
                  </div>
                  <span className="font-mono text-[11px] font-bold tabular-nums text-muted">{columnItems.length}</span>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
                  {columnItems.map((item) => (
                    <PlanningItemCard
                      key={item.id}
                      item={item}
                      busy={busy}
                      dragging={draggingItem?.id === item.id}
                      movable={planningDropTargets(item).length > 0}
                      onApprove={onApprove}
                      onEdit={onEdit}
                      onProduce={onProduce}
                      onReplace={onReplace}
                      onRemove={onRemove}
                      onDragStart={handlePointerDown}
                      onKeyMove={handleKeyMove}
                    />
                  ))}
                  {isOver && (
                    <p className="rounded-2xl border border-dashed border-accent/60 py-4 text-center text-xs font-semibold text-accent">
                      Soltar aqui: {planningDropAction(draggingItem, column.key)?.label}
                    </p>
                  )}
                  {!columnItems.length && !isOver && <p className="py-5 text-center text-xs text-muted">Nada aqui ainda.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
      {drag && <DragGhost drag={drag} ghostRef={ghostRef} />}
    </div>
  );
}
