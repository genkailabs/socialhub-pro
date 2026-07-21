# Melhoria do Planejamento Semanal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir revisar, editar, trocar e aprovar ideias antes de produzir conteúdo completo, com progresso e resumo semanal claros.

**Architecture:** Evoluir `editorial_plan_items` sem apagar planos existentes. A skill de planejamento passará a salvar metadados estratégicos e o resumo semanal numa única chamada; server actions controlam alterações manuais, regeneração individual e produção em lote. O painel client apenas chama ações e apresenta os estados persistidos.

**Tech Stack:** Next.js 14, React 18, Server Actions, Supabase/Postgres, Zod, Vitest, Tailwind.

## Global Constraints

- Planejamento inicial gera apenas dados estratégicos; nunca legenda, roteiro, hashtags, slides, imagem ou prompt visual.
- Estados persistidos: `idea`, `approved`, `in_production`, `ready`, `rejected`.
- Aprovar nunca inicia produção automaticamente.
- Trocar uma ideia gera somente aquele item, preservando os demais itens e respeitando limite configurável inicial de 3 trocas por item.
- Edição manual e restauração de versão não chamam IA.
- Produção em lote cria um job por item aprovado e continua quando outro item falhar.
- Exibir confirmação antes de trocar ideia, remover, aprovar todas e produzir itens aprovados.
- Manter modo escuro, responsividade e o registro de custos existente.

---

### Task 1: Dados do planejamento e contrato da IA

**Files:**
- Create: `supabase/migrations/20260718_weekly_planning_flow.sql`
- Modify: `lib/ai/skills/editorial-planner/index.js`
- Modify: `lib/planning-actions.js`
- Modify: `lib/planning-data.js`
- Modify: `lib/strategy-plan.js`
- Modify: `tests/unit/skill-strategy-planner.test.js`
- Modify: `tests/unit/strategy-plan.test.js`

**Interfaces:**
- Produces item fields `summary`, `hook`, `target_audience`, `estimated_duration`, `regeneration_count`, `production_error` and statuses in the global constraint.
- Produces plan field `weekly_summary` as `{ mainFocus, description }`.
- Produces pure `planProgress(items)` counts `{ total, idea, approved, inProduction, ready, rejected, readyToProduce }`.

- [ ] **Step 1: Write failing tests** for the expanded Zod output and all five state counts.
- [ ] **Step 2: Run** `npm test -- tests/unit/skill-strategy-planner.test.js tests/unit/strategy-plan.test.js` and confirm RED.
- [ ] **Step 3: Add additive migration.** Add columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, migrate legacy statuses (`proposed`→`idea`, `produced`→`ready`), replace the item status check, add `editorial_plan_item_versions` with RLS through the owning plan/brand, and add `weekly_summary JSONB NOT NULL DEFAULT '{}'::jsonb` to `editorial_plans`.
- [ ] **Step 4: Update the planner schema/prompt** so every item contains the strategic fields and output contains `weeklySummary`; increment skill version. Persist all values in `generateWeekPlan`, keeping approved/in-production/ready items during a new weekly suggestion.
- [ ] **Step 5: Update data selectors and pure status helpers** to return/use the new columns and the new status names.
- [ ] **Step 6: Run focused tests**, then `npm test`, and commit `feat: expand weekly planning data`.

### Task 2: Ações manuais, troca individual e histórico

**Files:**
- Modify: `lib/planning-actions.js`
- Create: `tests/unit/planning-actions.test.js`

**Interfaces:**
- Produces server actions `createPlanItem({ planId, values })`, `updatePlanItem({ itemId, patch })`, `approveAllPlanItems({ planId })`, `removePlanItem({ itemId })`, `replacePlanItem({ itemId, instruction })`, and `restorePlanItemVersion({ itemId, versionId })`.
- `replacePlanItem` returns `{ ok, itemId, cost }` or `{ error }`; it must never delete/alter another item.

- [ ] **Step 1: Write mocked Supabase/runSkill failing tests** covering allowed fields, no AI on manual edit, approval batch only changes `idea`, three-change limit, and restoration without AI.
- [ ] **Step 2: Run** `npm test -- tests/unit/planning-actions.test.js` and confirm RED.
- [ ] **Step 3: Implement ownership-safe actions.** Before replacement, copy the current item into the version table, increment `regeneration_count`, request only item context + Brand DNA + optional instruction, and update the same row. Reject replacement after three changes with the specified manual-edit message.
- [ ] **Step 4: Revalidate `/planning` after each mutation and surface database/provider failures without falsely changing status.**
- [ ] **Step 5: Run focused tests**, then `npm test`, and commit `feat: add individual planning controls`.

