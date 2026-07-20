# PRD Final — Simplificação do Social Hub (Instagram) para execução pelo Claude Code

**Versão:** 1.0
**Data:** 2026-07-20
**Status:** Pronto para implementação
**Executor:** Claude Code
**Depende de:** `PRD_Social_Hub_Jornada_Instagram.md` (visão de produto, já aprovado) e `PROPOSTA_Simplificacao_Planejamento_e_Historico.md` (auditoria de código que originou este PRD)

---

## 1. Contexto

O Social Hub já implementa boa parte da jornada assistida de Instagram descrita no PRD original: planejamento semanal (`editorial_plans`), produção de conteúdo por skill, aprovação, calendário e publicação. Uma auditoria de código (não uma reescrita) encontrou um conjunto pequeno e bem delimitado de problemas que estão gerando confusão real para o dono do produto: sensação de gastar tokens à toa, duplicidade de sistemas de geração de conteúdo, navegação maior do que o produto precisa agora, e desvios pontuais do próprio design system do projeto.

Este documento consolida esses achados em requisitos executáveis. **Não é uma reconstrução.** É uma lista de correções e remoções pontuais, todas rastreadas a arquivos específicos.

## 2. Objetivo

Reduzir a complexidade percebida e real do produto sem remover capacidade nenhuma que já funciona, e sem tocar em nada fora do escopo abaixo.

## 3. Fora do escopo

- Qualquer rede social além de Instagram.
- Reescrever o Planejador Editorial, as skills de IA ou o modelo de dados.
- Trocar hospedagem ou infraestrutura (Render/Supabase) como parte deste PRD — é uma decisão separada, tratada em documento à parte.
- Redesenho visual completo. Este PRD corrige desvios pontuais do `DESIGN.md` existente, não cria um novo design system.

---

## 4. Achados e requisitos

### 4.1 Bug — cálculo de vagas do Planejamento ignora itens removidos

**Arquivo:** `lib/planning-actions.js`, função `generateWeekPlan`.

**Problema:** `preservedItems` conta qualquer item com `status !== 'idea'`, incluindo itens `rejected`. Isso faz `remainingSlots` ficar menor do que deveria, e em casos comuns (usuário remove itens e pede novas sugestões) o sistema não gera nenhuma ideia nova, mesmo havendo vagas reais na semana.

**RF-01:** `remainingSlots` deve ser calculado a partir de `requestedPosts - (itens com status em ['approved','in_production','ready'])`. Itens `rejected` não contam como preenchidos.

**RF-02:** Cobrir esse cálculo com teste unitário puro (sem IA, sem banco) que exercite: todos aprovados, todos rejeitados, mistura de aprovados/rejeitados/ideias pendentes.

**Critério de aceitação:** remover N itens e clicar em "gerar novamente" sempre solicita até N ideias novas à IA, nunca menos por conta de itens rejeitados.

---

### 4.2 UX — economia de tokens não é visível no momento da decisão

**Arquivos:** `components/planning/PlanningPanel.jsx`, `lib/ai/limits.js`, `lib/planning-actions.js`.

**Problema:** O PRD original exige (§Etapa 10) que toda regeneração mostre que vai consumir crédito de IA. Isso não está implementado. O botão "Sugerir de novo" tem um aviso que soa como "vai apagar tudo", empurrando o usuário a remover itens manualmente em vez de usar "Trocar" (que já é a ação barata, por item).

**RF-03:** Renomear e reescrever o texto de "Sugerir de novo" para deixar claro que só preenche vagas vazias, sem tocar em itens aprovados/rejeitados — ex.: "Preencher vagas vazias (N)"; o botão só aparece quando `remainingSlots > 0`.

**RF-04:** Adicionar um selo de custo/crédito visível junto dos botões que chamam IA (Trocar, Preencher vagas, Gerar conteúdos aprovados), reaproveitando os limites já calculados em `lib/ai/limits.js`. Não é necessário criar UI nova grande — um texto pequeno tipo "usa 1 crédito" já atende.

**RF-05:** Adicionar um contador de uso do mês na própria tela de Planejamento (ex.: "6 de 12 gerações usadas"), derivado de `generation_jobs`/`ai_limits`, sem esperar a tela de dashboard prevista no PRD original.

**Critério de aceitação:** antes de qualquer clique que gasta IA, o usuário vê quantos créditos aquilo custa e quantos restam, sem sair da tela de Planejamento.

---

### 4.3 Duplicidade estrutural — "Piloto Automático" é um segundo sistema de geração, hoje órfão

**Arquivos:** `app/(app)/autopilot/page.jsx`, `components/autopilot/AutopilotForm.jsx`, `lib/autopilot.js`, `lib/content-plan-actions.js`, `lib/content-plan-data.js`, tabela `content_plans`.

