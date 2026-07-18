import { describe, expect, it } from 'vitest';
import { staticSuggestions, TONE_PRESETS } from '@/lib/ai/suggestion-templates';

describe('staticSuggestions', () => {
  it('compõe o tema nos templates (zero custo, sem IA)', () => {
    const out = staticSuggestions({ topic: 'LGPD', niche: 'advocacia' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(6);
    out.forEach((s) => {
      expect(s.title).toContain('LGPD');
      expect(s.title).not.toContain('{tema}');
      expect(typeof s.description).toBe('string');
    });
  });

  it('prioriza templates do nicho detectado', () => {
    const out = staticSuggestions({ topic: 'contrato', niche: 'escritório de advocacia' });
    // o 1º item deve ser do bloco de advocacia (contém "a lei diz" no v1)
    expect(out.some((s) => /lei diz|cláusulas|advogado/i.test(s.title))).toBe(true);
  });

  it('cai nos universais quando o nicho é desconhecido', () => {
    const out = staticSuggestions({ topic: 'produtividade', niche: 'coach de negócios' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((s) => s.title.includes('produtividade'))).toBe(true);
  });

  it('sem tema devolve lista vazia (chips só aparecem com tema)', () => {
    expect(staticSuggestions({ topic: '', niche: 'medicina' })).toEqual([]);
    expect(staticSuggestions({ topic: '   ' })).toEqual([]);
  });

  it('medicina e odontologia compartilham o bloco de saúde', () => {
    const med = staticSuggestions({ topic: 'sono', niche: 'medicina' });
    const odo = staticSuggestions({ topic: 'sono', niche: 'odontologia' });
    expect(med.some((s) => /sintomas|ciência|paciente|especialista/i.test(s.title))).toBe(true);
    expect(odo.some((s) => /mito|antes e depois|especialista/i.test(s.title))).toBe(true);
  });

  it('é determinístico (mesma entrada, mesma saída)', () => {
    const a = staticSuggestions({ topic: 'X', niche: 'arquitetura' });
    const b = staticSuggestions({ topic: 'X', niche: 'arquitetura' });
    expect(a).toEqual(b);
  });
});

describe('TONE_PRESETS', () => {
  it('tem 3 presets com label, emoji e valor de tom', () => {
    expect(TONE_PRESETS).toHaveLength(3);
    TONE_PRESETS.forEach((t) => {
      expect(t.value).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.emoji).toBeTruthy();
    });
  });
});
