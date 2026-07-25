import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { MascotTip } from '@/components/onboarding/MascotTip';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listPostsForBrand, getPostComments } from '@/lib/posts-data';

export default async function CalendarPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  let posts = active ? await listPostsForBrand(active.id) : [];

  // enriquece posts em aprovação com os retornos do cliente
  posts = await Promise.all(posts.map(async (p) =>
    p.status === 'waiting_approval' ? { ...p, comments: await getPostComments(p.id) } : p
  ));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Calendário</h1>
        <p className="mt-1 text-sm text-muted">{active ? <>Posts de <strong className="text-ink">{active.name}</strong> — clique num post para abrir os detalhes.</> : 'Crie uma marca primeiro.'}</p>
      </div>
      {active && (
        <MascotTip
          id="calendar"
          title="É aqui que o post ganha data e hora."
          lines={[
            'Clique num post para abrir os detalhes, editar e escolher quando ele sai.',
            'Post agendado publica sozinho no horário marcado — antes disso, nada sai.',
            'Precisa do ok do cliente? gere o link de aprovação dentro do post.'
          ]}
        />
      )}

      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <CalendarGrid posts={posts} />
      )}
    </div>
  );
}
