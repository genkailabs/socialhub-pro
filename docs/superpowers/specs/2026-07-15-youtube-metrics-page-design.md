# Especificação de Design: Central de Relatórios & Página de Métricas do YouTube (`/metrics/youtube`)

**Data:** 2026-07-15  
**Módulo:** Central de Relatórios & Analytics (`/metrics`)  
**Foco Inicial:** YouTube Analytics (`/metrics/youtube`)  
**Autor:** Antigravity (com validação do Usuário)

---

## 1. Visão Geral e Objetivo

Ativar a **Central de Relatórios (`/metrics`)** do SocialHub PRO, substituindo o status "Em breve" na barra lateral (`data/nav.js`) por um módulo de analytics completo, modular e de altíssimo padrão visual. A estrutura adota navegação por guias (tabs) que permitem explorar o desempenho de cada rede social conectada à marca ativa.

O primeiro canal implementado será o **YouTube (`/metrics/youtube`)**, oferecendo aos gestores e agências uma visão executiva e profunda sobre o crescimento de inscritos, alcance de visualizações, tempo de exibição, retenção de público por vídeo (`avg_view_pct`) e horários recomendados para postagem.

---

## 2. Padrões de Design e Identidade Visual

A interface segue rigorosamente as diretrizes do **`DESIGN.md` (Estética Finly / Daily App Balanced)**:
- **Tipografia:**
  - Títulos e rótulos de cards em `Outfit` ou `Geist`.
  - **Obrigatório:** Todos os números, porcentagens de variação, horários, contagens de visualizações e inscritos em `Geist Mono` ou `JetBrains Mono` com alinhamento tabular (`tabular-nums`).
- **Cartões e Superfícies:**
  - Cantos arredondados (`rounded-2xl` a `rounded-3xl`).
  - **Light Mode:** Fundo do app `#F6F5FA`, cards brancos `#FFFFFF` com sombras difusas (`shadow-sm` / `shadow-xl`) e bordas suaves (`border-line`).
  - **Dark Mode:** Fundo escuro acetinado `#18181C` (sem preto puro), cards `#232329` com borda estrutural de 1px (`rgba(255,255,255,0.07)`).
- **Cores Semânticas:**
  - Acento principal em Índigo/Violeta (`#6366F1` no Light, `#8B5CF6` no Dark) para guias ativas, linhas de gráficos e destaques.
  - Verde Esmeralda (`#10B981`) para taxas de retenção excelentes (≥ 60%) e variações positivas de crescimento.
  - Âmbar/Laranja (`#F59E0B`) para retenção média (30-59%) e métricas comparativas.
  - Vermelho (`#FF0000` ou `#F43F5E`) para a identidade do YouTube e indicação de baixa retenção (< 30%).

---

## 3. Arquitetura de Rotas e Layout

```
app/(app)/
└── metrics/
    ├── layout.jsx        -> Server Component: Cabeçalho, Seletor contextual da Marca e Barra de Guias (MetricsTabsNav)
    ├── page.jsx          -> Server Component: Visão Geral cross-platform (Hub de métricas com resumo e atalhos)
    └── youtube/
        └── page.jsx      -> Server Component: Painel completo de métricas do YouTube Analytics
```

### 3.1. Ativação no Menu Lateral (`data/nav.js`)
- Atualizar o item `Relatórios` no array `NAV_GROUPS`:
  - Mudar `soon: true` para `soon: false`.
  - Alterar `href: '#'` para `href: '/metrics'`.

### 3.2. Layout de Navegação (`app/(app)/metrics/layout.jsx`)
- Envolve `/metrics`, `/metrics/youtube`, `/metrics/instagram`, etc.
- Cabeçalho superior: `Central de Relatórios` + subtítulo indicando a marca ativa (`resolveActive`).
- Renderiza o componente de guias `MetricsTabsNav` que sinaliza a aba ativa dinamicamente consultando `usePathname()`.

---

## 4. Estrutura de Componentes do YouTube (`components/analytics/`)

### 4.1. `MetricsTabsNav.jsx`
- Client Component para abas de navegação estilo pílula/card.
- Links iniciais:
  - `Visão Geral` (`/metrics`) - Ícone: `BarChart3`
  - `YouTube` (`/metrics/youtube`) - Ícone: `Youtube` (exibe dot verde se conectado, cinza se pendente)
  - `Instagram` (`/metrics/instagram`) - Ícone: `Instagram` (preparado para futura expansão)
- Efeito visual de foco e pílula esmeralda/índigo no item ativo.

### 4.2. `YoutubeKpiGrid.jsx`
- Exibe 4 cartões de estatísticas (`StatTile` aprimorado com `Geist Mono` e variação histórica real):
  1. **Inscritos Totais:** Número atual de inscritos + variação em relação ao início do período (ex: `+18 (1.2%) em 30 dias`).
  2. **Visualizações Acumuladas:** Soma de views de todos os vídeos monitorados.
  3. **Retenção Média (`avg_view_pct`):** Média ponderada ou simples da porcentagem de vídeo assistida.
  4. **Tempo de Exibição (`watch_time_min`):** Total de minutos/horas que a audiência passou assistindo aos vídeos.

