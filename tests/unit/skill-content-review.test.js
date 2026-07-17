import { describe, expect, it } from 'vitest';
import { contentReviewSkill, inputSchema, outputSchema } from '@/lib/ai/skills/content-review';

const base = {
  brandName: 'Clinica Ana',
  topic: 'Sinais de ansiedade',
  content: { hook: 'Voce sabe?', caption: 'Legenda aqui.', cta: 'Salve', hashtags: ['#ansiedade'], slides: [] },
  dna: { tone: 'acolhedor', audience: 'Adultos', personality: ['proxima'], donts: ['promessa de cura'], professionalRules: ['Citar CRP'] }
};
const prompt = (over = {}) => contentReviewSkill.buildPrompt(inputSchema.parse({ ...base, ...over }));

describe('skill content-review', () => {
  it('segue o contrato e nao amarra provedor', () => {
    expect(contentReviewSkill.id).toBe('content-review');
    expect(contentReviewSkill.provider).toBeUndefined();
  });

  // Revisao deve ser previsivel: mesma entrada, mesmo veredito.
  it('usa temperatura baixa', () => {
    expect(contentReviewSkill.temperature).toBeLessThanOrEqual(0.3);
  });

  it('leva o conteudo e as regras da marca', () => {
    const { user } = prompt();

    expect(user).toContain('CONTEUDO A REVISAR');
    expect(user).toContain('Legenda aqui.');
    expect(user).toContain('Proibido pela marca: promessa de cura');
    expect(user).toContain('Citar CRP');
  });

  it('cobre as verificacoes do PRD', () => {
    const { system } = prompt();

    for (const check of ['aderencia', 'repeticao', 'promessa exagerada', 'linguagem proibida', 'inventado', 'informacao pessoal', 'sensivel', 'CTA']) {
      expect(system).toContain(check);
    }
  });

  // A regra que mais importa: o produto nao e advogado.
  it('proibe afirmar conformidade legal', () => {
    const { system } = prompt();

    expect(system).toContain('NUNCA afirme que o conteudo esta em conformidade legal');
    expect(system).toContain('quem decide e o usuario');
  });

  // Revisor que sempre acha defeito vira ruido e o usuario para de ler.
  it('proibe inventar problema para parecer util', () => {
    expect(prompt().system).toContain('nao invente defeito');
  });

  it('passa legendas recentes para detectar repeticao', () => {
    const { user } = prompt({ recentCaptions: ['Post antigo sobre ansiedade'] });

    expect(user).toContain('verifique repeticao');
    expect(user).toContain('Post antigo sobre ansiedade');
  });

  it('inclui os slides quando houver', () => {
    const { user } = prompt({ content: { ...base.content, slides: ['Capa', 'Slide 2'] } });

    expect(user).toContain('1. Capa');
    expect(user).toContain('2. Slide 2');
  });

  const ok = {
    decision: 'atencao',
    brandFit: { score: 7, notes: 'Tom coerente.' },
    problems: [{ excerpt: 'cura garantida', issue: 'Promessa de resultado', suggestion: 'Trocar por "apoio no processo"' }],
    professionalReviewReasons: ['Tema de saude mental'],
    summary: 'Pode publicar apos ajustar a promessa.'
  };

  it('aceita a saida esperada', () => {
    expect(outputSchema.safeParse(ok).success).toBe(true);
  });

  it('aceita conteudo limpo, sem problemas', () => {
    expect(outputSchema.safeParse({ ...ok, decision: 'aprovado', problems: [], professionalReviewReasons: [] }).success).toBe(true);
  });

  it('exige um dos tres vereditos do PRD', () => {
    expect(outputSchema.safeParse({ ...ok, decision: 'talvez' }).success).toBe(false);
    expect(outputSchema.safeParse({ ...ok, decision: 'bloqueado' }).success).toBe(true);
  });

  // Problema sem correcao deixa o usuario travado sem saber o que fazer.
  it('exige sugestao de correcao em cada problema', () => {
    expect(outputSchema.safeParse({ ...ok, problems: [{ excerpt: 'x', issue: 'ruim', suggestion: '' }] }).success).toBe(false);
  });

  it('limita a nota de aderencia a 0-10', () => {
    expect(outputSchema.safeParse({ ...ok, brandFit: { score: 11, notes: '' } }).success).toBe(false);
  });
});
