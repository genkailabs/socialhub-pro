# Motor de Pesquisa de Conteúdo — Plano de Implementação

> **Design congelado.** Ver [spec](../specs/2026-07-18-motor-pesquisa-conteudo.md). Opção A aprovada. TDD, tarefas pequenas. Nenhuma decisão de arquitetura reaberta.
>
> **Para workers:** use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Cada tarefa: teste falha → implementação mínima → teste passa → commit.

## Restrições globais (invariantes)

- DeepSeek é o único escritor do post final. Gemini nunca escreve.
- Fontes/links nunca vão para a UI — só para log/cache.
- Sem toggle de pesquisa no MVP; decisão automática via `needsResearch`.
- Sem fallback silencioso: pesquisa obrigatória que falha = erro duro, nada gerado.
- Summary não-vazio = sucesso (mesmo sem sources); summary vazio = falha; falha nunca é cacheada.
- Fluxo sem pesquisa permanece idêntico ao atual.

---

## Task 1 — Cliente Gemini com Google Search Grounding

**Objetivo:** expor `geminiGrounded({ query })` que busca na internet e devolve resumo + fontes.

**Arquivos:**
- Modifica: `lib/ai/gemini.js`
- Teste: `tests/unit/gemini.test.js`

**Testes:**
- fetch mockado com `groundingMetadata.groundingChunks` → retorna `{ summary, sources:[{uri,title}], usage, model }`.
- resposta sem chunks mas com texto → `sources: []`, summary presente.
- body enviado contém `tools:[{google_search:{}}]` e não força JSON (`jsonMode:false`).
- `res.ok=false` ou `data.error` → lança `Error` com prefixo `Gemini:`.

**Critérios de conclusão:**
- `geminiGrounded` exportado, formato `{ summary, sources, usage, model }` (usage em `prompt_tokens`/`completion_tokens`).
- `geminiChat` existente intacto.
- `npm test -- tests/unit/gemini.test.js` verde.

**Dependências:** nenhuma.

---

## Task 2 — Classificador e contexto de pesquisa (sem cache)

**Objetivo:** `needsResearch`, `buildResearchQuery`, `researchContext`, `ResearchUnavailableError`.

**Arquivos:**
- Cria: `lib/ai/research.js`
- Modifica: `lib/ai/cost.js` (constante `GEMINI_GROUNDING_USD`), `.env.example`
- Teste: `tests/unit/research.test.js`

**Testes:**
- `needsResearch`: `notícia hoje`→true; `format:'news'`→true; `tendências 2026`→true; `dicas de foco`+`tips_carousel`→false; `frase`+`quote`→false.
- `buildResearchQuery`: inclui topic+niche; determinístico (mesmo input = mesma string).
- `researchContext` (mock `geminiGrounded`): summary não-vazio → `{ summary, sources, usage, model, cost, cached:false }`; summary vazio → lança `ResearchUnavailableError` (`code:'research_unavailable'`); `geminiGrounded` throw → lança `ResearchUnavailableError`.

**Critérios de conclusão:**
- `ResearchUnavailableError` tipado com `code` e mensagem PT.
- `researchContext` nunca retorna null quando obrigatório — sucesso ou lança.
- `GEMINI_GROUNDING_USD` lido de env com default; somado ao custo por chamada não-cacheada.
- `npm test -- tests/unit/research.test.js` verde.

**Dependências:** Task 1.

---

## Task 3 — Tabela `research_cache` e cache no `researchContext`

**Objetivo:** cache de pesquisa TTL 6h, persistente no Supabase.

**Arquivos:**
- Cria: `supabase/migrations/2026071X_research_cache.sql`
- Modifica: `lib/ai/research.js` (leitura/escrita de cache em `researchContext`)
- Teste: `tests/unit/research.test.js` (amplia)

**Pré-passo obrigatório:** sondar geoq (`research_cache` não existe? `generation_jobs` aceita `kind` livre?) antes do DDL. Aplicar DDL **à mão no SQL Editor** — schema diverge das migrations; não usar `db push`.

**DDL:**
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

**Testes (mock do store Supabase):**
- cache < 6h presente → não chama `geminiGrounded`, retorna `cached:true, cost:0`.
- cache ausente/expirado → chama Gemini, grava, `cached:false`.
- Gemini falha → **não** grava cache.

**Critérios de conclusão:**
- Chave = hash da query normalizada (lower/trim/colapsa espaço).
- Só sucesso (summary não-vazio) é gravado.
- Migração aplicada no geoq confirmada por sondagem.
- Testes de cache verdes.

**Dependências:** Task 2.

---

## Task 4 — `buildContentPrompt` aceita `research`

