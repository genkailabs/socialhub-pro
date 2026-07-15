# Design System: SocialHub (Finly-Inspired High-End Dashboard)

## 1. Visual Theme & Atmosphere
SocialHub adota uma estética **"Daily App Balanced"** (Densidade 6/10) com **"Offset Asymmetric"** (Variância 6/10) e **"Fluid Spring Motion"** (Movimento 6/10), inspirada diretamente na elegância modular do dashboard *Finly*.

A atmosfera transmite precisão executiva, clareza visual e conforto prolongado para agências e gestores de redes sociais. O design prioriza cartões generosamente arredondados (`rounded-2xl` a `rounded-3xl`), separação espacial imaculada entre seções (sem sobreposições) e transições suaves entre o **Light Mode** (suave, respirável com tons pastel de lavanda e cartões brancos puros) e o **Dark Mode** (profundo, acetinado com tons grafite/carvão e bordas translúcidas de contraste milimétrico).

## 2. Color Palette & Roles

### Light Mode (Canvas Claro)
- **Canvas App Background** (`#F6F5FA`) — Fundo geral da aplicação, com sutil tom lavanda acinzentado para destacar os cartões brancos.
- **Pure Surface Card** (`#FFFFFF`) — Preenchimento dos cartões de métricas, gráficos, barra lateral e modais.
- **Surface Hover / Secondary** (`#F0EEF6`) — Estado hover de itens de lista e preenchimento de inputs.
- **Charcoal Ink** (`#18181B`) — Texto principal, títulos e números de alto impacto.
- **Muted Steel** (`#71717A`) — Texto secundário, legendas, datas e metadados.
- **Whisper Border** (`rgba(226, 232, 240, 0.7)`) — Linhas divisórias e bordas estruturais de 1px dos cartões.

### Dark Mode (Canvas Escuro)
- **Matte Graphite Background** (`#18181C`) — Fundo escuro profundo, sem ser preto puro (`#000000` é estritamente banido).
- **Elevated Surface Card** (`#232329`) — Preenchimento de cartões no modo escuro.
- **Surface Hover / Secondary** (`#2E2E36`) — Hover de navegação e pílulas de filtros.
- **Crisp Text Ink** (`#F4F4F6`) — Texto principal em alto contraste confortável.
- **Muted Lavender Gray** (`#9CA3AF`) — Texto secundário e ícones inativos.
- **Whisper Dark Border** (`rgba(255, 255, 255, 0.07)`) — Contorno estrutural sutil para separar cartões do fundo.

### Cores Semânticas & Acentos (Comuns a ambos)
- **Primary Brand Accent (Indigo/Violet)** (`#6366F1` no Light / `#8B5CF6` no Dark) — Acento principal para botões primários, pílula de navegação ativa, linhas principais de gráficos e anéis de foco (`focus-visible`). *(Saturação controlada. Sem brilho neon artificial).*
- **Secondary Accent (Warm Amber)** (`#F59E0B`) — Usado para segundas séries de gráficos comparativos (ex: Engajamento vs. Alcance ou Despesas vs. Receita) e badges de rascunho/alerta.
- **Success / Published** (`#10B981`) — Indicador de post publicado, crescimento positivo (`+13.4%`) e status de sucesso.
- **Danger / Error** (`#F43F5E`) — Indicador de erro no disparo, queda de métrica e ações destrutivas.

## 3. Typography Rules
- **Display & Headlines:** `Outfit` ou `Geist` — Pesos controlados (`SemiBold` 600 / `Medium` 500), tracking levemente ajustado (`-0.015em`), sem gritar com tamanhos gigantescos. A hierarquia se dá pelo peso e cor (ex: título de seção em `#18181B`, subtítulo em `#71717A`).
- **Body & UI Labels:** `Outfit` ou `Geist` — Tamanho mínimo de leitura `14px` (`0.875rem`) no corpo de cards e listas, `13px` para legendas secundárias. Altura de linha (`leading-relaxed`) para legibilidade máxima.
- **Mono / Numbers / Timestamps:** `Geist Mono` ou `JetBrains Mono` — Obrigatório para todos os valores monetários, porcentagens de KPIs, contadores de caracteres no agendador, datas e horários de agendamento. Garante alinhamento tabular perfeito (`tabular-nums`).
- **Fontes Banidas:** `Inter` é estritamente banida por transmitir sensação genérica de template. Fontes serifadas (`Times New Roman`, `Georgia`, `Garamond`) são absolutamente banidas em todo o dashboard.

## 4. Component Stylings
- **Cards (Cartões de Métrica e Gráficos):**
  - Cantos generosamente arredondados (`border-radius: 24px` a `30px`, correspondendo a `rounded-2xl` e `rounded-3xl` no Tailwind).
  - Sombras difusas e sutis no Light Mode (`box-shadow: 0 4px 24px -2px rgba(24, 24, 27, 0.04)`). No Dark Mode, sem sombra externa difusa; em vez disso, borda de `1px solid rgba(255,255,255,0.07)` e leve variação de tom de superfície.
  - Padding interno generoso (`p-6` ou `p-7`).
