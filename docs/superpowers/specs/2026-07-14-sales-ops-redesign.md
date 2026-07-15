# Especifição de Design: Redesign Sales-Ops (Modo Escuro Esmeralda/Ardósia)

**Data:** 2026-07-14  
**Objetivo:** Elevar a identidade visual e os componentes do `socialhub`, transformando o Modo Escuro (`.dark`) no visual analítico, de alta densidade de informação e contraste do `sales-ops-dashboard` (Tons de Ardósia/Grafite profundo + Acento Verde Esmeralda + Tipografia **DM Sans**), mantendo o Modo Claro (`:root`) limpo, funcional e harmônico.

---

## 1. Arquitetura e Estratégia de Tokens Híbridos

A aplicação adota uma estratégia de **Dupla Personalidade Semântica via CSS Custom Properties (`app/globals.css`)**, permitindo que o `ThemeToggle` alterne perfeitamente entre o modo claro e o novo modo escuro sem duplicação de código JSX.

### 1.1. Tipografia (`app/globals.css` & `tailwind.config.js`)
- **Modo Claro (`:root`):** Preserva a fonte **Outfit** para títulos (`font-display`) e corpo (`font-sans`).
- **Modo Escuro (`.dark`):** Ativa a fonte **DM Sans** (importada via Google Fonts no `globals.css`) para garantir a estética corporativa e analítica de dashboard de vendas.
- **Família Monospaçada (`font-mono`):** Ambos os modos compartilham **JetBrains Mono** para números de estatísticas, porcentagens e códigos, assegurando alinhamento tabular e legibilidade técnica.

### 1.2. Mapeamento da Paleta no Modo Escuro (`.dark` em `app/globals.css`)
As variáveis no bloco `.dark` são recalibradas com valores RGB/OKLCH equivalentes à referência `sales-ops-dashboard`:
- `--c-app`: `22 22 24` (`#161618` — Canvas Slate-Navy escuro, eliminando pretos puros).
- `--c-surface`: `31 31 35` (`#1F1F23` — Cartões elevados com nitidez visual).
- `--c-surface-2`: `39 39 45` (`#27272D` — Hovers de itens de lista, cabeçalhos de tabelas e inputs).
- `--c-line`: `255 255 255` (com opacidade `0.08` a `0.12` nas classes utilitárias para hairlines limpas como `border-border`).
- `--c-line-strong`: `82 82 91` (`#52525B`).
- `--c-ink`: `244 244 246` (`#F4F4F6` — Texto principal branco nítido de alto contraste).
- `--c-muted`: `156 163 175` (`#9CA3AF` — Texto secundário cinza acinzentado/lavanda).
- **Acento Principal (`--c-accent`):** `16 185 129` (`#10B981` — Verde Esmeralda/Mint vibrante, substituindo o roxo Índigo no modo noturno).
- **Estados Semânticos:**
  - `--c-success`: `16 185 129` (Verde Esmeralda).
  - `--c-warning`: `245 158 11` (Âmbar/Ouro).
  - `--c-danger`: `244 63 94` (Vermelho Rose).

### 1.3. Efeitos de Sombra, Brilho e Interação (`tailwind.config.js`)
- **Sombras (`shadow-soft` no `.dark`):** Ajustadas para sombras difusas sutis com leve reflexo de borda (`0 1px 2px rgba(0,0,0,0.3)`).
- **Brilho (`shadow-glow` / `ring-accent`):** Ajustado para emitir um halo de foco Verde Esmeralda (`rgba(16, 185, 129, 0.18)`) em inputs focados e cartões em hover.

---

## 2. Reestilização de Componentes Core & Layout

Os componentes são reestilizados utilizando classes semânticas (`bg-surface`, `border-line`, `text-accent`) para que respondam organicamente ao tema ativo sem duplicação estrutural.

