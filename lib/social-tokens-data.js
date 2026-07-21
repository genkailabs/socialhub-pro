import { createClient } from '@/lib/supabase/server';
import { tokenStatus } from '@/lib/social-tokens';

// Plataformas conectadas da marca, com o estado do token derivado (Etapa 3).
// Mantém o filtro is_active: quem chama usa a presença da chave como "dá para
// publicar". O estado vai junto para a tela de Conexões avisar sobre expiração
// antes de a publicação quebrar.
export async function listConnectedPlatforms(brandId) {
  if (!brandId) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_tokens')
    .select('platform, platform_username, platform_data, is_active, token_expires_at')
    .eq('brand_id', brandId)
    .eq('is_active', true);
  const map = {};
  (data || []).forEach((t) => { map[t.platform] = { ...t, status: tokenStatus(t) }; });
  return map;
}
