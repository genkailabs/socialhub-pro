---
title: Banco de Dados (Supabase)
description: Schema Postgres, RLS, funções RPC e padrão de uso dos clientes Supabase.
tags:
  - wiki
  - database
  - supabase
  - rls
---
# Banco de Dados (Supabase)

Cliente ativo do projeto e histórico de contas: ver [Decisões de projeto](./decisions.md). Camada de ações que lê/escreve estas tabelas: [Arquitetura e stack](./architecture.md) (Server Actions) e [Motor de conteúdo IA](./ai-engine.md) (`generation_jobs`, `dna_signals`).

## Migrações (ordem de aplicação)

`supabase/migrations/`: `20260706_initial_schema` → `20260707_fix_schema_and_rls` → `20260707_social_tokens` → `20260708_social_analytics_and_logs` → `20260711_storage_media_policy` → `20260711_approval_rpc` → `20260712_ai_content` → `20260713_brand_dna` → `20260714_brand_onboarding`.

**Nota operacional:** várias dessas migrações foram aplicadas manualmente via SQL Editor do Supabase (não via `supabase db push`), porque o projeto foi montado à mão e o histórico de migração do CLI ficou dessincronizado. Um `db push` futuro deve tratar colunas já existentes como no-op (`ADD COLUMN IF NOT EXISTS`).

## Schema (estado final)

| Tabela | Colunas-chave | Relações | RLS |
|---|---|---|---|
| `profiles` | `id` (PK = `auth.users.id`), `full_name`, `agency_name`, `avatar_url` | 1:1 com `auth.users`, auto-criada por trigger `handle_new_user()` | Dono só SELECT/UPDATE (`auth.uid() = id`) |
| `brands` | `id`, `user_id→profiles`, `name`, `handle`, `category`, `color`, `logo_url`, `connected_networks TEXT[]`, `followers`, `engagement`, `networks_metadata JSONB` | Pai de quase tudo | Dono ALL (`auth.uid() = user_id`) |
| `posts` | `id`, `brand_id→brands`, `title`, `content`/`caption`, `media_url`/`media_urls TEXT[]`, `media_type`, `networks TEXT[]`, `status` (draft/waiting_approval/scheduled/published/error), `scheduled_at`, `approval_token UUID UNIQUE` | Filho de brands | Dono ALL via posse da marca; política SELECT pública original (`USING(true)`) foi **removida** — substituída pela RPC `get_post_by_approval_token` |
| `approval_comments` | `id`, `post_id→posts`, `author_name`, `comment`, `action_taken` (approved/changes_requested/comment_only) | Filho de posts | INSERT/SELECT público (`true`) — revisor externo é anônimo, sem `EXISTS(posts)` check (anônimo não vê posts sob RLS) |
| `social_tokens` | `id`, `user_id`, `brand_id→brands`, `platform`, `access_token`, `token_expires_at`, `platform_user_id`, `platform_username`, `platform_data JSONB`, `is_active`, UNIQUE(`brand_id`,`platform`) | Tokens OAuth reais (Meta Graph API) | Dono ALL via marca/`user_id` |
| `social_insights_cache` | `brand_id`, `platform`, `metric_type`, `data JSONB`, `expires_at`, UNIQUE(`brand_id`,`platform`,`metric_type`) | Cache p/ não estourar rate limit da Graph API | Dono ALL |
| `social_analytics_history` | `brand_id`, `platform`, `snapshot_date DATE`, `followers`, `engagement_rate`, `total_reach`, UNIQUE(`brand_id`,`platform`,`snapshot_date`) | Snapshot diário p/ gráficos de tendência | Dono ALL |
| `social_sync_logs` | `brand_id`, `platform`, `status` (success/error), `error_message`, `duration_ms`, `synced_at` | Log de sync/debug | Dono ALL |
| `brand_kits` | `brand_id` PK/FK→brands, `niche`, `audience`, `tone`, `pillars/dos/donts TEXT[]`, `palette JSONB`, `logo_url` + extensão Brand DNA: `personality[]`, `emotions[]`, `formality`, `emoji_usage`, `cta_policy`, `storytelling BOOL`, `visual_style`, `caption_length`, `dna_report JSONB`, `dna_sources JSONB`, `dna_generated_at`, `objective` | 1:1 com brands | Dono ALL |
| `content_plans` | `brand_id` PK/FK, `active BOOL`, `posts_per_day`, `format`, `pillars[]`, `preferred_times[]`, `last_run_at` | Config do Piloto Automático, 1:1 com brands | Dono ALL |
| `generation_jobs` | `id`, `brand_id→brands`, `kind` (post/image/autopilot/brand_dna), `provider` (deepseek/deapi), `model`, `input_tokens`, `output_tokens`, `cost_usd NUMERIC(12,6)`, `status`, `ref_post_id→posts`, `error` | Livro-razão de custo/uso de IA | Dono SELECT + INSERT |
| `dna_signals` | `id`, `brand_id→brands`, `post_id→posts` (nullable), `action` (approve/reject/edit) | Sinal de aprendizado p/ re-análise do Brand DNA | Dono ALL |