**Objetivo:** injetar contexto atual no prompt do DeepSeek sem vazar fontes.

**Arquivos:**
- Modifica: `lib/ai/prompt.js`
- Teste: `tests/unit/prompt.test.js`

**Testes:**
- com `research={summary,sources}` → `user` contém bloco `<contexto_atual>` e o `summary`; **não** contém URLs das sources.
- sem `research` → `user` idêntico ao comportamento atual (snapshot/igualdade).
- instrução de usar o contexto como base factual presente quando há research.

**Critérios de conclusão:**
- Assinatura `buildContentPrompt({ brandKit, brief, research })`, `research` opcional.
- Fluxo sem research inalterado.
- `npm test -- tests/unit/prompt.test.js` verde.

**Dependências:** nenhuma (paralelizável com Tasks 1–3).

---

## Task 5 — Integração em `generateCreative`

**Objetivo:** orquestrar pesquisa antes do DeepSeek no fluxo único de geração.

**Arquivos:**
- Modifica: `lib/ai/generate.js`
- Teste: `tests/unit/ai.test.js` (ou novo `generate.test.js`)

**Testes (mocks de `needsResearch`/`researchContext`/`deepseekChat`):**
- `needsResearch=false` → não chama `researchContext`; DeepSeek recebe prompt sem research.
- `needsResearch=true` + sucesso → `buildContentPrompt` recebe research; retorno inclui `research`.
- `researchContext` lança → `generateCreative` propaga o erro; nenhum upload/insert de imagem ocorre.

**Critérios de conclusão:**
- `generateCreative` sobe `research` (ou null) no objeto de retorno para log.
- Erro de pesquisa aborta antes de qualquer I/O de imagem/storage.
- Testes verdes.

**Dependências:** Tasks 2, 4 (idealmente 3).

---

## Task 6 — Post avulso: action + log de custo

**Objetivo:** `generatePost` trata erro de pesquisa e registra job `research`.

**Arquivos:**
- Modifica: `lib/ai-actions.js`
- Teste: cobertura via `tests/unit/ai.test.js` (helpers puros) + verificação manual da action.

**Testes:**
- helper de montagem de linhas de log inclui linha `kind:'research'` quando `gen.research` presente (success/cached).
- mapeamento de `ResearchUnavailableError` → `{ error, code:'research_unavailable' }`.

**Critérios de conclusão:**
- `generatePost` retorna `{ error, code }` em falha de pesquisa; **não** retorna spec/rascunho.
- Job `research` (`provider:'gemini'`, status `success`/`cached`, cost real/0) inserido junto do job de texto.
- Log é best-effort (try/catch), como o padrão atual.

**Dependências:** Task 5.

---

## Task 7 — Autopilot: planejamento sem inventar tendências

**Objetivo:** slot com pesquisa falha é pulado e logado; demais slots seguem.

**Arquivos:**
- Modifica: `lib/autopilot.js`
- Teste: `tests/unit/autopilot.test.js` (novo ou existente)

**Testes (mock `generateCreative`):**
- `generateCreative` lança `research_unavailable` num slot → post **não** inserido; job `kind:'research', status:'error'` inserido; loop continua nos outros slots.
- sucesso com `research` → job `research` inserido junto de texto/imagem.
- `last_run_at` atualiza quando ao menos rodou.

**Critérios de conclusão:**
- Nenhum post com tendência inventada quando a pesquisa falha.
- Erro isolado por slot/marca (não derruba o cron).
- Testes verdes.

**Dependências:** Task 5.

---

## Task 8 — Validação e deploy

**Objetivo:** suíte completa, build e smoke real.

**Arquivos:** nenhum (verificação).

**Testes:**
- `npm test` — toda a suíte verde.
- `npm run build` — exit 0.

**Critérios de conclusão (smoke manual):**
- Tema atual (ex: "notícia de IA hoje") → pesquisa roda, post gerado com contexto.
- Tema atemporal (ex: "dicas de foco") → DeepSeek direto, sem chamada Gemini.
- Gemini indisponível + tema atual → erro PT claro, **nenhum** rascunho criado.
- `ai-costs` mostra custo `research` separado de texto/imagem.
- Deploy Railway (`socialhub-mvp`) após verde.

**Dependências:** Tasks 1–7.

---

## Grafo de dependências

```
T1 ─┬─ T2 ── T3 ─┐
    │            ├─ T5 ─┬─ T6 ─┐
T4 ─┴────────────┘      └─ T7 ─┴─ T8
```

- T1, T4 sem dependências (paralelos).
- T2 depende de T1; T3 de T2.
- T5 depende de T2+T4 (T3 recomendado).
- T6, T7 dependem de T5 (paralelos entre si).
- T8 fecha tudo.
