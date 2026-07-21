# Motor Inteligente de Conteúdo e Pesquisa — Design

> Status: **aprovado** (brainstorming 2026-07-18). Opção A. Pronto para plano de implementação.

## Understanding Summary

- **O que:** camada de pesquisa que dá ao Social Hub acesso a informações atuais antes de gerar posts, cobrindo post avulso (AI Studio) e planejamento semanal (Autopilot).
- **Por quê:** DeepSeek escreve bem mas não tem acesso confiável à internet; sem isso o produto sugere temas genéricos/desatualizados ou inventa fatos.
- **Para quem:** gestores de social media usando o Social Hub; o usuário não escolhe modelo — o sistema roteia nos bastidores.
- **Como:** classificador heurístico decide se o pedido depende de info atual → se sim, Gemini com Google Search Grounding busca contexto+fontes → DeepSeek escreve o post final on-brand usando esse contexto.
- **Núcleo honesto:** sem mock; custo real de pesquisa/texto/imagem logado separado em `generation_jobs`.
- **Não-objetivos:** Gemini nunca escreve o post final; fontes/links nunca aparecem na UI; sem toggle manual no MVP; sem fallback silencioso.

## Assumptions

- `GEMINI_API_KEY` (já usada p/ imagem) suporta Search Grounding — **confirmado pelo usuário**.
- Classificador econômico = heurística por palavra-chave (sem LLM extra).
- Gemini Grounding = `gemini-2.5-flash` + tool `google_search`, `jsonMode:false`.
- DeepSeek segue único escritor (`deepseek-v4-flash`).
- Schema do geoq diverge das migrations → DDL novo aplica à mão no SQL Editor, não via `supabase db push`.

## Decisão de arquitetura — Opção A (aprovada)

Camada de pesquisa isolada antes do gerador. Rejeitadas: B (pesquisa como provider de texto — polui abstração); C (Gemini escreve quando live — viola PRD, Brand DNA fraco).

### Fluxo

```
brief → needsResearch(brief)?
  ├ não → buildContentPrompt(sem research) → DeepSeek → post
  └ sim → researchContext(brief,kit)         [obrigatório]
            ├ sucesso → buildContentPrompt(+research) → DeepSeek → post
            └ falha   → ResearchUnavailableError → NADA gerado, erro na UI
```

### Componentes

**`lib/ai/gemini.js`** (edita) — `geminiGrounded({ query })`:
- `tools:[{ google_search:{} }]`, `jsonMode:false`.
- Extrai `summary` (texto) e `sources` (`candidates[0].groundingMetadata.groundingChunks[].web.{uri,title}`).
- Retorna `{ summary, sources, usage, model }`.

**`lib/ai/research.js`** (novo):
- `needsResearch(brief)` → boolean. Puro. Gatilhos PT regex: `notícia|hoje|atual|atualidade|tendência|lançamento|recente|novidade|agora|esta semana|202\d` OU `brief.format==='news'` OU `brief.research===true` (flag reservada ao modo avançado, não exposta no MVP).
- `buildResearchQuery({ brief, kit })` → string determinística (tema + nicho). Base da chave de cache.
- `researchContext({ brief, kit })` → `{ summary, sources, usage, model, cost, cached }`. Consulta cache < 6h; miss chama `geminiGrounded`, grava sucesso. **Lança `ResearchUnavailableError`** (`code:'research_unavailable'`) se Gemini falhar OU summary vazio. Nunca retorna null quando obrigatório.
- `ResearchUnavailableError` — erro tipado, mensagem PT: *"Não foi possível consultar informações atuais agora. Tente novamente em instantes."*

**`lib/ai/prompt.js`** (edita) — `buildContentPrompt({ brandKit, brief, research })`. Com `research`, injeta bloco `<contexto_atual>` no `user` com o `summary` (fontes NÃO entram no prompt de texto — só log). Sem `research`, prompt idêntico ao atual.

