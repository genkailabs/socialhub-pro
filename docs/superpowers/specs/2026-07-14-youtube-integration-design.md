# Integração YouTube — Design

- **Data:** 2026-07-14
- **Branch:** feat/brand-dna-ai (integração parte deste ciclo)
- **Status:** Aprovado (aguardando revisão do spec antes do plano de implementação)

## Objetivo

Integrar o YouTube ao gerenciador com três capacidades, focadas em **atrair engajamento** e **facilitar o planejamento** do usuário:

1. **Agendamento de uploads** — usuário envia um vídeo próprio (.mp4), agenda, e o app publica no canal do YouTube na hora marcada.
2. **Acompanhamento de métricas** — canal (inscritos, views, watch time) e por vídeo (views, likes, comments, retenção).
3. **Sugestões de horário de postagem** — híbrido: heurística genérica para canais novos, dados reais do canal quando houver histórico.

## Decisões que moldaram o design

- **Fonte do vídeo:** upload do próprio usuário. O motor de conteúdo do app gera imagem, não vídeo; portanto a geração de vídeo por IA está **fora de escopo**. O usuário fornece o .mp4.
- **Base da sugestão de horário:** híbrida (heurística → dados do canal conforme histórico acumula).
- **Nível de métricas:** canal **+** por vídeo.
- **Arquitetura:** reusar o pipeline `posts` existente (agendamento, status, aprovação, calendário), em vez de criar um subsistema paralelo.

## Estado atual do código (ponto de partida)

- `lib/youtube/google.js` — OAuth Google (buildAuthUrl / exchangeCodeForToken / refreshAccessToken), `getChannel`, `uploadVideo` (resumível, já escrito, ainda não usado). **Untracked** no git.
- `app/api/youtube/oauth/route.js` + `app/api/youtube/callback/route.js` — fluxo OAuth completo, grava token em `social_tokens` (refresh_token no JSONB `platform_data`). **Untracked**.
- `data/platforms.js:10-11` — card YouTube `integrated: true`, `connectPath: '/api/youtube/oauth'`.
- Escopos atuais: `youtube.upload` + `youtube.readonly`. **Falta** `yt-analytics.readonly` para relatórios de métricas.
- `app/api/cron/publish-due/route.js` — cron de publicação; hoje filtra redes para `instagram`/`facebook` apenas.
- `supabase/migrations/20260708_social_analytics_and_logs.sql` — `social_analytics_history` (métrica de canal por dia) + `social_sync_logs`. Genéricos por `platform`.

## Arquitetura

Reuso do pipeline `posts`. Um vídeo agendado é uma linha em `posts` com `media_type='video'`, `networks=['youtube']`, `media_url` apontando para o arquivo no Supabase Storage. Módulos novos: storage de vídeo, ramo YouTube no cron de publicação, cron de sync de métricas, módulo puro de sugestão de horário, UI de composer/dashboard.

---

## Seção 1 — Modelo de dados

### `posts` (existente) — adicionar coluna

```sql
ALTER TABLE posts ADD COLUMN media_type text DEFAULT 'image';  -- 'image' | 'video'
```

Vídeo agendado: `media_type='video'`, `networks=['youtube']`, `media_url` = path no Storage, `platform_data = { title, description, privacy }`. Reusa `scheduled_at`, `status`, aprovação e calendário existentes.

### Supabase Storage — bucket novo

`brand-videos` (privado). Path `{brand_id}/{uuid}.mp4`. Upload do usuário vai direto para cá; o cron lê via signed URL na hora de publicar.

### `social_tokens` (existente)

Sem mudança de schema. YouTube já grava aqui, com `refresh_token` no JSONB `platform_data`.

### `social_analytics_history` (existente)

Sem mudança de schema. Métricas de **canal** por dia: `platform='youtube'`, `followers`=inscritos, `total_reach`=views. `engagement_rate` opcional.

### `youtube_video_stats` (nova) — métricas por vídeo

```sql
CREATE TABLE public.youtube_video_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,  -- vínculo com o agendamento
  video_id text NOT NULL,           -- id do vídeo no YouTube
  snapshot_date date NOT NULL,
  views int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  avg_view_pct numeric DEFAULT 0,   -- retenção média %
  watch_time_min int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (brand_id, video_id, snapshot_date)
);

ALTER TABLE public.youtube_video_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono da marca gerencia stats de vídeo" ON public.youtube_video_stats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.brands
            WHERE brands.id = youtube_video_stats.brand_id AND brands.user_id = auth.uid())
  );

CREATE INDEX idx_yt_video_stats_brand ON public.youtube_video_stats (brand_id, video_id);
CREATE INDEX idx_yt_video_stats_date ON public.youtube_video_stats (snapshot_date DESC);
```

O `video_id` do YouTube retornado no upload é gravado em `posts.platform_data.youtube_video_id`.

---

## Seção 2 — Upload do vídeo (usuário → Storage)

**Fluxo:**

1. Usuário abre o composer de vídeo: escolhe .mp4, título, descrição, data/hora de agendamento, privacidade (`private` | `unlisted` | `public`, default `private`).
2. Front solicita **signed upload URL** ao Supabase Storage (bucket `brand-videos`, path `{brand_id}/{uuid}.mp4`).
3. Browser sobe o arquivo **direto para o Storage** — não passa pelo servidor Next, evitando o limite de payload da serverless.
4. App cria a linha em `posts`: `media_type='video'`, `media_url=<path>`, `networks=['youtube']`, `status='scheduled'` (ou `waiting_approval` se a marca exige aprovação), `platform_data={ title, description, privacy }`.