### 2.1. Card de Métricas (`components/dashboard/StatTile.jsx`)
O `StatTile.jsx` evolui para incorporar os padrões visuais e interativos do `MetricCard` do Sales-Ops:
- **Estrutura Base:** `bg-surface border border-line rounded-xl p-5 hover:border-accent/50 transition-all duration-300 overflow-hidden relative group`.
- **Gradiente de Hover (`Ambient Glow`):** Div absoluta em fundo `absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`.
- **Header de Ícone:** O ícone descansa em `w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center group-hover:bg-accent/10 transition-colors duration-300`. O ícone em si ganha `group-hover:text-accent transition-colors duration-300`.
- **Valor Principal:** `text-2xl lg:text-3xl font-bold font-mono text-ink tracking-tight tabular-nums`.
- **Badge de Tendência (`change` e `changeType`):** Exibe ícone semântico (`TrendingUp` esmeralda ou `TrendingDown` rose) ao lado da porcentagem em `text-sm font-medium`.

### 2.2. Painéis do Dashboard (`FollowerTrend.jsx` e `YoutubePanel.jsx`)
- **Containers Glass:** `bg-surface border border-line rounded-2xl p-5 shadow-soft`.
- **Listagens Internas (Vídeos/Métricas):** Itens com `flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-surface-2/60 transition-colors duration-200 text-sm text-ink`.
- **Destaque de Melhor Horário (`YoutubePanel`):** Container em `bg-surface-2/80 border border-line rounded-2xl p-4 text-sm flex items-center gap-2` com ícone `Clock text-accent`.

### 2.3. Topbar do AppShell (`components/layout/AppShell.jsx`)
Inspirado no `header.tsx` do Sales-Ops:
- **Barra Superior Sticky:** `h-16 border-b border-line bg-app/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6`.
- **Busca/Filtro Interativo:** Campo com micro-animação de foco `w-48 focus:w-64 transition-all duration-300 h-9 pl-9 pr-4 rounded-lg bg-surface-2 border border-line text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent`.
- **Ações Rápidas (Notificações e Botão de Tema):** `w-9 h-9 rounded-lg bg-surface-2 hover:bg-surface-2/80 flex items-center justify-center text-muted hover:text-ink transition-colors relative` (com ponto `animate-pulse` no ícone de notificações).

### 2.4. Barra Lateral (`components/layout/Sidebar.jsx`)
- **Destaque de Item Ativo no Modo Escuro:** Link ativo recebe `bg-accent/15 text-accent font-semibold border-l-2 border-accent transition-colors duration-200`.

---

## 3. Estratégia de Transição e Git Workflow

### 3.1. Fechamento Limpo do Branch Atual (`feat/brand-dna-ai`)
Antes da refatoração visual, consolidamos os 36 arquivos modificados e 4 pastas não rastreadas (`app/api/youtube/`, `components/onboarding/`, `lib/pipeline.js`, `wiki/`) que correspondem às tarefas finalizadas de YouTube e Brand DNA:
1. `git add app/ components/ lib/ wiki/ DESIGN.md README.md tailwind.config.js`
2. `git commit -m "feat(youtube, brand-kit): consolidação final de rotas OAuth, onboarding e UI polish"`
3. Criação de branch dedicado: `git checkout -b feat/sales-ops-redesign`

### 3.2. Plano de Verificação Continua
- **Testes Unitários:** `npm test` deve passar **100% (78 testes)** após as mudanças nos componentes e tokens.
- **Build de Produção:** `npm run build` deve compilar sem erros de CSS ou JSX em todas as 23 rotas.
- **Validação no Navegador:** Verificação no servidor local (`http://localhost:3001`) confirmando:
  - Fundo Slate-Navy e acento Verde Esmeralda no modo escuro (`.dark`).
  - Transição de foco no campo de busca do `AppShell` (`w-48` -> `w-64`).
  - Glow sutil em hover nos cards do `StatTile`.
  - Funcionamento bidirecional perfeito do `ThemeToggle` entre modo claro (Índigo/Outfit) e modo escuro (Esmeralda/DM Sans).
