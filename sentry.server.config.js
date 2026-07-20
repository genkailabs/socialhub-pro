import * as Sentry from '@sentry/nextjs';

// Sentry no servidor. Sem SENTRY_DSN, não inicializa — vira no-op, nada quebra
// (RF-05). O DSN é cadastrado no painel do Railway (RF-06).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production'
  });
}
