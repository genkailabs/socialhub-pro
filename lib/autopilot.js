import 'server-only';
import { generateCreative } from '@/lib/ai/generate';
import { buildGenerationJobs } from '@/lib/ai/jobs';
import { composeCaption } from '@/lib/posts-media';

const DAY_MS = 24 * 60 * 60 * 1000;

// Roda no cron diário: p/ cada marca com plano ativo, gera N criativos on-brand
// e insere como rascunhos `waiting_approval` (humano aprova antes de publicar).
// Usa o client admin (service role) — RLS não se aplica.
export async function runDailyAutopilot(admin) {
  const { data: plans } = await admin.from('content_plans').select('*').eq('active', true);
  const results = [];

  for (const plan of plans || []) {
    // idempotência: no máximo 1 rodada a cada ~20h por marca
    if (plan.last_run_at && Date.now() - new Date(plan.last_run_at).getTime() < 20 * 60 * 60 * 1000) {
      results.push({ brand: plan.brand_id, skipped: 'já rodou hoje' });
      continue;
    }
    try {
      const { data: brand } = await admin.from('brands').select('id, name, color').eq('id', plan.brand_id).maybeSingle();
      if (!brand) { results.push({ brand: plan.brand_id, error: 'marca não encontrada' }); continue; }
      const { data: kit } = await admin.from('brand_kits').select('*').eq('brand_id', plan.brand_id).maybeSingle();

      const count = Math.max(1, Math.min(5, plan.posts_per_day || 1));
      const pillars = (plan.pillars && plan.pillars.length) ? plan.pillars : (kit?.pillars || []);

      for (let k = 0; k < count; k++) {
        const topic = pillars.length ? pillars[k % pillars.length] : 'livre, dentro dos pilares';
        try {
          const gen = await generateCreative({
            supabase: admin, brandId: brand.id, brandName: brand.name, brandColor: brand.color, kit,
            brief: { topic, format: plan.format || 'news', goal: 'engajar a audiência' }
          });
          const caption = composeCaption(gen.spec.caption, gen.spec.hashtags);
          const { data: post } = await admin.from('posts').insert({
            brand_id: brand.id,
            title: (gen.spec.headline || 'Post gerado por IA').slice(0, 60),
            content: caption,
            media_url: gen.imageUrls[0],
            media_urls: gen.imageUrls,
            media_type: gen.imageUrls.length > 1 ? 'carousel' : 'image',
            networks: ['instagram'],
            status: 'waiting_approval'
          }).select('id').single();

          await admin.from('generation_jobs').insert(buildGenerationJobs({ brandId: brand.id, gen, textKind: 'autopilot', refPostId: post?.id }));
          results.push({ brand: brand.id, post: post?.id, cost: gen.cost });
        } catch (slotErr) {
          // Pesquisa indisponível: pula ESTE slot sem inventar tendência (regra do
          // núcleo honesto). Registra o erro; os demais slots/marcas seguem. Outros
          // erros sobem para o catch da marca.
          if (slotErr.code !== 'research_unavailable') throw slotErr;
          await admin.from('generation_jobs').insert({
            brand_id: brand.id, kind: 'research', provider: 'tavily', model: 'tavily-search',
            status: 'error', error: String(slotErr.message).slice(0, 500)
          });
          results.push({ brand: brand.id, skipped: 'pesquisa indisponível' });
        }
      }

      await admin.from('content_plans').update({ last_run_at: new Date().toISOString() }).eq('brand_id', brand.id);
    } catch (e) {
      results.push({ brand: plan.brand_id, error: e.message });
    }
  }

  return results;
}
