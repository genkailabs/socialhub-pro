import {
  LayoutDashboard, Stethoscope, Compass, CalendarRange, PenLine, Sparkles,
  CalendarDays, CheckSquare, BarChart3, Coins, Plug, TrendingUp, Wrench
} from 'lucide-react';

// Navegação agrupada por fluxo de trabalho (redesign 2026-07):
// Criar → Publicar → Analisar. Dashboard fica no topo, isolado.
// Conexões é configuração (não faz parte do fluxo diário): peso reduzido,
// ancorado logo acima do rodapé de conta (group.isolated).
export const NAV_GROUPS = [
  { items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
  ]},
  { label: 'Criar', items: [
    { href: '/instagram/diagnostico', label: 'Diagnostico', icon: Stethoscope },
    { href: '/strategy', label: 'Estrategia', icon: Compass },
    { href: '/trends', label: 'Tendencias', icon: TrendingUp },
    { href: '/planning', label: 'Planejamento', icon: CalendarRange },
    { href: '/composer', label: 'Composer', icon: PenLine },
    { href: '/brand-kit', label: 'Brand Kit', icon: Sparkles }
  ]},
  { label: 'Publicar', items: [
    { href: '/calendar', label: 'Calendario e Links', icon: CalendarDays },
    { href: '/approvals', label: 'Aprovacoes', icon: CheckSquare }
  ]},
  { label: 'Analisar', items: [
    { href: '/metrics', label: 'Relatorios', icon: BarChart3 },
    { href: '/ai-costs', label: 'Custos da IA', icon: Coins, adminOnly: true }
  ]},
  // Fora do fluxo diário: métodos de agência que rodam no Claude (deck,
  // landing, disparo). Ficam juntos de configuração para não competir com
  // quem só quer publicar.
  { isolated: true, items: [
    { href: '/avancado', label: 'Avancado', icon: Wrench },
    { href: '/connections', label: 'Conexoes', icon: Plug }
  ]}
];
