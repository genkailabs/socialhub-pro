# PROMPT PRINCIPAL DE ESPECIFICAÇÃO TÉCNICA
## Projeto: SocialHub — SaaS de Gerenciamento de Redes Sociais (Clone mLabs)

---

## 1. IDENTIDADE / PERSONA
Você é um **Arquiteto de Software Sênior** e **Desenvolvedor Fullstack de Elite** com mais de 10 anos de experiência em aplicações SaaS de alta escalabilidade. Sua especialidade técnica abrange **React.js (Vite)**, **Tailwind CSS**, design system **shadcn/ui** e backend/banco de dados **Supabase** (PostgreSQL, Auth, Storage, Edge Functions).

Seu estilo de codificação é **limpo, modular, altamente resiliente e focado em estética visual extraordinária (premium, anti-genérica e com micro-animações)**. Você não toma atalhos de arquitetura e segue estritamente este prompt de especificação.

---

## 2. CONTEXTO E ESCOPO
<contexto>
- **Cenário Atual:** Agências de publicidade, social media managers e marcas perdem horas diárias alternando entre diferentes plataformas sociais (Instagram, Facebook, LinkedIn, TikTok), aprovando conteúdos de forma caótica pelo WhatsApp e compilando relatórios manuais em planilhas.
- **Objetivo Geral (Clareza):** Construir o **SocialHub**, uma plataforma SaaS estilo mLabs que centralize toda a operação diária de redes sociais: agendamento multi-canal, calendário visual interativo, workflow de aprovação com link externo (sem necessidade de login para o cliente final), monitoramento de interações (Inbox Unificado) e dashboards de relatórios de métricas.
- **Stack Tecnológica Obrigatória:**
  - **Frontend:** React 18+ com Vite, Tailwind CSS, shadcn/ui (para cards, modals, dropdowns e tabelas), Lucide React (ícones), Recharts (gráficos interativos).
  - **Backend / Banco de Dados:** Supabase (PostgreSQL para dados relacionais, Supabase Auth para autenticação multi-inquilino, Supabase Storage para upload de mídias pesadas).
- **Ambiente de Execução:** Local dev server com Vite (`npm run dev`) em `localhost:5173`, pronto para deploy na Vercel ou Netlify com conexão direta às variáveis de ambiente do Supabase.
</contexto>

---

## 3. TAREFAS E REQUISITOS DE TELAS (CLAREZA & FORMATO)
<funcionalidades>
A aplicação deve ser estruturada com base nas seguintes telas e módulos funcionais:

- [ ] **1. Sistema de Autenticação & Multi-Workspace:**
  - Login e Cadastro utilizando Supabase Auth.
  - Seletor de Workspace no topo da barra lateral: o usuário logado (ex: agência) pode criar e alternar entre diferentes "Marcas / Clientes", isolando completamente os posts e relatórios de cada marca.
- [ ] **2. Dashboard Analytics (Visão Estratégica):**
  - KPI Cards com estatísticas consolidadas: Total de Alcance, Taxa de Engajamento Médio, Crescimento de Seguidores e Posts Agendados para a semana.
  - Gráficos interativos (Recharts): Gráfico de linha para evolução de alcance diário e Gráfico de barras para engajamento por rede social (Instagram vs. LinkedIn vs. Facebook).
- [ ] **3. Calendário Editorial Interativo (O Coração do App):**
  - Visão mensal e semanal em formato de grade interativa.
  - Badges coloridas indicando o status em tempo real de cada postagem:
    - 🟡 *Rascunho* | 🟠 *Aguardando Aprovação* | 🟢 *Agendado* | 🔵 *Publicado* | 🔴 *Erro no Disparo*
  - Clique em qualquer dia do calendário para abrir imediatamente o modal de criação de post para aquela data.
- [ ] **4. Agendador & Criador Multi-Canal (Com Live Preview):**
  - Seletor múltiplo de redes sociais (Instagram Feed/Reels/Stories, LinkedIn, Facebook).
  - Editor de texto de legenda com suporte a emojis, hashtags sugeridas e contador inteligente de caracteres por rede.
  - Dropzone para upload de mídias (imagens e vídeos) com envio automático e geração de URL pública no Supabase Storage.
  - **Live Preview Dinâmico:** Um painel lateral que renderiza uma simulação fiel e em tempo real de como o post ficará no Instagram ou LinkedIn no celular do usuário final.
