---
title: Servidor MCP Standalone
description: "mcp-servers/social-hub-mcp: automação multi-rede via Model Context Protocol, desacoplada do app Next.js."
tags:
  - wiki
  - mcp
  - automation
---
# Servidor MCP Standalone (`mcp-servers/social-hub-mcp`)

Relacionado ao app principal em [Visão geral](./overview.md), mas **código e runtime totalmente separados** — não é importado por `app/`, `components/` ou `lib/`.

## O que é

Um servidor Node.js seguindo o padrão **Model Context Protocol (MCP)**, standalone (`package.json` próprio em `mcp-servers/social-hub-mcp/`), que expõe 10 ferramentas de automação de redes sociais para agentes de IA (Claude Desktop, Antigravity, Cline etc.) via transporte Stdio:

| Ferramenta | O que faz |
|---|---|
| `meta_post_instagram` | Publica foto/vídeo no feed do Instagram |
| `meta_get_analytics` | Consulta alcance/impressões/top posts (Instagram/Facebook) |
| `youtube_upload_short` | Envia vídeo curto pro YouTube Shorts |
| `youtube_get_channel_stats` | Estatísticas do canal |
| `tiktok_post_video` | Publica vídeo no TikTok via URL |
| `tiktok_get_analytics` | Engajamento/curtidas/seguidores no TikTok |
| `spotify_get_episodes` | Lista episódios de podcast |
| `spotify_create_show_note_link` | Insere links de apoio nas show notes |
| `whatsapp_send_message` | Envia mensagem de texto via WhatsApp Cloud API |
| `whatsapp_send_media` | Envia foto/vídeo/documento via WhatsApp |

Estrutura: `src/index.js` (inicialização do transporte + registro das tools) + `src/platforms/{meta,youtube,tiktok,spotify,whatsapp}.js`.

## Modo Sandbox

Sem chaves reais de API (ou usando `"demo_token"`), o servidor **não falha** — processa em modo sandbox e retorna respostas simuladas de alta fidelidade. Se uma API real falhar (token expirado, cota, permissão), captura o erro e faz fallback pra simulação.

> ⚠️ **Isso contrasta com o princípio "núcleo honesto, zero dado simulado" do app Next.js principal** (ver [Visão geral](./overview.md) e [Decisões de projeto](./decisions.md)). O MCP server é uma ferramenta separada para uso via agente de IA — não deve ser confundido com, nem usado como substituto para, a integração real do Instagram/Facebook que vive em `lib/meta/graph.js` e nas rotas `app/api/meta/*`/`app/api/social/*`. Redes além de Instagram/Facebook não têm integração real em nenhuma das duas partes do repositório.

## Configuração

Registrado no config do cliente MCP (ex.: `claude_desktop_config.json`) apontando `command: node` para `mcp-servers/social-hub-mcp/src/index.js`, com env vars opcionais (`META_ACCESS_TOKEN`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`) — sem elas, roda em sandbox.
