import { describe, expect, it } from 'vitest';
import { instagramAuditSkill, inputSchema, outputSchema } from '@/lib/ai/skills/instagram-audit';
import { buildAuditSummary } from '@/lib/meta/audit';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const dias = (n) => new Date(NOW.getTime() - n * 24 * 3600 * 1000).toISOString();

const media = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i}`,
  timestamp: dias(i + 1),
  media_type: i % 2 ? 'CAROUSEL_ALBUM' : 'IMAGE',
  like_count: 10 * i,
  comments_count: i,
  caption: `post ${i}`,
  permalink: 'https://x'
}));

const summaryOf = (over = {}) => buildAuditSummary({
  profile: { username: 'ana', followers: 1000, mediaCount: 6, biography: 'Psicologa' },
  media,
  followerHistory: [{ followers: 900 }, { followers: 1000 }],
  now: NOW,
  ...over
});

const prompt = (summary) => instagramAuditSkill.buildPrompt(inputSchema.parse({ summary }));

describe('skill instagram-audit', () => {
  it('segue o contrato e nao amarra provedor', () => {
    expect(instagramAuditSkill.id).toBe('instagram-audit');
    expect(instagramAuditSkill.provider).toBeUndefined();
  });

  // O contrato entre o calculo e a skill: o que buildAuditSummary produz tem
  // que ser aceito pelo inputSchema, sempre.
  it('aceita a saida real de buildAuditSummary', () => {
    expect(inputSchema.safeParse({ summary: summaryOf() }).success).toBe(true);
  });

  it('aceita resumo de perfil sem historico de seguidores', () => {
    expect(inputSchema.safeParse({ summary: summaryOf({ followerHistory: [] }) }).success).toBe(true);
  });

  it('leva os numeros calculados para o prompt', () => {
    const { user } = prompt(summaryOf());

    expect(user).toContain('@ana');
    expect(user).toContain('Seguidores: 1000');
    expect(user).toContain('posts por semana');
    expect(user).toContain('CAROUSEL_ALBUM');
  });

  // Nucleo da restricao §9.2.
  it('proibe citar metrica indisponivel, listando quais sao', () => {
    const { system, user } = prompt(summaryOf());

    expect(system).toContain('Nunca cite metrica listada em "Indisponivel"');
    expect(user).toContain('Indisponivel');
    expect(user).toContain('alcance');
    expect(user).toContain('salvamentos');
  });

  it('nao lista indisponiveis quando o Insights veio completo', () => {
    const { user } = prompt(summaryOf({ insights: { reach: 500, impressions: 800, saves: 10, shares: 4, profileViews: 20 } }));

    expect(user).not.toContain('Indisponivel');
    expect(user).toContain('reach=500');
  });

  // Sem isso a IA afirma que "tercas rendem mais" sem ninguem ter medido.
  it('avisa quando o horario e referencia geral, nao medida do perfil', () => {
    const { user } = prompt(summaryOf({ media: [media[0]] }));

    expect(user).toContain('referencia geral');
  });

  it('marca o horario como medido quando ha historico', () => {
    const { user } = prompt(summaryOf());

    expect(user).toContain('medido neste perfil');
  });

  it('pede confianca baixa quando ha poucos dados (RF-03)', () => {
    const { user } = prompt(summaryOf({ media: [media[0]] }));

    expect(user).toContain('poucos posts');
    expect(user).toContain('baixa');
  });

  it('diz que falta historico em vez de omitir a evolucao', () => {
    const { user } = prompt(summaryOf({ followerHistory: [] }));

    expect(user).toContain('sem historico suficiente');
  });

  it('limita a saida a 3 itens por lista', () => {
    const ponto = { title: 't', detail: 'd' };
    const base = { strengths: [], attention: [], opportunities: [], priorities: [], openQuestions: [], confidence: 'media' };

    expect(outputSchema.safeParse({ ...base, strengths: Array(3).fill(ponto) }).success).toBe(true);
    expect(outputSchema.safeParse({ ...base, strengths: Array(4).fill(ponto) }).success).toBe(false);
  });

  it('exige confianca declarada', () => {
    const base = { strengths: [], attention: [], opportunities: [], priorities: [], openQuestions: [] };

    expect(outputSchema.safeParse(base).success).toBe(false);
    expect(outputSchema.safeParse({ ...base, confidence: 'alta' }).success).toBe(true);
  });
});
