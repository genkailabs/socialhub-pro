// Carrega a config do Sentry conforme o runtime (Next 14 instrumentationHook).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');

    // Agendador da fila de publicação. Só no runtime Node e só quando a service
    // role existe: sem ela a fila não lê o banco, e insistir a cada minuto só
    // encheria o log de erro.
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { startPublishScheduler } = await import('./lib/publish-scheduler');
      startPublishScheduler();
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
