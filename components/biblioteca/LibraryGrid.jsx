'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

/** Busca sem acento: quem digita "citacao" quer achar "Citação". */
function fold(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const TONES = { media: 'bg-cyan/25', strong: 'bg-ink/70', soft: 'bg-ink/35', accent: 'bg-accent/60' };

/** Miniatura de layout salvo, montada com os blocos de lib/layouts/thumb.js. */
function LayoutThumb({ blocks }) {
  return (
    <span aria-hidden="true" className="relative block h-full w-full bg-surface-3">
      {blocks.map((block) => (
        <span
          key={block.key}
          className={`absolute rounded-[2px] ${TONES[block.tone] || TONES.soft}`}
          style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.w}%`, height: `${block.h}%` }}
        />
      ))}
    </span>
  );
}

/** Que papel cada slide da prévia cumpre. A ordem casa com `previewSlides`. */
const PAPEL_DO_SLIDE = ['Capa', 'Miolo 1', 'Miolo 2', 'Miolo 3', 'Fecho'];

/**
 * Prévia dos slides de um template, sem abrir o Studio.
 *
 * Existe porque a grade mostra só a capa, e capa não prova nada: layout que
 * parece diferente na capa e repete a mesma caixa no miolo é variação de cor
 * com nome novo. Aqui dá para passar pelos cinco slides antes de escolher.
 */
function PreviewModal({ card, onClose }) {
  const slides = card?.previewSlides || [];
  const [index, setIndex] = useState(0);

  // Cada template abre no começo: manter o índice do template anterior faria a
  // prévia abrir no meio de um layout que a pessoa nunca viu.
  useEffect(() => { setIndex(0); }, [card?.id]);

  const go = useCallback((delta) => {
    setIndex((current) => Math.min(Math.max(current + delta, 0), Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  useEffect(() => {
    if (!card) return undefined;
    function onKeyDown(event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [card, go]);

  if (!card) return null;

  return (
    <Modal open onClose={onClose} labelledBy="previa-titulo" className="max-w-lg">
      <div className="flex items-start gap-3 border-b border-line p-4">
        <div className="min-w-0 flex-1">
          <h2 id="previa-titulo" className="truncate text-[15px] font-bold text-ink">{card.name}</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">{card.blurb}</p>
          {card.reference && (
            <p className="mt-1 text-[10.5px] text-faint">Derivado de: {card.reference}</p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar prévia" className="shrink-0 rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      {slides.length === 0 ? (
        <p className="px-6 py-14 text-center text-[12.5px] text-muted">
          O Studio não respondeu agora, então não há prévia para mostrar. O layout continua valendo — clique em &ldquo;Usar este layout&rdquo;.
        </p>
      ) : (
        <div className="p-4">
          {/* A arte encolhe no celular para as setas caberem fora dela: a 340px
              elas ficariam além da borda do modal e sumiriam da tela. */}
          <div className="relative mx-auto w-full max-w-[228px] sm:max-w-[340px]">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
              {/* Os cinco ficam montados: trocar de slide não pode piscar
                  enquanto o PNG seguinte baixa. O de fora só some da vista. */}
              <div className="relative aspect-[4/5]">
                {slides.map((url, position) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={`${card.name} — ${PAPEL_DO_SLIDE[position] || `slide ${position + 1}`}`}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity ${position === index ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden={position === index ? undefined : 'true'}
                  />
                ))}
              </div>
            </div>

            <ArrowButton side="left" disabled={index === 0} onClick={() => go(-1)} />
            <ArrowButton side="right" disabled={index === slides.length - 1} onClick={() => go(1)} />
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            {slides.map((url, position) => (
              <button
                key={url}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={PAPEL_DO_SLIDE[position] || `Slide ${position + 1}`}
                aria-current={position === index ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all ${position === index ? 'w-6 bg-accent' : 'w-1.5 bg-line hover:bg-muted'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[11.5px] font-semibold text-muted">
            {PAPEL_DO_SLIDE[index] || `Slide ${index + 1}`}
            <span className="font-normal text-faint"> · {index + 1} de {slides.length}</span>
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-line p-4">
        <button type="button" onClick={onClose} className="rounded-xl border border-line px-3.5 py-2 text-[12.5px] font-semibold text-muted hover:text-ink">
          Fechar
        </button>
        <Link href={card.href} className="rounded-xl bg-accent px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-accent-soft">
          Usar este layout
        </Link>
      </div>
    </Modal>
  );
}

function ArrowButton({ side, disabled, onClick }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Slide anterior' : 'Próximo slide'}
      // Fora da arte, não em cima dela: a -12px a seta cobria justamente o
      // canto onde os layouts editoriais assinam e escrevem o olho.
      className={`absolute top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface p-2 shadow-sm transition-opacity ${
        side === 'left' ? '-left-11' : '-right-11'
      } ${disabled ? 'pointer-events-none opacity-0' : 'opacity-100 hover:border-accent/50'}`}
    >
      <Icon className="h-4 w-4 text-ink" />
    </button>
  );
}

/**
 * Grade da Biblioteca criativa: templates de carrossel do Studio e layouts que
 * a pessoa salvou, na mesma grade.
 *
 * Os filtros são uma coluna estreita à esquerda e não um modal: escolher
 * direção visual é uma decisão de comparação, e comparar exige ver a grade
 * mudar enquanto se filtra.
 */
export function LibraryGrid({ cards, objetivos, offline = false, objetivoInicial = null }) {
  const [objetivo, setObjetivo] = useState(objetivoInicial);
  const [origem, setOrigem] = useState('todos');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(null);

  const visible = useMemo(() => cards.filter((card) => {
    if (origem !== 'todos' && card.kind !== origem) return false;
    // Layout salvo não tem objetivo — ele é forma, não intenção. Filtrar por
    // objetivo esconde os layouts, e isso é honesto: eles não respondem à
    // pergunta que o filtro faz.
    if (objetivo && !card.objetivos?.includes(objetivo)) return false;
    if (!query.trim()) return true;
    const term = fold(query);
    return fold(card.name).includes(term)
      || fold(card.blurb).includes(term)
      || fold(card.reference).includes(term);
  }), [cards, objetivo, origem, query]);

  const counts = {
    template: cards.filter((card) => card.kind === 'template').length,
    layout: cards.filter((card) => card.kind === 'layout').length
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Objetivo">
        <ObjetivoChip active={!objetivo} onClick={() => setObjetivo(null)} label="Todos os objetivos" resumo="A biblioteca inteira." />
        {objetivos.map((item) => (
          <ObjetivoChip
            key={item.id}
            active={objetivo === item.id}
            onClick={() => setObjetivo(objetivo === item.id ? null : item.id)}
            label={item.label}
            resumo={item.resumo}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar estilo"
              aria-label="Buscar estilo"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-faint"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" className="text-faint hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Origem</p>
          <div className="mt-2 space-y-1">
            <FilterRow active={origem === 'todos'} onClick={() => setOrigem('todos')} label="Tudo" count={cards.length} />
            <FilterRow active={origem === 'template'} onClick={() => setOrigem('template')} label="Templates" count={counts.template} />
            <FilterRow active={origem === 'layout'} onClick={() => setOrigem('layout')} label="Meus layouts" count={counts.layout} />
          </div>

          {(objetivo || origem !== 'todos' || query) && (
            <button
              type="button"
              onClick={() => { setObjetivo(null); setOrigem('todos'); setQuery(''); }}
              className="mt-5 w-full rounded-xl border border-line py-2 text-[11.5px] font-semibold text-muted hover:text-ink"
            >
              Limpar filtros
            </button>
          )}
        </aside>

        <div>
          {offline && (
            <p className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-[12px] text-ink">
              O Studio não respondeu agora: os templates aparecem sem prévia. O nome e o link continuam valendo.
            </p>
          )}

          {visible.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line px-6 py-16 text-center text-[13px] text-muted">
              Nada com esses filtros. Tente limpar a busca ou trocar o objetivo.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((card) => (
                <li key={card.id} className="group overflow-hidden rounded-3xl border border-line bg-surface transition-colors hover:border-accent/50">
                  {/* A arte é um botão, não um link: o primeiro gesto de quem
                      escolhe direção visual é olhar mais de perto, e abrir o
                      Composer para isso obriga a voltar para comparar. */}
                  <button
                    type="button"
                    onClick={card.kind === 'template' ? () => setPreview(card) : undefined}
                    disabled={card.kind !== 'template'}
                    aria-label={card.kind === 'template' ? `Ver os slides de ${card.name}` : undefined}
                    className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-2 text-left disabled:cursor-default"
                  >
                    {card.kind === 'layout' ? (
                      <LayoutThumb blocks={card.blocks || []} />
                    ) : card.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.previewUrl} alt={`Capa do template ${card.name}`} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[11.5px] text-faint">Prévia indisponível</span>
                    )}
                    {/* O selo caía em cima do topo da arte — no template
                        editorial ele cobria o "EDIÇÃO · 01" e parecia texto
                        riscado. Este véu separa a etiqueta da interface da
                        arte que está atrás dela, e serve para arte clara e
                        escura. */}
                    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/55 via-black/25 to-transparent" />
                    {/* À direita porque é à esquerda que os templates escrevem
                        ("EDIÇÃO · 01", aspas, número da lista): o selo caía
                        justamente ali e a arte parecia riscada. */}
                    <span className="absolute right-3 top-3">
                      <Badge tone={card.kind === 'layout' ? 'muted' : 'accent'}>
                        {card.kind === 'layout' ? 'MEU LAYOUT' : (card.funnelStage || 'TEMPLATE').toUpperCase()}
                      </Badge>
                    </span>
                    {card.kind === 'template' && (
                      // A dica só aparece no hover e no foco do teclado: fixa,
                      // ela taparia a arte que a pessoa veio ver.
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/75 to-transparent py-3 text-[11.5px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        Ver os slides
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-3 border-t border-line p-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-ink">{card.name}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-muted">{card.blurb}</span>
                      {/* De onde a planta veio. Escolher direção visual sem
                          saber a origem do padrão é escolher no escuro — e
                          esta linha é o que separa biblioteca de vitrine. */}
                      {card.reference && (
                        <span className="mt-1 block truncate text-[10.5px] text-faint" title={card.reference}>
                          Derivado de: {card.reference}
                        </span>
                      )}
                    </span>
                    <Link
                      href={card.href}
                      className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-accent-soft"
                    >
                      Usar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <PreviewModal card={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function ObjetivoChip({ active, onClick, label, resumo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-[168px] flex-1 rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? 'border-accent bg-accent/12' : 'border-line bg-surface hover:border-accent/40'
      }`}
    >
      <span className={`block text-[13px] font-bold ${active ? 'text-accent-ink' : 'text-ink'}`}>{label}</span>
      <span className="mt-0.5 block text-[11px] text-muted">{resumo}</span>
    </button>
  );
}

function FilterRow({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors ${
        active ? 'bg-accent/15 font-semibold text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {label}
      <span className="font-mono text-[11px] tabular-nums">{count}</span>
    </button>
  );
}
