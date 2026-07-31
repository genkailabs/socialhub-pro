# Plano — Tendências + gaveta editorial do Studio

Data: 2026-07-31 · Branch base: `fix/opcoes-ia-composer`

## Contexto

Três frentes abertas na mesma sessão:

1. **O carrossel falha e mente sobre a falha.** Diagnóstico com prova em `generation_jobs`
   e em cinco chamadas medidas ao DeepSeek: uma tentativa custa 25–31s, `runSkill` tenta
   duas vezes, e o cliente aborta em 65s — então toda rejeição da tentativa 1 aparece
   como "demorou mais que o esperado" em vez do erro real.
2. **O Studio não cabe na tela.** A faixa editorial de 4 passos fica empilhada acima do
   iframe e come a altura; sobra pouco para o canvas e a arte 1080×1350 é cortada.
3. **Falta a tela de Tendências.** Referência estudada: `maquina.brandsdecoded.com.br`.

## O que a referência faz (verificado no navegador, 31/07)

SPA React/Vite sobre Firebase (projeto `autopost-85308`). A tela `#/tendencias` tem:

- **Top 3 da semana** em cards com score %.
- **Tabela/grade** com 11 itens: nome, dificuldade, categorias, profissões, curtidas, score.
- **Filtros**: busca, categoria (educativo/venda/viral), profissão (20 opções), formato
  (só Reels), status (todos/salvos/curtidos).
- **Modal de detalhe**: embed real do Instagram (`/p/<code>/embed/captioned/`), badges,
  seções "O que é", "Como executar", "Profissões alvo", "Categorias", curtir e salvar.
- **CTA "Criar conteúdo"** (`title="Monta o roteiro e abre no chat escolhido"`): monta um
  prompt e abre ChatGPT, Claude ou Gemini em outra aba.

### De onde vêm as tendências deles

Não há coleta automática visível. As evidências apontam para **curadoria manual semanal**:

| Evidência | Leitura |
| --- | --- |
| Conteúdo não está no bundle (`TrendsPage`, `TrendBits`); a string `"trends"` está | coleção Firestore lida em runtime |
| Nenhuma chamada de ingest/scraping no cliente | coleta, se existisse, seria server-side |
| Imagens em `storage.../trends/1769624571881.jpg` — nome = `Date.now()` (28/01/2026) | upload por formulário de admin, não crawler (crawler indexaria pelo shortcode) |
| 11 itens, todos Reels, "Como executar" em prosa autoral longa | texto escrito por pessoa |
| Scores 95/85/83/83/82/81/80/80/78/74/60, sem método declarado | número atribuído à mão |

Não vejo o servidor deles, então não dá para descartar uma Cloud Function privada. Mas
nada no cliente sugere isso, e os artefatos apontam para curadoria humana.

**Decisão adotada:** curadoria manual + tela de admin. Coleta automática fica como fase
futura, e mudaria o plano (fila de revisão, custo por execução, bloqueio do Instagram).

## Limite que já está escrito no repositório

`docs/content-machine-research/README.md` proíbe reutilizar conteúdo, marca, métricas ou
promessas da BrandsDecoded. Então: copiamos a **função**, não o **catálogo**. Os 11
registros, os textos, os scores e o nome do método não entram. A tabela nasce vazia.

---

## Fase 0 — Destravar o carrossel (pré-requisito)

Sem isto, "Criar conteúdo" herda um pipeline que falha em ~33% das vezes.

1. **`lib/ai/skills/run.js`** — normalizar `null → undefined` antes do `safeParse`.
   Zod aplica `.default()` só em `undefined`; o modelo devolve `null` em campo opcional
   vazio. Atinge `carousel-brief` (`subheadline`, `body`, `sourceIds`, `assumptions`) e
   `story-planner` (`card.support`). Conserto central cobre todas.
2. **`lib/ai/skills/run.js` — `parseOutput`** — montar a razão a partir de
   `issue.code/expected/received`, não de `issue.message`. No build a mensagem degrada
   para `"Invalid input"` seco (comprovado: três meses de linhas em `generation_jobs`
   com esse texto para enum, literal, objeto e string), e o prompt de correção repete a
   mesma falha.
3. **Orçamento de tempo** — `CarouselStudioClient.jsx:138` sobe de 65s para 120s com
   mensagem de progresso; `app/api/carrossel/brief/route.js:12` (`maxDuration`) acompanha.

Teste: `tests/unit/ai-skills.test.js` ganha caso com `null` em campo opcional e caso que
verifica que a razão do erro cita o tipo recebido.

## Fase 1 — Gaveta editorial (o Studio recupera a altura)

**Arquivo:** `components/carrossel/CarouselStudioClient.jsx`.

Hoje o root é `flex h-full flex-col` com três filhos: barra, faixa editorial sem teto de
altura, e `min-h-0 flex-1` para o iframe. A faixa cresce com 5 cards de ideia ou 8 slides
de roteiro e rouba a altura. O wrapper em `VisualComposer.jsx:1283` já está correto
(`flex:1; minHeight:0; overflow:hidden`) — o problema é o filho do meio.

Mudança: a faixa vira **gaveta sobreposta**.

- Root `relative flex h-full flex-col` com dois filhos: barra + `min-h-0 flex-1` (Studio).
- Guia editorial: `absolute inset-y-0 left-0 z-20 w-[380px] max-w-[92vw] overflow-y-auto`
  com `translate-x` e `transition-transform`; largura total no mobile.