**Problema:** A rota `/autopilot` mistura duas coisas: (a) `StrategyPanel`, que é legítimo e alimenta o Planejamento; (b) `AutopilotForm`, um sistema antigo e paralelo de geração diária automática (`runDailyAutopilot`), com sua própria cadência e custo, que **não é chamado por nenhum cron, rota ou Edge Function hoje** (confirmado: não há referência a `runDailyAutopilot` fora de `lib/autopilot.js` e do teste unitário). A tela promete "sua agência operando 24/7" para um recurso que não roda, e compete visualmente com o Planejamento — a jornada correta segundo o PRD original.

**RF-06:** Separar a rota: criar/mover para `/strategy` uma página com apenas `StrategyPanel` (reaproveitar o componente como está). Atualizar `data/nav.js` para apontar "Estratégia" para essa rota.

**RF-07:** Remover `AutopilotForm` e o toggle de `content_plans.active` da interface. Não apagar `lib/autopilot.js`, `content_plans` ou os testes — apenas parar de expor a funcionalidade até haver decisão de produto sobre reativá-la como algo claramente separado e opcional (conforme PRD original §7.3, "não deve ser o centro da jornada").

**RF-08:** Se algum usuário já tiver `content_plans.active = true`, isso não deve gerar comportamento surpresa: como a função não é chamada por nenhum cron hoje, remover a UI não muda nada em produção. Registrar essa constatação no changelog/README.

**Critério de aceitação:** o menu não tem mais nenhuma tela prometendo geração automática diária que não existe; `/strategy` mantém a definição de pilares/objetivos que o Planejamento consome.

---

### 4.4 Navegação com mais itens do que o produto precisa agora

**Arquivo:** `data/nav.js`.

**RF-09:** Ajustar rótulos que citam YouTube em telas cujo escopo atual é só Instagram (ex.: "Calendário e Links", "Conexões (Meta/YT)") para não sugerir capacidade que não é o foco desta fase — sem remover a funcionalidade de YouTube já existente, só o rótulo.

**RF-10:** Remover o item "Inbox" (com badge "breve") do menu até o recurso existir. Reduz ruído sem perder nada, porque não há tela por trás.

**RF-11:** Confirmar o e-mail usado por `canAccessAICosts` (`lib/admin-access.js`) contra o e-mail real de login do dono do produto; se forem diferentes, ajustar para não esconder "Custos da IA" do próprio dono.

**Critério de aceitação:** menu lateral só mostra o que existe e funciona hoje, com rótulos que não prometem YouTube fora do escopo desta fase.

---

### 4.5 Histórico de custo mais detalhado

**Arquivos:** `app/(app)/ai-costs/page.jsx`, `lib/ai-costs-data.js`.

**Problema:** A tabela `generation_jobs` já guarda `skill_id`, `ref_post_id`, `retry_attempt`, `charged`, `research_performed`; a tela hoje só mostra provedor/modelo, marca, tokens, custo, status e data — sem dizer qual ação foi ou para qual conteúdo.

**RF-12:** Adicionar coluna "Ação", traduzindo `skill_id`/`kind` para rótulos em português (ex.: `editorial-planner` → "Planejamento semanal"; `post-producer` → "Produção de post"). Um mapa estático simples, sem IA.

**RF-13:** Quando existir `ref_post_id`, exibir link para `/content/[id]/review`.

**RF-14:** Adicionar coluna indicando tentativa (`retry_attempt`) e se foi cobrado (`charged`), para deixar visível quando uma tentativa falhou mas ainda consumiu tokens.

**RF-15:** Adicionar filtros por marca, ação e período; paginar além do `limit(100)` atual.

**Critério de aceitação:** a partir da tela de custos, dá para responder "o que foi essa cobrança e onde ela apareceu no produto" sem consultar o banco diretamente.

---

### 4.6 Design system — consolidar componentes duplicados

**Arquivos:** `components/ui/*`, e os pontos que reimplementam Card/Badge: `app/(app)/ai-costs/page.jsx` (`StatCard`), `components/planning/PlanningPanel.jsx` (`StatusBadge`), `components/brand-kit/wizard/DnaDashboard.jsx`, `components/connections/PlatformCard.jsx`, `components/workspace/BrandBadge.jsx`.

**RF-16:** Criar `components/ui/Card.jsx` e `components/ui/Badge.jsx` reaproveitando exatamente as classes já usadas hoje (não inventar visual novo) e substituir as reimplementações locais por esses componentes, um arquivo por vez, validando visualmente que nada mudou.

