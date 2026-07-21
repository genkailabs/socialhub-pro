# Integração YouTube — Design (métricas + horários)

- **Data:** 2026-07-14
- **Branch:** feat/brand-dna-ai
- **Status:** Aprovado (aguardando revisão do spec antes do plano de implementação)

## Objetivo

Integrar o YouTube ao gerenciador para **acompanhar métricas** do canal e **sugerir horários de postagem**, com foco em atrair engajamento e facilitar o planejamento. O app **não** publica nem armazena vídeo: o usuário sobe o vídeo direto no YouTube; o app só puxa e trabalha as métricas.

Capacidades:

1. **Acompanhamento de métricas** — canal (inscritos, views, watch time) e por vídeo (views, likes, comments, retenção), de **todos os uploads do canal**.
2. **Sugestões de horário de postagem** — híbrido: heurística genérica quando não há histórico suficiente; dados reais do canal (horário de publicação × desempenho) quando há.

## Decisões que moldaram o design

- **Sem upload pela plataforma.** O usuário publica o vídeo direto no YouTube. Evita lidar com arquivos grandes e limites de serverless. O app é **read-only** sobre o YouTube.
- **Cobertura de vídeos:** todos os uploads do canal (via YouTube Data API), não apenas conteúdo criado no app.
- **Base da sugestão de horário:** híbrida (heurística → dados do canal). Como o histórico do canal já existe desde o dia 1, a personalização não depende de o usuário postar pelo app.
- **Nível de métricas:** canal **+** por vídeo.
- **Arquitetura:** subsistema de leitura enxuto — OAuth (só leitura) + cron diário de sync + módulo puro de horários + UI de dashboard. Não toca no pipeline `posts` nem no cron de publicação.

## Estado atual do código (ponto de partida)

- `lib/youtube/google.js` — OAuth Google (buildAuthUrl / exchangeCodeForToken / refreshAccessToken), `getChannel`, `uploadVideo`. **Untracked** no git.
- `app/api/youtube/oauth/route.js` + `app/api/youtube/callback/route.js` — fluxo OAuth completo; grava token em `social_tokens` (refresh_token no JSONB `platform_data`). **Untracked**.
- `data/platforms.js:10-11` — card YouTube `integrated: true`, `connectPath: '/api/youtube/oauth'`.
- Escopos atuais: `youtube.upload` + `youtube.readonly`.
- `supabase/migrations/20260708_social_analytics_and_logs.sql` — `social_analytics_history` (métrica de canal por dia) + `social_sync_logs`, genéricos por `platform`.

### Mudanças no que já existe

- **`google.js`:** remover `uploadVideo` (não há mais upload). Trocar escopos para `youtube.readonly` + `yt-analytics.readonly` (remove `youtube.upload`). Adicionar funções de leitura de métricas e de listagem de vídeos.
- **`publish-due`:** **sem alteração** — YouTube não publica pelo app.

## Arquitetura

Subsistema de leitura. OAuth (só leitura) identifica o canal e guarda tokens. Um cron diário lê a YouTube Data API (lista de uploads + total de inscritos) e a YouTube Analytics API (desempenho de canal e por vídeo), grava snapshots no banco. Um módulo puro calcula os melhores horários a partir desses snapshots. A UI mostra tendência do canal, stats por vídeo e a sugestão de horário.

---

## Seção 1 — Modelo de dados

### `social_tokens` (existente)

Sem mudança de schema. YouTube grava aqui, com `refresh_token` no JSONB `platform_data`.

### `social_analytics_history` (existente)

Sem mudança de schema. Métricas de **canal** por dia: `platform='youtube'`, `followers`=inscritos, `total_reach`=views. `engagement_rate` opcional.

### `youtube_video_stats` (nova) — métricas por vídeo

