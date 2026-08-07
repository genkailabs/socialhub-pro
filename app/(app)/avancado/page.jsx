import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkillsAgencia } from '@/components/avancado/SkillsAgencia';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandKit } from '@/lib/brand-kit-data';

export const metadata = { title: 'Avançado' };

export default async function AvancadoPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const kit = active ? await getBrandKit(active.id) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.6px] text-ink">Avançado</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Métodos da GenkaiLabs que rodam no Claude, não aqui. O Hub entra com o que só ele tem: o briefing
          já preenchido com a marca ativa.
        </p>
      </header>

      {!active
        ? <EmptyState title="Nenhuma marca selecionada" icon={Sparkles}>Crie ou selecione uma marca para o briefing sair preenchido.</EmptyState>
        : <SkillsAgencia marca={{ ...active, kit }} />}
    </div>
  );
}
