# Auditoria do Projeto — Social Hub

> Snapshot em 2026-07-18. Gestor de redes sociais com IA — núcleo honesto (sem mock, custo real logado, sem inventar fatos).

## 1. Visão geral

Social Hub não é só gerador de legenda: entende marca (Brand DNA), acompanha assuntos atuais, propõe estratégia, monta planejamento semanal, gera posts completos e permite aprovação humana antes de publicar. Usuário não escolhe modelo de IA — o sistema roteia nos bastidores.

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 |
| UI | Tailwind CSS, Radix UI, Recharts, lucide-react |
| Banco/Auth | Supabase (Postgres + Auth) |
| Hospedagem | Railway (substituiu Vercel) |
| Testes | Vitest (392 unit tests), Playwright (e2e) |
| Imagem | sharp, next/og (render on-brand sem custo) |

## 3. APIs de IA e custo (stack enxuta — PRD 2026-07-18: 4 → 2 APIs)

| API | Função | Modelo default | Custo aprox. |
|---|---|---|---|
| **DeepSeek** | escritor único do texto final (copy, legenda, CTA, hashtags, roteiro) | `deepseek-v4-flash` | $0.14/M in · $0.28/M out |
| **Pollinations** — pesquisa | contexto atual (notícias, tendências) via `gemini-search` (Gemini grounding por trás, sem billing Google) | `gemini-search` | ~$0.001/busca |
| **Pollinations** — imagem | imagem do post e variações de notícia, 1080×1080 sem watermark | `flux` | ~$0.002/imagem (sem chave → fallback next/og grátis) |

Removidos na refatoração: **Gemini** (grounding exigia billing), **deAPI** (créditos pré-pagos), **Tavily** (futuro incerto). Preços em `lib/ai/cost.js` — ajustáveis via env (`POLLINATIONS_IMAGE_USD`, `POLLINATIONS_SEARCH_USD`).

## 4. Motor de conteúdo e pesquisa

Fluxo: `needsResearch(brief)` (heurística, sem custo) → se depende de info atual → `researchContext` via **Pollinations gemini-search** → contexto injetado no prompt → **DeepSeek** escreve o post final.

Regras duras:
- DeepSeek é sempre o único escritor; a pesquisa nunca escreve o post.
- Fontes da pesquisa ficam só em log/cache — nunca aparecem na UI.
- Pesquisa obrigatória que falha = erro (`ResearchUnavailableError`), **nada é gerado** — sem fallback silencioso, sem inventar tendência/notícia.
- Autopilot: slot com pesquisa indisponível é pulado; demais slots/marcas seguem.
- Cache de pesquisa 6h (`research_cache`, chave = hash da query) reduz custo duplicado.
- Todo custo (pesquisa/texto/imagem) logado separado em `generation_jobs`.

Design completo: [docs/superpowers/specs/2026-07-18-motor-pesquisa-conteudo.md](superpowers/specs/2026-07-18-motor-pesquisa-conteudo.md).

## 5. Integrações sociais

| Rede | Status |
|---|---|
| Instagram / Facebook (Meta) | **OAuth real** + publicação real (`app/api/meta/`, `app/api/social/publish`) |
| YouTube | **OAuth real** + sync de métricas (`app/api/youtube/`, cron `youtube-sync`) |
| Outras redes | mockadas, em processo de remoção |

## 6. Infra e deploy

- **Railway** hospeda a aplicação (Node standalone).
- **Supabase** = banco + Auth. Schema do banco de produção **diverge das migrations locais** — sondar o banco antes de qualquer DDL; aplicar migrações novas à mão no SQL Editor.
- **Cron** a cada 5min: `publish-due` (fila de publicação com idempotência via estado `publishing`) e `youtube-sync`.

## 7. Rotas principais

**Páginas** (`app/(app)/`): dashboard, composer, autopilot, calendar, planning, brand-kit, approvals, content/[id], instagram/diagnostico, ai-costs, connections, metrics.

**API** (`app/api/`): `cron/publish-due`, `cron/youtube-sync`, `meta/oauth`, `meta/callback`, `youtube/oauth`, `youtube/callback`, `social/publish`, `social/sync`, `approval/submit`, `render`.

Fluxo público de aprovação: `app/approve/[token]` (link enviado ao cliente, sem login).

## 8. Mapa de `lib/`

| Domínio | Arquivos-chave |
|---|---|
| IA | `ai/generate.js`, `ai/prompt.js`, `ai/research.js`, `ai/deepseek.js`, `ai/tavily.js`, `ai/gemini.js`, `ai/deapi.js`, `ai/cost.js`, `ai/jobs.js`, `ai-actions.js`, `ai-costs-data.js` |
| Autopilot / planejamento | `autopilot.js`, `autopilot-schedule.js`, `planning-actions.js`, `planning-data.js`, `content-plan-*.js` |
| Aprovação | `approval-actions.js`, `approval-flow.js` |
| Marca / Brand DNA | `brands.js`, `brands-data.js`, `brand-kit-*.js`, `dna-*.js`, `onboarding-actions.js` |
| Posts / conteúdo | `posts-actions.js`, `posts-data.js`, `posts-media.js`, `content-actions.js`, `content-production.js`, `pipeline.js`, `formats.js` |
| Métricas / calendário | `metrics-data.js`, `calendar.js` |
| Redes / OAuth | `social-tokens.js`, `social-tokens-data.js`, `youtube-data.js` |
| Instagram | `instagram-audit-actions.js`, `instagram-audit-data.js` |

## 9. Variáveis de ambiente (chaves, ver `.env.example`)

| Chave | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `DEEPSEEK_API_KEY` | texto (escritor final) |
| `POLLINATIONS_SECRET_KEY`, `POLLINATIONS_IMAGE_MODEL`, `POLLINATIONS_IMAGE_USD`, `POLLINATIONS_SEARCH_USD` | imagem (flux) + pesquisa (gemini-search) |
| `META_APP_ID`, `META_APP_SECRET` | OAuth Instagram/Facebook |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth YouTube |
| `CRON_SECRET` | autentica chamadas de cron |
| `APP_URL` | base URL da app |

## 10. Pendências conhecidas

1. Migração `supabase/migrations/20260718_research_cache.sql` **não aplicada** no banco de produção (SQL Editor) — cache de pesquisa degrada sem ela, mas o fluxo funciona.
2. `POLLINATIONS_SECRET_KEY` **não setada no Railway** — só em `.env.local`; remover `GEMINI_API_KEY`/`TAVILY_API_KEY`/`DEAPI_API_KEY` do Railway se existirem.
3. Redes sociais mockadas ainda a remover da UI.
4. Deploy do frontend no Vercel (RF-06 do PRD) — adiado, fora desta rodada.

## 11. Testes

- `npm test` → 393 testes unitários (Vitest), todos verdes.
- `npm run build` → build de produção validado.
- `npm run e2e` → Playwright disponível para testes ponta-a-ponta.
