'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, Check, ChevronDown, ChevronUp, Clock, Coins, Pencil, Sparkles, Target, Wand2, X } from 'lucide-react';
import {
  approveAllPlanItems, createPlanItem, generateWeekPlan, removePlanItem,
  replacePlanItem, restorePlanItem, restorePlanItemVersion, setPlanItemStatus, updatePlanItem
} from '@/lib/planning-actions';
import { produceApprovedPlanItems, produceFromPlanItem } from '@/lib/content-actions';
import { formatLabel } from '@/lib/content-production';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { PlanningItemForm } from '@/components/planning/PlanningItemForm';
import { availablePlanningItemActions, itemDetails, PlanningSummary } from '@/components/planning/PlanningSummary';
import { normalizePlanningItemStatus, PLANNING_COLUMNS, groupPlanningItemsByColumn } from '@/lib/planning-status';
import { remainingPlanSlots } from '@/lib/strategy-plan';

// Selo pequeno junto de cada ação que gasta IA, para o custo ficar visível no
// momento da decisão (RF-04). Sem UI nova grande — apenas o aviso.
function CreditHint({ className = '', label = 'usa 1 crédito' }) {
  return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold text-muted ${className}`}><Coins className="h-3 w-3 shrink-0" aria-hidden="true" />{label}</span>;
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

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

const STATUS_TONE = { idea: 'muted', approved: 'success', in_production: 'accent', ready: 'success' };

function StatusBadge({ status }) {
  // `shrink-0` + `whitespace-nowrap`: dentro do card estreito do quadro, "Em
  // produção" quebrava em duas linhas e desalinhava o cabeçalho.
  return <Badge className="shrink-0 whitespace-nowrap" tone={STATUS_TONE[status] || 'muted'}>{STATUS[status] || status}</Badge>;
}

function PlanningItemCard({ item, busy, onApprove, onEdit, onProduce, onRemove, onReplace }) {
  const [expanded, setExpanded] = useState(false);
  const details = itemDetails(item);
  const actions = availablePlanningItemActions(item);
  const isBusy = busy === item.id;
  const primaryAction = ['approve', 'produce', 'viewContent'].some((action) => actions.includes(action));
  const secondaryActions = ['edit', 'replace', 'remove'].filter((action) => actions.includes(action));
  const creditActions = [actions.includes('produce') && 'Gerar conteúdo', actions.includes('replace') && 'Trocar'].filter(Boolean);

  return (
    <article className="rounded-2xl border border-line bg-surface-2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">{formatLabel(item.format)}</span><span className="text-[11px] text-muted">• {dataCurta(item.date)}</span></div><h4 className="mt-2 text-sm font-semibold leading-snug text-ink">{item.title || item.topic}</h4><p className="mt-1 text-[11px] text-muted">Pilar: {item.pillar || 'Não informado'}</p></div>
        <StatusBadge status={item.status} />
      </div>
      {/* `flex` (não `inline-flex`): como <p> inline-level, esta linha colava no
          botão "Ver detalhes" logo abaixo, sem espaço entre os dois textos. */}
      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-accent">
        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />Melhor horario: {horarioSugerido(item.suggested_time)}
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

export function PlanningPanel({ brandId, weekStart, plan, hasStrategy, postsPerWeek = 3, planningUsage = null }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [message, setMessage] = useState(null);
  const [formItem, setFormItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  // §7: remover mostra um aviso com "Desfazer" por alguns segundos, em vez de
  // pedir confirmação antes. Remover é reversível — confirmar a cada clique
  // cansa mais do que ajuda.
  const [undo, setUndo] = useState(null);

  useEffect(() => {
    if (!undo) return undefined;
    const timer = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(timer);
  }, [undo]);
  // A leitura normaliza estados antigos, mas manter essa proteção no cliente
  // evita que um cache antigo esconda itens durante a atualização da migração.
  const items = (plan?.items || []).map((item) => ({ ...item, status: normalizePlanningItemStatus(item.status) }));
  const ideaCount = items.filter((item) => item.status === 'idea').length;
  const approvedCount = items.filter((item) => item.status === 'approved').length;
  // Vagas ainda não preenchidas por itens decididos. Só faz sentido "preencher"
  // (e gastar IA) quando há vaga real — senão o botão nem aparece (RF-03).
  const remainingSlots = remainingPlanSlots(postsPerWeek, items);

  function confirm(message) { return typeof window !== 'undefined' && window.confirm(message); }
  async function run(key, work) {
    setBusy(key); setMessage(null);
    try { const result = await work(); if (result?.error) throw new Error(result.error); router.refresh(); return result; }
    catch (error) { setMessage({ type: 'error', text: error.message || 'Não foi possível concluir a ação.' }); return null; }
    finally { setBusy(''); }
  }

  async function generate() {
    // Só preenche vagas vazias: itens aprovados e removidos não são tocados;
    // apenas ideias ainda não aprovadas podem ser trocadas pelas novas.
    const pergunta = items.length
      ? `Preencher ${remainingSlots} vaga(s) com novas sugestões? Itens aprovados e removidos não mudam; ideias ainda não aprovadas podem ser substituídas.`
      : null;
    if (pergunta && !confirm(pergunta)) return;
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
  // §7: remove direto e oferece desfazer. A remoção é soft (vira "rejected"),
  // então o desfazer devolve o item ao status exato que ele tinha.
  async function remove(item) {
    setUndo(null);
    const result = await run(item.id, () => removePlanItem({ itemId: item.id }));
    if (result) setUndo({ itemId: item.id, title: item.title || item.topic, status: result.previousStatus || 'idea' });
  }

  async function desfazerRemocao() {
    if (!undo) return;
    const alvo = undo;
    setUndo(null);
    await run(alvo.itemId, () => restorePlanItem({ itemId: alvo.itemId, status: alvo.status }));
  }

  // §8: replanejar troca as ideias ainda não aprovadas por novas. Não produz
  // conteúdo nem imagem — é a operação barata, de propósito.
  async function replanejar() {
    if (!confirm('Trocar as ideias ainda não aprovadas por novas sugestões? Itens aprovados, em produção e prontos não mudam.')) return;
    await generate();
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

  if (!hasStrategy) return <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center"><Target className="mx-auto h-8 w-8 text-muted" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-ink">Primeiro, a estratégia</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Aprove uma estratégia na tela de Estratégia antes de escolher os temas da semana.</p></div>;

  const usageLabel = planningUsage
    ? (planningUsage.max != null
        ? `${planningUsage.used} de ${planningUsage.max} gerações usadas ${planningUsage.period === 'day' ? 'hoje' : 'neste mês'}`
        : `${planningUsage.used} ${planningUsage.used === 1 ? 'geração usada' : 'gerações usadas'} ${planningUsage.period === 'day' ? 'hoje' : 'neste mês'}`)
    : null;

  return <div className="space-y-5">
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-bold text-ink"><Calendar className="h-4 w-4 text-muted" aria-hidden="true" />Semana de {dataCurta(weekStart)}</p><p className="mt-1 text-xs text-muted">Você decide o que aprovar antes de qualquer conteúdo ser criado.</p>{usageLabel && <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted"><Coins className="h-3 w-3" aria-hidden="true" />{usageLabel}</p>}</div>{(!items.length || remainingSlots > 0) && <div className="flex flex-col items-end gap-1"><Button onClick={generate} disabled={generatingPlan}><Sparkles className="h-4 w-4" aria-hidden="true" />{generatingPlan ? 'Planejando...' : items.length ? `Preencher vagas vazias (${remainingSlots})` : 'Planejar minha semana'}</Button><CreditHint /></div>}</div></section>

    <div role="group" className="flex flex-wrap items-center gap-2" aria-label="Ações do planejamento"><Button variant="outline" onClick={approveAll} disabled={!ideaCount || busy === 'approve-all'}>Aprovar todas as ideias</Button><span className="inline-flex items-center gap-1.5"><Button onClick={produceAll} disabled={!approvedCount || busy === 'produce-all'}><Wand2 className="h-4 w-4" aria-hidden="true" />Gerar conteúdos aprovados</Button><CreditHint /></span><Button variant="ghost" onClick={addIdea}><Pencil className="h-4 w-4" aria-hidden="true" />Adicionar ideia</Button>{ideaCount > 0 && <span className="inline-flex items-center gap-1.5"><Button variant="outline" onClick={replanejar} disabled={generatingPlan}><Sparkles className="h-4 w-4" aria-hidden="true" />Replanejar</Button><CreditHint /></span>}</div>

    {showForm && <PlanningItemForm item={formItem} busy={busy === 'form'} onCancel={() => { setShowForm(false); setFormItem(null); }} onSave={saveItem} onRestoreVersion={restoreVersion} />}
    {generatingPlan && <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft"><LoadingIndicator compact label="Montando seu planejamento" description="Organizando temas, formatos e a sequência da semana." /></div>}
    {busy && busy !== 'form' && <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft"><LoadingIndicator compact label="Atualizando o planejamento" description="Só um instante." /></div>}
    {message && <p role="status" className={`flex items-center gap-1.5 text-xs font-semibold ${message.type === 'error' ? 'text-danger' : message.type === 'warn' ? 'text-warning' : 'text-success'}`}><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{message.text}</p>}

    {items.length > 0 && <PlanningSummary items={items} weeklySummary={plan?.weekly_summary} />}
    {!items.length ? <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-7 text-center"><p className="text-sm font-bold text-ink">Nenhuma ideia planejada ainda</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Peça sugestões para a semana ou adicione suas próprias ideias. Planejar não cria conteúdo.</p></div> : (() => {
      // §20: o caminho inteiro do conteúdo, de ideia a publicado.
      const grupos = groupPlanningItemsByColumn(items);
      // O quadro nunca espreme a coluna: cada etapa tem uma largura mínima
      // legível (20rem) e cresce para dividir o espaço que sobrar. Quando as 5
      // etapas não cabem, o trilho rola na horizontal em vez de comprimir os
      // cards até o conteúdo ficar ilegível.
      return <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">{PLANNING_COLUMNS.map((column) => { const columnItems = grupos[column.key] || []; return <section key={column.key} className="flex min-w-[20rem] flex-1 snap-start flex-col rounded-2xl border border-line bg-surface p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="text-sm font-bold text-ink">{column.title}</h3><p className="mt-0.5 text-[11px] text-muted">{column.hint}</p></div><span className="font-mono text-[11px] font-bold tabular-nums text-muted">{columnItems.length}</span></div><div className="mt-4 space-y-3">{columnItems.length ? columnItems.map((item) => <PlanningItemCard key={item.id} item={item} busy={busy} onApprove={(itemId) => run(itemId, () => setPlanItemStatus({ itemId, status: 'approved' }))} onEdit={(nextItem) => { setFormItem(nextItem); setShowForm(true); }} onProduce={produce} onReplace={replace} onRemove={remove} />) : <p className="py-5 text-center text-xs text-muted">Nada aqui ainda.</p>}</div></section>; })}</div>;
    })()}

    {/* §7: aviso de remoção com desfazer. Fica fixo no rodapé para não empurrar
        o quadro nem sumir quando a coluna rola. */}
    {undo && (
      <div role="status" className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <div className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 shadow-lift">
          <p className="text-[13px] text-ink">
            Planejamento removido{undo.title ? <> — <span className="font-semibold">{undo.title}</span></> : null}
          </p>
          <button
            type="button"
            onClick={desfazerRemocao}
            className="shrink-0 text-[13px] font-semibold text-accent transition-colors hover:text-accent-ink"
          >
            Desfazer
          </button>
        </div>
      </div>
    )}
  </div>;
}