```sql
CREATE TABLE public.youtube_video_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  video_id text NOT NULL,            -- id do vídeo no YouTube
  title text,                        -- título do vídeo (cache p/ UI)
  published_at timestamptz,          -- quando o usuário publicou no YouTube (Data API)
  snapshot_date date NOT NULL,
  views int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  avg_view_pct numeric DEFAULT 0,    -- retenção média %
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

`published_at` (da Data API) é o insumo central da sugestão de horário — dá o horário real em que cada vídeo foi publicado, cruzado com desempenho.

---

## Seção 2 — Conexão (OAuth só leitura)

Fluxo OAuth já existe; ajustes:

- **Escopos:** `youtube.readonly` (listar canal/uploads) + `yt-analytics.readonly` (relatórios de métricas). Remove `youtube.upload`.
- **Callback:** sem mudança de lógica — `getChannel` identifica o canal, grava token em `social_tokens`.
- **Reconexão:** usuários já conectados no escopo antigo precisam **reconectar** para conceder `yt-analytics.readonly`. Aviso na UI de Conexões.

---

## Seção 3 — Sync de métricas (cron diário)

Nova rota `app/api/cron/youtube-sync/route.js`, agendada 1x/dia, autenticada por `CRON_SECRET` (mesmo padrão de `publish-due`). Para cada marca com token YouTube ativo:

1. Renova o access_token via `refreshAccessToken` (expira ~1h; refresh_token em `social_tokens.platform_data`).
2. **Canal** → Analytics API (`views`, `estimatedMinutesWatched`, `subscribersGained`) + Data API (total de inscritos). Grava snapshot do dia em `social_analytics_history` (`platform='youtube'`).
3. **Uploads do canal** → Data API lista os vídeos do canal (`playlistItems` da playlist de uploads): `video_id`, `title`, `published_at`.
4. **Por vídeo** → Analytics API filtrando por `video==id`: views, likes, comments, `averageViewPercentage`, watch time. Grava snapshot em `youtube_video_stats`.
5. Registra duração + status em `social_sync_logs`.

**Funções novas em `lib/youtube/google.js`:**

- `getChannelStats(accessToken)` — agregado de canal do dia.
- `listChannelVideos(accessToken)` — uploads do canal (id, título, publishedAt).
- `getVideoStats(accessToken, videoId, dateRange)` — métricas de um vídeo.

Endpoints: `https://www.googleapis.com/youtube/v3` (Data), `https://youtubeanalytics.googleapis.com/v2/reports` (Analytics).

**Limite MVP:** sincronizar até os N vídeos mais recentes do canal (ex.: 25) para conter uso de cota. Ajustável.

---

## Seção 4 — Sugestão de horário (híbrido)

Módulo puro `lib/youtube/best-times.js`, sem I/O (testável isolado):

```js
suggestBestTimes({ videoStats, timezone }) → [{ weekday, hour, score, basis }]
```

- **Sem histórico suficiente** (< N vídeos com métrica, ex. N=5): heurística fixa por dia da semana — janelas conhecidas de engajamento no BR (ex.: ter/qui 19–21h, dom 10–12h). `basis='heuristic'`.
- **Com histórico**: cruza `published_at` de cada vídeo (horário real de publicação) com views/retenção de `youtube_video_stats`, rankeando as janelas que renderam mais. `basis='channel'`.
- Transição automática ao acumular dados suficientes.

Consumido por um card no dashboard ("Melhor horário para postar: qui 20h"). Como o app não agenda, a sugestão é orientação — o usuário publica no YouTube quando quiser.

---

## Seção 5 — UI

- **Dashboard** — card de tendência YouTube (reusa `FollowerTrend` com dados de `social_analytics_history`) + lista de vídeos do canal com stats (`youtube_video_stats`) + card de melhor horário (Seção 4).
- **Conexões** (`data/platforms.js`) — trocar `caps` do YouTube de `['Vídeos','Shorts']` para algo de análise (ex.: `['Métricas','Analytics']`), já que o app não publica; adicionar aviso "reconecte para ativar métricas" para quem conectou no escopo antigo.

---

## Fora de escopo

- Upload/publicação de vídeo pela plataforma (usuário publica direto no YouTube).
- Agendamento de postagens no YouTube.
- Geração de vídeo por IA / conversão de imagem em vídeo.

## Riscos e mitigações

| Risco | Mitigação MVP |
|-------|---------------|
| Usuários já conectados sem escopo `yt-analytics.readonly` | Aviso na UI para reconectar. |
| Cota da YouTube Data/Analytics API | Sync 1x/dia por marca; limitar a N vídeos mais recentes; log de erros em `social_sync_logs`. |
| Canal novo sem histórico para horários | Heurística genérica até acumular dados. |
| Vídeos antigos com muitos uploads | Limite de N vídeos por sync; paginação futura se necessário. |

## Critérios de sucesso

1. Usuário conecta o YouTube (escopo com analytics) e vê o canal identificado em Conexões.
2. Dashboard mostra tendência do canal e stats por vídeo, atualizados diariamente pelo cron.
3. Dashboard sugere um horário de postagem — genérico no início, personalizado conforme o histórico do canal cresce.
4. Nenhum arquivo de vídeo transita ou é armazenado pela plataforma.
