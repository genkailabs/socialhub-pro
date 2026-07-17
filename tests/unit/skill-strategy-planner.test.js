import { describe, expect, it } from 'vitest';
import { contentStrategySkill, inputSchema as stratIn, outputSchema as stratOut } from '@/lib/ai/skills/content-strategy';
import { editorialPlannerSkill, inputSchema as planIn, outputSchema as planOut } from '@/lib/ai/skills/editorial-planner';

const dna = { niche: 'Psicologa de ansiedade', audience: 'Adultos', tone: 'acolhedor', pillars: ['educacao'], objective: 'mais pacientes', donts: ['promessa de cura'] };
const stratPrompt = (over = {}) => contentStrategySkill.buildPrompt(stratIn.parse({ brandName: 'Clinica Ana', dna, ...over }));

describe('skill content-strategy', () => {
  it('segue o contrato e nao amarra provedor', () => {
    expect(contentStrategySkill.id).toBe('content-strategy');
    expect(contentStrategySkill.provider).toBeUndefined();
  });

  it('leva a marca e as restricoes para o prompt', () => {
    const { user } = stratPrompt();

    expect(user).toContain('Clinica Ana');
    expect(user).toContain('Psicologa de ansiedade');
    expect(user).toContain('promessa de cura');
  });

  // A estrategia tem que responder ao perfil real quando ele existe.
  it('usa as prioridades do diagnostico', () => {
    const { user } = stratPrompt({ auditPriorities: ['Publicar com mais constancia'] });

    expect(user).toContain('Publicar com mais constancia');
  });

  it('diz quando ainda nao ha diagnostico, em vez de omitir', () => {
    const { user } = stratPrompt();

    expect(user).toContain('Ainda nao ha diagnostico');
  });

  it('proibe jargao e invencao', () => {
    const { system } = stratPrompt();

    expect(system).toContain('nunca estudou marketing');
    expect(system).toContain('Nao invente');
  });

  // Profissao regulada sem prometer conformidade legal (§8-E11).
  it('pede regras profissionais sem afirmar conformidade', () => {
    const { system } = stratPrompt();

    expect(system).toContain('professionalRules');
    expect(system).toContain('sem afirmar que isso garante conformidade legal');
  });

  const estrategiaOk = {
    mainObjective: 'Atrair pacientes',
    secondaryObjectives: ['Educar sobre ansiedade'],
    targetAudience: 'Adultos com ansiedade',
    editorialProposal: 'Conteudo educativo e humano',
    pillars: [
      { name: 'Educacao', description: 'Explicar ansiedade', share: 60, examples: ['O que e crise'] },
      { name: 'Autoridade', description: 'Mostrar experiencia', share: 40, examples: ['Bastidores'] }
    ],
    formats: ['tips_carousel'],
    postsPerWeek: 3,
    balance: { educacao: 60, autoridade: 20, relacionamento: 10, conversao: 10 },
    professionalRules: ['Nao prometer cura'],
    indicators: ['Salvamentos'],
    rationale: 'Educacao gera confianca antes de vender.'
  };

  it('aceita a estrategia esperada', () => {
    expect(stratOut.safeParse(estrategiaOk).success).toBe(true);
  });

  it('exige ao menos dois pilares', () => {
    expect(stratOut.safeParse({ ...estrategiaOk, pillars: [estrategiaOk.pillars[0]] }).success).toBe(false);
  });

  it('recusa estrategia sem justificativa', () => {
    expect(stratOut.safeParse({ ...estrategiaOk, rationale: '' }).success).toBe(false);
  });
});

const strategy = { mainObjective: 'Atrair pacientes', pillars: [{ name: 'Educacao', share: 60 }, { name: 'Autoridade', share: 40 }], formats: ['tips_carousel'], postsPerWeek: 3 };
const planPrompt = (over = {}) => editorialPlannerSkill.buildPrompt(planIn.parse({ brandName: 'Clinica Ana', weekStart: '2026-07-20', strategy, ...over }));

describe('skill editorial-planner', () => {
  it('segue o contrato', () => {
    expect(editorialPlannerSkill.id).toBe('editorial-planner');
  });

  it('exige data no formato certo', () => {
    expect(planIn.safeParse({ brandName: 'x', weekStart: '20/07/2026', strategy }).success).toBe(false);
    expect(planIn.safeParse({ brandName: 'x', weekStart: '2026-07-20', strategy }).success).toBe(true);
  });

  it('leva pilares com peso e frequencia', () => {
    const { user } = planPrompt();

    expect(user).toContain('Educacao (60%)');
    expect(user).toContain('3');
  });

  // Regra de economia (§8-E9): planejar e barato, produzir e caro.
  it('proibe gerar conteudo nesta etapa', () => {
    const { system, user } = planPrompt();

    expect(system).toContain('nao escreva legenda');
    expect(user).toContain('Nada de legenda ou imagem');
  });

  it('nao tem campo de legenda na saida', () => {
    const itemOk = {
      date: '2026-07-20', format: 'tips_carousel', topic: 'Sinais de ansiedade',
      title: 'Cinco sinais', objective: 'Educar', pillar: 'Educacao',
      stage: 'descoberta', cta: 'Salve este post', rationale: 'Abre a semana educando.'
    };
    const parsed = planOut.parse({ items: [{ ...itemOk, caption: 'texto pronto' }] });

    expect(parsed.items[0].caption).toBeUndefined();
  });

  it('evita repetir tema recente', () => {
    const { user } = planPrompt({ recentTopics: ['Sinais de ansiedade'] });

    expect(user).toContain('nao repetir');
    expect(user).toContain('Sinais de ansiedade');
  });

  // Aprendizado entra como contexto, nunca como regra (§8-E16).
  it('trata sinais como contexto, nao como regra', () => {
    const { user } = planPrompt({ signals: ['Carrossel costuma ser aprovado sem edicao'] });

    expect(user).toContain('nao trate como regra');
  });

  it('exige justificativa e estagio validos em cada item', () => {
    const item = { date: '2026-07-20', format: 'news', topic: 't', title: 'x', objective: 'o', pillar: 'p', stage: 'descoberta', cta: 'c', rationale: 'r' };

    expect(planOut.safeParse({ items: [item] }).success).toBe(true);
    expect(planOut.safeParse({ items: [{ ...item, rationale: '' }] }).success).toBe(false);
    expect(planOut.safeParse({ items: [{ ...item, stage: 'funil' }] }).success).toBe(false);
  });

  it('recusa plano vazio', () => {
    expect(planOut.safeParse({ items: [] }).success).toBe(false);
  });
});
