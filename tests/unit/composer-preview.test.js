import { describe, expect, it } from 'vitest';
import { shouldShowPreviewTitle } from '@/lib/composer-preview';

describe('shouldShowPreviewTitle', () => {
  it('não sobrepõe o título que já foi gravado pela IA na imagem', () => {
    expect(shouldShowPreviewTitle({ title: 'IA nas empresas', titleAppliedByAi: true })).toBe(false);
  });

  it('mostra o título da prévia enquanto ele ainda não foi aplicado à imagem', () => {
    expect(shouldShowPreviewTitle({ title: 'IA nas empresas', titleAppliedByAi: false })).toBe(true);
  });
});
