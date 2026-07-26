'use client';
import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { JourneyProvider } from '@/components/journey/JourneyProvider';
import { AgentWindow } from '@/components/journey/AgentWindow';
import { usePathname } from 'next/navigation';

export function AppShell({ children, brands = [], activeId, journey = null, canAccessAICosts = false, accountEmail = '' }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isComposer = pathname === '/composer';

  // Preferência de sidebar recolhida persiste como o tema (localStorage) — RF-20.
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('sidebar-collapsed') === '1'); } catch {}
  }, []);

  function toggleSidebar() {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  const activeBrand = brands.find((b) => b.id === activeId);

  // Durante a jornada guiada o app continua inteiro na tela: o agente flutua por
  // cima e conduz, mas quem trabalha são as telas reais. Quem trava a navegação
  // é o gate no layout do servidor — aqui só se desenha o estado.
  return (
    <JourneyProvider journey={journey}>
      <div className="app-glow flex h-screen">
        <Sidebar collapsed={collapsed} canAccessAICosts={canAccessAICosts} accountEmail={accountEmail} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            brands={brands}
            activeId={activeId}
            canAccessAICosts={canAccessAICosts}
            accountEmail={accountEmail}
            onToggleSidebar={toggleSidebar}
            collapsed={collapsed}
          />
          <main className={`min-h-0 flex-1 bg-app ${isComposer ? 'overflow-hidden' : 'overflow-auto'}`}>
            <div className={isComposer ? 'h-full w-full' : 'mx-auto w-full max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8'}>{children}</div>
          </main>
        </div>
        <AgentWindow journey={journey} brandId={activeId} brandName={activeBrand?.name || 'Sua marca'} />
      </div>
    </JourneyProvider>
  );
}
