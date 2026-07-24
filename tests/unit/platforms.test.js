import { describe, it, expect } from 'vitest';
import { PLATFORMS, integratedPlatforms, isIntegrated, connectHref } from '@/data/platforms';

describe('platforms', () => {
  it('tem 9 plataformas', () => { expect(PLATFORMS.length).toBe(9); });
  it('apenas instagram, facebook e youtube são integrados no v1', () => {
    expect(integratedPlatforms().map((p) => p.id).sort()).toEqual(['facebook', 'instagram', 'youtube']);
  });
  it('isIntegrated reflete a flag', () => {
    expect(isIntegrated('instagram')).toBe(true);
    expect(isIntegrated('tiktok')).toBe(false);
    expect(isIntegrated('inexistente')).toBe(false);
  });
  it('connectHref monta URL com brand_id e return_to opcional', () => {
    expect(connectHref({ connectPath: '/api/meta/oauth' }, 'brd-1')).toBe('/api/meta/oauth?brand_id=brd-1');
    expect(connectHref({ connectPath: '/api/meta/oauth' }, 'brd-1', '/onboarding')).toBe('/api/meta/oauth?brand_id=brd-1&return_to=%2Fonboarding');
  });
});
