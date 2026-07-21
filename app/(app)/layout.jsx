import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { canAccessAICosts } from '@/lib/admin-access';

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const brands = await listBrands();
  const activeId = await getActiveBrandId();

  return <AppShell brands={brands} activeId={activeId} canAccessAICosts={canAccessAICosts(user.email)} accountEmail={user.email}>{children}</AppShell>;
}
