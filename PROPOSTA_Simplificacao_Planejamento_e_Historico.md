# Proposta — Simplificar o Planejamento e Detalhar o Histórico (Instagram)

**Data:** 2026-07-20
**Escopo:** apenas Instagram (único canal ativo)
**Tipo:** documento de planejamento — nenhuma alteração de código foi feita ainda
**Atualização:** revisão estendida para o app inteiro (navegação, duplicidade de sistemas, design e hospedagem) — ver seção 6 em diante.

---

## 1. O que já existe (e já está bem pensado)

O código atual já implementa boa parte do que o PRD pede em matéria de economia de IA:

- **Planejar é barato, produzir é caro**: `generateWeekPlan` só cria temas (título, gancho, CTA...); legenda/carrossel completo só é gerado depois, por item aprovado.
- **Editar, aprovar e remover não custam IA** — só leitura/escrita no banco.
- Existe uma ação **"Trocar"** por card (`replacePlanItem`) que troca *só aquela ideia*, guarda a versão anterior e permite restaurar — isto já é a forma barata de "não gostei, quero outra".
- Há um limite de **3 trocas por ideia** e um registro completo de tokens/custo por chamada (`generation_jobs`).

Ou seja: o mecanismo para "não gostei, troco sem regerar a semana inteira" **já existe** — o problema é que ele não é o caminho óbvio na tela, e o botão que regenera a semana toda ("Sugerir de novo") se comporta de um jeito que confunde.

---

## 2. Causa raiz do problema relatado

### 2.1 "Sugerir de novo" não faz o que o aviso diz

O botão mostra: *"Substituir as ideias atuais por novas sugestões? As ideias atuais serão removidas."* — isso soa como "vai jogar tudo fora e cobrar de novo", o que empurra o usuário para remover itens manualmente um a um, sem perceber que existe o "Trocar" (mais barato) por card.

### 2.2 Bug real: itens removidos "ocupam vaga" e travam a regeneração

Em `generateWeekPlan` (lib/planning-actions.js), o cálculo de quantas ideias novas pedir é:

```
remainingSlots = metaDeposts - preservedItems.length
```

