import { LayoutDashboard, GitBranch, Handshake, Sparkles, Coins, Users, CheckSquare, Inbox, BarChart3, Stethoscope, CalendarRange } from 'lucide-react';

export const NAV_GROUPS = [
  { label: 'Modulos Principais', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/instagram/diagnostico', label: 'Diagnostico', icon: Stethoscope },
    { href: '/planning', label: 'Planejamento', icon: CalendarRange },
    { href: '/composer', label: 'Composer (Postar)', icon: GitBranch },
    { href: '/calendar', label: 'Calendario e Links', icon: Handshake },
    { href: '/brand-kit', label: 'Brand Kit e DNA', icon: Sparkles }
  ]},
  { label: 'Administracao', items: [
    { href: '/approvals', label: 'Aprovacoes', icon: CheckSquare },
    { href: '/connections', label: 'Conexoes (Meta/YT)', icon: Users },
    { href: '/ai-costs', label: 'Custos da IA', icon: Coins }
  ]},
  { label: 'Relatorios', items: [
    { href: '/metrics', label: 'Relatorios', icon: BarChart3 },
    { href: '#', label: 'Inbox', icon: Inbox, soon: true }
  ]}
];
