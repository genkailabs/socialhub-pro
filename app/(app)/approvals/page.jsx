import { EmptyState } from '@/components/ui/EmptyState';
import { ApprovalsList } from '@/components/approvals/ApprovalsList';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listPostsForBrand, getPostComments } from '@/lib/posts-data';

export default async function ApprovalsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const all = active ? await listPostsForBrand(active.id) : [];
  let pending = all.filter((p) => p.status === 'waiting_approval');
  pending = await Promise.all(pending.map(async (p) => ({ ...p, comments: await getPostComments(p.id) })));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Aprovações</h1>
        <p className="text-xs text-muted">
          {active ? <>Posts de <strong>{active.name}</strong> aguardando decisão do cliente</> : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca">Crie/selecione uma marca no topo.</EmptyState>
      ) : pending.length === 0 ? (
        <EmptyState title="Nada em aprovação">
          Gere um link de aprovação abrindo um post no <strong>Calendário</strong>. Ele aparece aqui até o cliente responder.
        </EmptyState>
      ) : (
        <ApprovalsList posts={pending} />
      )}
    </div>
  );
}
