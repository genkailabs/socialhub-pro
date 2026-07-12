import { BrandSwitcher } from './BrandSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { signOut } from '@/app/login/actions';

export function Topbar({ brands, activeId }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface/85 px-5 backdrop-blur-md">
      <BrandSwitcher brands={brands} activeId={activeId} />
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <div className="h-5 w-px bg-line" />
        <form action={signOut}>
          <button className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink">Sair</button>
        </form>
      </div>
    </header>
  );
}
