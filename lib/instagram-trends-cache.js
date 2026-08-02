import 'server-only';

import { createAdmin } from '@/lib/supabase/admin';

// research_cache tem RLS sem policy para sessões de usuário. O cache de
// tendências usa service role somente dentro da rota; sem as duas variáveis,
// a pesquisa continua funcionando sem cache em vez de cair no client RLS.
export function createTrendsResearchCacheClient() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) return null;
  return createAdmin();
}
