# Brand DNA AI — Design (MVP)

**Data:** 2026-07-13
**Status:** Design validado (brainstorm concluído) — pronto para plano de implementação
**Origem:** PRD 001 — Brand DNA AI
**Relacionado:** núcleo honesto (rewrite), motor de conteúdo IA (DeepSeek→Gemini)

---

## 1. Resumo do Entendimento

Sistema que aprende a identidade de uma marca (tom, público, posicionamento, pilares,
paleta, personalidade) a partir de fontes fornecidas/oficiais, gera um **Brand DNA**
persistido por marca + um **relatório qualitativo**, e alimenta automaticamente toda
geração de conteúdo (Composer e Piloto).

**Hipótese a validar no MVP:** a IA consegue realmente entender e padronizar uma marca.
Não é resolver a plataforma de marketing inteira agora.

- **O que é:** preenchimento assistido por IA + edição manual do DNA da marca.
- **Por que:** hoje o `brand_kit` é 100% manual e genérico; o conteúdo perde identidade.
- **Para quem:** o dono da marca. Uma marca por vez (multi-brand já existe).

### Fontes do MVP (sem scraping)
1. **Criador manual de padrão** — espinha dorsal; expande o `/brand-kit` atual.
2. **Instagram próprio** — Graph API: bio + últimas **12** legendas (prioriza legendas relevantes).
3. **Website** — URL → fetch HTML → texto.
4. **Texto colado** — manual da marca, briefing, legendas.

### Provider
**Google Gemini 2.5 Flash como provider único.** Substitui DeepSeek E deapi.
Faz: análise, Brand DNA, relatório, geração de texto e de imagem. Chave já no ambiente.

---

## 2. Premissas

1. Brand DNA **estende `brand_kits`** (colunas nullable), não cria tabela concorrente.
2. "Multi-agente / especialistas" = **1 chamada Gemini** com system prompt de **6 lentes
   destiladas** (branding, instagram, copywriting, design, growth, concorrência). Não são
   agentes separados no MVP.
3. **Aprendizado contínuo mínimo:** grava sinais leves de aprovar/rejeitar/editar; NÃO
   reescreve o DNA sozinho. Sinais entram como contexto na próxima análise manual.
   Auto-reescrita = V2.
4. Comparação com concorrentes = fora do MVP (vira premium com scraping).
5. Identidade visual do MVP = paleta declarada + extração de cor da logo **por código**
   (sem IA de visão).
6. Escala: uso individual, baixo volume, análise sob demanda.

---

## 3. Decision Log

| # | Decisão | Alternativas | Por quê |
|---|---------|--------------|---------|
| 1 | Sem scraping no MVP; só fontes fornecidas + oficiais | Apify scraping; colar dados | Reduz risco jurídico/técnico; entrega valor rápido. Scraping vira premium depois |
| 2 | 4 fontes: manual, IG próprio, website, texto colado | Só própria; adiar tudo | Muito valor sem scraping, tudo oficial/fornecido |
| 3 | Relatório = notas + base explícita por nota + disclaimer | Só texto; só medível; adiar | Honesto e "vendável"; deixa claro que é avaliação qualitativa da IA |
| 4 | **+ Nível de confiança por categoria** | — | Explicita o grau de evidência disponível |
| 5 | Visual = paleta manual + cor da logo por código | Modelo de visão; extrair cor | Custo zero de visão; feed/fontes fica pra V2 |
| 6 | **Provider único = Gemini 2.5 Flash**, substitui DeepSeek e deapi | Manter DeepSeek+deapi | Simplifica arquitetura, reduz custo, um provider só |
| 7 | Gemini gera imagem também (nano-banana) | deapi continua imagem | Provider 100% único |
| 8 | Estende `brand_kits` | Tabela `brand_dna` 1:1 | Um só lugar de verdade; geração já lê brand_kits |
| 9 | 1 chamada com 6 lentes | 6 chamadas + orquestrador | MVP: custo 1x, latência baixa; multi-chamada = V2 |
| 10 | Destilar conteúdo das skills de marketing nos prompts Gemini | Instalar p/ construção; nenhuma | App roda Gemini, não Claude; skills viram conteúdo do system prompt |
| 11 | UI toda dentro de `/brand-kit` (abas análise + edição) | Página `/brand-dna` separada | Menos navegação; um lugar pra identidade |
| 12 | Aprendizado = sinais leves, sem auto-reescrever DNA | Auto-reescrita | Honesto; valida hipótese antes de automatizar |

### Skills de marketing → lentes destiladas (fonte de conhecimento dos prompts)
Repo `coreyhaines31/marketingskills` + Anthropic/Figma:
- **Branding:** marketing-psychology, product-marketing, brand-guidelines
- **Instagram:** social
- **Copywriting:** copywriting, copy-editing, ad-creative
- **Design:** frontend-design, canvas-design, theme-factory
- **Growth:** launch, marketing-loops, cro, content-strategy
- **Concorrência:** competitors, competitor-profiling (só distilado; comparação real = V2)

---

## 4. Design

