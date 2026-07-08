# Design Doc — Refatoração Tela "Conexões & Canais"

**Data:** 2026-07-08
**Status:** Aprovado
**Abordagem:** A — Refatoração progressiva com extração de sub-componentes

---

## Objetivo

Melhorar experiência da tela de conexões com organização, hierarquia visual e sensação de produto SaaS premium, conforme PRD.

---

## Decisões de Design

| Decisão | Escolha |
|---------|---------|
| White-Label banner | Página separada, item no menu "Externo / Cliente" |
| Botão de ajuda global | Ícone `?` no header da página → Drawer lateral direito |
| Estado de erro nos cards | Usar `syncError` do WorkspaceContext |
| Bio da conta conectada | Manter inline no card, compacta |
| Abordagem de implementação | A — Refatoração progressiva |

---

## Estrutura de Arquivos (Resultado)

```
src/
├── pages/
│   └── Connections.jsx              ← orquestrador (~250 linhas)
│       - Estado global (banner, modals, drawer)
│       - Monta dashboard + seções + drawers
│       - Lógica de conectar/desconectar (delega ao contexto)
│       - Mantém modais OAuth/QR/Bio inline (extração futura)
│
└── components/
    └── connections/
        ├── ConnectionDashboard.jsx   ← faixa de 6 mini-cards de resumo
        ├── ConnectedAccountCard.jsx  ← card de conta conectada
        ├── AvailablePlatformCard.jsx ← card de plataforma disponível
        ├── HelpDrawer.jsx            ← drawer lateral de tutoriais
        └── WhiteLabelPage.jsx        ← nova página Portal White-Label
```

---

## Seções da Tela

### 1. Dashboard Superior

Faixa horizontal com 6 mini-cards:

| Card | Ícone | Valor | Fonte |
|------|-------|-------|-------|
| Redes Conectadas | CheckCircle2 | `connectedCount/networks.length` | `networks.filter()` |
| Total Seguidores | Users | soma formatada | `networks[n].followers` parse |
| Última Sincronização | Clock | timestamp relativo | `lastSynced` mais recente |
| Contas Disponíveis | Globe | `networks.length` | `networks.length` |
| Alertas/Erros | AlertCircle | contagem | canais com `syncError` |
| Status Geral | Activity | Online/Offline | `connectedCount > 0` |

Layout: `flex` row, cada card `flex-1`, responsivo (3 colunas mobile, 6 desktop).
Estilo: `bg-white border-gray-100 shadow-sm`, valor em `text-lg font-extrabold`.

### 2. Contas Conectadas

Header: "Contas Conectadas" + badge com contagem.

Grid: 3 col (lg) / 2 (md) / 1 (mobile).

**Card layout (altura ~35% menor que atual):**

```
[Ícone colorido]  Nome Plataforma    ● Conectado
@handle
urlcurta.com/perfil

👥 85.4k seguidores    📈 3.2% engajamento
🕐 Sinc: 8min atrás

[⚙️ Gerenciar]
```

- Borda verde (`border-emerald-200`), fundo levemente esverdeado (`bg-emerald-50/30`)
- Badge "Conectado" (`bg-emerald-100 text-emerald-700`)
- Métricas com fonte `font-extrabold text-base`
- Botão Gerenciar secundário (`bg-gray-100`)

**Estado de erro:**
- Borda `border-red-300`, fundo `bg-red-50/30`
- Badge "Reconectar" vermelha
- Mensagem de erro inline (`text-[10px] text-red-500`)

Removido do card atual: bio inline (mantida compacta), botão Bio separado, botão Desconectar (movido pro modal Gerenciar), accordion tutorial, token expiry, subtítulo da plataforma.

### 3. Plataformas Disponíveis

Header: "Plataformas Disponíveis" + badge com contagem.

Grid: mesmo esquema. Cards ~60% menores que os de conectadas.

