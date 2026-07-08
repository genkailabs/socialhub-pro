# Refatoração Tela Conexões & Canais — Plano de Implementação

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refatorar Connections.jsx monolítico (1148 linhas) em orquestrador enxuto + 5 sub-componentes extraídos + nova página WhiteLabel, conforme spec aprovado.

**Architecture:** Abordagem A — refatoração progressiva. Extrair `defaultNetworks` pra módulo de dados, criar componentes visuais puros em `src/components/connections/`, manter modais OAuth/QR/Bio inline no orquestrador. Adicionar rota WhiteLabel no App.jsx e entrada na Sidebar.

**Tech Stack:** React 18, Tailwind CSS v3, Lucide React icons, Supabase (via WorkspaceContext)

**Nota:** Projeto não tem infra de testes. Steps de "Verify" usam `npm run dev` e inspeção visual no navegador.

---

## File Structure (resultado final)

```
src/
├── data/
│   └── platforms.js                  ← NEW: defaultNetworks array + helpers
├── components/
│   └── connections/
│       ├── ConnectionDashboard.jsx   ← NEW: 6 mini-cards de resumo
│       ├── ConnectedAccountCard.jsx  ← NEW: card conta conectada
│       ├── AvailablePlatformCard.jsx ← NEW: card plataforma disponível
│       └── HelpDrawer.jsx            ← NEW: drawer lateral tutoriais
├── pages/
│   ├── Connections.jsx               ← MODIFY: orquestrador (~250 linhas)
│   └── WhiteLabel.jsx                ← NEW: página Portal White-Label
├── components/
│   └── layout/
│       └── Sidebar.jsx               ← MODIFY: +1 menu item
└── App.jsx                           ← MODIFY: +1 tab route + import
```

---

### Task 1: Extrair `defaultNetworks` para `src/data/platforms.js`

**Files:**
- Create: `src/data/platforms.js`
- Modify: `src/pages/Connections.jsx` (import)

- [ ] **Step 1: Criar `src/data/platforms.js`**

```bash
New-Item -ItemType Directory -Force -Path "src/data"
```

Conteúdo do arquivo — extrair array `defaultNetworks` + ícones SVG custom (`IconX`, `IconPinterest`) do `Connections.jsx` atual (linhas 42-233):

```jsx
// src/data/platforms.js
import {
  Instagram, Linkedin, Facebook, Youtube, Music,
  MessageSquare, Video
} from 'lucide-react';

export const IconX = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const IconPinterest = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
  </svg>
);

export const defaultNetworks = [
  {
    id: 'instagram', name: 'Instagram', subtitle: 'Feed, Reels & Stories',
    icon: Instagram, color: 'from-purple-500 via-pink-500 to-amber-500',
    bgLight: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como conectar o Instagram Business',
    steps: [
      'Configure sua conta como Profissional (Criador de Conteúdo ou Empresa).',
      'Vincule sua conta a uma Página pública do Facebook.',
      'Clique em "Conectar" e autorize o acesso a métricas e publicações.',
      'Após a confirmação, seu perfil aparecerá como Conectado.'
    ]
  },
  {
    id: 'facebook', name: 'Facebook', subtitle: 'Página Comercial',
    icon: Facebook, color: 'from-blue-600 to-indigo-700',
    bgLight: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Conexão Integrada com Facebook Pages',
    steps: [
      'Conectado automaticamente junto com seu Instagram Business.',
      'Para páginas separadas, clique em "Conectar" e selecione as páginas.',
      'Permite análise de visualizações, engajamento e compartilhamentos.'
    ]
  },
  {
    id: 'tiktok', name: 'TikTok', subtitle: 'Creator / Business',
    icon: Video, color: 'from-gray-900 via-purple-950 to-black',
    bgLight: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como autorizar postagens no TikTok',
    steps: [
      'Esteja logado na conta do TikTok que deseja conectar.',
      'Clique em "Conectar" e autorize na página oficial do TikTok.',
      'Autorize as permissões de publicação e leitura de perfil.',
      'Acompanhe taxa de viralidade e tempo médio de exibição.'
    ]
  },
  {
    id: 'linkedin', name: 'LinkedIn', subtitle: 'Company Page / Perfil',
    icon: Linkedin, color: 'from-[#0A66C2] to-blue-700',
    bgLight: 'bg-blue-50', textColor: 'text-[#0A66C2]', borderColor: 'border-blue-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como conectar a Página de Empresa do LinkedIn',
    steps: [
      'Você deve ser Administrador (Super Admin) da Company Page.',
      'Clique em "Conectar", faça login e conceda as permissões.',
      'Publique artigos, fotos e monitore impressões orgânicas vs patrocinadas.'
    ]
  },
  {
    id: 'youtube', name: 'YouTube', subtitle: 'Canal & Shorts',
    icon: Youtube, color: 'from-red-600 to-red-700',
    bgLight: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como vincular seu Canal do YouTube (Google OAuth)',
    steps: [
      'Clique em "Conectar" para abrir a janela segura do Google.',
      'Selecione a conta do Google que administra o canal.',
      'Permita a consulta de estatísticas avançadas.',
      'Gerencie vídeos longos e Shorts em uma interface unificada.'
    ]
  },
  {
    id: 'twitter', name: 'X / Twitter', subtitle: 'Pro API & Posts',
    icon: IconX, color: 'from-slate-900 via-gray-900 to-black',
    bgLight: 'bg-gray-50', textColor: 'text-gray-900', borderColor: 'border-gray-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como vincular seu Perfil Oficial do X',
    steps: [
      'Acesse sua conta oficial no X com permissões de leitura e escrita.',
      'Clique em "Conectar" para autorizar via OAuth 2.0 / X API Pro.',
      'Conceda acesso a estatísticas de tweets, impressões e retweets.',
      'Agende threads e monitore métricas virais.'
    ]
  },
  {
    id: 'pinterest', name: 'Pinterest', subtitle: 'Business (Pins & Pastas)',
    icon: IconPinterest, color: 'from-[#E60023] via-red-600 to-red-700',
    bgLight: 'bg-red-50', textColor: 'text-[#E60023]', borderColor: 'border-red-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como integrar sua Conta Comercial do Pinterest',
    steps: [
      'Configure sua conta como Conta Business (gratuita).',
      'Clique em "Conectar" e autorize a Pinterest API.',
      'Permita acesso aos quadros e métricas de Pins Salvos.',
      'Seu catálogo estará pronto para agendamentos e análises.'
    ]
  },
  {
    id: 'whatsapp', name: 'WhatsApp', subtitle: 'Business API / Atendimento',
    icon: MessageSquare, color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como conectar o WhatsApp via QR Code ou Meta Cloud API',
    steps: [
      'Abra o WhatsApp Business no celular oficial do seu negócio.',
      'Vá em Aparelhos Conectados e toque em Conectar um aparelho.',
      'Aponte a câmera para o QR Code gerado pelo nosso painel.',
      'Suas mensagens chegarão na aba Social Inbox com KPIs em tempo real.'
    ]
  },
  {
    id: 'spotify', name: 'Spotify', subtitle: 'Podcasters & Músicas',
    icon: Music, color: 'from-[#1DB954] to-emerald-700',
    bgLight: 'bg-green-50', textColor: 'text-[#1DB954]', borderColor: 'border-green-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como vincular seus Podcasts ou Lançamentos no Spotify',
    steps: [
      'Ideal para criadores, selos musicais e agências de artistas.',
      'Clique em "Conectar" e faça login com sua conta de artista.',
      'Autorize a leitura dos seus catálogos e análise de streams.',
      'Aproveite a pré-visualização interativa dos seus lançamentos.'
    ]
  }
];
```

