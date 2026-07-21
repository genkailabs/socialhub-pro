'use client';
import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { isOnboardingComplete } from '@/lib/onboarding-helpers';
import { GuidedOnboardingWizard } from '@/components/onboarding/guided/GuidedOnboardingWizard';

export function AppShell({ children, brands = [], activeId, activeKit = null, connectedPlatforms = {}, canAccessAICosts = false, accountEmail = '' }) {
  const [collapsed, setCollapsed] = useState(false);

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
  const needsOnboarding = activeId && activeKit && !isOnboardingComplete(activeKit);

  if (needsOnboarding) {
    return (
      <div className="app-glow min-h-screen bg-app overflow-auto p-4 sm:p-6 lg:p-8">
        <GuidedOnboardingWizard
          brandId={activeId}
          brandName={activeBrand?.name || 'Sua Marca'}
          kit={activeKit}
          connectedPlatforms={connectedPlatforms}
        />
      </div>
    );
  }

  return (
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
        <main className="min-h-0 flex-1 overflow-auto bg-app">
          <div className="mx-auto w-full max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
