import { Sparkles, Wand2, ShieldCheck, Palette, CalendarClock, CheckSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AutopilotForm } from '@/components/autopilot/AutopilotForm';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getContentPlan } from '@/lib/content-plan-data';
import { getBrandKit } from '@/lib/brand-kit-data';
import { getPipeline } from '@/lib/pipeline';
import { PipelineProgress } from '@/components/onboarding/PipelineProgress';
import { BrandBadge } from '@/components/workspace/BrandBadge';

export default async function AutopilotPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const [plan, kit] = active
    ? await Promise.all([getContentPlan(active.id), getBrandKit(active.id)])
    : [null, null];
  const pipeline = active ? await getPipeline(active.id) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
              <Wand2 className="h-3.5 w-3.5" /> IA Autônoma & Agendada
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> 100% com Aprovação
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Piloto Automático de Conteúdo</h1>
          <p className="mt-1 text-sm text-muted">
            {active ? (
              <>
                Sua agência operando 24/7 para <strong className="text-ink">{active.name}</strong>. A IA cria criativos on-brand todos os dias e deixa prontos para você aprovar.
              </>
            ) : (
              'Selecione ou crie uma marca no topo para configurar o Piloto.'
            )}
          </p>
        </div>
        {active && <BrandBadge name={active.name} color={active.color} size={44} />}
      </div>

      {active && <PipelineProgress pipeline={pipeline} />}

      {/* Como funciona (Guia Visual Interativo UX) */}
      <div className="overflow-hidden rounded-2xl glass shadow-soft">
        <div className="border-b border-line bg-surface-2/60 px-5 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">
            💡 Como funciona o Piloto Automático?
          </p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-line/60 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                1
              </span>
              <p className="font-bold text-ink">Lê seu Brand Kit</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              O modelo consulta o nicho, tom de voz, paleta de cores e regras (Do&apos;s &amp; Don&apos;ts) da sua marca para garantir posts personalizados.
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                2
              </span>
              <p className="font-bold text-ink">Gera Ideia + Arte</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Todos os dias, o <strong className="text-ink">DeepSeek</strong> escreve a legenda e hashtags, e a <strong className="text-ink">deAPI</strong> gera a imagem ou carrossel on-brand.
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                3
              </span>
              <p className="font-bold text-ink">Você Revisa e Aprova</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Nada é publicado sozinho. O post entra como <strong className="text-ink">Rascunho</strong> na aba Aprovações para você validar, alterar ou enviar ao cliente.
            </p>
          </div>
        </div>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca selecionada" icon={Sparkles}>
          Crie ou selecione uma marca no seletor acima para configurar o Piloto Automático.
        </EmptyState>
      ) : (
        <AutopilotForm brandId={active.id} plan={plan} hasBrandKit={!!kit} />
      )}
    </div>
  );
}
