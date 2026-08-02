'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, Bookmark, Check, Copy, ExternalLink, Heart, Loader2,
  RefreshCw, Search, Sparkles, X
} from 'lucide-react';
import { filterTrends, TREND_LABELS, buildTrendCarouselPrompt, selectTopTrends } from '@/lib/instagram-trends';
import { gptUrl } from '@/lib/carrossel-gpts';

const EMPTY_FILTERS = { query: '', category: '', profession: '', format: '', status: '' };

function readIds(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function dateLabel(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function sourceDateLabel(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function ToggleButton({ active, label, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${active ? 'border-accent bg-accent-tint text-accent-ink' : 'border-line bg-surface text-faint hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent">
        <option value="">Todos</option>
        {Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

function TrendModal({ trend, sources, brandName, onClose }) {
  const [copied, setCopied] = useState(false);
  const prompt = buildTrendCarouselPrompt(trend, brandName);
  const createUrl = gptUrl('carrossel', prompt);
  const evidence = sources.filter((source) => trend.sourceIds.includes(source.id));

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="trend-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-panel p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-bold text-accent-ink">{TREND_LABELS.priority[trend.priority]}</span>
            <h2 id="trend-dialog-title" className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{trend.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{trend.summary}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-faint hover:text-ink"><X size={17} /></button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-2 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Mecânica</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{trend.mechanic}</p>
          </div>
          <div className="rounded-2xl bg-surface-2 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Como executar</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{trend.howTo}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-line p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Fontes originais consultadas</p>
          <ul className="mt-3 space-y-2">
            {evidence.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm font-semibold text-accent hover:underline">
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {source.title}
                    <span className="block text-xs font-normal text-faint">{source.publisher}</span>
                    {sourceDateLabel(source.publishedAt) && <span className="block text-xs font-normal text-faint">{sourceDateLabel(source.publishedAt)}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Prompt preparado</p>
            <button type="button" onClick={copyPrompt} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-muted">{prompt}</p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href="/composer?format=carrossel" className="inline-flex items-center justify-center rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-surface-2">Abrir Composer</Link>
          {createUrl && <a href={createUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white">Criar carrossel com este tema <ArrowUpRight size={16} /></a>}
        </div>
        <p className="mt-2 text-right text-[11px] text-faint">O CTA abre o fluxo manual de carrosséis com o prompt preenchido. Revise antes de usar.</p>
      </section>
    </div>
  );
}

export function TrendsExplorer({ brandId, brandName }) {
  const storageBase = `socialhub:trends:${brandId}`;
  const [state, setState] = useState({ loading: true, error: '', trends: [], sources: [], researchedAt: '' });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [saved, setSaved] = useState(new Set());
  const [liked, setLiked] = useState(new Set());
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setSaved(readIds(`${storageBase}:saved`));
    setLiked(readIds(`${storageBase}:liked`));
  }, [storageBase]);

  async function load() {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.state !== 'ready') throw new Error(data.error || 'A pesquisa de tendências está indisponível.');
      setState({ loading: false, error: '', trends: data.trends || [], sources: data.sources || [], researchedAt: data.researchedAt || '' });
    } catch (error) {
      setState({ loading: false, error: error.message || 'A pesquisa de tendências está indisponível.', trends: [], sources: [], researchedAt: '' });
    }
  }

  useEffect(() => { load(); }, [brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(kind, id) {
    const key = `${storageBase}:${kind}`;
    const setter = kind === 'saved' ? setSaved : setLiked;
    setter((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(key, JSON.stringify([...next]));
      return next;
    });
  }

  const visible = useMemo(() => filterTrends(state.trends, {
    ...filters,
    savedOnly: libraryFilter === 'saved',
    savedIds: saved,
    likedOnly: libraryFilter === 'liked',
    likedIds: liked
  }), [state.trends, filters, libraryFilter, saved, liked]);
  const topThree = selectTopTrends(state.trends);
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  if (state.loading) {
    return <div className="grid min-h-[360px] place-items-center rounded-3xl border border-line bg-panel"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /><p className="mt-3 text-sm font-semibold text-ink">Consultando fontes atuais…</p><p className="mt-1 text-xs text-faint">Nada será exibido sem evidência verificável.</p></div></div>;
  }

  if (state.error) {
    return <div className="rounded-3xl border border-line bg-panel px-6 py-12 text-center"><Sparkles className="mx-auto h-7 w-7 text-faint" /><h2 className="mt-3 text-lg font-extrabold text-ink">Tendências indisponíveis agora</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted">{state.error}</p><button type="button" onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white"><RefreshCw size={15} /> Tentar novamente</button></div>;
  }

  return (
    <div className="space-y-7">
      <section aria-labelledby="top-trends-title">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">Curadoria qualitativa</p><h2 id="top-trends-title" className="mt-1 text-xl font-extrabold text-ink">Top 3 para considerar agora</h2><p className="mt-1 text-xs text-muted">Ordem editorial, sem nota, previsão ou métrica estimada.</p></div>
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent"><RefreshCw size={14} /> Atualizar fontes</button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {topThree.map((trend, index) => (
            <article key={trend.id} className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold text-accent">0{index + 1}</span><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">{TREND_LABELS.priority[trend.priority]}</span></div>
              <h3 className="mt-4 text-lg font-extrabold leading-snug text-ink">{trend.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{trend.summary}</p>
              <button type="button" onClick={() => setSelected(trend)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-accent">Ver mecânica e fontes <ArrowUpRight size={14} /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-panel p-4 sm:p-5" aria-label="Filtros de tendências">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <label className="space-y-1 lg:col-span-2"><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Buscar</span><span className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-faint" /><input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Tema, mecânica ou aplicação" className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-faint focus:border-accent" /></span></label>
          <FilterSelect label="Categoria" value={filters.category} options={TREND_LABELS.category} onChange={(value) => updateFilter('category', value)} />
          <FilterSelect label="Profissão" value={filters.profession} options={TREND_LABELS.profession} onChange={(value) => updateFilter('profession', value)} />
          <FilterSelect label="Formato" value={filters.format} options={TREND_LABELS.format} onChange={(value) => updateFilter('format', value)} />
          <FilterSelect label="Status" value={filters.status} options={TREND_LABELS.status} onChange={(value) => updateFilter('status', value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar biblioteca">
          {[['all', 'Todos'], ['saved', 'Salvos'], ['liked', 'Curtidos']].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={libraryFilter === value} onClick={() => setLibraryFilter(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${libraryFilter === value ? 'border-accent bg-accent-tint text-accent-ink' : 'border-line bg-surface text-muted'}`}>{label}</button>
          ))}
        </div>
      </section>

      <section aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-extrabold text-ink">Biblioteca de tendências</h2><p className="text-xs text-faint">{visible.length} {visible.length === 1 ? 'resultado' : 'resultados'} · pesquisa de {dateLabel(state.researchedAt)}</p></div>
          <div className="flex gap-1 rounded-xl border border-line bg-surface p-1" role="group" aria-label="Modo de visualização">
            <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'grid' ? 'bg-accent text-white' : 'text-muted'}`}>Grade</button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === 'list' ? 'bg-accent text-white' : 'text-muted'}`}>Lista</button>
          </div>
        </div>
        {visible.length && view === 'grid' ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((trend) => (
          <article key={trend.id} className="flex min-h-[260px] flex-col rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap gap-1.5"><span className="rounded-md bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">{TREND_LABELS.format[trend.format]}</span><span className="rounded-md bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">{TREND_LABELS.status[trend.status]}</span></div><div className="flex gap-1.5"><ToggleButton active={liked.has(trend.id)} label={liked.has(trend.id) ? 'Remover curtida' : 'Curtir localmente'} onClick={() => toggle('liked', trend.id)}><Heart size={15} fill={liked.has(trend.id) ? 'currentColor' : 'none'} /></ToggleButton><ToggleButton active={saved.has(trend.id)} label={saved.has(trend.id) ? 'Remover dos salvos' : 'Salvar localmente'} onClick={() => toggle('saved', trend.id)}><Bookmark size={15} fill={saved.has(trend.id) ? 'currentColor' : 'none'} /></ToggleButton></div></div>
            <h3 className="mt-4 text-base font-extrabold leading-snug text-ink">{trend.title}</h3><p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">{trend.summary}</p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-5"><span className="text-[11px] font-semibold text-faint">{TREND_LABELS.category[trend.category]} · {TREND_LABELS.profession[trend.profession]}</span><button type="button" onClick={() => setSelected(trend)} className="text-xs font-bold text-accent">Detalhes</button></div>
          </article>
        ))}</div> : null}
        {visible.length && view === 'list' ? <div role="list" aria-label="Tendências em lista" className="mt-4 space-y-2">{visible.map((trend) => (
          <article role="listitem" key={trend.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-1.5"><span className="rounded-md bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">{TREND_LABELS.format[trend.format]}</span><span className="rounded-md bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">{TREND_LABELS.status[trend.status]}</span></div><h3 className="mt-2 font-extrabold text-ink">{trend.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted">{trend.summary}</p></div>
            <div className="flex shrink-0 items-center gap-2"><ToggleButton active={liked.has(trend.id)} label={liked.has(trend.id) ? 'Remover curtida' : 'Curtir localmente'} onClick={() => toggle('liked', trend.id)}><Heart size={15} fill={liked.has(trend.id) ? 'currentColor' : 'none'} /></ToggleButton><ToggleButton active={saved.has(trend.id)} label={saved.has(trend.id) ? 'Remover dos salvos' : 'Salvar localmente'} onClick={() => toggle('saved', trend.id)}><Bookmark size={15} fill={saved.has(trend.id) ? 'currentColor' : 'none'} /></ToggleButton><button type="button" onClick={() => setSelected(trend)} className="px-2 text-xs font-bold text-accent">Detalhes</button></div>
          </article>
        ))}</div> : null}
        {!visible.length ? <div className="mt-4 rounded-2xl border border-dashed border-line py-12 text-center text-sm text-muted">Nenhuma tendência corresponde aos filtros escolhidos.</div> : null}
      </section>

      {selected && <TrendModal trend={selected} sources={state.sources} brandName={brandName} onClose={() => setSelected(null)} />}
    </div>
  );
}