- **Buttons (Botões & CTAs):**
  - Formato pílula (`rounded-full`) ou levemente arredondado (`rounded-xl`).
  - Botão Primário: Preenchimento sólido no acento (`#6366F1`), texto branco puro, sem *outer glow* neon. Feedback tátil com física ao clicar (`active:translate-y-[1px] active:scale-[0.98]`).
  - Botão Secundário / Ghost: Fundo transparente ou superficial (`#F0EEF6` / `#2E2E36`), borda sutil opcional, texto no tom `Ink`.
- **Inputs & Search Bar:**
  - Barra de busca superior estilo pílula (`rounded-full`), fundo `#F0EEF6` no Light / `#1E1E24` no Dark, ícone de lupa à esquerda em cor `Muted`, sem borda agressiva até receber o foco.
  - Ao receber foco (`focus-visible`): Anel suave na cor do acento (`ring-2 ring-indigo-500/30 border-indigo-500`).
- **Theme Toggle & Action Pills:**
  - Seletor compacto no topo direito com ícones de calendário/data (`Thu, Sep 5`) e switch pílula com ícones de Lua/Sol para alternar instantaneamente entre Dark e Light mode.
- **Status Badges (Postagens e Aprovações):**
  - Pílulas compactas (`px-3 py-1 rounded-full text-xs font-medium tabular-nums`) com fundo em tom suave (`tint`) e texto no tom forte do acento ou semântica correspondente.
- **Chart Layouts (Recharts):**
  - Gráficos de linha com curvas suaves (`type="monotone"`), sem pontos pesados marcados em cada dado a menos que em hover.
  - Grade de fundo (`CartesianGrid`) extremamente sutil ou apenas linhas horizontais esmaecidas (`strokeOpacity={0.08}`).
  - Tooltips customizados no mesmo formato de card (`rounded-xl`, fundo opaco com borda sutil, tipografia mono para valores).

## 5. Layout Principles
- **Sidebar Esquerda Fixa & Limpa:**
  - Largura controlada (`w-64`), contendo o logo estilizado com ícone moderno, navegação principal com espaçamento vertical respirável (`space-y-1.5`) e pílula de item ativo destacada (`bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium rounded-xl`).
- **Grid Modular & Assimpétrico:**
  - O conteúdo central é dividido em uma grade de 12 colunas ou 3 colunas fluidas:
    - Coluna da Esquerda / Centro (8 ou 9 colunas): Cards de KPIs no topo (`grid grid-cols-1 md:grid-cols-3 gap-5`), seguidos pelo grande card de Gráfico Principal (`Income vs. Expenses` / `Alcance vs. Engajamento`) e seção inferior de cartões de conexão/meta.
    - Coluna da Direita (3 ou 4 colunas): Lista vertical compacta de Atividades Recentes (`Recent Transactions` / `Aprovações Recentes`) e Gráfico de Rosquinha (`Expense Categories` / `Distribuição por Redes`).
- **Contenção & Responsividade:**
  - Em telas menores (`< 1024px`), a coluna direita vai para baixo da principal de forma fluida.
  - Em mobile (`< 768px`), colapso estrito para coluna única. Sidebar transforma-se em menu gaveta oculto ou barra inferior. Sem scroll horizontal.

## 6. Motion & Interaction
- **Física de Mola (Spring Physics):** Todas as transições de expansão, abertura de modais e hover utilizam aceleração natural (`transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]`).
- **Micro-interações:**
  - Hover nos cards de KPIs exibe uma sutil elevação ou mudança de opacidade da seta de tendência.
  - Transição suave de cor global ao alternar entre Light e Dark Mode (`transition-colors duration-200`).
- **Performance:** Animações restritas a `opacity` e `transform`. Sem animações em propriedades pesadas de layout (`width`, `height`, `top`, `left`).

## 7. Anti-Patterns (Banned / Proibidos)
- ❌ **Sem Emojis na Interface do Sistema:** Não use emojis no meio de títulos, labels de menus ou botões do painel (exceção: dentro do conteúdo gerado pelo usuário no editor de legenda do post).
- ❌ **Sem Fonte `Inter` ou Fontes Serifadas:** Proibido usar `Inter` em títulos/menus. Proibido usar fontes serifadas no painel.
- ❌ **Sem Preto Puro (`#000000`):** Fundos escuros devem ser grafite/carvão (`#18181C`), nunca preto absoluto.
- ❌ **Sem Brilho Neon (Neon Glow ao redor de botões/cards):** O acento é limpo e sólido, sem sombras brilhantes roxas artificialmente difusas (`neon glow`) que poluem a visão.
- ❌ **Sem Grade 3x3 Genérica Simétrica em tudo:** Varie alturas e proporções de cards para criar hierarquia visual executiva (cards de KPI de um tamanho, gráfico de largura dupla, lateral de transações com altura estendida).
- ❌ **Sem Dados Inventados/Absurdos em Labels de Sistema:** Se não houver dado real, use placeholders descritivos limpos ou estados vazios estruturados ("Nenhuma transação recente" em vez de cards falsos com números aleatórios absurdos).
- ❌ **Sem Textos Clichê de IA:** Proibido usar termos como "Elevate your social media", "Unleash power", "Next-Gen AI workflow" na interface. Use português claro, executivo e direto.
