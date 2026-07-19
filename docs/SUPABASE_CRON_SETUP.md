# Agendamento pelo Supabase

O Next.js nao publica mais posts agendados. O Supabase Cron chama as Edge Functions diretamente.

## 1. Configurar secrets

No Dashboard do Supabase, configure os secrets das Edge Functions:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
```

No SQL Editor, antes de aplicar a migracao, crie os secrets que o `pg_cron` usa para chamar as funcoes:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'scheduler_project_url');
select vault.create_secret('<service-role-key>', 'scheduler_service_role_key');
```

## 2. Aplicar banco e funcoes

```bash
supabase db push
supabase functions deploy publish-due-posts --no-verify-jwt
supabase functions deploy youtube-sync --no-verify-jwt
```

As funcoes validam internamente o header `Authorization` com o service role; `--no-verify-jwt` permite que o `pg_net` as invoque sem um JWT de usuario.

## 3. Validar sem publicar

Primeiro, consulte o job configurado:

```sql
select jobname, schedule, command from cron.job;
```

Depois, crie um post de teste para alguns minutos no futuro e acompanhe:

```sql
select id, status, scheduled_at, publish_attempts, last_publish_error, published_at
from public.posts
order by created_at desc
limit 10;
```

Os registros de auditoria ficam em `publication_job_logs`. Nunca chame a Edge Function manualmente em producao sem confirmar que nao existem posts vencidos reais.
