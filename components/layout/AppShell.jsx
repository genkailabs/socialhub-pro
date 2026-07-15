import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children, brands, activeId }) {
  return (
    <div className="app-glow flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar brands={brands} activeId={activeId} />
        <main className="min-h-0 flex-1 overflow-auto bg-app">
          <div className="p-8 space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
