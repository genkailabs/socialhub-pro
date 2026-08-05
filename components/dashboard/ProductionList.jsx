'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ContentThumbnail } from '@/components/ui/ContentThumbnail';
import { relativeFromNow, scheduleLabel } from '@/lib/relative-time';

// Cada aba é um estado real da tabela `posts`. "Revisão" junta o que espera
// alguém — aprovação do cliente e retorno — porque para quem olha o quadro é a
// mesma espera.
const TABS = [
  { id: 'todos', label: 'Todos', match: () => true },
  { id: 'rascunhos', label: 'Rascunhos', match: (post) => post.status === 'draft' },
  { id: 'revisao', label: 'Revisão', match: (post) => post.status === 'waiting_approval' },
  { id: 'agendados', label: 'Agendados', match: (post) => post.status === 'scheduled' || post.status === 'ready_to_post' }
];

const STATUS_BADGE = {
  draft: { label: 'Rascunho', tone: 'muted' },
  waiting_approval: { label: 'Revisão', tone: 'warning' },
  scheduled: { label: 'Agendado', tone: 'accent' },
  ready_to_post: { label: 'Pronto p/ postar', tone: 'accent' },
  published: { label: 'Publicado', tone: 'success' },
  posted_manually: { label: 'Você postou', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
  error: { label: 'Erro', tone: 'danger' }
};

// Quanto do caminho até publicar cada estado representa. É régua de leitura,
// não porcentagem calculada: a barra existe para o olho ordenar a lista.
const PROGRESS = {
  draft: 0.35,
  waiting_approval: 0.6,
  scheduled: 0.85,
  ready_to_post: 0.85,
  published: 1,
  posted_manually: 1
};

export function ProductionList({ posts = [] }) {
  const [tab, setTab] = useState('todos');
  const visible = posts.filter(TABS.find((item) => item.id === tab)?.match || (() => true));

  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">Produção</p>
          <h2 className="mt-1 text-[19px] font-bold leading-tight tracking-tight text-ink">Conteúdos em andamento</h2>
        </div>
        <Link href="/calendar" className="text-[12.5px] font-semibold text-accent-ink hover:underline">Ver todos</Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="Filtrar por estado">
        {TABS.map((item) => {
          const count = posts.filter(item.match).length;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                active ? 'bg-accent/15 text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {item.label}
              <span className={`font-mono text-[11px] tabular-nums ${active ? 'text-accent-ink' : 'text-faint'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <ul className="mt-3 space-y-2">
        {visible.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[12.5px] text-muted">
            {posts.length === 0
              ? 'Nada em produção ainda. Comece uma criação e ela aparece aqui.'
              : 'Nenhum conteúdo neste estado.'}
          </li>
        )}
        {visible.slice(0, 6).map((post) => {
          const badge = STATUS_BADGE[post.status] || STATUS_BADGE.draft;
          return (
            <li key={post.id}>
              <Link
                href={post.href}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-2.5 transition-colors hover:border-accent/40"
              >
                <ContentThumbnail id={post.id} title={post.title} imageUrl={post.mediaUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{post.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{post.formatLabel}</span>
                </span>
                <Badge tone={badge.tone} className="shrink-0">{badge.label}</Badge>
                <span aria-hidden="true" className="hidden h-1 w-24 shrink-0 overflow-hidden rounded-full bg-surface-3 sm:block">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-accent to-cyan"
                    style={{ width: `${Math.round((PROGRESS[post.status] ?? 0.35) * 100)}%` }}
                  />
                </span>
                <span className="hidden w-24 shrink-0 text-right text-[11px] text-faint md:block">
                  {post.status === 'scheduled' || post.status === 'ready_to_post'
                    ? scheduleLabel(post.scheduledAt)
                    : relativeFromNow(post.updatedAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
