---
title: Motor de Conteúdo IA
description: Provedores de IA, coleta de Brand DNA, pipeline de renderização de imagem e rastreio de custo.
tags:
  - wiki
  - ai
  - brand-dna
  - deepseek
---
# Motor de Conteúdo IA

UI que consome este motor: [Componentes e design system](./components.md) (`AIStudioPanel`, wizard de Brand DNA). Tabelas envolvidas: [Banco de dados](./database.md) (`brand_kits`, `content_plans`, `generation_jobs`, `dna_signals`). Histórico da decisão de provider: [Decisões de projeto](./decisions.md).

## Diferencial de produto

O app **fabrica** a linha editorial diária on-brand e injeta nos trilhos de aprovação + publicação já existentes (composer manual, calendário, aprovação por link) — diferencial frente a mLabs/Etus.

## Provedores (estado atual)

| Função | Provider ativo | Arquivo | Observação |
|---|---|---|---|
| Texto/copy (posts, análise de DNA) | **DeepSeek** (`deepseek-v4-flash` default, modo JSON) | `lib/ai/deepseek.js` | Único provider de texto usado no caminho principal |
| Imagem | **deAPI** (preferido quando `DEAPI_API_KEY` existe) | `lib/ai/deapi.js` | Suporta endpoint síncrono OpenAI-compat (chaves `dpn-sk-`) e endpoint nativo assíncrono com polling (chave `<id>|token`); modelo default `Flux1schnell` |
| Imagem (fallback zero-custo) | Render on-brand via `next/og` | `lib/ai/render.jsx` + `lib/ai/templates.js` | Usado quando não há chave de imagem — templates `quote`/`tips_carousel`/`promo`/`stat` sobre a paleta do Brand Kit |
| Texto (não usado no caminho principal) | Gemini | `lib/ai/gemini.js` | Cliente equivalente existe mas não está fiado na geração — órfão desde o revert do pivot (ver decisions.md) |
| Imagem (não usado) | Gemini Image (`gemini-2.5-flash-image`) | `lib/ai/gemini-image.js` | Idem — órfão |

**DeepSeek só gera texto** (modelos públicos `deepseek-chat`/`deepseek-reasoner` não têm API de imagem) — por isso o app tem um pipeline de render próprio como fallback zero-custo, e o deAPI como provider de imagem quando disponível. Vídeo/Reels está fora de escopo (fase 2).

## Pipeline de geração (`lib/ai/generate.js` — `generateCreative`)

1. Monta prompt on-brand (`lib/ai/prompt.js`), injetando campos do Brand DNA: personalidade, emoções, formalidade, política de emoji/CTA, storytelling, estilo visual.
2. Chama DeepSeek.
3. Normaliza a resposta em spec validada (`lib/ai/spec.js`): limita tamanhos, normaliza hashtags, valida template contra whitelist.
4. Gera 1..N imagens (deAPI ou render on-brand) com prompts por slide derivados de `spec.imagePrompt`/bullets.
5. Faz upload das imagens pro bucket `media` do Supabase Storage.
6. Retorna `{spec, imageUrls, cost}`.

`slideCount()` limita o carrossel a 2–10 slides. Consumido por `lib/ai-actions.js` (`generatePost`, usado pelo `AIStudioPanel`) e por `lib/autopilot.js` (Piloto diário).

## Coleta de Brand DNA (`lib/ai/dna/*`, orquestrada por `lib/dna-actions.js` → `analyzeBrandDNA`)

**Até 4 fontes, sem scraping** (scraping/concorrentes fica pra versão premium futura):

1. Criador manual (form do wizard/editor).
2. Instagram próprio — bio + até 12 legendas top via Graph API, com heurística de relevância (`lib/ai/dna/captions.js`).
3. Site — fetch + strip de tags/scripts (`lib/ai/dna/website.js`).
4. Texto colado manualmente.
5. (Sinal adicional, não uma "fonte" no wizard) Resumo de `dna_signals` recentes.

`collect.js` roda as fontes em paralelo. `prompt.js` monta **um único prompt de sistema DeepSeek** aplicando "6 lentes" destiladas (branding, Instagram, copywriting, design, growth, análise competitiva — conhecimento baseado nas skills `coreyhaines31/marketingskills`, não multi-agente real), pedindo JSON estruturado: campos de `dna` + `report` com score e nível de confiança por categoria. `normalize.js` valida/limita scores (0–10), rebaixa confiança para "baixa" em categorias dependentes de feed quando não há dado do Instagram, e anexa um disclaimer ("não são métricas oficiais do IG").

Resultado é gravado em `brand_kits` (só colunas conhecidas, upsert cuidadoso) + `dna_report`/`dna_sources` como trilha de auditoria, e realimenta `buildContentPrompt` nas gerações futuras pra manter o conteúdo "on-brand".

## Aprendizado por sinais (`lib/dna-signals.js`)

Grava eventos de aprovação implícita durante o ciclo de vida do post (`recordDnaSignal` em `lib/posts-actions.js`): `approve` / `edit` / `reject`. **Não reescreve o DNA automaticamente** — só alimenta um resumo que entra no próximo prompt de análise. `reject` fica pendente de RLS (dono é owner-only, mas a aprovação é anônima).

## Rastreio de custo (`lib/ai/cost.js`)

Tabelas de preço estáticas por modelo (variações DeepSeek, texto Gemini, imagem deAPI/Gemini flat por imagem — todas sobrescrevíveis por env var), calculando custo em USD a partir do uso de tokens. Todo caminho de geração (`ai-actions.js` `generatePost`, autopilot, análise de DNA) grava uma linha em `generation_jobs` tanto em sucesso quanto em falha — base do dashboard `/ai-costs` (`lib/ai-costs-data.js`).
