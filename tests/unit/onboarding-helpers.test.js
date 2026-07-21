import { describe, it, expect } from 'vitest';
import {
  isOnboardingComplete,
  deriveBrandName,
  derivePalettePriority,
  classifyInstagramData
} from '@/lib/onboarding-helpers';

describe('onboarding-helpers', () => {
  it('isOnboardingComplete verifica status ou dna_generated_at', () => {
    expect(isOnboardingComplete(null)).toBe(false);
    expect(isOnboardingComplete({ onboarding_status: 'completed' })).toBe(true);
    expect(isOnboardingComplete({ dna_generated_at: '2026-07-21T10:00:00Z' })).toBe(true);
    expect(isOnboardingComplete({ onboarding_status: 'in_progress' })).toBe(false);
  });

  it('deriveBrandName segue prioridade: Bio > Nome do perfil > Profissional > Username', () => {
    expect(deriveBrandName({ username: 'acme_store', full_name: 'Acme Oficial' }, 'Bem-vindo à Loja Acme')).toBe('Loja Acme');
    expect(deriveBrandName({ username: 'acme_store', full_name: 'Acme Oficial' }, '')).toBe('Acme Oficial');
    expect(deriveBrandName({ username: 'acme_store' }, '')).toBe('acme_store');
  });

  it('derivePalettePriority segue prioridade: Feed > Avatar > Segmento > Fallback', () => {
    const feed = { accent: '#FF5500', bg: '#FFFFFF', surface: '#F4F4F5', ink: '#18181B' };
    const avatar = '#0088FF';
    expect(derivePalettePriority(feed, avatar, '#10B981').accent).toBe('#FF5500');
    expect(derivePalettePriority(null, avatar, '#10B981').accent).toBe('#0088FF');
    expect(derivePalettePriority(null, null, '#10B981').accent).toBe('#10B981');
    expect(derivePalettePriority(null, null, null).accent).toBe('#007AFF');
  });

  it('classifyInstagramData classifica os campos em CONFIRMED, INFERRED e NOT_FOUND', () => {
    const profile = { username: 'cafe_oficial', biography: 'Cafeteria artesanal em SP', followers_count: 1200 };
    const res = classifyInstagramData(profile, [], {});
    expect(res.classification.name).toBe('CONFIRMED');
    expect(res.classification.segment).toBe('INFERRED');
    expect(res.classification.audience).toBe('INFERRED');
  });

  it('manipula parametros nulos (null) defensivamente sem disparar exceção', () => {
    expect(deriveBrandName(null, 'Bem-vindo à Loja Acme')).toBe('Loja Acme');
    expect(deriveBrandName(null, null)).toBe('Sua Marca');

    const pal = derivePalettePriority(null, null, null);
    expect(pal).toBeDefined();
    expect(pal.accent).toBe('#007AFF');

    const classified = classifyInstagramData(null, null, null);
    expect(classified).toBeDefined();
    expect(classified.name).toBe('Sua Marca');
    expect(classified.segment).toBe('Geral');
    expect(classified.classification.name).toBe('NOT_FOUND');
    expect(classified.classification.segment).toBe('NOT_FOUND');

    expect(isOnboardingComplete(null)).toBe(false);
  });
});
