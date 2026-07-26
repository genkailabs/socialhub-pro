import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { canAccessAICosts } from '@/lib/admin-access';
import { getJourney } from '@/lib/journey-data';
import { isPathAllowed } from '@/lib/journey';
import { resolveActive } from '@/lib/brands';

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const brands = await listBrands();
  const activeId = await getActiveBrandId();
  const active = resolveActive(brands, activeId);

  // O gate do primeiro uso decide aqui, e não no middleware: resolver a jornada
  // custa algumas leituras e o middleware roda em toda requisição, inclusive nas
  // de /api. Aqui roda uma vez por navegação e antes de qualquer render — então
  // digitar uma rota trancada na URL volta sem piscar conteúdo.
  const journey = await getJourney(active?.id);
  const pathname = (await headers()).get('x-pathname') || '';
  if (journey.conducting && !isPathAllowed(pathname, journey)) {
    redirect(journey.currentStep.route);
  }

  return (
    <AppShell
      brands={brands}
      activeId={active?.id || activeId}
      journey={journey}
      canAccessAICosts={canAccessAICosts(user.email)}
      accountEmail={user.email}
    >
      {children}
    </AppShell>
  );
}
