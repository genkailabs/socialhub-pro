'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, Check, ChevronDown, ChevronUp, Clock, Pencil, Sparkles, Target, Wand2, X } from 'lucide-react';
import {
  approveAllPlanItems, createPlanItem, generateWeekPlan, removePlanItem,
  replacePlanItem, restorePlanItemVersion, setPlanItemStatus, updatePlanItem
} from '@/lib/planning-actions';
import { produceApprovedPlanItems, produceFromPlanItem } from '@/lib/content-actions';
import { formatLabel } from '@/lib/content-production';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { PlanningItemForm } from '@/components/planning/PlanningItemForm';
import { availablePlanningItemActions, itemDetails, PlanningSummary } from '@/components/planning/PlanningSummary';
import { normalizePlanningItemStatus } from '@/lib/planning-status';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const COLUNAS = [
  { key: 'ideas', title: 'Ideias', statuses: ['idea'] },
  { key: 'production', title: 'Em produção', statuses: ['approved', 'in_production'] },
  { key: 'ready', title: 'Prontos para publicar', statuses: ['ready'] }
];

const STATUS = {
  idea: 'Ideia', approved: 'Aprovado', in_production: 'Em produção', ready: 'Pronto', rejected: 'Removido'
};

function dataCurta(iso) {
  if (!iso) return 'Sem data';
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return `${DIAS[date.getUTCDay()]}, ${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function horarioSugerido(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || '')) ? time : 'A definir';
}

function StatusBadge({ status }) {
  const classes = {
    idea: 'bg-line text-muted', approved: 'bg-success/10 text-success', in_production: 'bg-accent/10 text-accent', ready: 'bg-success/10 text-success'
  };
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${classes[status] || 'bg-line text-muted'}`}>{STATUS[status] || status}</span>;
}

function PlanningItemCard({ item, busy, onApprove, onEdit, onProduce, onRemove, onReplace }) {
  const [expanded, setExpanded] = useState(false);
  const details = itemDetails(item);
  const actions = availablePlanningItemActions(item);
  const isBusy = busy === item.id;

  return (
    <article className="rounded-2xl border border-line bg-surface-2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-[9px] font-bold uppercase tracking-wider text-accent">{formatLabel(item.format)}</span><span className="text-[10px] text-muted">• {dataCurta(item.date)}</span></div><h4 className="mt-2 text-[13px] font-semibold leading-snug text-ink">{item.title || item.topic}</h4><p className="mt-1 text-[10px] text-muted">Pilar: {item.pillar || 'Não informado'}</p></div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
        <Clock className="h-3 w-3" aria-hidden="true" />Melhor horario: {horarioSugerido(item.suggested_time)}
      </p>

      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-ink">Ver detalhes {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}</button>
      {expanded && <dl className="mt-3 grid gap-2 rounded-xl bg-surface p-3 text-xs"><div><dt className="font-bold text-ink">Objetivo</dt><dd className="mt-0.5 text-muted">{details.objective}</dd></div><div><dt className="font-bold text-ink">Resumo</dt><dd className="mt-0.5 text-muted">{details.summary}</dd></div><div><dt className="font-bold text-ink">Gancho</dt><dd className="mt-0.5 text-muted">{details.hook}</dd></div><div className="grid grid-cols-2 gap-2"><div><dt className="font-bold text-ink">CTA</dt><dd className="mt-0.5 text-muted">{details.cta}</dd></div><div><dt className="font-bold text-ink">Público</dt><dd className="mt-0.5 text-muted">{details.audience}</dd></div></div><div><dt className="font-bold text-ink">Duração</dt><dd className="mt-0.5 text-muted">{details.duration}</dd></div></dl>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {actions.includes('edit') && <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</Button>}
        {actions.includes('approve') && <Button size="sm" disabled={isBusy} onClick={() => onApprove(item.id)}><Check className="h-3.5 w-3.5" aria-hidden="true" />Aprovar</Button>}
        {actions.includes('replace') && <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onReplace(item)}><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />Trocar</Button>}
        {actions.includes('remove') && <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onRemove(item)}><X className="h-3.5 w-3.5" aria-hidden="true" />Remover</Button>}
        {actions.includes('produce') && <Button size="sm" disabled={isBusy} onClick={() => onProduce(item.id)}><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />{isBusy ? 'Gerando...' : 'Gerar conteúdo'}</Button>}
        {actions.includes('viewContent') && <Link href={`/content/${item.post_id}/review`} className="inline-flex h-8 items-center gap-1 rounded-full bg-accent/10 px-3 text-xs font-bold text-accent">Ver conteúdo</Link>}
      </div>
    </article>
  );
}

