import {
  LayoutDashboard, Stethoscope, Compass, CalendarRange, PenLine, Sparkles,
  CalendarDays, CheckSquare, BarChart3, Coins, Plug, TrendingUp, Wrench, LibraryBig
} from 'lucide-react';

// Navegação do redesign Aurora Grid (2026-08-04), agrupada por onde a pessoa
// está na cabeça, não por verbo:
//
//   Workspace → entender (o que está acontecendo com a marca);
//   Produção  → fazer (do rascunho ao aprovado);
//   Marca     → o que sustenta os dois (identidade, contas, resultado).
//
// O agrupamento anterior era Criar/Publicar/Analisar. Ele quebrava porque
// Diagnóstico e Tendências não são "criar", e Relatórios ficava sozinho num
// grupo "Analisar" de dois itens.
//
// A Biblioteca vem antes do Studio dentro de Produção porque é essa a ordem do
// trabalho: primeiro se escolhe a direção visual, depois se escreve.
export const NAV_GROUPS = [
  { label: 'Workspace', items: [
    { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
    { href: '/instagram/diagnostico', label: 'Diagnóstico', icon: Stethoscope },
    { href: '/strategy', label: 'Estratégia', icon: Compass },
    { href: '/trends', label: 'Tendências', icon: TrendingUp }
  ]},
  { label: 'Produção', items: [
    { href: '/biblioteca', label: 'Biblioteca', icon: LibraryBig },
    { href: '/composer', label: 'Studio', icon: PenLine },
    { href: '/planning', label: 'Planejamento', icon: CalendarRange },
    { href: '/calendar', label: 'Calendário e Links', icon: CalendarDays },
    { href: '/approvals', label: 'Aprovações', icon: CheckSquare }
  ]},
  { label: 'Marca', items: [
    { href: '/brand-kit', label: 'Brand Kit', icon: Sparkles },
    { href: '/connections', label: 'Conexões', icon: Plug },
    { href: '/metrics', label: 'Relatórios', icon: BarChart3 }
  ]},
  // Fora do fluxo diário: métodos de agência que rodam no Claude (deck,
  // landing, disparo) e a conta de gasto da IA. Peso reduzido, ancorados
  // logo acima do rodapé de conta.
  { isolated: true, items: [
    { href: '/avancado', label: 'Avançado', icon: Wrench },
    { href: '/ai-costs', label: 'Custos da IA', icon: Coins, adminOnly: true }
  ]}
];
