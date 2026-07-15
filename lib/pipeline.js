import { getBrandKit } from '@/lib/brand-kit-data';
import { getContentPlan } from '@/lib/content-plan-data';
import { listPostsForBrand } from '@/lib/posts-data';

// Estado real do fluxo de publicação de uma marca, para a barra didática.
// Passos: 1 Brand Kit · 2 Ativar Piloto · 3 IA gera rascunho · 4 Aprovar & agendar · 5 Publica.
export async function getPipeline(brandId) {
  if (!brandId) return null;
  const [kit, plan, posts] = await Promise.all([
    getBrandKit(brandId),
    getContentPlan(brandId),
    listPostsForBrand(brandId)
  ]);

  const count = (s) => posts.filter((p) => p.status === s).length;
  const counts = {
    waiting: count('waiting_approval'),
    scheduled: count('scheduled'),
    published: count('published')
  };

  const done = [
    !!kit,
    !!plan?.active,
    !!plan?.last_run_at || counts.waiting > 0 || counts.scheduled > 0 || counts.published > 0,
    counts.scheduled > 0 || counts.published > 0,
    counts.published > 0
  ];

  const currentIndex = done.findIndex((d) => !d); // -1 = tudo concluído
  return { brandId, done, currentIndex, counts };
}
