'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, Coins, Pencil, Sparkles, Target, Wand2 } from 'lucide-react';
import {
  approveAllPlanItems, createPlanItem, generateWeekPlan, removePlanItem,
  replacePlanItem, restorePlanItem, restorePlanItemVersion, setPlanItemStatus, updatePlanItem
} from '@/lib/planning-actions';
import { produceApprovedPlanItems, produceFromPlanItem } from '@/lib/content-actions';
import { Button } from '@/components/ui/Button';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { PlanningItemForm } from '@/components/planning/PlanningItemForm';
import { PlanningSummary } from '@/components/planning/PlanningSummary';
import { CreditHint, dataCurta, PlanningBoard } from '@/components/planning/PlanningBoard';
import { normalizePlanningItemStatus } from '@/lib/planning-status';
import { remainingPlanSlots } from '@/lib/strategy-plan';

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

  // Arrastar um card entre as colunas executa a mesma ação dos botões — nada de
  // um caminho paralelo com regras próprias. Só a produção pergunta antes, por
  // gastar crédito de IA (RF-04); aprovar e desaprovar são reversíveis.
  async function aplicarArrasto(item, action) {
    if (action.confirm && !confirm(action.confirm)) return;
    if (action.kind === 'produce') { await produce(item.id); return; }
    await run(item.id, () => setPlanItemStatus({ itemId: item.id, status: action.status }));
  }
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
    {!items.length ? <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-7 text-center"><p className="text-sm font-bold text-ink">Nenhuma ideia planejada ainda</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Peça sugestões para a semana ou adicione suas próprias ideias. Planejar não cria conteúdo.</p></div> : (
      // §20: o caminho inteiro do conteúdo, de ideia a publicado — e o card se
      // arrasta de uma etapa para a outra.
      <PlanningBoard
        items={items}
        busy={busy}
        onApprove={(itemId) => run(itemId, () => setPlanItemStatus({ itemId, status: 'approved' }))}
        onEdit={(nextItem) => { setFormItem(nextItem); setShowForm(true); }}
        onProduce={produce}
        onReplace={replace}
        onRemove={remove}
        onDropAction={aplicarArrasto}
      />
    )}

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