### 4.3. `YoutubeEvolutionChart.jsx`
- Client Component interativo encapsulando o `Recharts` (`AreaChart`).
- **Controles no Cabeçalho do Card:**
  - Seletor de Métrica: Botão estilo pílula para alternar entre **Crescimento de Inscritos** (`followers`) e **Visualizações Diárias** (`total_reach`).
  - Seletor de Janela de Tempo: `14 dias` vs. `30 dias`.
- Gradiente visual fluido (`#FF0000` / `#6366F1`), grade sutil (`CartesianGrid strokeOpacity={0.08}`) e Tooltip customizado com fundo opaco (`#18181C` / `#FFFFFF`) e fonte mono.

### 4.4. `YoutubeVideosTable.jsx`
- Client Component que exibe o grid/tabela analítica dos vídeos postados pelo canal (até 50 vídeos mais recentes vindos de `youtube_video_stats`).
- **Controles de Interatividade:**
  - Abas de Ordenação: `Mais Vistos`, `Maior Retenção` e `Mais Recentes`.
  - Campo de Busca: Filtro em tempo real por palavras no título do vídeo.
- **Barra de Progresso de Retenção Visual:**
  - Coluna dedicada com barra de progresso horizontal (`avg_view_pct`).
  - Codificação de cores automática:
    - Verde (`#10B981`) para retenção ≥ 60%.
    - Âmbar (`#F59E0B`) para retenção entre 30% e 59%.
    - Vermelho (`#F43F5E`) para retenção < 30%.
- Colunas de dados: `Título / Thumbnail`, `Views`, `Likes`, `Comentários`, `Retenção (%)` e `Publicado Em`.

### 4.5. `YoutubeBestTimeCard.jsx`
- Card executivo destacando as recomendações de agendamento geradas por `getYoutubeBestTimes(brandId)`.
- Apresenta o dia da semana (`dom`, `seg`, `ter`...) e horário ideal (`HH:00h`), informando se a sugestão é baseada no histórico real do canal (`basis: 'channel'`) ou em heurística de mercado (`basis: 'heuristic'`).

---

## 5. Fluxo de Dados e Camada de Backend (`lib/youtube-data.js`)

Manteremos e estenderemos as funções em `lib/youtube-data.js` para alimentar de forma robusta e tipada o Server Component em `/metrics/youtube/page.jsx`:

1. **`hasYoutube(brandId)`:**
   - Consulta `social_tokens` onde `platform = 'youtube'` e `is_active = true`.
   - Retorna os dados da conta (`platform_username`, `platform_data`) ou `null`.
2. **`getYoutubeFollowerHistory(brandId, days = 30)`:**
   - Consulta `social_analytics_history` ordenando por `snapshot_date ASC`.
   - Retorna o histórico de `followers` e `total_reach` (visualizações do dia) para o gráfico evolutivo.
3. **`getYoutubeVideos(brandId, limit = 50)`:**
   - Consulta `youtube_video_stats` deduplicando por `video_id` mantendo o snapshot mais recente.
   - Retorna array completo de vídeos com `views`, `likes`, `comments`, `avg_view_pct`, `watch_time_min`, `title` e `published_at`.
4. **`getYoutubeBestTimes(brandId)`:**
   - Calcula os 3 melhores horários com `suggestBestTimes` a partir das views e datas de publicação dos vídeos.

---

## 6. Tratamento de Erros e Estados Vazia (Empty States)

- **Canal Não Conectado (`hasYoutube === null`):**
  - Renderiza um componente `EmptyState` personalizado em `app/(app)/metrics/youtube/page.jsx`.
  - Ícone do YouTube (`Youtube` do Lucide), título `"Canal do YouTube Não Conectado"` e descrição explicando que a conexão permite acompanhar visualizações, retenção de público e melhores horários.
  - Botão de Ação (`Conectar Canal`) apontando para `/connections`.
- **Canal Conectado mas Sem Histórico de Vídeos (`videos.length === 0`):**
  - Exibe os KPIs zerados/neutros e um card informativo no lugar da tabela e gráfico indicando: *"Sincronização em andamento ou canal sem uploads recentes. Os dados aparecerão aqui após a rodada diária de coleta."*
- **Erro de Conexão ou Falha na API:**
  - Exibe alerta não intrusivo sugerindo verificar o status do token na página de Conexões.

---

## 7. Verificação e Testes

### 7.1. Validação Manual de Interface
- Verificar se a rota `/metrics` abre sem erros e exibe a barra de abas no layout.
- Navegar para `/metrics/youtube` e validar a renderização dos cartões, gráfico e tabela.
- Alternar o tema entre **Light Mode** e **Dark Mode** para garantir contraste correto (`Geist Mono`, bordas `1px solid rgba(255,255,255,0.07)`).
- Testar a responsividade em telas médias e móveis (grid de 1 a 4 colunas nos KPIs e scroll horizontal na tabela de vídeos se necessário).

### 7.2. Teste de Interatividade no Cliente
- Clicar nas abas de ordenação da tabela de vídeos (`Mais Vistos`, `Maior Retenção`, `Mais Recentes`) e confirmar a reordenação instantânea sem reload.
- Digitar um termo de busca no filtro de vídeos e confirmar a filtragem correta.
- Clicar nos botões de métrica e período do gráfico Recharts e confirmar a atualização da curva.

### 7.3. Teste do Empty State
- Acessar a página com uma marca que não possui YouTube vinculado (ou desativar temporariamente o token no Supabase local/desenvolvimento) para confirmar a exibição do card de convite à conexão.