### Funções RPC / triggers

- `handle_new_user()` — trigger, cria linha em `profiles` ao inserir em `auth.users`.
- `set_updated_at()` — trigger genérico para colunas `updated_at` (brands, posts, social_tokens).
- `get_post_by_approval_token(p_token UUID) RETURNS SETOF posts` — `SECURITY DEFINER`, `STABLE`, concedida a `anon`/`authenticated`. Forma sancionada da página pública de aprovação buscar 1 post sem expor a tabela toda via RLS.

### Storage

Bucket público `media`: políticas permitem INSERT para `authenticated` e SELECT público. Usado para logos de marca e imagens de post (upload manual ou geradas por IA).

### Evolução notada (lição de segurança)

O schema inicial tinha uma política SELECT perigosamente aberta em `posts` (`USING (true)`) para viabilizar o link público de aprovação — isso vazava dados entre marcas (qualquer um podia ler qualquer post). A migração `20260707_fix_schema_and_rls.sql` fechou esse vazamento de isolamento multi-tenant, substituindo por uma RPC `SECURITY DEFINER` restrita a 1 post por token opaco.

## Clientes Supabase (`lib/supabase/`)

| Cliente | Arquivo | Chave | Uso |
|---|---|---|---|
| Browser | `client.js` | anon | `createBrowserClient`, Client Components (auth/sessão no browser, upload direto no Storage) |
| Server (SSR) | `server.js` | anon | `createServerClient` ligado a `cookies()` do Next — Server Components, Server Actions, route handlers. RLS se aplica; toda action chama `auth.getUser()` primeiro |
| Admin | `admin.js` | service role (`SUPABASE_SERVICE_ROLE_KEY`) | `persistSession:false`, bypassa RLS. Reservado a código confiável server-only — hoje só o cron (`lib/autopilot.js` recebe o client `admin` do caller). Nunca importado client-side |

## Camada de dados/ações por domínio

- **Marcas**: `lib/brands.js` (helpers puros: slug de handle, validação de nome, resolução de marca ativa, cookie `ACTIVE_COOKIE`) + `lib/brands-data.js` (leituras Supabase: `listBrands`, `getActiveBrandId`).
- **Brand Kit / DNA**: `lib/brand-kit-data.js` (lê 1 linha de `brand_kits`) + `lib/brand-kit-actions.js` (`saveBrandKit`, upsert cuidadoso pra não apagar DNA gerado por IA em edições parciais).
- **Posts**: `lib/posts-data.js` (lista posts/comentários) + `lib/posts-actions.js` (ciclo de vida completo como server actions: `publishNow`, `schedulePost`, `saveDraft`, `submitForApproval` — valida mídia via `lib/posts-media.js`: carrossel 2–10 imagens, limite de 2200 caracteres do IG, normalização de hashtag; chama `recordDnaSignal`).
- **Calendário**: `lib/calendar.js` — puro, sem I/O (grid mensal, agrupamento por dia, mapa status→cor).
- **Aprovações**: `lib/approval-actions.js` — `requestApproval` (dono) e `submitApproval` (revisor anônimo).
- **Métricas**: `lib/metrics-data.js` (perfil/mídia via Graph API + `lib/meta/metrics.js` p/ engajamento; upsert best-effort de snapshot diário) + `lib/ai-costs-data.js` (agrega `generation_jobs` por provider).
- **Integração Meta/Instagram** (`lib/meta/graph.js`): troca de code/token longo, descoberta de conta IG Business via Página do Facebook vinculada, fetch de perfil/mídia (cache 10min), fluxo completo de publicação (criar container → poll status → `media_publish`, com retry) para imagem única, carrossel e comentário pós-publicação.
- **Piloto Automático**: `lib/autopilot.js` (`runDailyAutopilot`, rodado pelo client admin no cron) itera `content_plans` ativos, limita a ~1 execução/20h por marca, gera N criativos por pilar, insere posts como `waiting_approval`, loga custo em `generation_jobs`.
- **Tokens sociais**: `lib/social-tokens-data.js` — `listConnectedPlatforms`.
- **Sinais DNA**: `lib/dna-signals.js` (grava approve/reject/edit, best-effort) + `lib/dna-actions.js` (`analyzeBrandDNA`, orquestra coleta → prompt → DeepSeek → normaliza → upsert em `brand_kits` + log de custo).
- **Cor**: `lib/color/dominant.js` — extração de cor dominante por pixel de canvas (só-browser numa função), usada pra paleta automática a partir do logo.