### 4.1 Modelo de dados — estende `brand_kits`
Colunas novas (nullable, não quebram o que existe):
```
+ personality      TEXT[]        -- especialista, acessível, consultivo
+ emotions         TEXT[]        -- confiança, segurança, inovação
+ formality        TEXT          -- baixa | média | alta
+ emoji_usage      TEXT          -- nunca | poucos | muitos
+ cta_policy       TEXT          -- sempre | só vendas | nunca
+ storytelling     BOOLEAN
+ visual_style     TEXT          -- premium | moderno | minimalista | criativo
+ caption_length   TEXT          -- curta | média | longa
+ dna_report       JSONB         -- relatório (ver 4.4)
+ dna_sources      JSONB         -- fontes analisadas + timestamps
+ dna_generated_at TIMESTAMPTZ
```
Sinais de aprendizado: tabela nova `dna_signals` (brand_id, post_id, action approve|reject|edit, created_at) — ou reuso de `generation_jobs`. A decidir no plano.

### 4.2 Camada de IA
- Novo `lib/ai/gemini.js` — server-only, JSON mode; espelha `deepseek.js`. Substitui o cliente DeepSeek.
- `lib/ai/cost.js` — tabela de preço Gemini (texto + imagem).
- Geração de imagem migra deapi → Gemini Image.

### 4.3 Fluxo `analyzeBrandDNA({ brandId, sources })`
1. **Coleta** (paralela, server-side): IG (bio + 12 legendas via Graph API/token existente),
   website (fetch→texto), texto colado, campos do manual.
2. **Monta contexto** único (trunca por orçamento de tokens).
3. **1 chamada Gemini** — system = 6 lentes; retorna `{ dna:{...}, report:{...} }`.
4. **Persiste** em `brand_kits` (+ dna_report, dna_sources, dna_generated_at).
5. **Log** em `generation_jobs` (kind='brand_dna', provider='gemini', custo real).
6. **Revalida** `/brand-kit`.

Honestidade: fonte que falha (ex: IG sem token) → segue com o resto; report marca "não analisado" e baixa a confiança das categorias dependentes. Falha da chamada → `generation_jobs` status=error.

### 4.4 Formato do relatório (`dna_report` JSONB)
```json
{
  "disclaimer": "Avaliação qualitativa da IA baseada nas fontes analisadas. Não são métricas oficiais do Instagram.",
  "overall": 8.4,
  "categories": [
    { "key": "branding", "score": 8.8, "confidence": "alta",
      "basis": "tom e posicionamento consistentes em 10/12 legendas + site" },
    { "key": "cta", "score": 6.2, "confidence": "média",
      "basis": "só 3 de 12 posts têm chamada clara" }
  ],
  "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."]
}
```
`confidence` (alta|média|baixa) derivada do volume/qualidade de evidência da fonte.

### 4.5 UI — dentro de `/brand-kit`
- **Aba Análise:** painel de fontes (toggles manual/IG/site/texto + inputs) → botão "Gerar Brand DNA" (loading real) → relatório (nota geral, cards por categoria com nota + badge de confiança + base, listas de forças/fraquezas/oportunidades, disclaimer no rodapé).
- **Aba Editor:** todos os campos do DNA editáveis (criador manual). Salvar = `saveBrandKit` estendido.
- Selo "DNA usado automaticamente na geração".

### 4.6 Uso automático na geração
`buildContentPrompt` (`lib/ai/prompt.js`) expande para incluir os campos novos do DNA →
Composer e Piloto saem on-brand sem esforço. Flag "ignorar DNA" no Composer (atende critério do PRD).

### 4.7 Visual (MVP)
Upload de logo → extração de cor dominante por código (lib pura) → `palette`. Sem visão.

### 4.8 Aprendizado contínuo (mínimo)
Aprovar/rejeitar/editar post → grava sinal leve. Entra como "histórico de preferência" na
próxima análise manual. Sem auto-reescrita do DNA.

---

## 5. Fora do MVP (V2+)
Scraping IG/concorrentes (premium), comparação real com concorrentes, IA de visão avançada
(feed/fontes/composição), vídeo, TikTok/LinkedIn/YouTube, Meta Ads, previsão de desempenho,
multi-agente real (6 chamadas), auto-reescrita do DNA.

---

## 6. Critérios de Aceitação (MVP)
- [ ] Analisar 1+ fontes (das 4) e gerar um Brand DNA consistente.
- [ ] DNA persistido por marca em `brand_kits` e reutilizado nas gerações.
- [ ] Usuário edita manualmente qualquer atributo do DNA.
- [ ] Relatório com forças/fraquezas/oportunidades + notas com base + confiança + disclaimer.
- [ ] Toda geração usa o DNA automaticamente (flag para ignorar).
- [ ] Sinais de aprovar/rejeitar/editar registrados (aprendizado mínimo).
- [ ] Provider único Gemini funcionando (texto + imagem); DeepSeek/deapi removidos.

---

## 7. Riscos
- **Migração de provider:** trocar DeepSeek+deapi por Gemini toca `deepseek.js`, `generate.js`,
  `prompt.js`, `cost.js`, `ai-actions.js`, render de imagem. Testar geração ponta-a-ponta.
- **Qualidade da imagem Gemini** vs deapi atual — validar antes de remover deapi.
- **Graph API IG:** limites de campo/permissão; degradar com elegância quando faltar dado.
- **Notas do LLM:** mitigado por base explícita + confiança + disclaimer.
