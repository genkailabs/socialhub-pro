import { Sparkles, CheckSquare } from 'lucide-react';
import Link from 'next/link';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Aprovações</h1>
        <p className="mt-1 text-sm text-muted">
          {active ? <>Posts de <strong className="text-ink">{active.name}</strong> aguardando decisão do cliente</> : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca" icon={Sparkles}>Crie/selecione uma marca no topo.</EmptyState>
      ) : pending.length === 0 ? (
        <EmptyState title="Nada em aprovação" icon={CheckSquare}>
          Gere um link de aprovação abrindo um post no{' '}
          <Link href="/calendar" className="font-semibold text-accent hover:underline">Calendário</Link>. Ele aparece aqui até o cliente responder.
        </EmptyState>
      ) : (
        <ApprovalsList posts={pending} />
      )}
    </div>
  );
}
