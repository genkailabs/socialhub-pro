import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }) {
  return (
    <div className="flex h-screen bg-app">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
