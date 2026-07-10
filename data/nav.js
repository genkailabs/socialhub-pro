import { LayoutDashboard, PenSquare, Calendar, Share2, CheckSquare, Inbox, BarChart3 } from 'lucide-react';

export const NAV_GROUPS = [
  { label: 'Conteúdo', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/composer', label: 'Composer', icon: PenSquare },
    { href: '/calendar', label: 'Calendário', icon: Calendar }
  ]},
  { label: 'Redes', items: [
    { href: '/connections', label: 'Conexões', icon: Share2 }
  ]},
  { label: 'Cliente', items: [
    { href: '/approvals', label: 'Aprovações', icon: CheckSquare }
  ]},
  { label: 'Em breve', items: [
    { href: '#', label: 'Inbox', icon: Inbox, soon: true },
    { href: '#', label: 'Relatórios', icon: BarChart3, soon: true }
  ]}
];
