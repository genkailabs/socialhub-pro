import { Sparkles, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendsExplorer } from '@/components/trends/TrendsExplorer';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';

// A tela chamava tudo isto de "tendência", e não é: o que ela cura são padrões
// de conteúdo — formatos, narrativas e mecânicas que estão funcionando. Chamar
// "conteúdo humanizado" de tendência é o defeito que a etapa Ideia corrigiu; o
// nome honesto aqui evita que a confusão volte pela porta dos fundos. Assunto
// de carrossel (acontecimento com fonte e data) se procura no Studio.
export const metadata = { title: 'Padrões de conteúdo no Instagram' };

export default async function TrendsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-xs font-bold text-accent-ink"><TrendingUp className="h-3.5 w-3.5" /> Radar editorial</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Padrões de conteúdo no Instagram</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Formatos, narrativas e mecânicas que estão funcionando — ligados às fontes originais e sem métricas estimadas. Procurando um <strong className="font-semibold text-ink">assunto</strong> para o carrossel (acontecimento com fonte e data)? Ele se pesquisa no Studio, no passo do assunto.</p>
        </div>
        {active && <div className="rounded-xl border border-line bg-panel px-3 py-2 text-xs text-muted">Curadoria para <strong className="text-ink">{active.name}</strong></div>}
      </header>

      {!active ? <EmptyState title="Nenhuma marca selecionada" icon={Sparkles}>Crie ou selecione uma marca para pesquisar os padrões que servem a ela.</EmptyState> : <TrendsExplorer brandId={active.id} brandName={active.name} />}
    </div>
  );
}
