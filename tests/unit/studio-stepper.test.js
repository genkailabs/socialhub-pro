import { describe, it, expect } from 'vitest';
import { currentStudioStep } from '@/components/carrossel/StudioStepper';

describe('currentStudioStep', () => {
  it('comeca na Ideia', () => {
    expect(currentStudioStep({})).toBe(0);
  });

  it('vai para Roteiro quando existe brief', () => {
    expect(currentStudioStep({ hasBrief: true })).toBe(1);
  });

  it('vai para Visual quando o roteiro foi aplicado no Studio', () => {
    expect(currentStudioStep({ hasBrief: true, applied: true })).toBe(2);
  });

  it('so chega em Revisao com rascunho salvo — antes disso nao ha o que revisar', () => {
    expect(currentStudioStep({ applied: true, hasDraft: false })).toBe(2);
    expect(currentStudioStep({ applied: true, hasDraft: true })).toBe(3);
  });

  it('rascunho sem roteiro aplicado nao pula para Revisao', () => {
    expect(currentStudioStep({ applied: false, hasDraft: true })).toBe(0);
  });
});