`preservedItems` conta **qualquer item com status ≠ "idea"` — isso inclui itens **rejeitados** (removidos), não só aprovados. Resultado prático: se você remove 2 de 4 ideias e clica em "Sugerir de novo" esperando 2 substitutas, o sistema calcula que a semana já tem 4 itens "resolvidos" (2 aprovados + 2 rejeitados) e **não pede nenhuma ideia nova** — ou pede muito menos do que deveria. Isso é o "eu removo e não vem nada de novo" que gera a sensação de estar preso.

### 2.3 Nenhuma tela mostra o custo antes de clicar

O PRD exige (§Etapa 10): *"Cada regeneração deverá mostrar claramente que utilizará crédito de IA."* Hoje nenhum botão (Trocar, Sugerir de novo, Gerar conteúdo, Pedir nova legenda/imagem) mostra quantos créditos restam ou quanto vai custar antes da ação. A única tela com custo é `/ai-costs`, separada do fluxo, e liberada só para o e-mail `genkailabs@gmail.com` (`lib/admin-access.js`) — se você não estiver logado com esse e-mail no produto, nem consegue ver o histórico de custo hoje.

---

## 3. Proposta de simplificação (Planejamento)

Ordem sugerida, da mudança mais barata/segura para a mais estrutural:

1. **Corrigir o cálculo de vagas**: `remainingSlots` deve contar apenas itens `approved/in_production/ready` como "preservados". Itens `rejected` liberam a vaga de volta. Isso sozinho resolve a sensação de "removi e não veio nada".
2. **Trocar o texto e o destaque dos botões**: "Trocar esta ideia" vira a ação primária de cada card (já existe); "Sugerir de novo" passa a se chamar "Preencher vagas vazias" e só aparece quando há vagas de fato, com um aviso claro tipo "vai gerar N ideias novas, sem tocar nas que você já aprovou".
3. **Mostrar o custo/crédito no próprio card**: um selo pequeno tipo "≈ 1 crédito" perto de "Trocar" e "Gerar conteúdo aprovado", puxando do mesmo limite já calculado em `lib/ai/limits.js`. Não precisa de UI nova grande — é reaproveitar o dado que já existe.
4. **Um contador de créditos do mês visível na própria tela de Planejamento** (não só no dashboard futuro): "6 de 12 gerações usadas este mês", para a decisão acontecer onde a ação acontece.
5. (Opcional, fase 2) Aplicar a mesma lógica de aviso de custo nas telas de produção de conteúdo (`/content/[id]/review`), onde hoje "pedir nova legenda/imagem" também não avisa custo.

Nenhuma dessas mudanças exige tocar em schema do banco (exceto talvez um contador simples de uso mensal, que já pode ser derivado de `generation_jobs`).

---

## 4. Proposta de histórico mais detalhado

O banco já registra muito mais do que a tela `/ai-costs` mostra: `skill_id`, `ref_post_id`, `retry_attempt`, `charged`, `research_performed`, `image_count`. A tela hoje só exibe provedor/modelo, marca, tokens, custo, status e data — sem dizer **qual ação** foi essa (planejar a semana? trocar uma ideia? gerar um carrossel? gerar imagem?) nem **para qual conteúdo**.

Proposta:

- **Coluna "Ação"**: traduzir `skill_id` para um rótulo em português (ex.: `editorial-planner` → "Planejamento semanal", `post-producer` → "Produção de post", `reel-producer` → "Roteiro de Reel"). Mapa simples, sem IA.
- **Link para o conteúdo**: quando existir `ref_post_id`, linkar para `/content/[id]/review`; quando for troca de ideia de planejamento, linkar para o item no `/planning`.
- **Coluna "Tentativas" e "Cobrado"**: usar `retry_attempt` e `charged` para deixar claro quando uma tentativa falhou mas ainda assim consumiu tokens (isso já acontece e hoje é invisível).
- **Filtros**: por marca, por ação/skill, por período e por status (sucesso/erro) — a tabela já tem os campos, falta a UI de filtro.
- **Paginação**: hoje é um `limit(100)` fixo; com filtro por período isso deixa de ser um problema, mas vale paginar mesmo assim.
- **Liberar a visão para o dono da marca**, não só para o e-mail administrativo fixo — ou, no mínimo, confirmar se esse é o e-mail que você usa para logar no Social Hub hoje.

---

## 5. O que eu preciso que você decida

1. Confirma que o e-mail `genkailabs@gmail.com` é o mesmo que você usa para entrar no Social Hub? Se não for, `/ai-costs` está invisível para você agora.
2. Quer que eu já implemente os itens da seção 3 (correção do cálculo de vagas + textos dos botões + selo de custo)? São mudanças pequenas e isoladas em `lib/planning-actions.js` e `components/planning/PlanningPanel.jsx`.
3. Quer que o histórico detalhado (seção 4) vire uma tela nova (`/historico`) separada de `/ai-costs`, ou uma evolução da própria `/ai-costs`?

Meu plano depois de aprovação: aplicar em passos pequenos e testáveis — primeiro o bug do cálculo de vagas (isolado, sem risco), depois os textos/selo de custo na tela de Planejamento, por último a tabela de histórico detalhada.

---

## 6. Revisão do app inteiro (não só o Planejamento)

Você pediu para olhar o app todo em busca de simplificação, incluindo design. Revisei rotas, navegação, o cron de publicação e o design system. O achado mais importante mudou de "melhorar o Planejamento" para **"existem dois sistemas de geração de conteúdo rodando em paralelo, e um deles nem funciona"**.

### 6.1 Achado principal: "Piloto Automático" é um segundo motor de conteúdo, órfão

O item de menu **"Estratégia e Piloto"** (`/autopilot`) na verdade mistura duas coisas diferentes:

1. **Estratégia** (`StrategyPanel`) — isso é legítimo, alimenta o Planejamento, deveria continuar.
2. **Piloto Automático** (`AutopilotForm` + `lib/autopilot.js` + tabela `content_plans`) — um sistema **antigo e paralelo** que promete na tela *"sua agência operando 24/7... gera post diário"*. Ele tem seu próprio botão liga/desliga, sua própria cadência (`posts_per_day`), e gera conteúdo completo (texto + imagem, custo real) **sem passar pelo Planejamento novo**.

Investigando quem realmente chama essa geração diária (`runDailyAutopilot`), não encontrei nenhum cron, rota ou agendamento que a dispare hoje — nem no Next.js, nem no `render.yaml`, nem nas Supabase Edge Functions que vocês acabaram de migrar (`supabase/functions/publish-due-posts`, `youtube-sync`, ambas de 19/07). Ou seja: **o botão "Piloto Automático" existe na tela, promete rodar sozinho todo dia, mas está desconectado — não roda.** Isso não é uma feature discreta, é uma tela inteira contando uma história que o sistema não cumpre, e que compete visualmente com o Planejamento (que é o fluxo real e correto, conforme o PRD).

Isso muda a prioridade da simplificação: antes de mexer em botões do Planejamento, vale **decidir o destino dessa tela** — porque enquanto ela existir do jeito que está, qualquer usuário (inclusive você) pode ligar "Piloto Automático" achando que está economizando trabalho, sem saber que (a) hoje não faz nada, ou (b) se um dia for religado, vai gerar conteúdo por fora do Planejamento, com seu próprio consumo de créditos.

**Proposta:** separar a página em duas responsabilidades reais — `/strategy` só com o `StrategyPanel` (isso já é usado pelo Planejamento) e remover o `AutopilotForm`/toggle da interface (ou movê-lo para uma área "experimental" claramente isolada, como o próprio PRD pede em §7.3). Isso é uma redução real de superfície: uma tela a menos competindo com o Planejamento, um sistema de geração a menos para explicar, testar e manter.

### 6.2 Navegação com mais itens do que o produto precisa agora

O menu atual tem 7 itens em "Módulos Principais" + 3 em "Administração" + 2 em "Relatórios" = 12 entradas, para um produto que ainda está validando o fluxo assistido de Instagram. O próprio PRD (§14.3) já sugere um menu mais enxuto: Início, Planejamento, Conteúdos, Calendário, Resultados, Marca, Conexões — 7 itens. Alguns ajustes concretos, de baixo risco:

- "Calendário e Links" e "Conexões (Meta/YT)" citam YouTube no rótulo, mas YouTube está fora do escopo desta fase (só Instagram ativo) — o rótulo confunde sobre o que está realmente disponível agora.
- "Inbox" aparece no menu com badge "breve" — um item de menu para algo que não existe ainda adiciona ruído visual sem ganho; pode esperar para quando for lançado.
- "Custos da IA" é `adminOnly` fixo para o e-mail `genkailabs@gmail.com` (ver seção 5) — se for você mesmo logado com outro e-mail, o item some do menu sem explicação.

### 6.3 Design: dois pontos fora do próprio guia da equipe

O `DESIGN.md` do projeto é bem específico e teria evitado dois problemas que encontrei:

- A própria regra diz *"Sem Emojis na Interface do Sistema"*, mas o cabeçalho de `/autopilot` usa `💡 Como funciona o Piloto Automático?` — um emoji literal em um título de seção do painel.
- O rodapé da barra lateral mostra **"GenkaiLabs — Plano Enterprise"** fixo no código (`components/layout/Sidebar.jsx`), não vindo de dado nenhum — texto de placeholder que ficou para trás e aparece como se fosse informação real da conta.

São ajustes pequenos, mas em uma revisão de "onde simplificar e alinhar ao design" valem a pena por serem baratos e por destoarem do padrão que vocês mesmos definiram.

### 6.3.1 Aprofundando no design: o que encontrei olhando `components/ui`, `tailwind.config.js` e o shell do app

Você pediu para olhar o design com mais cuidado. `components/ui` hoje tem só 4 peças (`Button`, `EmptyState`, `LoadingIndicator`, `ThemeToggle`) — não existe `Card`, `Badge` ou `Table` compartilhados. Consequência prática: pelo menos 5 arquivos diferentes (`ai-costs/page.jsx`, `PlanningPanel.jsx`, `DnaDashboard.jsx`, `PlatformCard.jsx`, `BrandBadge.jsx`) reimplementam localmente seu próprio "StatCard" ou "Badge", cada um com sua própria combinação de `rounded-2xl`/`bg-surface`/cores. Isso é exatamente o tipo de coisa que faz o produto parecer "quase igual, mas não igual" entre telas — e é simplificação de verdade: extrair um `Card` e um `Badge` para `components/ui` e trocar as reimplementações reduziria código sem mudar nada visualmente hoje.

Outros pontos que confirmei no código, comparando com o `DESIGN.md` de vocês:

- **Sem responsividade real no shell**: `Sidebar.jsx`, `Topbar.jsx` e `AppShell.jsx` não têm nenhuma classe `sm:`/`md:`/`lg:` para colapsar em mobile. O `DESIGN.md` (§5) e o próprio PRD (§16) pedem colapso em coluna única e menu como gaveta/barra inferior abaixo de 768px — hoje isso não existe; a barra lateral de 240px é fixa sempre. Em uma tela de celular o app provavelmente aperta ou corta conteúdo.
- **Barra de busca fora do padrão**: o `DESIGN.md` pede pílula (`rounded-full`) para a busca do topo; o `Topbar.jsx` usa `rounded-lg`.
- **Sininho de notificação sempre "piscando"**: o ponto vermelho do sino tem `animate-pulse` fixo no JSX, sem checar se existe notificação real — sempre parece ter algo novo, mesmo quando não tem.
- **Token de "neon glow" ainda existe no Tailwind** (`shadow-neon`, variável `--c-glow` em `globals.css`): o `DESIGN.md` proíbe brilho neon explicitamente. Hoje nenhum componente usa esse token, então não há problema visual ainda — mas ele convida alguém a usar no futuro e violar a própria regra. Vale remover.
- **Fonte fora da lista**: o `tailwind.config.js` usa `DM Sans` como fonte primária; o `DESIGN.md` só documenta `Outfit`/`Geist`. Não é grave, mas o guia e o código estão dizendo coisas diferentes.

Nenhum desses pontos é urgente isoladamente, mas juntos formam uma lista curta e barata de "arrumação" que deixaria o app mais consistente com o próprio padrão que vocês escreveram — e a extração de `Card`/`Badge` compartilhados é a que mais reduz código de verdade.

### 6.4 Sobre a hospedagem (Render) — você perguntou se está bom ou se deveriam trocar

Direto ao ponto: para o estágio de MVP, **dá para continuar no Render**, mas vale saber a troca que está sendo feita hoje. O plano free do Render "dorme" o serviço depois de ~15 minutos sem uso e leva de 30 a 60 segundos para acordar no próximo acesso — isso é ruim justamente na hora de validar o produto com uma cliente de verdade ou uma agência (o piloto de 2–4 semanas que o PRD propõe em §19), porque a primeira impressão vira uma tela travada.

Como vocês já moveram a publicação agendada e a sincronização do YouTube para Supabase Edge Functions/`pg_cron` (migração de ontem, 19/07), o Render agora só precisa hospedar o Next.js em si — não depende mais dele para cron. Isso simplifica a decisão:

- **Ficar no Render, mas sair do free tier** (~US$7/mês no plano Starter) elimina o "dormir" e é a mudança mais barata e menos arriscada agora.
- **Vercel** tem o melhor suporte nativo a Next.js (ISR, edge, otimização de imagem) e um free tier generoso, mas o plano gratuito (Hobby) é para uso não-comercial — se o Social Hub for cobrar de clientes, precisaria do plano Pro.
- **Railway** fica no meio: sem cold start, modelo por contêiner mais previsível, ~US$8–15/mês em uso moderado — foi inclusive onde os crons rodavam antes da migração para Supabase.

Não é uma decisão urgente nem que trava o produto. Minha recomendação para agora: manter Render e só tirar do free tier quando o piloto com usuárias reais começar, para não perder a primeira impressão por causa do cold start.

---

## 7. Ordem de prioridade sugerida (app inteiro)

1. Decidir o destino da tela "Piloto Automático" (seção 6.1) — é o item que mais gera confusão e é o mais barato de resolver (não tem cron para desligar, só a interface e o toggle).
2. Corrigir o cálculo de vagas do Planejamento (seção 2.2) — isolado, sem risco.
3. Textos/selo de custo + contador de créditos no Planejamento (seção 3).
4. Ajustes de rótulo de navegação e os dois itens de design (seção 6.2/6.3) — baratos, sem risco.
5. Histórico detalhado em `/ai-costs` (seção 4).
6. Sair do free tier do Render quando o piloto com usuárias reais começar (seção 6.4) — não é código, é uma configuração no painel do Render.

Nenhum desses itens exige reescrever telas existentes — todos são ajustes ou remoções pontuais, na linha do que o próprio PRD pede ("não reconstruir do zero").
