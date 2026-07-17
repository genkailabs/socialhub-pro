// Estado da conexão de uma rede (PRD Etapa 3). Puro, sem I/O.
//
// O estado é DERIVADO de token_expires_at + is_active, que já existem, em vez de
// guardado numa coluna própria: coluna de status precisa ser mantida em sincronia
// com a realidade e vira mentira no dia em que alguém esquece de atualizar.

// Janela de aviso antes do token vencer. Reconectar por escolha é melhor do que
// reconectar porque a publicação já falhou.
export const EXPIRING_SOON_DAYS = 7;

export function tokenStatus(token, now = new Date()) {
  if (!token) return 'disconnected';
  if (!token.is_active) return 'revoked';

  // Page token derivado de user token long-lived não expira: ausência de data
  // é válida, não suspeita.
  if (!token.token_expires_at) return 'active';

  const expiresAt = new Date(token.token_expires_at).getTime();
  // Data ilegível não é motivo para bloquear quem está publicando: trata como
  // ativo e deixa a Meta ser a autoridade sobre o token.
  if (Number.isNaN(expiresAt)) return 'active';

  const restaMs = expiresAt - now.getTime();
  if (restaMs <= 0) return 'expired';
  if (restaMs <= EXPIRING_SOON_DAYS * 24 * 3600 * 1000) return 'expiring';
  return 'active';
}

export function needsReconnect(status) {
  return status === 'expired' || status === 'revoked';
}

export const STATUS_LABEL = {
  disconnected: { label: 'Nao conectado', tone: 'muted' },
  active: { label: 'Conectado', tone: 'success' },
  expiring: { label: 'Expira em breve', tone: 'warning' },
  expired: { label: 'Token expirado', tone: 'danger' },
  revoked: { label: 'Reconexao necessaria', tone: 'danger' }
};
