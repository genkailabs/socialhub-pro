import { cn } from '@/lib/utils';

// Cartão "glass" padrão do produto (DESIGN.md). Reúne as classes já repetidas
// em várias telas — rounded-2xl + glass + shadow-soft — sem inventar visual
// novo. Cada tela adiciona espaçamento/estado via className (RF-16).
export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={cn('rounded-2xl glass shadow-soft', className)} {...props}>
      {children}
    </Tag>
  );
}
