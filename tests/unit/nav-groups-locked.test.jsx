import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NavGroups } from '@/components/layout/NavGroups';
import { JourneyProvider } from '@/components/journey/JourneyProvider';
import { resolveJourney } from '@/lib/journey';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

const conduzindo = resolveJourney({ hasBrand: true }, { onboarding_status: 'in_progress' });
const livre = resolveJourney({ hasBrand: true }, { onboarding_status: 'completed' });

function renderNav(journey) {
  return render(
    <JourneyProvider journey={journey}>
      <NavGroups />
    </JourneyProvider>
  );
}

describe('NavGroups durante a jornada', () => {
  it('mantem os itens visiveis, porem inertes e fora do alcance do teclado', () => {
    const { container } = renderNav(conduzindo);
    const item = container.querySelector('[aria-disabled="true"]');
    expect(item).not.toBeNull();
    expect(item.getAttribute('tabindex')).toBe('-1');
    expect(item.textContent).toContain('Visão geral');
    // O que prova a trava: nenhum link navegavel sobrou no menu.
    expect(container.querySelectorAll('nav a').length).toBe(0);
  });

  it('volta a navegar quando a jornada termina', () => {
    const { container } = renderNav(livre);
    expect(container.querySelectorAll('nav a').length).toBeGreaterThan(0);
    expect(container.querySelector('nav [aria-disabled="true"]')).toBeNull();
  });
});
