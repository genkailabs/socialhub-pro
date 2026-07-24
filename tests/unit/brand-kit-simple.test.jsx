import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { BrandKitTabs } from '@/components/brand-kit/BrandKitTabs';

afterEach(() => cleanup());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('Brand Kit simple diagnosis', () => {
  it('renders the diagnosis before history and editor, without technical sources or analysis tab', () => {
    render(<BrandKitTabs brandId="brd-1" brandColor="#007AFF" kit={{ dna_report: { overall: 6.5, categories: [{ key: 'branding', score: 7, confidence: 'alta' }], strengths: ['Boa identidade'], weaknesses: ['CTA fraco'], opportunities: ['Melhorar a bio'] } }} versions={[{ id: 'v1', version: 1, status: 'approved', created_at: '2026-07-18T12:00:00Z' }]} />);

    const text = document.body.textContent;
    expect(text.indexOf('Nota Geral')).toBeLessThan(text.indexOf('Branding'));
    expect(text.indexOf('Branding')).toBeLessThan(text.indexOf('Pontos Fortes'));
    expect(text.indexOf('Pontos Fortes')).toBeLessThan(text.indexOf('Pontos de Melhoria'));
    expect(text.indexOf('Pontos de Melhoria')).toBeLessThan(text.indexOf('Recomen'));
    expect(text.indexOf('Recomen')).toBeLessThan(text.indexOf('Brand DNA'));
    expect(text.indexOf('Brand DNA')).toBeLessThan(text.indexOf('Editor do Brand Kit'));
    expect(screen.getByRole('button', { name: 'Editar Brand Kit' })).toBeDefined();
    expect(screen.queryByText(/An. lise/i)).toBeNull();
    expect(screen.queryByText(/URL do site/i)).toBeNull();
    expect(screen.queryByText(/Texto colado/i)).toBeNull();
  });
});
