export const MAX_PUBLISH_ATTEMPTS = 3;

export function publicationFailurePatch({ attempts, error, maxAttempts = MAX_PUBLISH_ATTEMPTS }) {
  const publishAttempts = Math.max(1, Number(attempts) || 1);
  return {
    status: publishAttempts >= maxAttempts ? 'failed' : 'scheduled',
    publish_attempts: publishAttempts,
    last_publish_error: String(error || 'Erro desconhecido ao publicar.').slice(0, 1000),
    publishing_started_at: null
  };
}

const STATUS = {
  scheduled: { label: 'Agendado', tone: 'info' },
  publishing: { label: 'Publicando', tone: 'warning' },
  published: { label: 'Publicado', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'muted' }
};

export function publicationStatusMeta(status) {
  return STATUS[status] || { label: 'Rascunho', tone: 'muted' };
}