- Os chips 1-4 (Tema/Capa/Roteiro/Studio) migram para o topo da gaveta; a barra ganha um
  botão fino que abre/fecha e mostra o passo atual.
- Abre por padrão quando não há roteiro; fecha sozinha ao aplicar (comportamento que já
  existe em `editorialOpen`). `Esc` fecha, `aria-expanded` no botão.

**Fora de escopo, mas registrado:** o aviso "Revisar: Texto saiu do slide" e a altura
mínima interna do canvas são do outro repositório (`H:\criador de carrossel\carrossel-studio`).

## Fase 2 — Tabela de tendências

Sondagem feita: o banco tem 39 tabelas e **nenhuma** de tendência. Ainda assim, sondar de
novo antes do DDL — o schema diverge das migrations locais.

`supabase/migrations/<data>_content_trends.sql`:

```sql
CREATE TABLE public.content_trends (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  format       text NOT NULL DEFAULT 'reel' CHECK (format IN ('reel','carrossel','post','story')),
  status       text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','ativo','arquivado')),
  what_is      text NOT NULL,
  how_to       text NOT NULL,
  why_it_works text,
  difficulty   text NOT NULL CHECK (difficulty IN ('facil','medio','dificil')),
  categories   text[] NOT NULL DEFAULT '{}',
  niches       text[] NOT NULL DEFAULT '{}',
  example_url  text,
  thumbnail_url text,
  score        integer CHECK (score BETWEEN 0 AND 100),
  score_basis  text,
  observed_at  date,
  expires_at   date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_trend_reactions (
  trend_id uuid NOT NULL REFERENCES public.content_trends(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  liked    boolean NOT NULL DEFAULT false,
  saved    boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trend_id, brand_id)
);
```

RLS no padrão do repositório: `content_trends` legível por usuário autenticado (catálogo
é global); `content_trend_reactions` restrito à marca do usuário.

Campos que a referência não tem e são a razão de existirem aqui:

- `why_it_works` — eles explicam o que é e como fazer, não por que funciona.
- `expires_at` — tendência morre; o catálogo deles não envelhece.
- `score_basis` — de onde saiu o número. Sem base declarada, a tela não mostra número.
- `niches` — casa com `brand_kits.niche`, que já temos, para ordenar por encaixe em vez
  de obrigar o usuário a filtrar por profissão.

## Fase 3 — Tela de leitura

- `app/(app)/tendencias/page.jsx` — server component no padrão de
  `app/(app)/planning/page.jsx`: `resolveActive`, busca trends ativas + reações da marca.
- `lib/trends-data.js` — leitura, no padrão de `lib/layouts-data.js` (`safeQuery`).
- `components/trends/TrendsClient.jsx` — Top 3, alternância tabela/grade, filtros
  (busca, categoria, dificuldade, nicho, salvos/curtidos).
- `components/trends/TrendDetail.jsx` — modal: badges, "O que é", "Como executar",
  "Por que funciona", embed do Instagram em `iframe` lazy + `sandbox`, curtir/salvar, CTA.
- Ordenação padrão: **encaixe com a marca** (`niches` ∩ nicho do Brand Kit) e depois
  score. Item vencido aparece rebaixado e marcado, não some.
- Nav: `data/nav.js`, grupo **Criar**, ícone `TrendingUp` do lucide.

Funções puras de filtro/ordenação isoladas em `lib/trends-filter.js` para teste unitário.

## Fase 4 — Curadoria (admin)

`app/(app)/tendencias/admin/page.jsx`, atrás da mesma checagem que protege `/ai-costs`
(`adminOnly` em `data/nav.js`). Formulário de criar/editar, upload da miniatura para o
bucket que já usamos, e publicar/arquivar. Sem isto, o catálogo depende de SQL na mão.

## Fase 5 — "Criar conteúdo" gera dentro do Hub

Reels apenas nesta versão.

- Estender `lib/ai/skills/reel-producer/index.js`: `inputSchema` ganha
  `trend: { name, whatIs, howTo }` opcional, e `buildPrompt` passa a mecânica como
  restrição de execução. Reaproveita todo o pipeline testado — melhor que criar skill nova.
- `lib/trends-actions.js` → `generateScriptFromTrend({ brandId, trendId, topic })`:
  `runSkill(reelProducer)` → salva rascunho `format: 'reel'` via `posts-actions` →
  devolve o id.
- O botão leva a `/composer?post=<id>&format=reel`, onde `ReelTimeline` e `ReelVideoPanel`
  já existem.
- Saída secundária: "copiar prompt", para quem preferir levar para outro chat.

## Verificação

1. `npm test` — novos casos: `null` em campo opcional, razão de erro com tipo, filtros
   e ordenação de tendências.
2. `npm run build`.
3. App rodando + Studio em `:3100`: abrir `/composer?format=carrossel`, confirmar que o
   canvas ocupa a altura inteira com a gaveta aberta e fechada, em 1280×800 e 1920×1080.
   Screenshot como prova (medir no render, não confiar no CSS de origem).
4. `/tendencias` com pelo menos dois registros semeados por você: filtrar, curtir, salvar,
   abrir o detalhe, gerar um roteiro e conferir o rascunho no Composer.
5. Conferir `generation_jobs` depois da geração: `status`, `output_tokens` e `retry_attempt`.

## Ordem de execução

Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5.

Fases 0 e 1 são independentes das outras e entregam valor sozinhas; se o tempo apertar,
elas fecham em um commit e as Tendências viram um segundo branch.
