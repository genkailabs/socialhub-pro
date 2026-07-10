import { BrandSwitcher } from './BrandSwitcher';
import { signOut } from '@/app/login/actions';

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-5">
      <BrandSwitcher />
      <form action={signOut}>
        <button className="text-xs font-semibold text-muted hover:text-ink">Sair</button>
      </form>
    </header>
  );
}
