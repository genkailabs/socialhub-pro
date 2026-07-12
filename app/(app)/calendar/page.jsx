import { Sparkles } from 'lucide-react';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Calendário</h1>
        <p className="mt-1 text-sm text-muted">{active ? <>Posts de <strong className="text-ink">{active.name}</strong> — clique num post para abrir os detalhes.</> : 'Crie uma marca primeiro.'}</p>
      </div>
      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <CalendarGrid posts={posts} />
      )}
    </div>
  );
}