**RF-17:** Corrigir três desvios pontuais do `DESIGN.md`:
  - Remover o emoji `💡` do cabeçalho da página de Piloto/Estratégia (regra "sem emojis na interface do sistema").
  - Trocar `rounded-lg` por `rounded-full` na barra de busca do `Topbar.jsx` (regra "barra de busca em pílula").
  - Trocar o texto fixo "GenkaiLabs — Plano Enterprise" no `Sidebar.jsx` por dado real (nome da conta/plano) ou remover até existir dado real.

**RF-18:** O sino de notificação no `Topbar.jsx` usa `animate-pulse` incondicional. Deve refletir estado real (existe notificação não lida ou não); sem esse dado ainda, remover o indicador em vez de simular um estado falso.

**RF-19:** Remover o token `shadow-neon`/`--c-glow` de `tailwind.config.js` e `app/globals.css` — não está em uso e contradiz a regra do próprio `DESIGN.md` que proíbe brilho neon.

**Critério de aceitação:** nenhuma mudança visual perceptível nas telas existentes (é consolidação, não redesenho), exceto as três correções pontuais do RF-17/18, que são o objetivo.

---

### 4.7 Responsividade do shell do app

**Arquivos:** `components/layout/Sidebar.jsx`, `components/layout/Topbar.jsx`, `components/layout/AppShell.jsx`.

**Problema:** nenhum dos três tem classe responsiva (`sm:`/`md:`/`lg:`). O `DESIGN.md` (§5) e o PRD original (§16) exigem colapso em coluna única e menu como gaveta/barra inferior abaixo de 768px.

**RF-20:** Implementar colapso do sidebar para menu de gaveta (ou barra inferior) abaixo de 768px, sem alterar o comportamento em desktop. Este é o item de maior esforço deste PRD — tratar como sua própria fase, com tela de teste em mobile real ou emulado antes de considerar concluído.

**Critério de aceitação:** todas as telas principais (Dashboard, Planejamento, Composer, Calendário, Aprovações) usáveis em largura de celular, sem scroll horizontal, conforme o próprio `DESIGN.md`.

---

## 5. Ordem de implementação (fases pequenas, testáveis, com commit por fase)

1. **RF-01/RF-02** — bug do cálculo de vagas. Isolado, só lógica pura, sem risco de regressão visual.
2. **RF-06/RF-07/RF-08** — separar Estratégia do Piloto Automático e remover a UI órfã. Reduz a maior fonte de confusão relatada.
3. **RF-03/RF-04/RF-05** — textos, selo de custo e contador de créditos no Planejamento.
4. **RF-09/RF-10/RF-11** — ajustes de navegação.
5. **RF-16/RF-17/RF-18/RF-19** — consolidação de Card/Badge e correções pontuais de design.
6. **RF-12 a RF-15** — histórico detalhado em `/ai-costs`.
7. **RF-20** — responsividade do shell (fase maior, feita por último e isolada).

## 6. Instruções para o Claude Code

1. Não reconstruir nada — todas as mudanças aqui são pontuais e mapeadas a arquivos existentes.
2. Antes de cada fase, rodar os testes existentes (`npm run test`) como baseline.
3. Cada fase acima é um commit próprio, pequeno, com mensagem descrevendo o RF correspondente.
4. RF-01/RF-02 exige teste unitário novo antes de mexer no comportamento (TDD, já é a prática do projeto em `lib/planning-actions.js`).
5. RF-06/RF-07 não apaga código (`lib/autopilot.js`, `lib/content-plan-actions.js`, testes) — só remove a exposição na interface. Registrar essa decisão no `README.md`.
6. RF-16 é refatoração pura: o resultado visual deve ser idêntico ao atual. Validar com captura de tela antes/depois de cada arquivo migrado.
7. RF-20 é a única fase que pode exigir decisões de layout não cobertas aqui (breakpoints exatos, comportamento do menu-gaveta); nesse caso, parar e pedir decisão antes de prosseguir, como já orienta o PRD original em sua seção de instruções.
8. Atualizar `README.md` ao final de cada fase relevante, como já é prática do projeto.
9. Não tocar em `supabase/functions`, `render.yaml` ou infraestrutura de hospedagem — fora de escopo deste PRD.

## 7. Critérios de aceitação do conjunto

O trabalho deste PRD estará concluído quando: remover uma ideia do Planejamento e pedir novas sugestões sempre gera substitutas; nenhuma tela do produto promete um recurso que não roda; o menu lateral só lista o que existe hoje; toda ação que gasta IA mostra isso antes de ser confirmada; a tela de custos explica cada cobrança; os componentes visuais duplicados foram consolidados sem mudança perceptível; e o app é usável em largura de celular.
