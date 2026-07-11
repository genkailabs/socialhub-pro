import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Calendário</h1>
        <p className="text-xs text-muted">{active ? <>Posts de <strong>{active.name}</strong></> : 'Crie uma marca primeiro.'}</p>
      </div>
      {!active ? (
        <EmptyState title="Nenhuma marca">Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <CalendarGrid posts={posts} />
      )}
    </div>
  );
}
