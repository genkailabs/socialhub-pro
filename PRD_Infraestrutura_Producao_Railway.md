# PRD — Infraestrutura de Produção: Migração para Railway

**Versão:** 1.0
**Data:** 2026-07-20
**Status:** Aprovado para implementação — você vai assinar o plano do Railway
**Executor do código:** Claude Code
**Executor das etapas de painel/DNS:** você (login em Railway, Cloudflare, Sentry — nenhuma dessas contas pode ser criada pelo Claude Code)

---

## 1. Contexto

Hoje o Social Hub roda assim:

- **Hospedagem do Next.js:** Render (`render.yaml`), plano free — "dorme" após ~15 min de inatividade, 30-60s pra acordar.
- **Banco, Auth, Storage, Cron:** Supabase — inclui as Edge Functions de publicação e sync do YouTube, migradas do Railway para o Supabase em 19/07. Isso **não muda** neste PRD.
- **IA:** DeepSeek (texto) e Pollinations (imagem/pesquisa) — chamadas que podem levar vários segundos.
- **Sem monitoramento de erro:** não há Sentry, Logtail, Datadog ou equivalente no projeto hoje.

Decisão tomada: sair do Render e hospedar o Next.js no **Railway**, mantendo tudo o mais como está.

## 2. Por que Railway e não Vercel

O `next.config.js` já usa `output: 'standalone'` — formato pensado para rodar em container (Docker), o modelo do Railway e do Render, não o modelo serverless da Vercel. As chamadas de IA deste projeto não têm `maxDuration` configurado e podem passar de alguns segundos; em funções serverless da Vercel isso arrisca timeout (10s no plano Hobby, 60s no Pro sem configuração extra). Migrar para Vercel exigiria reescrever parte da arquitetura (remover `standalone`, configurar limites, possivelmente mover geração de IA para fila/background job). Railway aceita o projeto como está, sem mudança de arquitetura.

## 3. O que muda e o que não muda

**Muda:**
- Onde o Next.js roda: Render → Railway.
- Onde o domínio aponta (DNS).
- Adição de monitoramento de erro (Sentry) e CDN na frente do domínio (Cloudflare) — aproveitando a janela de migração para fechar essas duas lacunas de produção.

**Não muda:**
- Supabase (banco, auth, storage, Edge Functions de cron) — nenhuma alteração.
- Código da aplicação, rotas, componentes, skills de IA — nenhuma mudança funcional.
- `next.config.js` / `output: 'standalone'` — continua igual, é justamente o que torna a migração simples.

---

## 4. Requisitos

### 4.1 Configuração do Railway (código)

**RF-01:** Criar `railway.json` na raiz do projeto, espelhando o que `render.yaml` já descreve hoje (build `npm ci && npm run build`, start `npm start`, healthcheck em `/`), para a configuração do serviço ficar versionada e não depender só de cliques no painel.

**RF-02:** Confirmar que `scripts/start-server.cjs` e `scripts/prepare-standalone.cjs` funcionam sem nenhuma variável de ambiente exclusiva do Render (ex.: nenhuma referência hardcoded a `RENDER_*`). Se houver, tornar genérico.

**RF-03:** Documentar em `.env.example` (já existe) a lista completa de variáveis que precisam ser cadastradas no painel do Railway — a mesma lista que já está em `render.yaml`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `META_APP_ID`, `META_APP_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `POLLINATIONS_SECRET_KEY`, `DEAPI_API_KEY`.

**RF-04:** `APP_URL` precisa apontar para o domínio final em produção (o mesmo domínio configurado no Cloudflare/Railway) — usado no callback do Meta OAuth (`app/api/meta/callback/route.js`) e no `middleware.js`. Se o domínio mudar, o app Meta (Facebook Developer) também precisa ter a Redirect URI atualizada — isso é manual, fora do código.

### 4.2 Observabilidade (código + conta)

**RF-05:** Adicionar Sentry (`@sentry/nextjs`) ao projeto: instrumentação de servidor e cliente, captura de erros nas Server Actions (onde hoje os erros só viram `{ error: message }` devolvido pra UI, sem registro nenhum em lugar nenhum). Não expor DSN nem segredo no client além do necessário pelo próprio SDK.
**RF-06 (manual, sua conta):** Criar conta Sentry (tem free tier), gerar o DSN, cadastrar como variável de ambiente no Railway.

### 4.3 CDN / DNS (manual, sua conta)

**RF-07:** Colocar o domínio atrás do Cloudflare (proxy DNS, grátis) — cache de imagens e assets estáticos, proteção básica contra abuso.
**RF-08:** Apontar o DNS do domínio para o Railway (CNAME conforme o painel do Railway indicar) depois que o app estiver validado rodando lá.

### 4.4 Corte (cutover) e rollback

**RF-09:** Rodar Railway e Render **em paralelo** por um período curto de validação (domínio de teste do próprio Railway, tipo `algo.up.railway.app`) antes de apontar o domínio de produção para lá.
**RF-10:** Só desligar o serviço no Render depois de confirmar em produção: login, conexão Meta, geração de conteúdo (IA), publicação agendada (via Edge Function do Supabase, que já independe de onde o Next.js roda) e o cron do YouTube.
**RF-11:** Manter o Render pausado (não excluído) por pelo menos alguns dias após o corte, como plano B caso apareça algum problema só visível com tráfego real.

---

## 5. Passo a passo — o que é código (Claude Code) e o que é manual (você)

**Claude Code faz:**
1. RF-01/RF-02/RF-03 — criar `railway.json`, garantir scripts genéricos, documentar env vars.
2. RF-05 — instalar e configurar o Sentry no código.

**Você faz, fora do repositório:**
1. Criar conta/projeto no Railway, conectar o repositório GitHub.
2. Colar as variáveis de ambiente da RF-03 no painel do Railway.
3. Criar conta no Sentry, gerar o DSN, colar no painel do Railway (RF-06).
4. Validar o app rodando no domínio temporário do Railway (RF-09).
5. Colocar o domínio no Cloudflare (RF-07).
6. Atualizar a Redirect URI do app Meta para o domínio final, se ele mudar (RF-04).
7. Apontar o DNS de produção para o Railway (RF-08).
8. Confirmar tudo funcionando, então pausar o Render (RF-10/RF-11).

---

## 6. Critérios de aceitação

- App funcionando em produção no Railway, sem cold start perceptível.
- Login, conexão Meta, geração de conteúdo por IA e publicação agendada funcionando sem diferença em relação ao Render.
- Erros de produção aparecendo no Sentry (testar um erro proposital antes de considerar concluído).
- Domínio servido atrás do Cloudflare.
- Render pausado, não excluído, mantido como rollback por um período de segurança.

## 7. Riscos e observações

- A troca de domínio/host pode invalidar o token de conexão do Instagram se a Redirect URI do Meta não for atualizada a tempo (RF-04) — isso quebraria a publicação até reconectar. Fazer essa atualização **antes** do corte de DNS, não depois.
- Nenhuma mudança aqui afeta o Supabase ou as Edge Functions de cron — elas continuam publicando e sincronizando independentemente de o Next.js estar no Render ou no Railway.
