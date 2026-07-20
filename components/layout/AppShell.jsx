import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children, brands, activeId, canAccessAICosts = false, accountEmail = '' }) {
  return (
    <div className="app-glow flex h-screen">
      <Sidebar canAccessAICosts={canAccessAICosts} accountEmail={accountEmail} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar brands={brands} activeId={activeId} canAccessAICosts={canAccessAICosts} accountEmail={accountEmail} />
        <main className="min-h-0 flex-1 overflow-auto bg-app">
          <div className="mx-auto w-full max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
