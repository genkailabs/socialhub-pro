// Fila de publicação dos posts agendados.
//
// O produto agendava e nunca publicava: nenhuma consulta no código buscava
// posts vencidos, e /api/social/publish exige sessão de usuário — é o botão
// "publicar agora", não um worker. lib/publishers/index.js já tinha sido escrito
// para uma rota de cron que não existia; esta é a fila que faltava.
//
// ## Como a idempotência funciona
//
// A tabela posts já traz publishing_started_at, publish_attempts e
// last_publish_error — colunas que existem no banco mas que nenhuma linha de
// código usava. É o lock que a fila precisa, então é ele que usamos: nada de
// status novo (o CHECK não aceitaria) e nada de mexer no scheduled_at, que é o
// horário escolhido pela pessoa.
//
// Reivindicar = escrever publishing_started_at com update condicional a ele
// estar vazio (ou vencido). Quem consegue escrever ganhou a corrida; execução
// paralela não casa o WHERE e passa adiante. Se o processo morrer no meio, o
// lease expira e o post volta para a fila sozinho.
//
// Nada é marcado como publicado antes de a plataforma confirmar: o banco nunca
// mente sobre o que está no Instagram. Publicar é irreversível, então toda
// decisão aqui erra do lado de não publicar, nunca do lado de publicar duas vezes.

export const DEFAULT_LEASE_MS = 10 * 60 * 1000; // 10 min
export const DEFAULT_LIMIT = 10;

// Antes deste instante, um lease é considerado abandonado (processo morreu).
export function staleLeaseBefore(now = new Date(), leaseMs = DEFAULT_LEASE_MS) {
  return new Date(now.getTime() - leaseMs).toISOString();
}

// Uma passada na fila. Todo I/O entra por `db` e `publish` para o teste rodar
// sem banco e sem rede — publicar de verdade num teste seria postar de verdade.
export async function runPublishQueue({ db, publish, now = new Date(), leaseMs = DEFAULT_LEASE_MS, limit = DEFAULT_LIMIT } = {}) {
  const vencidos = await db.listDue({ now, limit });
  const resultado = { examined: vencidos.length, published: 0, failed: 0, skipped: 0, details: [] };

  for (const post of vencidos) {
    const claimed = await db.claim({
      id: post.id,
      now: now.toISOString(),
      staleBefore: staleLeaseBefore(now, leaseMs)
    });

    // Outra execução pegou primeiro. Não é erro — é a trava funcionando.
    if (!claimed) {
      resultado.skipped++;
      resultado.details.push({ id: post.id, outcome: 'claimed_by_other' });
      continue;
    }

    try {
      const { externalId, network } = await publish(post);
      await db.markPublished({ id: post.id, externalId, publishedAt: now.toISOString() });
      resultado.published++;
      resultado.details.push({ id: post.id, outcome: 'published', network, externalId });
    } catch (e) {
      await db.markError({ id: post.id, message: String(e?.message || e).slice(0, 400) });
      resultado.failed++;
      resultado.details.push({ id: post.id, outcome: 'error', error: String(e?.message || e).slice(0, 200) });
    }
  }

  return resultado;
}