- [ ] **Step 2: Atualizar imports no `Connections.jsx`**

Remover linhas 42-233 (IconX, IconPinterest, defaultNetworks) e substituir por:

```jsx
import { defaultNetworks, IconX, IconPinterest } from '../data/platforms';
```

Remover também imports não mais usados no Connections.jsx que foram movidos pro platforms.js:
- `Instagram`, `Linkedin`, `Facebook`, `Youtube`, `Music`, `MessageSquare`, `Video` do lucide-react (se não usados em outro lugar do arquivo)

Manter imports que ainda são usados no Connections.jsx: `Share2`, `CheckCircle2`, `AlertCircle`, `HelpCircle`, `ExternalLink`, `QrCode`, `ShieldCheck`, `Sparkles`, `ChevronDown`, `ChevronUp`, `Key`, `RefreshCw`, `X`, `Copy`, `Check`, `Cloud`, `Database`, `UserCog`, `Save`, `AlertTriangle`, `Bookmark`, `Unplug`, `Plug`, `Globe`, `Clock`, `Users`, `Activity`, `ArrowRight`, `Info`.

- [ ] **Step 3: Commit**

```bash
git add src/data/platforms.js src/pages/Connections.jsx
git commit -m "refactor: extract defaultNetworks to src/data/platforms.js"
```

---

### Task 2: Criar `ConnectionDashboard.jsx`

**Files:**
- Create: `src/components/connections/ConnectionDashboard.jsx`

- [ ] **Step 1: Criar diretório**

```bash
New-Item -ItemType Directory -Force -Path "src/components/connections"
```

- [ ] **Step 2: Escrever componente**

