---
title: Decisões de Projeto
description: "Histórico das decisões-chave: rewrite para Next.js, pivot de provider de IA, contas Supabase, integrações reais x mockadas."
tags:
  - wiki
  - decisions
  - history
---
# Decisões de Projeto

Contexto de produto: [Visão geral](./overview.md). Impacto técnico das decisões de IA: [Motor de conteúdo IA](./ai-engine.md). Impacto no schema: [Banco de dados](./database.md).

## Rewrite total para Next.js — "Núcleo Honesto" (2026-07-10)

O usuário aprovou um rewrite completo do SPA Vite anterior (preservado em `legacy/`) para **Next.js (App Router)**, portando a lógica de Graph API do Instagram já comprovada em vez de re-derivar.

- **Escopo v1 "núcleo honesto":** Auth, Workspaces/Marcas, Conexões (IG/FB real + demais "Em breve" desabilitado), Composer, Agendamento (Vercel Cron), Calendário, Aprovação por link, Métricas reais de IG. **Fora de escopo:** Inbox, Relatórios multi-rede, Grid Planner, White-Label.
- **Princípio inegociável:** nenhum dado exibido pode ser inventado — sem métricas fabricadas, sem conexão falsa, sem falso sucesso de publicação.
- **Visual:** "Studio Light" — claro, acento violeta `#6366F1` (testou-se antes um visual "Vivid Agency" mais colorido).
- **Segurança:** o `META_APP_SECRET` que estava commitado no histórico do git foi tratado como comprometido e rotacionado; RLS que vazava dados entre marcas foi corrigida (removido fallback "qualquer token ativo"/hardcode de marca).

Os marcos **M1 a M5 foram completados e verificados ao vivo** em sequência (fundação → marcas → conexão IG real → métricas reais → composer/publicação real → agendamento via cron → calendário + aprovação por link), fechando o loop completo: login → marca → conectar IG → métricas reais → publicar → agendar → calendário → aprovação. Deploy de produção feito via `vercel deploy --prod` em 2026-07-11.

Um bug real encontrado apenas em runtime (não pego pelo `next build`): Server Component não pode passar função (ícone lucide) como prop pra Client Component — corrigido passando `platformId` e resolvendo via `platformById` no client.

## Integrações reais vs. mockadas

Apenas **Instagram/Facebook são reais** (Meta Graph API v21.0): OAuth completo (`app/api/meta/oauth|callback`), descoberta de conta IG Business, publicação e métricas reais. **Todas as demais redes eram fakes no app antigo** (TikTok/LinkedIn/X/Pinterest/Spotify com `setTimeout` simulando OAuth, WhatsApp QR falso, métricas de dashboard fabricadas por arrays de fatores fixos, Inbox com personas hardcoded) — esse comportamento está sendo removido no rewrite; o padrão atual é exibir "Em breve" em vez de simular. Ver também [Servidor MCP standalone](./mcp-server.md), que roda em modo sandbox por design mas é desacoplado do app principal.

## Brand DNA AI: MVP e pivot de provider (2026-07-13)

Brainstorm formal (PRD "Brand DNA AI") validou a hipótese central: **IA entende e padroniza a marca do cliente** o suficiente pra virar a base de geração de conteúdo. Decisões travadas:

- **Estende `brand_kits`** em vez de criar tabela concorrente (colunas nullable + `dna_report`/`dna_sources`/`dna_generated_at` JSONB).
- **4 fontes no MVP, sem scraping** (criador manual, IG próprio, site, texto colado) — scraping/concorrentes fica pra versão premium.
- **1 chamada única** ao provider de texto com 6 "lentes" destiladas no prompt (branding/instagram/copy/design/growth/concorrência) — não é multi-agente real.
- **Aprendizado mínimo:** grava sinal de aprovar/rejeitar/editar; **não** reescreve o DNA automaticamente.

**Pivot de provider testado e revertido no mesmo dia:** cogitou-se migrar texto+imagem pra um único provider Gemini. Foi **revertido** (commit `a230fe6`) porque o free tier do Gemini tinha `limit: 0` pra geração de imagem (exige billing no Google Cloud) e o modelo de texto testado foi descontinuado pra chaves novas (404 no `generateContent`; só funcionava via alias `gemini-flash-latest`). Voltou-se ao provider vigente: **DeepSeek (texto) + deAPI (imagem)**, com render on-brand como fallback zero-custo (ver [Motor de conteúdo IA](./ai-engine.md)). Os clientes `lib/ai/gemini*.js` ficaram órfãos no código (não importados no caminho principal) — candidatos a limpeza futura, não removidos por decisão explícita.

## Contas/projetos Supabase

- **Projeto ativo:** ref `geoqbbrlyepmhwgdbjmz` ("genkailabs's Project", org genkailabs), migrado em 2026-07-08. `.env` local, env vars da Vercel (prod+preview) e `supabase/.temp/project-ref` apontam pra ele.
- **Projeto morto (não usar):** ref `qmubkbszgjnaeeeyylgz` (nome "HubSocialMedia", região sa-east-1) — domínio não existe mais (DNS deletado). Já causou um bug de produção (login Google silenciosamente não funcionava porque o build da Vercel estava com essa URL morta embutida); corrigido trocando as env vars da Vercel pra `geoq` e re-deploy.
- **Migrações aplicadas à mão:** `20260712_ai_content.sql`, `20260713_brand_dna.sql` e `20260714_brand_onboarding.sql` foram todas aplicadas manualmente via SQL Editor (não `supabase db push`) — o projeto foi construído à mão e o histórico de migração do CLI ficou dessincronizado (migrações antigas têm dependências faltando, tipo `set_updated_at()`). Um `db push` futuro deve re-aplicar como no-op.
- Sempre confirmar o e-mail logado antes de recomendar mudanças no banco — há histórico de confusão entre contas/projetos Supabase neste workspace.