export function PlanningPanel({ brandId, weekStart, plan, hasStrategy }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [message, setMessage] = useState(null);
  const [formItem, setFormItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  // A leitura normaliza estados antigos, mas manter essa proteção no cliente
  // evita que um cache antigo esconda itens durante a atualização da migração.
  const items = (plan?.items || []).map((item) => ({ ...item, status: normalizePlanningItemStatus(item.status) }));
  const ideaCount = items.filter((item) => item.status === 'idea').length;
  const approvedCount = items.filter((item) => item.status === 'approved').length;

  function confirm(message) { return typeof window !== 'undefined' && window.confirm(message); }
  async function run(key, work) {
    setBusy(key); setMessage(null);
    try { const result = await work(); if (result?.error) throw new Error(result.error); router.refresh(); return result; }
    catch (error) { setMessage({ type: 'error', text: error.message || 'Não foi possível concluir a ação.' }); return null; }
    finally { setBusy(''); }
  }

  async function generate() {
    if (items.some((item) => item.status === 'idea') && !confirm('Substituir as ideias atuais por novas sugestões? As ideias atuais serão removidas.')) return;
    setGeneratingPlan(true); setMessage(null);
    try { const result = await generateWeekPlan({ brandId, weekStart }); if (result?.error) throw new Error(result.error); if (result.discarded) setMessage({ type: 'warn', text: `${result.count} ideias sugeridas; ${result.discarded} ficaram fora da semana.` }); router.refresh(); }
    catch (error) { setMessage({ type: 'error', text: error.message || 'Não foi possível sugerir a semana.' }); }
    finally { setGeneratingPlan(false); }
  }

  function addIdea() {
    if (!plan?.id) { setMessage({ type: 'warn', text: 'Gere o planejamento uma vez antes de adicionar uma ideia manual.' }); return; }
    setFormItem(null); setShowForm(true);
  }
  async function saveItem(values) {
    const result = await run('form', () => formItem?.id ? updatePlanItem({ itemId: formItem.id, patch: values }) : createPlanItem({ planId: plan.id, values }));
    if (result) { setShowForm(false); setFormItem(null); }
  }
  async function restoreVersion(versionId) {
    if (!formItem?.id || !confirm('Restaurar esta versão e substituir as alterações atuais?')) return;
    const result = await run('form', () => restorePlanItemVersion({ itemId: formItem.id, versionId }));
    if (result) { setShowForm(false); setFormItem(null); }
  }
  async function replace(item) {
    const instruction = window.prompt('Como você quer mudar esta ideia? (opcional)');
    if (instruction === null || !confirm('Trocar esta ideia por uma nova sugestão da IA? A versão atual poderá ser restaurada depois.')) return;
    await run(item.id, () => replacePlanItem({ itemId: item.id, instruction }));
  }
  async function produce(itemId) { await run(itemId, () => produceFromPlanItem({ itemId })); }
  async function produceAll() {
    if (!approvedCount) return;
    if (!confirm(`Gerar conteúdo com IA para ${approvedCount} ${approvedCount === 1 ? 'ideia aprovada' : 'ideias aprovadas'}?`)) return;
    const result = await run('produce-all', () => produceApprovedPlanItems({ planId: plan.id }));
    if (result) { const failures = result.results?.filter((entry) => !entry.ok).length || 0; setMessage({ type: failures ? 'warn' : 'ok', text: failures ? `${failures} conteúdo(s) não puderam ser gerados.` : 'Conteúdos aprovados enviados para produção.' }); }
  }
  async function approveAll() {
    if (!ideaCount || !confirm(`Aprovar as ${ideaCount} ideias da semana? Isso não gera conteúdo automaticamente.`)) return;
    const result = await run('approve-all', () => approveAllPlanItems({ planId: plan.id }));
    if (result) setMessage({ type: 'ok', text: `${result.count} ideias aprovadas. A produção continua sendo uma ação separada.` });
  }

  if (!hasStrategy) return <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center"><Target className="mx-auto h-8 w-8 text-muted" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-ink">Primeiro, a estratégia</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Aprove uma estratégia no Piloto Automático antes de escolher os temas da semana.</p></div>;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-bold text-ink"><Calendar className="h-4 w-4 text-muted" aria-hidden="true" />Semana de {dataCurta(weekStart)}</p><p className="mt-1 text-xs text-muted">Você decide o que aprovar antes de qualquer conteúdo ser criado.</p></div><Button onClick={generate} disabled={generatingPlan}><Sparkles className="h-4 w-4" aria-hidden="true" />{generatingPlan ? 'Planejando...' : items.length ? 'Sugerir de novo' : 'Planejar minha semana'}</Button></div></section>

    <div role="group" className="flex flex-wrap gap-2" aria-label="Ações do planejamento"><Button variant="outline" onClick={approveAll} disabled={!ideaCount || busy === 'approve-all'}>Aprovar todas as ideias</Button><Button onClick={produceAll} disabled={!approvedCount || busy === 'produce-all'}><Wand2 className="h-4 w-4" aria-hidden="true" />Gerar conteúdos aprovados</Button><Button variant="ghost" onClick={addIdea}><Pencil className="h-4 w-4" aria-hidden="true" />Adicionar ideia</Button></div>

    {showForm && <PlanningItemForm item={formItem} busy={busy === 'form'} onCancel={() => { setShowForm(false); setFormItem(null); }} onSave={saveItem} onRestoreVersion={restoreVersion} />}
    {generatingPlan && <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft"><LoadingIndicator compact label="Montando seu planejamento" description="Organizando temas, formatos e a sequência da semana." /></div>}
    {busy && busy !== 'form' && <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft"><LoadingIndicator compact label="Atualizando o planejamento" description="Só um instante." /></div>}
    {message && <p role="status" className={`flex items-center gap-1.5 text-xs font-semibold ${message.type === 'error' ? 'text-danger' : message.type === 'warn' ? 'text-warning' : 'text-success'}`}><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{message.text}</p>}

    {items.length > 0 && <PlanningSummary items={items} weeklySummary={plan?.weekly_summary} />}
    {!items.length ? <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-7 text-center"><p className="text-sm font-bold text-ink">Nenhuma ideia planejada ainda</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Peça sugestões para a semana ou adicione suas próprias ideias. Planejar não cria conteúdo.</p></div> : <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">{COLUNAS.map((column) => { const columnItems = items.filter((item) => column.statuses.includes(item.status)); return <section key={column.key} className="rounded-[22px] border border-line bg-surface p-5"><div className="flex items-center justify-between"><h3 className="text-[15px] font-bold text-ink">{column.title}</h3><span className="font-mono text-[11px] font-bold text-muted">{columnItems.length}</span></div><div className="mt-4 space-y-3">{columnItems.length ? columnItems.map((item) => <PlanningItemCard key={item.id} item={item} busy={busy} onApprove={(itemId) => run(itemId, () => setPlanItemStatus({ itemId, status: 'approved' }))} onEdit={(nextItem) => { setFormItem(nextItem); setShowForm(true); }} onProduce={produce} onReplace={replace} onRemove={(nextItem) => { if (confirm(`Remover “${nextItem.title || nextItem.topic}” do planejamento?`)) run(nextItem.id, () => removePlanItem({ itemId: nextItem.id })); }} />) : <p className="py-5 text-center text-xs text-muted">Nada aqui ainda.</p>}</div></section>; })}</div>}
  </div>;
}
