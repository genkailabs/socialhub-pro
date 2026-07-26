import { runPublishQueue } from '@/lib/publish-queue';
import { createQueueDb } from '@/lib/publish-queue-data';
import { publishPostTo, publishableNetworks, mediaUrlsOf } from '@/lib/publishers';

// Agendador interno: o próprio processo do app varre a fila de tempos em tempos.
//
// A alternativa era um serviço de cron externo batendo em /api/cron/publish.
// Este caminho tem menos partes móveis (nada para configurar fora do app, nenhum
// segredo em outro sistema) e o app já roda 24/7 no Railway com healthcheck.
// A rota HTTP continua existindo para disparo manual e para o dia em que um cron
// externo fizer mais sentido.
//
// Rodar dentro do processo web só é seguro porque a fila é idempotente: se um
// dia houver duas réplicas, as duas varrem e o lock em publishing_started_at
// garante que só uma publica cada post.

const INTERVALO_PADRAO_MS = 60 * 1000;

let timer = null;
let rodando = false;

export async function publicarPost(db, post) {
  const urls = mediaUrlsOf(post);
  if (!urls.length) throw new Error('Post agendado sem mídia.');

  const redes = publishableNetworks(post);
  if (!redes.length) throw new Error(`Nenhuma rede publicável em: ${(post.networks || []).join(', ') || 'vazio'}`);

  const erros = [];
  let primeiro = null;

  for (const network of redes) {
    const token = await db.getToken({ brandId: post.brand_id, platform: network });
    if (!token) {
      erros.push(`${network}: conta não conectada`);
      continue;
    }
    try {
      const externalId = await publishPostTo({
        platform: network,
        token,
        caption: post.content || '',
        urls,
        format: post.format,
        post
      });
      // external_post_id é uma coluna só; guardamos o da primeira rede que
      // publicou, e o Instagram é o canal principal do produto.
      if (!primeiro) primeiro = { externalId, network };
    } catch (e) {
      erros.push(`${network}: ${e.message}`);
    }
  }

  // Publicar em ao menos uma rede conta como publicado — mas o que falhou
  // continua dito em voz alta, não engolido.
  if (!primeiro) throw new Error(erros.join(' | ') || 'Falha desconhecida ao publicar.');
  return primeiro;
}

export async function processarFila() {
  const db = createQueueDb();
  return runPublishQueue({ db, publish: (post) => publicarPost(db, post) });
}

// Uma passada por vez: uma varredura lenta (upload de vídeo, retry da Graph)
// não pode se sobrepor à seguinte.
async function tick() {
  if (rodando) return;
  rodando = true;
  try {
    const res = await processarFila();
    if (res.published || res.failed) {
      console.log(`[fila] examinados=${res.examined} publicados=${res.published} falhas=${res.failed} ignorados=${res.skipped}`);
      for (const d of res.details.filter((x) => x.outcome === 'error')) {
        console.error(`[fila] post ${d.id}: ${d.error}`);
      }
    }
  } catch (e) {
    // A fila nunca pode derrubar o processo web.
    console.error('[fila] varredura falhou:', e.message);
  } finally {
    rodando = false;
  }
}

export function startPublishScheduler({ intervalMs } = {}) {
  if (timer) return timer;
  if (process.env.PUBLISH_SCHEDULER === 'off') {
    console.log('[fila] agendador desligado por PUBLISH_SCHEDULER=off');
    return null;
  }
  const intervalo = Number(intervalMs || process.env.PUBLISH_QUEUE_INTERVAL_MS) || INTERVALO_PADRAO_MS;
  timer = setInterval(tick, intervalo);
  // unref: o timer não segura o processo vivo por si só.
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`[fila] agendador de publicação ativo (a cada ${Math.round(intervalo / 1000)}s)`);
  return timer;
}

export function stopPublishScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
