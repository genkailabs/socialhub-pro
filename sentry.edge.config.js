import * as Sentry from '@sentry/nextjs';

// Sentry no edge runtime (middleware). No-op sem SENTRY_DSN (RF-05).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production'
  });
}
