import { describe, expect, it } from 'vitest';
import { brandContextSkill, inputSchema, outputSchema } from '@/lib/ai/skills/brand-context';

const base = { brandName: 'Clinica Ana' };
const prompt = (input) => brandContextSkill.buildPrompt(inputSchema.parse(input));

describe('skill brand-context', () => {
  it('segue o contrato de skill', () => {
    expect(brandContextSkill.id).toBe('brand-context');
    expect(brandContextSkill.version).toBe(1);
  });

  // A skill não escolhe provedor — quem decide é a configuração.
  it('nao amarra provedor nem modelo', () => {
    expect(brandContextSkill.provider).toBeUndefined();
    expect(brandContextSkill.model).toBeUndefined();
  });

  it('exige o nome da marca', () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it('aceita apenas o cadastro minimo', () => {
    expect(inputSchema.safeParse(base).success).toBe(true);
  });

  it('leva os dados informados para o prompt', () => {
    const { user } = prompt({
      ...base,
      niche: 'Psicologa especializada em ansiedade',
      city: 'Brasilia'
    });

    expect(user).toContain('Clinica Ana');
    expect(user).toContain('ansiedade');
    expect(user).toContain('Brasilia');
  });

  it('declara o que nao foi informado, em vez de omitir', () => {
    const { user } = prompt(base);

    expect(user).toContain('Nao informado');
    expect(user).toContain('area de atuacao');
    expect(user).toContain('dados do Instagram');
  });

  it('nao lista como ausente o que foi informado', () => {
    const { user } = prompt({ ...base, niche: 'Psicologa', audience: 'Adultos', objective: 'Mais pacientes', instagramBio: 'CRP 1234' });

    expect(user).not.toContain('Nao informado');
  });

  it('inclui as respostas da entrevista', () => {
    const { user } = prompt({ ...base, answers: { 'Quais assuntos evitar': 'promessa de cura' } });

    expect(user).toContain('Quais assuntos evitar: promessa de cura');
  });

  it('ignora respostas em branco', () => {
    const { user } = prompt({ ...base, answers: { 'Pergunta vazia': '   ' } });

    expect(user).not.toContain('Pergunta vazia');
  });

  it('proibe invencao no system prompt', () => {
    const { system } = prompt(base);

    expect(system).toContain('Nao invente');
    expect(system).toContain('pendingQuestions');
  });

  it('corta legenda longa para nao estourar o prompt', () => {
    const { user } = prompt({ ...base, recentCaptions: ['x'.repeat(2000)] });

    expect(user).not.toContain('x'.repeat(400));
  });

  it('limita a amostra de legendas', () => {
    expect(inputSchema.safeParse({ ...base, recentCaptions: Array(13).fill('a') }).success).toBe(false);
  });

  it('aceita a saida esperada', () => {
    expect(outputSchema.safeParse({
      summary: 'Clinica de psicologia em Brasilia.',
      services: ['Terapia individual'],
      audience: 'Adultos com ansiedade',
      objective: 'Atrair pacientes',
      differentiators: ['Atendimento online'],
      restrictions: ['Nao prometer cura'],
      pendingQuestions: ['Qual servico e prioridade?'],
      confidence: 'media'
    }).success).toBe(true);
  });

  it('recusa saida sem resumo ou com confianca invalida', () => {
    const ok = { summary: 'x', services: [], audience: '', objective: '', differentiators: [], restrictions: [], pendingQuestions: [], confidence: 'media' };

    expect(outputSchema.safeParse({ ...ok, summary: '' }).success).toBe(false);
    expect(outputSchema.safeParse({ ...ok, confidence: 'otima' }).success).toBe(false);
  });
});