```jsx
// src/components/connections/ConnectionDashboard.jsx
import React from 'react';
import { CheckCircle2, Users, Clock, Globe, AlertCircle, Activity, Unplug } from 'lucide-react';

function formatNumber(num) {
  if (!num) return '--';
  const n = parseInt(num, 10);
  if (isNaN(n)) return '--';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function getRelativeTime(dateStr) {
  if (!dateStr || dateStr === '--') return '--';
  try {
    const date = new Date(dateStr.split(' ')[0].split('/').reverse().join('-') + 'T' + (dateStr.split(' ')[1] || '00:00:00'));
    if (isNaN(date.getTime())) return '--';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  } catch { return '--'; }
}

export default function ConnectionDashboard({ networks }) {
  const connected = networks.filter(n => n.status === 'connected');
  const connectedCount = connected.length;
  const totalNetworks = networks.length;
  const hasConnections = connectedCount > 0;

  const totalFollowers = connected.reduce((sum, n) => {
    const val = parseInt(String(n.followers || '0').replace(/[^0-9]/g, ''), 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const lastSyncRaw = connected.reduce((latest, n) => {
    if (!n.lastSynced) return latest;
    return !latest || n.lastSynced > latest ? n.lastSynced : latest;
  }, null);

  const syncErrors = connected.filter(n =>
    n.expiresIn && (n.expiresIn.toLowerCase().includes('erro') || n.expiresIn.toLowerCase().includes('expirado'))
  ).length;

  const items = [
    {
      label: 'Redes Conectadas',
      value: `${connectedCount}/${totalNetworks}`,
      icon: hasConnections ? CheckCircle2 : Unplug,
      color: hasConnections ? 'text-emerald-600 bg-emerald-100' : 'text-gray-400 bg-gray-100'
    },
    {
      label: 'Total Seguidores',
      value: formatNumber(totalFollowers),
      icon: Users,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      label: 'Última Sincronização',
      value: getRelativeTime(lastSyncRaw),
      icon: Clock,
      color: 'text-gray-600 bg-gray-100'
    },
    {
      label: 'Contas Disponíveis',
      value: totalNetworks,
      icon: Globe,
      color: 'text-indigo-600 bg-indigo-100'
    },
    {
      label: 'Alertas',
      value: syncErrors > 0 ? `${syncErrors} erro(s)` : '0 erros',
      icon: AlertCircle,
      color: syncErrors > 0 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
    },
    {
      label: 'Status Geral',
      value: hasConnections ? 'Online' : 'Offline',
      icon: Activity,
      color: hasConnections ? 'text-emerald-600 bg-emerald-100' : 'text-gray-400 bg-gray-100'
    }
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex flex-col gap-1.5 hover:shadow-md transition-shadow"
        >
          <div className={`p-1.5 rounded-lg w-fit ${item.color}`}>
            <item.icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-gray-900 leading-none">{item.value}</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/connections/ConnectionDashboard.jsx
git commit -m "feat: add ConnectionDashboard summary strip component"
```

---

### Task 3: Criar `ConnectedAccountCard.jsx`

**Files:**
- Create: `src/components/connections/ConnectedAccountCard.jsx`

- [ ] **Step 1: Escrever componente**