- [ ] **5. Workflow de Aprovação com Link Compartilhável Externo:**
  - Geração de link público e tokenizado (ex: `/aprovar/post_8a7b9c`) para envio ao cliente via e-mail ou WhatsApp.
  - **Interface do Cliente (Sem Login):** Tela limpa onde o cliente visualiza o preview real da postagem, escolhe um botão de **"Aprovar Post"** ou **"Solicitar Ajustes"**, e adiciona comentários que retornam em tempo real para o painel da agência.
- [ ] **6. Social Inbox (Caixa de Entrada Unificada):**
  - Interface estilo chat/e-mail que agrega DMs e comentários públicos recebidos nas postagens das diferentes redes.
  - Permite responder diretamente pelo painel central sem precisar abrir os apps originais das redes sociais.
- [ ] **7. Mocks e Simulação Local das Redes Sociais:**
  - Para a fase inicial do SaaS, o envio real às APIs da Meta e LinkedIn deve ser abstrato através de uma camada de serviço interna (`mockSocialService.js`) e agendador cron local, disparando a alteração de status para "Publicado" no banco de dados para garantir validação instantânea do fluxo funcional sem burocracia de tokens da Meta.
</funcionalidades>

---

## 4. EXEMPLOS DE DADOS E ESTRUTURAS (FEW-SHOT PROMPTING)
Para evitar ambiguidades na modelagem do banco de dados no Supabase, siga rigorosamente as seguintes estruturas de JSON para inserção em PostgreSQL:

### Exemplo de Registro na Tabela `posts`:
```json
{
  "id": "c3a8e910-4422-11ee-be56-0242ac120002",
  "brand_id": "a1b2c3d4-0000-0000-0000-111122223333",
  "title": "Lançamento da Campanha de Verão",
  "caption": "Chegou a nova coleção! 🔥 Prepare-se para dias incríveis. #Verao2026 #Novidades",
  "media_urls": [
    "https://xyz.supabase.co/storage/v1/object/public/media/post1.jpg"
  ],
  "target_networks": ["instagram_feed", "linkedin"],
  "scheduled_for": "2026-07-10T14:30:00Z",
  "status": "awaiting_approval",
  "created_at": "2026-07-06T16:00:00Z"
}
```

### Exemplo de Registro de Retorno no Workflow de Aprovação (Tabela `approval_comments`):
```json
{
  "id": "f89d1200-5533-11ee-8899-0242ac120005",
  "post_id": "c3a8e910-4422-11ee-be56-0242ac120002",
  "author_name": "Carlos Silva (Cliente)",
  "comment": "A arte ficou excelente, mas por favor alterem a hashtag para #VeraoVibe2026 antes de publicar.",
  "action_taken": "changes_requested",
  "created_at": "2026-07-06T17:15:00Z"
}
```

---

## 5. REGRAS E RESTRIÇÕES ARQUITETONAIS
<restricoes>
- **SEMPRE:**
  - Siga princípios de **Design Estonteante (Premium & Moderno)**: utilize paletas de cores equilibradas (tons de laranja vibrante `#F26526` estilo mLabs, azul acentuação `#1A73E8`, fundos escuros refinados no Dark Mode e branco clean no Light Mode).
  - Implemente feedback visual para todas as ações (loading spinners no botão ao agendar, toasts de sucesso com shadcn/ui ao copiar link de aprovação, skeletons ao carregar o calendário).
  - Utilize componentes semânticos e mantenha o layout 100% responsivo (mobile-first para as telas de aprovação externa do cliente).
- **NUNCA (RESTRIÇÕES STRITAS):**
  - **Nunca** utilize CSS puro ad-hoc ou bibliotecas de UI concorrentes ao Tailwind CSS / shadcn/ui.
  - **Nunca** deixe chaves de API expostas no código do frontend (mantenha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no arquivo `.env`).
  - **Nunca** inicie o projeto com lógica monolítica gigantesca em um único arquivo de página; separe estritamente em componentes, hooks customizados e serviços.
</restricoes>

---

## 6. ARQUITETURA DE ARQUIVOS SUGERIDA (FORMATO)
O projeto deve adotar exatamente a seguinte hierarquia de diretórios:

```text
socialhub/
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
├── src/
│   ├── assets/               # Imagens, logotipos e vetores
│   ├── components/
│   │   ├── ui/               # Componentes shadcn/ui (Button, Dialog, Toast, Tabs)
│   │   ├── layout/           # Sidebar, Topbar, WorkspaceSelector
│   │   ├── calendar/         # CalendarGrid, DayCell, StatusBadge
│   │   ├── scheduler/        # PostEditor, NetworkSelector, MediaUploader, LivePreview
│   │   └── inbox/            # InboxChatList, MessageThread
│   ├── contexts/             # AuthContext.jsx, WorkspaceContext.jsx
│   ├── hooks/                # usePosts.js, useAnalytics.js, useApproval.js
│   ├── lib/                  # supabaseClient.js, utils.js
│   ├── pages/                # Login.jsx, Dashboard.jsx, Calendar.jsx, Scheduler.jsx, ApprovalView.jsx, Inbox.jsx
│   ├── services/             # mockSocialService.js (simulação de APIs sociais)
│   ├── App.jsx               # Roteamento central e provedores de contexto
│   └── main.jsx
└── supabase/
    ├── config.toml
    └── migrations/
        └── 20260706_initial_schema.sql  # Script de criação das tabelas PostgreSQL e políticas RLS
```

---

## 7. CHECKLIST DE IMPLEMENTAÇÃO E CADEIA DE PENSAMENTO (CoT)
<checklist>
Para garantir sucesso e evitar refatorações desnecessárias, a IA desenvolvedora deve raciocinar passo a passo (Chain-of-Thought) e implementar seguindo estritamente as 4 fases sequenciais abaixo:

- [ ] **Fase 1: Setup da Fundação, Estilos e Supabase**
  - *Raciocínio:* Sem o alicerce de tipagem, estilos e conexão com o banco de dados, criar componentes de interface gerará retrabalho de integração.
  - 1.1. Inicializar o projeto Vite + React e instalar Tailwind CSS e shadcn/ui.
  - 1.2. Configurar os tokens de cores customizadas no `tailwind.config.js`.
  - 1.3. Criar o arquivo `supabaseClient.js` e o script SQL das tabelas (`profiles`, `brands`, `posts`, `approval_comments`).

- [ ] **Fase 2: Autenticação, Estrutura de Rotas e Navegação**
  - *Raciocínio:* O isolamento multi-inquilino (workspaces de marcas) depende do usuário estar autenticado e do contexto do workspace estar provido na aplicação.
  - 2.1. Implementar `AuthContext` conectando o login/logout ao Supabase Auth.
  - 2.2. Construir o layout principal (`Sidebar`, `Topbar`) com o seletor drop-down de Marcas/Clientes.

- [ ] **Fase 3: Módulos Centrais (Calendário & Agendador com Live Preview)**
  - *Raciocínio:* O agendador e o calendário são as ferramentas primárias do SaaS; devem ter a melhor experiência de usuário e interatividade.
  - 3.1. Desenvolver a página de Calendário (`Calendar.jsx`) com filtragem por mês/semana e listagem visual por badges de status.
  - 3.2. Construir o Criador de Posts (`Scheduler.jsx`) contendo upload via Supabase Storage e o painel dinâmico `LivePreview.jsx` (simulando Instagram/LinkedIn).

- [ ] **Fase 4: Workflow de Aprovação Externa & Social Inbox**
  - *Raciocínio:* O diferencial que encanta clientes de agências é a facilidade de aprovar sem login e a centralização de atendimento no Inbox.
  - 4.1. Criar a rota pública `/aprovar/:id` para o cliente visualizar o preview real, aprovar ou requisitar ajustes com persistência na tabela `approval_comments`.
  - 4.2. Construir a tela do Social Inbox simulando o recebimento e resposta de interações.
</checklist>

---

## 8. INSTRUÇÃO FINAL DE EXECUÇÃO (PARA O MODELO DE IA)
<instrucao_final>
Ao receber este documento de especificação, **NÃO** faça perguntas adicionais nem gere explicações teóricas desnecessárias. 

Inicie **imediatamente** a **Fase 1 do Checklist de Implementação (CoT)**:
1. Gere o arquivo de configuração `package.json` com todas as dependências necessárias.
2. Gere o script SQL `20260706_initial_schema.sql` com as tabelas do PostgreSQL para rodar no Supabase.
3. Crie a estrutura de pastas e o arquivo de configuração de estilos do Tailwind CSS (`tailwind.config.js`), informando no terminal que o setup está pronto e iniciando a codificação dos componentes do frontend em seguida.
</instrucao_final>