**Validação no upload (mitigação do risco serverless):**

- Tamanho máximo MVP: **200 MB** (rejeita no client antes de subir).
- Tipos aceitos: `video/mp4`, `video/quicktime`.
- Duração: sem checagem no MVP (frágil no client); o limite de tamanho já contém o custo do upload.

Servidor Next nunca segura o arquivo inteiro — só orquestra. O cron lê os bytes do Storage na publicação.

---

## Seção 3 — Publicação (cron → YouTube)

Estende `app/api/cron/publish-due/route.js`. Novo ramo para `media_type='video'` com `youtube` em `networks`:

1. Cron seleciona `posts` due (`status='scheduled'`, `scheduled_at <= now`) de vídeo.
2. Renova o access_token via `refreshAccessToken` (access_token expira ~1h; refresh_token vive em `social_tokens.platform_data`).
3. Baixa os bytes do Storage (signed URL) → `uploadVideo` (resumível, já existe em `google.js`) com título/descrição/privacidade de `platform_data`.
4. Recebe `video_id` → grava em `posts.platform_data.youtube_video_id` + `status='published'`.
5. Erro (token, cota, tamanho) → `status='error'` + linha em `social_sync_logs`.

**Escopos** (`google.js`): manter `youtube.upload`, **adicionar** `yt-analytics.readonly`, manter `youtube.readonly`. Usuários já conectados precisam **reconectar** (novo escopo) — aviso na UI de Conexões. Remover `uploadVideo`? Não — permanece, é o núcleo da publicação.

**Risco serverless:** `maxDuration 60` no cron. Upload resumível de até 200 MB pode estourar o limite de tempo/memória. Mitigação MVP: tenta; se falhar/timeout, marca `error` e o usuário reagenda. Escalonamento futuro (fora de escopo): mover o upload para um job dedicado / fila.

---

## Seção 4 — Sync de métricas (cron diário)

Nova rota `app/api/cron/youtube-sync/route.js`, agendada 1x/dia (autenticada por `CRON_SECRET`, mesmo padrão do `publish-due`). Para cada marca com token YouTube ativo:

- **Canal** → YouTube Analytics API (`views`, `estimatedMinutesWatched`, `subscribersGained`) + Data API (total de inscritos). Grava snapshot do dia em `social_analytics_history` (`platform='youtube'`).
- **Por vídeo** → para cada vídeo publicado pelo app (`posts.platform_data.youtube_video_id` presente), Analytics API filtrando por `video==id`: views, likes, comments, retenção média (`averageViewPercentage`), watch time. Grava snapshot em `youtube_video_stats`.
- Registra duração + status em `social_sync_logs`.

**Funções novas em `lib/youtube/google.js`:**

- `getChannelStats(accessToken)` — agregado de canal do dia.
- `getVideoStats(accessToken, videoId, dateRange)` — métricas de um vídeo.

Endpoint base: `https://youtubeanalytics.googleapis.com/v2/reports`.

---

## Seção 5 — Sugestão de horário (híbrido)

Módulo puro `lib/youtube/best-times.js`, sem I/O (testável isolado):

```js
suggestBestTimes({ videoStats, publishHistory, timezone }) → [{ weekday, hour, score, basis }]
```

- **Sem histórico** (< N vídeos publicados, ex. N=5): heurística fixa por dia da semana — janelas conhecidas de engajamento no BR (ex.: ter/qui 19–21h, dom 10–12h). `basis='heuristic'`.
- **Com histórico**: cruza o horário de publicação de cada vídeo (`posts.scheduled_at`) com views/retenção de `youtube_video_stats`, rankeando as janelas que renderam mais. `basis='channel'`.
- Transição automática ao acumular dados suficientes.

Consumido pelo composer de vídeo (chip "Melhor horário: qui 20h") e por um card no dashboard.

---

## Seção 6 — UI

- **Composer de vídeo** — rota/aba nova para upload + agendamento (Seção 2), com chip de melhor horário (Seção 5).
- **Dashboard** — card de tendência YouTube (reusa `FollowerTrend` com dados de `social_analytics_history`) + lista de vídeos publicados com stats (`youtube_video_stats`).
- **Conexões** (`data/platforms.js`) — manter `caps: ['Vídeos','Shorts']`; adicionar aviso "reconecte para ativar métricas" para quem conectou no escopo antigo.
- **Calendar** — vídeos agendados aparecem no calendário existente (já lê `posts`), com ícone distinto por `media_type`.

---

## Fora de escopo

- Geração de vídeo por IA.
- Conversão de imagem em vídeo/Short.
- Upload de vídeo em job dedicado / fila (escalonamento além de 200 MB).
- Checagem de duração de vídeo.

## Riscos e mitigações

| Risco | Mitigação MVP |
|-------|---------------|
| Upload de vídeo grande estoura `maxDuration 60` da serverless | Limite de 200 MB; em falha, `status='error'` + reagendar. Job dedicado no futuro. |
| Usuários já conectados sem escopo `yt-analytics.readonly` | Aviso na UI para reconectar. |
| Cota da YouTube Data/Analytics API | Sync 1x/dia por marca; log de erros em `social_sync_logs`. |
| Canal novo sem histórico para horários | Heurística genérica até acumular dados. |

## Critérios de sucesso

1. Usuário conecta o YouTube (escopo com analytics) e vê o canal identificado em Conexões.
2. Usuário sobe um .mp4, agenda, e o vídeo é publicado no YouTube no horário marcado.
3. Dashboard mostra tendência do canal e stats por vídeo, atualizados diariamente.
4. Composer sugere um horário — genérico no início, personalizado quando há histórico.
