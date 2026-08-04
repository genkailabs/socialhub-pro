import Link from 'next/link';
import { CheckSquare, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Duas coisas no produto se chamam "aprovação", e nenhuma tela dizia que eram
// duas — quem usava achava que uma tinha substituído a outra. O conserto não é
// renomear (os dois nomes estão certos): é as duas aparecerem juntas, com a
// mesma redação, na tela de cada uma. Quem está numa vê onde fica a outra.
//
// `atual`: 'interna' | 'cliente'. `postId` habilita o atalho da revisão, que só
// existe quando há um post em mãos.
export function QualAprovacao({ atual, postId = null }) {
  const lados = [
    {
      id: 'interna',
      icon: CheckSquare,
      titulo: 'Revisão de conteúdo',
      quem: 'Você, dentro do app',
      resumo: 'A IA aponta o que melhorar na peça e você edita. Editar não consome IA.',
      href: postId ? `/content/${postId}/review` : null
    },
    {
      id: 'cliente',
      icon: Link2,
      titulo: 'Aprovação do cliente',
      quem: 'Seu cliente, por link público',
      resumo: 'Ele abre sem login, aprova ou pede ajuste. O post espera a resposta dele.',
      href: '/calendar'
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lados.map((lado) => {
        const aqui = lado.id === atual;
        const Icone = lado.icon;
        return (
          <div
            key={lado.id}
            className={cn(
              'rounded-xl border p-3.5',
              aqui ? 'border-accent/40 bg-accent-tint' : 'border-line bg-surface-2'
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Icone className={cn('h-3.5 w-3.5', aqui ? 'text-accent-ink' : 'text-muted')} />
              <span className={cn('text-xs font-bold', aqui ? 'text-accent-ink' : 'text-ink')}>{lado.titulo}</span>
              {aqui && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">Você está aqui</span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{lado.quem}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{lado.resumo}</p>
            {!aqui && lado.href && (
              <Link
                href={lado.href}
                className="mt-2 inline-block text-xs font-bold text-accent hover:underline"
              >
                Ir para {lado.titulo}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
