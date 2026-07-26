import { createAdmin } from '@/lib/supabase/admin';

// Acesso ao banco para a fila de publicação. Separado de lib/publish-queue.js
// para a orquestração ser testável sem banco — e para o service role ficar
// confinado a um arquivo só.

const CAMPOS = 'id, brand_id, title, content, media_url, media_urls, networks, status, scheduled_at, format, cover_url, share_to_feed, publish_attempts';

export function createQueueDb(supabase = createAdmin()) {
  return {
    async listDue({ now, limit }) {
      const { data, error } = await supabase
        .from('posts')
        .select(CAMPOS)
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString())
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true })
        .limit(limit);
      if (error) throw new Error(`Falha ao ler a fila: ${error.message}`);
      return data || [];
    },

    // Reivindica escrevendo publishing_started_at, condicionado a ele estar
    // vazio ou vencido. Se outra execução passou na frente, o WHERE não casa e
    // voltam zero linhas — é isso que impede publicar o mesmo post duas vezes.
    async claim({ id, now, staleBefore }) {
      const { data, error } = await supabase
        .from('posts')
        .update({ publishing_started_at: now })
        .eq('id', id)
        .eq('status', 'scheduled')
        .or(`publishing_started_at.is.null,publishing_started_at.lt.${staleBefore}`)
        .select('id');
      if (error) throw new Error(`Falha ao reivindicar o post: ${error.message}`);
      return !!(data && data.length);
    },

    async markPublished({ id, externalId, publishedAt }) {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: publishedAt,
          external_post_id: externalId || null,
          publishing_started_at: null,
          last_publish_error: null
        })
        .eq('id', id);
      // Publicou de verdade e não conseguiu gravar: o lease continua preso de
      // propósito, para a próxima passada NÃO republicar. Quem resolve é gente.
      if (error) throw new Error(`PUBLICOU no Instagram mas não gravou no banco (${error.message}). Post ${id} precisa de conferência manual.`);
    },

    // Solta o lease junto com o erro: o post pode ser reagendado sem ficar
    // preso, e a mensagem fica visível em vez de morrer no log.
    async markError({ id, message }) {
      await supabase
        .from('posts')
        .update({ status: 'error', last_publish_error: message, publishing_started_at: null })
        .eq('id', id);
    },

    async getToken({ brandId, platform }) {
      const { data } = await supabase
        .from('social_tokens')
        .select('access_token, platform_user_id')
        .eq('brand_id', brandId)
        .eq('platform', platform)
        .eq('is_active', true)
        .maybeSingle();
      return data || null;
    }
  };
}