**`lib/ai/generate.js`** (edita) — `generateCreative` chama `needsResearch`→`researchContext` antes do DeepSeek; sobe `research` no retorno p/ log. Erro sobe (nenhum upload/insert).

**`lib/autopilot.js`** (edita) — loop reusa `generateCreative`. `research_unavailable` por slot → registra job `error`, pula o slot (sem tendência inventada), segue os demais.

**`lib/ai-actions.js`** (edita) — `generatePost` converte `ResearchUnavailableError` em `{ error, code:'research_unavailable' }`; loga job research.

### Erros / fallback

- Sem pesquisa → DeepSeek direto, sempre OK.
- Pesquisa obrigatória + Gemini falha → erro duro, **nenhum** rascunho criado, UI mostra aviso PT.
- Autopilot: slot com falha é pulado, `last_run_at` só atualiza se rodou; outros slots/marcas seguem.
- Summary não-vazio = sucesso (mesmo sem sources). Summary vazio = falha. Falha nunca é cacheada.

### Cache e custo

- Tabela `research_cache` (Supabase, sobrevive a restart). Chave = hash da query normalizada. TTL 6h.
- Hit → `cost:0`, `cached:true`, sem chamada Gemini. Miss → Gemini, grava só sucesso.
- Custo: `estimateCostUsd('gemini-2.5-flash', usage)` + `GEMINI_GROUNDING_USD` (env) por chamada não-cacheada.
- Sem teto rígido no MVP (YAGNI); log revela se precisar.

### Persistência / logs

`research_cache`:
```sql
create table research_cache (
  query_hash text primary key,
  query text not null,
  summary text not null,
  sources jsonb not null default '[]',
  model text,
  created_at timestamptz not null default now()
);
create index on research_cache (created_at);
```
Sem RLS pública (só server). **Aplicar à mão no SQL Editor do geoq** (schema diverge das migrations).

`generation_jobs` — novo `kind:'research'`, `provider:'gemini'`: `status` `success`|`cached`|`error`; `cost_usd` real/0/0; `ref_post_id` null em erro.

### Testes (Vitest, `tests/unit/`)

- `research.test.js`: `needsResearch` (gatilhos true/false), `buildResearchQuery` (determinístico), `researchContext` (summary vazio→lança; Gemini throw→lança; cache hit→sem Gemini, cost 0; falha não grava cache).
- `gemini.test.js`: `geminiGrounded` (fetch mock, extrai summary/sources, `jsonMode:false`, chunks ausentes→sources []).
- `prompt.test.js`: `buildContentPrompt` com research→bloco `<contexto_atual>`+summary; sem research→prompt inalterado; fontes fora do prompt.
- Integração leve: `generateCreative`/autopilot com `researchContext` lançando → nenhum insert/upload; autopilot insere job `error`, não insere post.

## Decision Log

| Decisão | Alternativas | Motivo |
|---|---|---|
| Camada isolada (Opção A) | B: provider de texto; C: Gemini escreve live | Não polui abstração de texto; DeepSeek dono do Brand DNA; cumpre PRD |
| Classificador heurístico | LLM classificador; toggle UI | Zero custo, sem latência; usuário não decide |
| Sem toggle no MVP | Toggle "buscar internet" | Decisão automática; toggle fica p/ modo avançado futuro |
| Erro duro sem fallback | Degradar p/ DeepSeek sozinho | Nunca inventar fatos/tendências atuais |
| Summary não-vazio = sucesso | Exigir sources | Grounding às vezes responde sem chunks |
| Cache 6h no Supabase | Memória; sem cache; TTL longo | Sobrevive a restart Railway; corta duplicatas; mantém frescor |
| `kind:'research'` em generation_jobs | Tabela nova de log | Reusa infra de custo existente (`ai-costs`) |
| DDL à mão no SQL Editor | `supabase db push` | Schema geoq diverge das migrations (memória) |
