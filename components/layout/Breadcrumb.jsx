'use client';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/data/nav';

// "Workspace / Visão geral" no topo: o menu diz onde dá para ir, o breadcrumb
// diz onde a pessoa está. Sai do mesmo NAV_GROUPS do menu — se um item mudar de
// grupo, o rastro muda junto, sem segunda lista para manter.
//
// Rota fora do menu (ex.: /content/[id]/review) não inventa nome: não mostra
// nada. Melhor vazio do que rótulo errado.
export function breadcrumbFor(pathname) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return { group: group.label || null, page: item.label };
      }
    }
  }
  return null;
}

export function Breadcrumb() {
  const pathname = usePathname() || '';
  const trail = breadcrumbFor(pathname);
  if (!trail) return null;

  return (
    <nav aria-label="Onde você está" className="hidden min-w-0 items-center gap-1.5 text-[12.5px] lg:flex">
      {trail.group && (
        <>
          <span className="truncate text-muted">{trail.group}</span>
          <span aria-hidden="true" className="text-faint">/</span>
        </>
      )}
      <span className="truncate font-semibold text-ink">{trail.page}</span>
    </nav>
  );
}
