# Agente condutor em janela flutuante

Data: 2026-07-25

## Problema

Quem entra no SocialHub pela primeira vez cai no `/dashboard` e é deixado sozinho
diante de um menu com onze itens. Não há caminho: a marca nasce por um modal do
topo, o Instagram se conecta numa tela que ninguém indica, e as três telas que
realmente dependem uma da outra — DNA, Estratégia, Planejamento — só revelam a
ordem quando o servidor recusa a ação.

Pior: o app já tem três versões do fluxo brigando entre si.

- `GuidedOnboardingWizard` — 7 passos, tela cheia. **Está desligado**:
  `app/(app)/layout.jsx:15` não passa `activeKit` ao `AppShell`, então
  `needsOnboarding` (`AppShell.jsx:28`) é sempre falso. O ramo nunca renderiza.
- `getPipeline` / `FlowStepper` — 5 passos que começam no Brand Kit e ignoram
  Instagram e Diagnóstico. E `done[0] = !!kit` (`lib/pipeline.js:29`) dá "Brand
  Kit pronto" pela mera existência da linha, que nasce de qualquer rascunho.
- A cadeia real de dependências do banco, descrita abaixo.

Dois defeitos só apareceram ao ler o wizard de ponta a ponta:

1. **O onboarding atual nunca produziu um plano.** `confirmDnaAndGeneratePlan`
   (`GuidedOnboardingWizard.jsx:146-172`) vai de `approveDnaVersion` direto para
   `generateWeekPlan`, pulando a estratégia — e `generateWeekPlan` exige
   estratégia aprovada (`lib/planning-actions.js:46-53`). Cai sempre no ramo de
   aviso da linha 161 e ainda assim mostra tela de sucesso.
2. **A frequência escolhida não chega a lugar nenhum.** O passo 4 grava em
   `onboarding_answers`; `generateStrategy` lê `content_plans.posts_per_day`
   (`lib/strategy-actions.js:34`), que só o formulário do Piloto escreve.

## Resultado pretendido

Depois do login, a pessoa é conduzida por um agente numa janela flutuante, do
zero até o primeiro plano da semana. O menu lateral fica visível e inerte até
lá. O agente não faz o trabalho dentro dele: leva a pessoa às telas reais e
explica o que fazer ali.

## Cadeia real de dependências

Não é opinião — é o que o servidor exige.

```
criar marca ──(cookie active_brand_id)──> tudo o mais
   ├─ conectar IG   grava social_tokens; só grava platform='instagram' se a
   │                Página do Facebook tiver instagram_business_account
   ├─ diagnóstico   EXIGE social_tokens instagram ativo; grava instagram_audits
   ├─ Brand DNA     exige só brandId; aprovar grava brand_kits.dna_generated_at
   ├─ estratégia    EXIGE dna_generated_at (gate duro); audit é opcional
   └─ planejamento  EXIGE estratégia approved (gate duro)
```

## Desenho

### 1. Uma fonte de verdade

`lib/journey.js` (puro, sem I/O) e `lib/journey-data.js` (leitura), seguindo a
separação que o repo já usa em `lib/brands.js` × `lib/brands-data.js`.

Seis passos, cada um `done` por **fato do banco**, nunca por contador:

| passo      | rota                      | `done` quando                          |
|------------|---------------------------|----------------------------------------|
| `brand`    | `/dashboard`              | existe marca ativa                     |
| `connect`  | `/connections`            | `social_tokens` instagram ativo        |
| `diagnose` | `/instagram/diagnostico`  | ≥1 linha em `instagram_audits`         |
| `dna`      | `/brand-kit`              | `brand_kits.dna_generated_at` não nulo |
| `strategy` | `/strategy`               | `content_strategies` status approved   |
| `plan`     | `/planning`               | `countPlanItemsForBrand > 0`           |

A etapa atual é **o primeiro passo não feito**, nunca "último feito + 1". Fato
fora de ordem em dado legado não confunde o cálculo.

`brand_kits.onboarding_step` deixa de ser autoridade e vira espelho do índice
derivado — telemetria de onde as pessoas travam. `onboarding_answers` continua
sendo fonte de verdade do **conteúdo** (segmento, objetivo, frequência).

### 2. Quem é conduzido

A regra mais delicada do desenho. Não pode ser "não completou", senão todo
usuário atual com DNA e estratégia mas sem plano é jogado de volta ao começo.

```
conducting = !hasPlanItems && (
  onboarding_status === 'in_progress'        // nasceu dentro do agente
  || (!igConnected && !dnaApproved && !strategyApproved)  // marca vazia
)
```

Duas portas, ambas seguras. **Fato vence flag**: com plano na mão ninguém é
conduzido, mesmo com a flag suja. Marcas legadas que nunca saíram do zero são
cobertas pela segunda porta.

Válvula de escape: `leaveJourney` grava `pending` e solta a pessoa. Sem ela,
qualquer bug no gate vira chamado de suporte.

Antes de ligar o gate em produção, contar quantas marcas cairiam em
`conducting`. Se não for aproximadamente "as marcas vazias", parar.

### 3. O gate

- `middleware.js` injeta o pathname num header `x-pathname`. Não decide nada —
  cinco queries no edge a cada request seria caro.