```
[Ícone cinza]  Nome Plataforma    Disponível
Descrição curta (1 linha)

[🔌 Conectar]
```

- Borda `border-gray-200`, fundo `bg-white`, sem opacidade reduzida
- Badge "Disponível" (`bg-gray-100 text-gray-500`)
- Botão Conectar com gradiente laranja (`from-[#F26526] to-[#FF8A50]`)

Removido: tudo que não for logo + nome + descrição + botão.

### 4. Drawer de Ajuda

- Ícone `?` no header da página (ao lado do título "Canais Sociais")
- Abre drawer lateral direito (`w-96`, ~400px)
- Overlay: `bg-black/50 backdrop-blur-sm`
- Animação: `translate-x-0` ↔ `translate-x-full`, `transition-transform duration-300`
- Fundo: `bg-white`, sombra `shadow-2xl`

Conteúdo:
- Header: "Central de Ajuda" + descrição + botão X
- Lista scrollável: todas 9 plataformas com tutorialTitle + steps[]
- Cada plataforma em accordion interno (header clicável expande/colapsa)

Dados: reutilizar `tutorialTitle` e `steps[]` do `defaultNetworks`.

### 5. Portal White-Label (nova página)

- Item no menu Sidebar: "Externo / Cliente" → "Portal White-Label"
- Tab: `whitelabel`
- Conteúdo: card atual de link de convite + copy, redesign simples
- Rota/estado: gerenciado pelo `currentTab` do App.jsx

---

## Dados e Estado

### Fontes (sem alterações):
- `WorkspaceContext.activeBrand.connectedChannels[]` — IDs dos canais conectados
- `WorkspaceContext.activeBrand.networksMetadata{}` — metadados por canal
- `WorkspaceContext.toggleChannelConnection()` — toggle + persist
- `WorkspaceContext.updateNetworkMetadata()` — update bio/metadata
- `WorkspaceContext.syncError` — erro de sinc (novo uso nos cards)
- `defaultNetworks[]` — definições das 9 plataformas (movido pra `src/data/platforms.js`)

### Props dos componentes:

```jsx
// ConnectionDashboard
{ networks, syncError }

// ConnectedAccountCard
{ network, onManage, onDisconnect, syncError }

// AvailablePlatformCard
{ network, onConnect }

// HelpDrawer
{ isOpen, onClose, platforms }

// WhiteLabelPage
{ activeBrand }
```

---

## Design Tokens (Tailwind)

Cores existentes mantidas:
- Primary: `#F26526` (laranja)
- Secondary: `#1A73E8` (azul)
- Background: `#F9FAFB` (cinza claro)

Novos estados visuais:
- Conectado: `border-emerald-200 bg-emerald-50/30`
- Erro: `border-red-300 bg-red-50/30`
- Disponível: `border-gray-200 bg-white`

---

## Fora do Escopo

- Extrair modais OAuth/QR/Bio do Connections.jsx (próxima iteração)
- Trocar `defaultNetworks` hardcoded por API dinâmica
- Integração real com API de métricas (já existe em `SocialSyncService`)
- Testes automatizados (não existem no projeto atualmente)

---

## Critérios de Aceitação

- [ ] Dashboard superior exibe 6 indicadores com dados reais
- [ ] Contas conectadas aparecem primeiro, com destaque visual verde
- [ ] Plataformas disponíveis aparecem abaixo, cards compactos
- [ ] Cards conectados ~35% mais baixos que versão atual
- [ ] Drawer de ajuda abre/fecha com animação, contém tutoriais de todas plataformas
- [ ] Tutorial removido de todos os cards individuais
- [ ] White-Label movido pra página separada no menu
- [ ] Estado de erro detectado via syncError e exibido nos cards
- [ ] Banner global de notificações mantido funcional
- [ ] Modais OAuth, QR e Bio mantidos funcionais sem regressão
- [ ] Interface transmite sensação SaaS premium
