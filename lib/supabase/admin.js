import { createClient as createAdminClient } from '@supabase/supabase-js';

// Client com service role — SOMENTE em código server-side confiável (cron).
// Ignora RLS; nunca importar em componente client.
export function createAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