```jsx
// src/components/connections/ConnectedAccountCard.jsx
import React from 'react';
import { Users, Activity, Clock, Settings, AlertCircle } from 'lucide-react';

export default function ConnectedAccountCard({ network, onManage, hasSyncError }) {
  const Icon = network.icon;
  const isError = hasSyncError || (network.expiresIn && (
    network.expiresIn.toLowerCase().includes('erro') ||
    network.expiresIn.toLowerCase().includes('expirado')
  ));

  const borderClass = isError
    ? 'border-red-300 bg-red-50/30'
    : 'border-emerald-200 bg-emerald-50/30 shadow-sm hover:shadow-md';

  const badgeClass = isError
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const badgeLabel = isError ? 'Reconectar' : 'Conectado';
  const badgeDot = isError ? 'bg-red-500' : 'bg-emerald-500';

  const profileUrl = network.profileUrl || (() => {
    const handle = network.handle || '';
    const id = network.id;
    if (id === 'instagram') return `instagram.com/${handle.replace('@', '')}`;
    if (id === 'facebook') return `facebook.com/${handle.replace('@', '')}`;
    if (id === 'tiktok') return `tiktok.com/${handle.replace('@', '')}`;
    if (id === 'linkedin') return `linkedin.com/in/${handle.replace('@', '')}`;
    if (id === 'youtube') return `youtube.com/${handle.replace('@', '')}`;
    if (id === 'twitter') return `x.com/${handle.replace('@', '')}`;
    return '';
  })();

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${borderClass}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl shadow-sm bg-gradient-to-br ${network.color} text-white`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 leading-tight">{network.name}</h3>
            <p className="text-[11px] text-gray-500">{network.handle || network.accountName || ''}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${badgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`}></span>
          {badgeLabel}
        </span>
      </div>

      {/* Métricas */}
      <div className="px-4 pb-1 space-y-2">
        {profileUrl && (
          <p className="text-[11px] text-gray-400 truncate">{profileUrl}</p>
        )}

        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-extrabold text-gray-900">{network.followers || '--'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-extrabold text-emerald-600">{network.engagement || '--'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Sinc: {network.lastSynced || '--'}</span>
        </div>

        {isError && network.expiresIn && (
          <p className="text-[10px] text-red-500 font-medium">{network.expiresIn}</p>
        )}
      </div>

      {/* Bio inline compacta */}
      {network.bio && (
        <div className="px-4 pb-1">
          <p className="text-[11px] text-gray-500 italic leading-snug line-clamp-1 border-l-2 border-emerald-300 pl-2">
            "{network.bio}"
          </p>
        </div>
      )}

      {/* Botão Gerenciar */}
      <div className="px-4 pb-4 pt-2 mt-auto">
        <button
          onClick={() => onManage(network)}
          className="w-full py-2 px-3 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          <Settings className="w-3.5 h-3.5" />
          Gerenciar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connections/ConnectedAccountCard.jsx
git commit -m "feat: add ConnectedAccountCard component with error state"
```

---

### Task 4: Criar `AvailablePlatformCard.jsx`

**Files:**
- Create: `src/components/connections/AvailablePlatformCard.jsx`

- [ ] **Step 1: Escrever componente**

```jsx
// src/components/connections/AvailablePlatformCard.jsx
import React from 'react';
import { Plug } from 'lucide-react';

export default function AvailablePlatformCard({ network, onConnect }) {
  const Icon = network.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
      {/* Header */}
      <div className="p-3.5 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gray-100 text-gray-400">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-900">{network.name}</h3>
          <p className="text-[11px] text-gray-400 truncate">{network.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase border border-gray-200 shrink-0">
          Disponível
        </span>
      </div>

      {/* Botão Conectar */}
      <div className="px-3.5 pb-3.5 mt-auto">
        <button
          onClick={() => onConnect(network)}
          className="w-full py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white shadow-md shadow-[#F26526]/20 active:scale-[0.98]"
        >
          <Plug className="w-3.5 h-3.5" />
          Conectar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connections/AvailablePlatformCard.jsx
git commit -m "feat: add AvailablePlatformCard compact component"
```

---

### Task 5: Criar `HelpDrawer.jsx`

**Files:**
- Create: `src/components/connections/HelpDrawer.jsx`

- [ ] **Step 1: Escrever componente**

```jsx
// src/components/connections/HelpDrawer.jsx
import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

function PlatformTutorial({ platform }) {
  const [open, setOpen] = useState(false);
  const Icon = platform.icon;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${platform.color} text-white`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800">{platform.name}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-gray-600 animate-in fade-in duration-200">
          <p className="font-extrabold text-gray-800 text-[11px] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
            {platform.tutorialTitle}
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
            {platform.steps.map((step, idx) => (
              <li key={idx} className="pl-1">
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function HelpDrawer({ isOpen, onClose, platforms }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-96 max-w-[calc(100vw-2rem)] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#F26526]" />
              Central de Ajuda
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tutoriais de conexão para cada plataforma
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {platforms.map((platform) => (
            <PlatformTutorial key={platform.id} platform={platform} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Dúvidas? Consulte nossa documentação ou entre em contato com o suporte.
          </p>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connections/HelpDrawer.jsx
git commit -m "feat: add HelpDrawer with platform tutorials"
```

---

### Task 6: Criar `WhiteLabel.jsx`

**Files:**
- Create: `src/pages/WhiteLabel.jsx`

- [ ] **Step 1: Escrever página**

```jsx
// src/pages/WhiteLabel.jsx
import React, { useState } from 'react';
import { Sparkles, Copy, Check, Share2, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function WhiteLabel() {
  const { activeBrand } = useWorkspace();
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/#conectar-cliente`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-full font-sans select-none">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2.5">
          <span className="p-2 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] text-white shadow-lg shadow-[#F26526]/20">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Portal White-Label
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Convite seguro para seus clientes conectarem redes sociais
            </p>
          </div>
        </div>
      </div>

      {/* Card principal */}
      <div className="max-w-2xl">
        <div className="bg-[#0B0F19] text-white rounded-2xl p-6 md:p-8 shadow-2xl border border-gray-800 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#F26526]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-4 max-w-xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F26526]/20 border border-[#F26526]/40 text-[#FF8A50] text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Exclusivo Agências / White-Label
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
              Seu cliente prefere conectar ele mesmo sem te passar senhas?
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Gere um Link de Convite de Conexão Segura. Seu cliente acessa pelo celular ou computador dele,
              autoriza o Instagram ou YouTube em 1 clique e a permissão cai automaticamente no seu painel.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="px-6 py-3.5 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-[#F26526]/30 transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copiado!' : 'Copiar Link de Convite'}</span>
              </button>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-300 leading-relaxed">
                O link é único para sua agência. O cliente não precisa criar conta — apenas autorizar a conexão.
                Os dados aparecem automaticamente no painel da marca <strong className="text-white">{activeBrand?.name || 'ativa'}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/WhiteLabel.jsx
git commit -m "feat: add WhiteLabel invite page"
```

---

### Task 7: Refatorar `Connections.jsx`

**Files:**
- Modify: `src/pages/Connections.jsx`

- [ ] **Step 1: Reescrever o componente como orquestrador**

Substituir o conteúdo completo atual por:

```jsx
import React, { useState, useEffect } from 'react';
import {
  Share2, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, QrCode,
  ShieldCheck, Sparkles, RefreshCw, X, Copy, Check, Cloud, Database,
  UserCog, Save, AlertTriangle, Unplug, Info, MessageSquare
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { defaultNetworks } from '../data/platforms';
import ConnectionDashboard from '../components/connections/ConnectionDashboard';
import ConnectedAccountCard from '../components/connections/ConnectedAccountCard';
import AvailablePlatformCard from '../components/connections/AvailablePlatformCard';
import HelpDrawer from '../components/connections/HelpDrawer';

export default function Connections({ setCurrentTab }) {
  const { activeBrand, toggleChannelConnection, updateNetworkMetadata, refreshBrands, syncError } = useWorkspace();

  // --- state ---
  const [helpDrawerOpen, setHelpDrawerOpen] = useState(false);
  const [globalBanner, setGlobalBanner] = useState(null);

  // modal state (mantido inline)
  const [activeModalNet, setActiveModalNet] = useState(null);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [customHandleInput, setCustomHandleInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthStep, setOauthStep] = useState(0);
  const [manualForm, setManualForm] = useState({ handle: '', profileUrl: '', displayName: '', bio: '', followers: '' });
  const [qrCodeModal, setQrCodeModal] = useState(false);
  const [bioModalNet, setBioModalNet] = useState(null);
  const [bioText, setBioText] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const BIO_LIMITS = { instagram: 150, facebook: 255, twitter: 160, linkedin: 300, tiktok: 80, pinterest: 160 };

  // --- derived data ---
  const networks = React.useMemo(() => {
    const connectedList = activeBrand?.connectedChannels || [];
    const dbMetadata = activeBrand?.networksMetadata || {};
    return defaultNetworks.map(net => {
      const isConnected = connectedList.includes(net.id);
      const netMeta = dbMetadata[net.id] || {};
      const cleanName = activeBrand?.name?.toLowerCase().replace(/\s+/g, '') || 'suamarca';
      return {
        ...net,
        status: isConnected ? 'connected' : 'disconnected',
        handle: isConnected ? (netMeta.handle || `@${cleanName}.${net.id}`) : '',
        expiresIn: isConnected ? (netMeta.expiresIn || 'Ativo') : null,
        token: isConnected ? (netMeta.token || '') : '',
        bio: netMeta.bio || '',
        followers: netMeta.followers || (isConnected ? '--' : null),
        engagement: netMeta.engagement || (isConnected ? '--' : null),
        ...netMeta
      };
    });
  }, [activeBrand]);

  const connectedNetworks = networks.filter(n => n.status === 'connected');
  const availableNetworks = networks.filter(n => n.status !== 'connected');

  // --- banner helper ---
  const showBanner = (type, msg, duration = 6000) => {
    setGlobalBanner({ type, msg });
    setTimeout(() => setGlobalBanner(null), duration);
  };

  // --- OAuth callback handler ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const platform = params.get('platform');
    const username = params.get('username');
    const error = params.get('error');

    if (status === 'success' && platform) {
      refreshBrands();
      showBanner('success', `Canal ${platform.toUpperCase()} (@${username || platform}) conectado com sucesso!`, 8000);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      showBanner('error', `Erro na autorização: ${error}`, 8000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // --- handlers (mantidos do original) ---
  const handleOpenConnectModal = (net) => {
    if (!activeBrand) {
      showBanner('error', 'Crie ou selecione uma marca antes de conectar canais!', 4000);
      return;
    }
    if (net.id === 'whatsapp') {
      setQrCodeModal(true);
      return;
    }
    setActiveModalNet(net);
    setCustomTokenInput(net.token || '');
    setCustomHandleInput(net.handle || '');
    setOauthStep(0);
    setManualForm({ handle: '', profileUrl: '', displayName: '', bio: '', followers: '' });
  };

  const handleConfirmRealConnection = (method) => {
    if (!activeModalNet || !activeBrand) return;
    setIsConnecting(true);
    setOauthStep(1);

    const cleanHandle = customHandleInput || `@${activeBrand.name.toLowerCase().replace(/\s+/g, '')}`;
    const netMetadata = {
      handle: cleanHandle,
      token: method === 'cloud' ? `PROD_CLOUD_TOKEN_${Date.now()}` : (customTokenInput || `USER_API_KEY_${Date.now()}`),
      bio: '', followers: '0', engagement: '0%',
      accountName: `${activeBrand.name} (${activeModalNet.name})`,
      status: 'connected',
      expiresIn: method === 'cloud' ? 'Sincronizado' : 'Token Ativo',
      lastSynced: new Date().toLocaleString('pt-BR')
    };

    setTimeout(() => {
      setOauthStep(2);
      setTimeout(() => {
        setOauthStep(3);
        setTimeout(async () => {
          await toggleChannelConnection(activeBrand.id, activeModalNet.id, netMetadata);
          setIsConnecting(false);
          setOauthStep(0);
          const connectedName = activeModalNet.name;
          setActiveModalNet(null);
          showBanner('success', `Canal ${connectedName} conectado com sucesso!`);
        }, 800);
      }, 700);
    }, 700);
  };

  const handleManualConnection = async () => {
    if (!activeModalNet || !activeBrand || !manualForm.handle.trim()) return;
    setIsConnecting(true);
    const cleanHandle = manualForm.handle.trim().startsWith('@') ? manualForm.handle.trim() : `@${manualForm.handle.trim()}`;
    const netMetadata = {
      handle: cleanHandle, token: `MANUAL_${Date.now()}`,
      bio: manualForm.bio || '', followers: manualForm.followers || '0',
      engagement: manualForm.engagement || '0%',
      profileUrl: manualForm.profileUrl || '',
      displayName: manualForm.displayName || cleanHandle,
      accountName: manualForm.displayName || `${activeBrand.name} (${activeModalNet.name})`,
      status: 'connected', connectionType: 'manual',
      expiresIn: 'Conexão Manual',
      lastSynced: new Date().toLocaleString('pt-BR')
    };
    setTimeout(async () => {
      await toggleChannelConnection(activeBrand.id, activeModalNet.id, netMetadata);
      setIsConnecting(false);
      const connectedName = activeModalNet.name;
      setActiveModalNet(null);
      setManualForm({ handle: '', profileUrl: '', displayName: '', bio: '', followers: '' });
      showBanner('success', `Canal ${connectedName} (${cleanHandle}) conectado manualmente!`);
    }, 600);
  };

  const handleDisconnect = async (netId) => {
    if (!activeBrand) return;
    if (activeBrand.connectedChannels?.includes(netId)) {
      await toggleChannelConnection(activeBrand.id, netId);
    }
    showBanner('info', `Canal desconectado da marca ${activeBrand.name}.`, 4000);
  };

  const handleManage = (net) => {
    handleOpenConnectModal(net);
  };

  // --- bio handlers ---
  const openBioModal = (net) => {
    setBioText(net.bio || '');
    setBioModalNet(net);
  };

  const handleSaveBio = () => {
    if (!bioModalNet || !activeBrand) return;
    setIsSavingBio(true);
    setTimeout(async () => {
      await updateNetworkMetadata(activeBrand.id, bioModalNet.id, { bio: bioText });
      setIsSavingBio(false);
      const savedNet = bioModalNet;
      setBioModalNet(null);
      showBanner('success', `Bio de ${savedNet.name} atualizada!`);
    }, 900);
  };

  // ==================== RENDER ====================
  return (
    <div className="p-6 md:p-8 bg-[#F9FAFB] min-h-full font-sans select-none pb-20 relative">
      {/* ===== BANNER GLOBAL ===== */}
      {globalBanner && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 max-w-lg w-[calc(100%-2rem)] ${
          globalBanner.type === 'success' ? 'bg-[#0B0F19] border-emerald-500/40 text-white'
          : globalBanner.type === 'error' ? 'bg-[#0B0F19] border-red-500/40 text-white'
          : 'bg-[#0B0F19] border-blue-500/40 text-white'
        }`}>
          <div className={`p-1.5 rounded-lg shrink-0 ${
            globalBanner.type === 'success' ? 'bg-emerald-500/20 text-emerald-400'
            : globalBanner.type === 'error' ? 'bg-red-500/20 text-red-400'
            : 'bg-blue-500/20 text-blue-400'
          }`}>
            {globalBanner.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : globalBanner.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <p className="text-xs font-semibold leading-relaxed flex-1">{globalBanner.msg}</p>
          <button onClick={() => setGlobalBanner(null)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] text-white shadow-lg shadow-[#F26526]/20">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Canais Sociais
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Marca: <span className="font-semibold text-gray-700">{activeBrand?.name || 'Nenhuma selecionada'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Botão de ajuda global */}
        <button
          onClick={() => setHelpDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-[#F26526]/30 text-gray-600 hover:text-[#F26526] transition-all font-semibold text-xs"
        >
          <HelpCircle className="w-4 h-4" />
          Ajuda & Tutoriais
        </button>
      </div>

      {/* ===== DASHBOARD SUPERIOR ===== */}
      <ConnectionDashboard networks={networks} />

      {/* ===== CONTAS CONECTADAS ===== */}
      {connectedNetworks.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
              Contas Conectadas
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
              {connectedNetworks.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedNetworks.map(net => (
              <ConnectedAccountCard
                key={net.id}
                network={net}
                onManage={handleManage}
                hasSyncError={!!syncError}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== PLATAFORMAS DISPONÍVEIS ===== */}
      {availableNetworks.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
              Plataformas Disponíveis
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-extrabold">
              {availableNetworks.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableNetworks.map(net => (
              <AvailablePlatformCard
                key={net.id}
                network={net}
                onConnect={handleOpenConnectModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state — zero conexões */}
      {connectedNetworks.length === 0 && (
        <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Nenhum canal conectado ainda</p>
            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
              Conecte pelo menos uma rede social para começar a gerenciar publicações e analisar métricas.
            </p>
          </div>
        </div>
      )}

      {/* ===== HELP DRAWER ===== */}
      <HelpDrawer
        isOpen={helpDrawerOpen}
        onClose={() => setHelpDrawerOpen(false)}
        platforms={defaultNetworks}
      />

      {/* ===== MODAL DE CONEXÃO OAUTH (mantido do original) ===== */}
      {activeModalNet && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-gray-800 text-white space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { if (!isConnecting) setActiveModalNet(null); }}
              className="absolute top-5 right-5 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-3.5 border-b border-gray-800 pb-5">
              <div className={`p-3 bg-gradient-to-r ${activeModalNet.color} rounded-2xl shadow-lg`}>
                <activeModalNet.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  Conectar: {activeModalNet.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Autorização segura via OAuth 2.0 com criptografia de tokens
                </p>
              </div>
            </div>

            {/* Opção 1: Conexão via Nuvem */}
            <div className="p-5 bg-[#1F2937]/80 rounded-2xl border border-gray-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#F26526]" /> 1. Conexão Instantânea via Servidor Nuvem
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Recomendado</span>
              </div>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                Autorização OAuth em tempo real com validação de token e gravação sincronizada no banco Supabase.
              </p>

              {activeModalNet.id === 'instagram' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Requisitos Obrigatórios da Meta (Instagram Business):</span>
                  </div>
                  <ul className="text-xs md:text-sm text-gray-200 space-y-1.5 list-disc list-inside">
                    <li>O seu Instagram deve ser do tipo <strong>Comercial (Business)</strong> ou Criador.</li>
                    <li>Deve estar <strong>vinculado a uma Página do Facebook</strong> da qual você seja Administrador.</li>
                  </ul>
                  <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-800 text-xs">
                    <a href="https://www.facebook.com/help/instagram/502981923235522" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1">
                      Como mudar para Comercial <ExternalLink className="w-3 h-3" />
                    </a>
                    <a href="https://www.facebook.com/help/1215086795543252" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1">
                      Como vincular ao Facebook <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Nome do Perfil / Handle a ser exibido:
                </label>
                <input
                  type="text" value={customHandleInput} disabled={isConnecting}
                  onChange={(e) => setCustomHandleInput(e.target.value)}
                  placeholder={`Ex: @${activeBrand?.name?.toLowerCase().replace(/\s+/g, '') || 'suamarca'}.${activeModalNet.id}`}
                  className="w-full bg-[#111827] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F26526] mb-2 disabled:opacity-50 placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-400 mb-4 leading-normal">
                  💡 Este nome é apenas para exibição interna. Você deve digitar o seu @ real.
                </p>

                {isConnecting ? (
                  <div className="p-4 rounded-xl bg-[#111827] border border-[#F26526]/50 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#FF8A50]">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>Conectando ao servidor OAuth 2.0...</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                      <div className={`flex items-center gap-2 ${oauthStep >= 1 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block" />}</span>
                        <span>Redirecionando para servidor seguro...</span>
                      </div>
                      <div className={`flex items-center gap-2 ${oauthStep >= 2 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block" />}</span>
                        <span>Validando permissões (Analytics e KPIs)...</span>
                      </div>
                      <div className={`flex items-center gap-2 ${oauthStep >= 3 ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                        <span>{oauthStep >= 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block" />}</span>
                        <span>Sincronizando token com Supabase...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmRealConnection('cloud')}
                    className="w-full py-3 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-[#F26526]/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Autorizar e Conectar Agora (1 Clique)
                  </button>
                )}
              </div>
            </div>

            {/* Opção 2: Chave Manual */}
            <div className="p-5 bg-[#0B0F19] rounded-2xl border border-gray-800 space-y-3">
              <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" /> 2. Ou colar Access Token / API Key manual
              </span>
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                Se você possui um Token OAuth de longa duração da Meta, Google ou TikTok, cole abaixo:
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="password" value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value)}
                  placeholder="Cole seu token de acesso aqui (ex: EAA... ou AIza...)"
                  className="flex-1 bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => handleConfirmRealConnection('token')}
                  disabled={!customTokenInput || isConnecting}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all disabled:opacity-40 shrink-0"
                >
                  Salvar Token
                </button>
              </div>
            </div>

            {/* Opção 3: Conexão Manual Simplificada */}
            <div className="p-5 bg-gradient-to-b from-[#0D1321] to-[#111827] rounded-2xl border border-emerald-500/20 space-y-4 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-emerald-400" /> 3. Conexão Manual (Preenchimento Direto)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Alternativo</span>
              </div>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                Preencha os dados do seu perfil manualmente para registrar a conexão no painel.
              </p>

              <div className="space-y-3.5 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">Nome de Usuário / @Handle *</label>
                  <input
                    type="text" value={manualForm.handle} disabled={isConnecting}
                    onChange={(e) => setManualForm(prev => ({ ...prev, handle: e.target.value }))}
                    placeholder="Ex: @suamarca"
                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">URL do Perfil (opcional)</label>
                  <input
                    type="url" value={manualForm.profileUrl} disabled={isConnecting}
                    onChange={(e) => setManualForm(prev => ({ ...prev, profileUrl: e.target.value }))}
                    placeholder="Ex: https://suarede.com/suamarca"
                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">Nome de Exibição</label>
                    <input
                      type="text" value={manualForm.displayName} disabled={isConnecting}
                      onChange={(e) => setManualForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Ex: Genkai Labs"
                      className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">Seguidores (aprox.)</label>
                    <input
                      type="text" value={manualForm.followers} disabled={isConnecting}
                      onChange={(e) => setManualForm(prev => ({ ...prev, followers: e.target.value }))}
                      placeholder="Ex: 15.4k"
                      className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-gray-650 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">Bio / Descrição (opcional)</label>
                  <textarea
                    rows="2.5" value={manualForm.bio} disabled={isConnecting}
                    onChange={(e) => setManualForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Ex: Perfil oficial da sua marca."
                    className="w-full bg-[#1F2937] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none placeholder:text-gray-650 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2 relative z-10">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  A conexão manual registra o perfil para gerenciamento no painel. Para analytics em tempo real, use a Opção 1 (OAuth).
                </p>
              </div>

              <button
                onClick={handleManualConnection}
                disabled={!manualForm.handle.trim() || isConnecting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed relative z-10"
              >
                {isConnecting ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>) : (<><Save className="w-4 h-4" /> Salvar Conexão Manual</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL QR CODE WHATSAPP ===== */}
      {qrCodeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-gray-200 text-center space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Conectar WhatsApp Oficial</h3>
              <p className="text-xs text-gray-500 mt-1">
                Escaneie com o celular oficial da empresa em <strong>Aparelhos Conectados</strong>.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 inline-block mx-auto shadow-inner relative">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SocialHub-Render-WhatsApp-Live-Session&color=075E54"
                alt="QR Code WhatsApp" className="w-44 h-44 mx-auto rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <MessageSquare className="w-24 h-24 text-green-800" />
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-xl border border-green-200/80 text-[11px] text-green-900 text-left flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>Demonstração do fluxo de pareamento por QR Code. A integração real com a WhatsApp Business API requer backend dedicado (em desenvolvimento).</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setQrCodeModal(false)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => {
                  setQrCodeModal(false);
                  if (activeBrand && !activeBrand.connectedChannels?.includes('whatsapp')) {
                    toggleChannelConnection(activeBrand.id, 'whatsapp', {
                      handle: '+55 (11) 98888-0000', followers: '0', engagement: '0%',
                      expiresIn: 'Sessão Ativa (QR Code)', status: 'connected',
                      lastSynced: new Date().toLocaleString('pt-BR')
                    });
                  }
                  showBanner('success', `WhatsApp Business conectado à marca ${activeBrand?.name || 'ativa'}!`, 5000);
                }}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-green-500/25 transition-all"
              >
                Já Escaneei (Confirmar Conexão)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE EDIÇÃO DE BIO ===== */}
      {bioModalNet && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-gray-800 text-white space-y-5 relative">
            <button onClick={() => setBioModalNet(null)} className="absolute top-5 right-5 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-3.5 border-b border-gray-800 pb-5">
              <div className={`p-3 bg-gradient-to-r ${bioModalNet.color} rounded-2xl shadow-lg`}>
                <bioModalNet.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-[#F26526]" /> Editar Bio: {bioModalNet.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Perfil: <span className="font-mono text-gray-300">{bioModalNet.handle}</span>
                </p>
              </div>
            </div>
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                A bio do seu perfil de <strong>{bioModalNet.name}</strong> será sincronizada com as configurações da sua marca.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Texto da Bio</label>
              <div className="relative">
                <textarea
                  rows="4" value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  maxLength={BIO_LIMITS[bioModalNet.id] || 200}
                  placeholder="Ex: Transformamos ideias em resultados."
                  className="w-full bg-[#0B0F19] border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F26526] resize-none"
                />
                <span className="absolute bottom-3 right-3 text-[11px] font-bold text-gray-500">
                  {bioText.length} / {BIO_LIMITS[bioModalNet.id] || 200}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setBioModalNet(null)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSaveBio} disabled={isSavingBio}
                className="flex-1 py-3 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#F26526]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingBio ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>) : (<><Save className="w-4 h-4" /> Salvar Bio</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run dev
```

Abrir http://localhost:5173, navegar para Conexões & Canais. Confirmar que:
- Dashboard superior aparece com 6 cards
- Seções "Contas Conectadas" e "Plataformas Disponíveis" separadas
- Botão "Ajuda & Tutoriais" no header abre drawer
- Modais de conexão ainda funcionam

- [ ] **Step 3: Commit**

```bash
git add src/pages/Connections.jsx
git commit -m "refactor: rewrite Connections as orchestrator with extracted components"
```

---

### Task 8: Adicionar WhiteLabel na Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Adicionar item no menu "Externo / Cliente"**

Localizar o bloco "Externo / Cliente" no Sidebar.jsx (por volta da linha 177-194). Adicionar novo botão para WhiteLabel ANTES do "Simular Tela Cliente":

```jsx
{/* Link rápido White-Label */}
<button
  onClick={() => setCurrentTab('whitelabel')}
  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:bg-[#F26526]/10 hover:text-[#F26526] border border-dashed border-gray-700 hover:border-[#F26526]/50 ${
    currentTab === 'whitelabel' ? 'bg-[#F26526]/15 text-[#F26526] border-[#F26526]' : ''
  }`}
>
  <div className="flex items-center space-x-3.5 truncate">
    <Sparkles className="w-5 h-5 shrink-0 text-[#F26526]" />
    <span className="text-sm font-medium truncate">Portal White-Label</span>
  </div>
  <ChevronRight className="w-4 h-4 text-gray-500" />
</button>
```

Inserir logo acima do botão "Simular Tela Cliente" existente, dentro da mesma `<div className="pt-6">` section.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "feat: add WhiteLabel portal entry to sidebar"
```

---

### Task 9: Adicionar rota WhiteLabel no App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Importar e adicionar tab**

Adicionar import:
```jsx
import WhiteLabel from './pages/WhiteLabel';
```

Adicionar renderização condicional na seção `<main>` (após linha 176, antes do fechamento `</main>`):
```jsx
{currentTab === 'whitelabel' && <WhiteLabel />}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add WhiteLabel route in App"
```

---

### Task 10: Verificação final e ajustes

**Files:**
- Verify: todos os arquivos modificados

- [ ] **Step 1: Rodar build de verificação**

```bash
npm run build
```

Corrigir eventuais erros de compilação (imports faltando, props incorretas).

- [ ] **Step 2: Verificação visual completa**

Rodar `npm run dev` e verificar:

1. **Dashboard superior:** 6 mini-cards com dados corretos (conectados/total, seguidores, última sinc, total, alertas, status)
2. **Contas Conectadas:** cards menores (~35%), borda verde, métricas destacadas, botão Gerenciar
3. **Plataformas Disponíveis:** cards compactos, só nome + descrição + Conectar
4. **Drawer Ajuda:** abre com ícone `?`, fecha com X ou overlay, tutoriais expandem/colapsam
5. **White-Label:** nova página acessível pelo menu lateral, link copiável
6. **Modais:** OAuth (3 opções), QR Code WhatsApp, Bio — todos funcionais
7. **Banner global:** notificações de sucesso/erro ainda aparecem
8. **Estado vazio:** mensagem amarela quando zero conexões
9. **Responsivo:** mobile (1 col), tablet (2 col), desktop (3 col)

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: complete Connections screen refactoring — dashboard, split sections, help drawer, white-label page"
```
