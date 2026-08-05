import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { LibraryGrid } from '@/components/biblioteca/LibraryGrid';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { OBJETIVOS } from '@/lib/carrossel-tipos';
import { listStudioTemplates } from '@/lib/carrossel-templates';
import { listLayoutTemplates } from '@/lib/layouts-data';
import { templateBlocks } from '@/lib/layouts/thumb';

export const metadata = { title: 'Biblioteca criativa' };

/**
 * Biblioteca criativa: escolher a direção visual antes de escrever.
 *
 * A grade junta duas origens diferentes de propósito — os templates de
 * carrossel, que vêm do Carrossel Studio, e os layouts que a pessoa salvou no
 * Composer. São coisas distintas por dentro (um monta um carrossel inteiro, o
 * outro reaproveita a forma de uma peça), mas do lado de fora respondem à mesma
 * pergunta: "com que cara isso vai sair?".
 */
export default async function BibliotecaPage({ searchParams }) {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  if (!active) {
    return (
      <EmptyState title="Nenhuma marca criada ainda" icon={Sparkles}>
        A Biblioteca mostra o que serve para a sua marca. Crie a marca no seletor do topo para começar.
      </EmptyState>
    );
  }

  const [{ online, cards: templateCards }, layouts] = await Promise.all([
    listStudioTemplates(),
    listLayoutTemplates(active.id)
  ]);

  const layoutCards = layouts.map((layout) => ({
    kind: 'layout',
    id: `layout:${layout.id}`,
    name: layout.name,
    blurb: `${layout.category || 'Salvo por você'} · ${layout.format || 'post'}`,
    blocks: templateBlocks(layout.template),
    objetivos: [],
    format: layout.format || 'post',
    href: `/composer?layout=${layout.id}`
  }));

  const objetivoInicial = OBJETIVOS.some((item) => item.id === searchParams?.objetivo)
    ? searchParams.objetivo
    : null;

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Biblioteca criativa"
        tone="cyan"
        as="h1"
        title="Escolha a direção visual"
        description="Comece pelo objetivo, não pelo template."
      />
      <LibraryGrid
        cards={[...templateCards, ...layoutCards]}
        objetivos={OBJETIVOS}
        offline={!online}
        objetivoInicial={objetivoInicial}
      />
    </div>
  );
}
