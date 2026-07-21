import * as Sentry from '@sentry/nextjs';

// Sentry no cliente. Só o DSN público é exposto (o próprio SDK precisa dele);
// nenhum outro segredo vai para o browser (RF-05). No-op sem o DSN.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enabled: process.env.NODE_ENV === 'production'
  });
}
