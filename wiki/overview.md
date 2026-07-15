---
title: SocialHub PRO — Visão Geral
description: "Ponto de entrada da wiki: o que é o produto, status atual do rewrite e mapa dos demais documentos."
tags:
  - wiki
  - overview
---
# SocialHub PRO — Visão Geral

**SocialHub PRO** é um SaaS de gerenciamento de redes sociais multi-marca para agências: workspaces por marca/cliente, agendamento de posts, calendário editorial, geração de conteúdo por IA on-brand, métricas reais do Instagram e workflow de aprovação externa por link (sem login para o cliente final).

Este diretório (`wiki/`) é uma base de conhecimento gerada por análise do código-fonte em 2026-07-14, para que agentes de IA futuros entendam o projeto sem precisar re-explorar o repositório do zero.

## Status atual (2026-07-14)

O projeto passou por um **rewrite total** (decisão de 2026-07-10, ver [Decisões de projeto](./decisions.md)) do antigo SPA Vite (preservado em `legacy/`) para **Next.js 14 (App Router)**, numa base chamada **"Núcleo Honesto"**: nenhum dado exibido pode ser inventado. A integração real do Instagram/Facebook (OAuth Meta + publicação + métricas) foi portada e validada ponta a ponta; as demais redes sociais aparecem como **"Em breve"** até ganharem integração real.

Os marcos M1–M5 do núcleo honesto estão **completos e verificados ao vivo**: login → marca ativa → conectar Instagram → métricas reais → publicar → agendar (cron) → calendário → aprovação por link. Em cima dessa base, a feature **Brand DNA AI** (branch `feat/brand-dna-ai`, branch atual no momento desta análise) adiciona onboarding guiado (wizard) + análise de marca por IA que alimenta a geração de conteúdo.

## Mapa da wiki

| Documento | Conteúdo |
|---|---|
| [Arquitetura e stack](./architecture.md) | Stack técnica, estrutura de pastas, modelo de renderização (server/client components) |
| [Rotas, auth e fluxo da aplicação](./app-flow.md) | Mapa de rotas do App Router, middleware de sessão, rotas de API |
| [Componentes e design system](./components.md) | Mapa de `components/`, convenções visuais, fluxo do wizard de Brand DNA |
| [Banco de dados (Supabase)](./database.md) | Schema, RLS, funções RPC, padrão de uso dos clientes Supabase |
| [Motor de conteúdo IA](./ai-engine.md) | Provedores de IA, coleta de Brand DNA, pipeline de renderização de imagem, custo |
| [Servidor MCP standalone](./mcp-server.md) | `mcp-servers/social-hub-mcp` — automação multi-rede via protocolo MCP (sandbox) |
| [Testes e deploy](./testing-deploy.md) | Vitest/Playwright, deploy Vercel, limitações do cron |
| [Decisões de projeto](./decisions.md) | Histórico de decisões-chave: rewrite, pivot de provider de IA, contas Supabase |

## Princípios inegociáveis do produto

- **Nada de dados simulados.** Sem métricas fabricadas, sem conexão falsa, sem falso sucesso de publicação — reforçado por estados de erro explícitos em vez de fallback fake.
- **Apenas Instagram/Facebook são integrações reais** hoje (Meta Graph API v21.0). Qualquer outra rede exibida como conectada seria uma regressão ao comportamento antigo (ver [Decisões de projeto](./decisions.md)).
- **Isolamento multi-tenant via RLS**: cada usuário só vê/edita as próprias marcas e posts; o link público de aprovação usa uma função RPC `SECURITY DEFINER` em vez de abrir a tabela `posts`.