- `app/(app)/layout.jsx` decide: resolve a jornada e, se `conducting` e o
  pathname não for o da etapa, `redirect` para a rota do passo. Antes de
  renderizar, então sem flash.
- `AppShell` não decide; só desenha o menu travado e a janela.

**Falha aberto.** Erro no `getJourney` ou header ausente ⇒ não conduz. Prender
alguém por timeout de banco é pior que não conduzir.

Curto-circuito de custo: quem já terminou paga 1 query (lê `brand_kits`, vê
`completed`, retorna), não 6.

### 4. O menu inerte

Links continuam **visíveis** e viram `<span aria-disabled="true" tabIndex={-1}>`
em vez de `<Link>`. Não `pointer-events-none`, que não impede foco por teclado
nem leitor de tela. Sumir com o menu apagaria a memória espacial e pareceria
quebrado; visível-e-travado comunica "existe, ainda não agora".

Trocar de marca continua livre (a jornada é por marca). "Nova marca" fica
desabilitado — a marca precisa nascer dentro do agente.

### 5. A janela

`components/journey/`: `JourneyProvider`, `AgentWindow`, `AgentStepBody`,
`journey-copy.js` e um componente por passo.

- `fixed bottom-5 right-5`, `z-[45]` — acima da Topbar (`z-30`) e do MascotTip
  (`z-40`), abaixo dos modais (`z-50`). Mobile: barra inferior.
- Recolhível, preferência em `localStorage` sob `journey-agent:collapsed`.
  Recolher não destrava nada — o gate é do servidor.
- Reusa `components/onboarding/Mascot.jsx` e as animações `animate-mascot-bob` /
  `animate-mascot-pulse` já em `app/globals.css`.
- Depois de cada ação, `router.refresh()`: o layout recalcula os fatos e a etapa
  anda sozinha. Nenhuma máquina de estados no cliente.
- `busy` obrigatório nos quatro CTAs que custam crédito de IA.

### 6. Sem dois mascotes

`MascotTip` e `FlowStepper` leem o contexto e retornam `null` durante a jornada.
Uma linha em cada, sem tocar nas cinco páginas que os renderizam.

### 7. O que sobrevive do wizard

Classificação, objetivos/frequência e a sequência de chamadas de IA. A
classificação **ganha qualidade**: hoje recebe `platform_data`, que só tem
`page_id`/`page_name`; com o diagnóstico rodando antes do DNA, passa a receber
`username` e `biography` reais do audit.

Morrem: a casca de tela cheia, `app/(app)/onboarding/page.jsx`, o ramo morto do
`AppShell`, e os órfãos `DnaAnalyzer.jsx`, `wizard/BrandWizard.jsx`,
`wizard/DnaDashboard.jsx`.

## Fatias

Cada uma deixa o app de pé e testável.

0. `lib/journey.js` + `lib/journey-data.js`, sem consumidor.
1. `getPipeline` passa a usar os fatos — para de mentir sobre o Brand Kit.
2. Janela e provider, sem gate. Menu ainda livre.
3. Passos `brand` e `connect`; `startJourney`; "Nova marca" desabilitado.
4. **O gate.** Header, redirect, menu inerte, MascotTip e FlowStepper calados.
5. Passos `diagnose` e `dna`.
6. Passos `strategy` e `plan`; frequência chega em `posts_per_day`;
   `finishJourney` destrava o menu.
7. Bugs: `return_to` do OAuth (com whitelist, não regex) e `resetOnboarding`.
8. Demolição do wizard e dos órfãos.

A fatia 4 é a de risco. As fatias 0–3 não mudam nada para quem já usa o app.

## Testes

O grosso é unitário porque a peça central é pura: `resolveJourney` com um fato
por vez; **fatos fora de ordem** (tem plano, não tem audit) ⇒ completo vence;
**retrocesso** (token revogado depois do plano pronto) ⇒ continua completo —
esta é a asserção que impede reabrir o onboarding de quem terminou.

`isPathAllowed` e `safeReturnTo` (incluindo `//evil.com` ⇒ null) também são
puros. Componente: janela presente com `conducting`, Sidebar renderizada com
`aria-disabled`, e **children ainda renderizados** — essa asserção codifica em
teste a decisão "palco = telas reais".

Só a inspeção visual pega: colisão da janela com os CTAs reais das telas, se o
menu travado parece intencional ou quebrado, z-index contra a Topbar sticky,
dark mode.

## Riscos

1. **Prender quem já usa o app.** Mitigado por `conducting` opt-in, "fato vence
   flag", `leaveJourney` e o teste de retrocesso.
2. **Fail-closed acidental.** A regra de falhar aberto vai no código.
3. **Custo por request.** Mitigado pelo curto-circuito de 1 query.
4. `createBrand` não cria linha em `brand_kits` — `startJourney` cria.
5. Cache do layout congelando o agente — `router.refresh()` após cada ação.

## Aberto

`resetOnboarding` grava `not_started`, aceito pelo CHECK da migration
`20260721204500`. Como o schema em produção diverge das migrations locais,
sondar o banco antes de confiar. Gravar `pending` funciona nos dois mundos.
