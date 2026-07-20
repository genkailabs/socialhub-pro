import { getBrandKit } from '@/lib/brand-kit-data';
import { listPostsForBrand } from '@/lib/posts-data';
import { listStrategies, countPlanItemsForBrand } from '@/lib/planning-data';
import { activeStrategy } from '@/lib/strategy-plan';

// Estado real da jornada assistida de uma marca, para a barra didática.
// Passos: 1 Brand Kit · 2 Estratégia · 3 Planejar semana · 4 Aprovar & agendar · 5 Publicar.
// Não há geração automática diária: o dono conduz cada etapa (PRD Jornada Instagram).
export async function getPipeline(brandId) {
  if (!brandId) return null;
  const [kit, strategies, planItems, posts] = await Promise.all([
    getBrandKit(brandId),
    listStrategies(brandId),
    countPlanItemsForBrand(brandId),
    listPostsForBrand(brandId)
  ]);

  const count = (s) => posts.filter((p) => p.status === s).length;
  const counts = {
    waiting: count('waiting_approval'),
    scheduled: count('scheduled'),
    published: count('published'),
    planItems
  };

  const hasStrategy = !!activeStrategy(strategies);

  const done = [
    !!kit,
    hasStrategy,
    planItems > 0,
    counts.scheduled > 0 || counts.published > 0,
    counts.published > 0
  ];

  const currentIndex = done.findIndex((d) => !d); // -1 = tudo concluído
  return { brandId, done, currentIndex, counts };
}
