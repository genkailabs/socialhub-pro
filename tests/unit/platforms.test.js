import { describe, it, expect } from 'vitest';
import { PLATFORMS, integratedPlatforms, isIntegrated } from '@/data/platforms';

describe('platforms', () => {
  it('tem 9 plataformas', () => { expect(PLATFORMS.length).toBe(9); });
  it('apenas instagram e facebook são integrados no v1', () => {
    expect(integratedPlatforms().map((p) => p.id).sort()).toEqual(['facebook', 'instagram']);
  });
  it('isIntegrated reflete a flag', () => {
    expect(isIntegrated('instagram')).toBe(true);
    expect(isIntegrated('tiktok')).toBe(false);
    expect(isIntegrated('inexistente')).toBe(false);
  });
});
