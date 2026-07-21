import * as Sentry from '@sentry/nextjs';

// Registra um erro no Sentry sem interromper o fluxo. Útil nas Server Actions,
// onde hoje o erro só vira `{ error: message }` devolvido à UI, sem registro
// em lugar nenhum (RF-05). Sem SENTRY_DSN, `captureException` é no-op.
export function captureError(error, context) {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Observabilidade nunca pode derrubar o produto.
  }
}
