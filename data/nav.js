import { LayoutDashboard, GitBranch, Handshake, Sparkles, Coins, Users, CheckSquare, Inbox, BarChart3 } from 'lucide-react';

export const NAV_GROUPS = [
  { label: 'Módulos Principais', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/composer', label: 'Composer (Postar)', icon: GitBranch },
    { href: '/calendar', label: 'Calendário & Links', icon: Handshake },
    { href: '/brand-kit', label: 'Brand Kit & DNA', icon: Sparkles },
  ]},
  { label: 'Administração', items: [
    { href: '/approvals', label: 'Aprovações', icon: CheckSquare },
    { href: '/connections', label: 'Conexões (Meta/YT)', icon: Users },
    { href: '/ai-costs', label: 'Custos da IA', icon: Coins }
  ]},
  { label: 'Em breve', items: [
    { href: '#', label: 'Inbox', icon: Inbox, soon: true },
    { href: '#', label: 'Relatórios', icon: BarChart3, soon: true }
  ]}
];