### Task 3: Produção individual e em lote com falha isolada

**Files:**
- Modify: `lib/content-actions.js`
- Create: `tests/unit/content-actions.test.js`

**Interfaces:**
- `produceFromPlanItem({ itemId, adjustment })` transitions `approved` → `in_production` → `ready`; on failure restores `approved` and stores `production_error`.
- Produces `produceApprovedPlanItems({ planId })` returning `{ results: [{ itemId, ok, error? }] }` and attempting each approved item independently.

- [ ] **Step 1: Write failing tests** for status transitions, failure isolation, retry eligibility and batch selection of approved items only.
- [ ] **Step 2: Run** `npm test -- tests/unit/content-actions.test.js` and confirm RED.
- [ ] **Step 3: Implement transitions around the existing producer.** Mark in production before costly work; mark ready only after post creation succeeds; on catch persist a readable error and leave the item approved.
- [ ] **Step 4: Implement batch production with `Promise.allSettled` or sequential protected calls so one failure never prevents later approved items.** Keep cost registration through the existing `runSkill` calls.
- [ ] **Step 5: Run focused tests**, then `npm test`, and commit `feat: batch approved content production`.

### Task 4: Painel de planejamento, cards e confirmações

**Files:**
- Modify: `components/planning/PlanningPanel.jsx`
- Create: `components/planning/PlanningSummary.jsx`
- Create: `components/planning/PlanningItemForm.jsx`
- Modify: `app/globals.css` only if a missing reusable style is necessary
- Create: `tests/unit/planning-panel.test.jsx` or focused pure component tests supported by the existing Vitest setup

**Interfaces:**
- Renders columns Ideias (`idea`), Em produção (`approved` and `in_production`) and Prontos para publicar (`ready`).
- Uses actions from Task 2 and Task 3; never produces on approve.

- [ ] **Step 1: Write failing component tests** for expanded details, card action availability by status, and summary/progress calculations.
- [ ] **Step 2: Run the focused test command** and confirm RED.
- [ ] **Step 3: Replace compact card with an accessible expandable card.** Show format, date, title, pillar and status initially; reveal objective, summary, hook, CTA, audience and duration via “Ver detalhes”.
- [ ] **Step 4: Add manual add/edit form, version restore control and dialogs using `window.confirm` only where the project has no modal primitive.** Confirm replacement, removal, approve-all and batch production with the PRD wording.
- [ ] **Step 5: Add top actions** “Aprovar todas as ideias”, “Gerar conteúdos aprovados” and “Adicionar ideia”; clearly mark only AI-consuming actions with the existing Sparkles/Wand icon.
- [ ] **Step 6: Add responsive `PlanningSummary`** with state, format and objective distributions, strategic summary, and ready/total progress bar.
- [ ] **Step 7: Run focused tests**, then `npm test`, and commit `feat: redesign weekly planning panel`.

### Task 5: Integração e regressões do fluxo completo

**Files:**
- Modify: `tests/unit/composer-intelligence.test.js` only if status names are consumed there
- Modify: affected existing tests from Tasks 1-4
- Modify: `docs/HANDOFF.md` only if it documents old planning states

- [ ] **Step 1: Search** `rg -n "proposed|produced" lib app components tests` and classify each planning-state use.
- [ ] **Step 2: Add regression tests** for legacy plan rows being presented as idea/ready and for a complete flow: generate plan → edit → approve → produce → ready.
- [ ] **Step 3: Run** `npm test` and `npm run build`; fix only regressions caused by this PRD.
- [ ] **Step 4: Commit** `test: cover weekly planning flow`.

## Coverage Review

- Dados estratégicos, resumo na mesma chamada e baixo custo: Task 1.
- Estados, colunas, contadores e progresso: Tasks 1 and 4.
- Edição, remoção, adição, troca, limite e histórico: Tasks 2 and 4.
- Produção individual/lote, confirmação, progresso/falha/retry e custos: Tasks 3 and 4.
- Responsividade, contraste, regressões e build: Tasks 4 and 5.
