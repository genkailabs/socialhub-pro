import { describe, expect, it } from 'vitest';
import {
  SKILLS_AGENCIA, skillAgenciaPorId, skillsPorEscopo, briefingDaSkill, claudeUrl
} from '@/lib/skills-agencia';

const marca = {
  name: 'GenkaiLabs',
  description: 'Consultoria de IA para pequenos negócios',
  niche: 'Consultoria',
  kit: {
    niche: 'IA aplicada a pequenos negócios',
    audience: 'Donos de óticas e clínicas no DF',
    tone: 'Direto, sem jargão',
    pillars: ['Bastidor', 'Prova'],
    donts: ['Promessa de resultado', 'Emoji em excesso']
  }
};

describe('skills de agência dentro do Hub', () => {
  it('tem as quatro skills, com o diagnóstico no núcleo e o resto no avançado', () => {
    expect(SKILLS_AGENCIA).toHaveLength(4);
    expect(skillsPorEscopo('nucleo').map((s) => s.id)).toEqual(['brandsdecoded-diagnostico-marca']);
    expect(skillsPorEscopo('avancado')).toHaveLength(3);
  });

  it('cada skill diz o que faz, quando usar, o que entrega e como se aplica aqui', () => {
    for (const skill of SKILLS_AGENCIA) {
      expect(skill.resumo.length).toBeGreaterThan(30);
      expect(skill.quando.length).toBeGreaterThan(10);
      expect(skill.entrega.length).toBeGreaterThan(3);
      expect(skill.aplicacaoNoHub.length).toBeGreaterThan(20);
      expect(skill.pedido.length).toBeGreaterThan(15);
    }
  });

  it('busca por id não cai na primeira skill quando o id é inventado', () => {
    expect(skillAgenciaPorId('skill-fantasma')).toBeNull();
    expect(skillAgenciaPorId('')).toBeNull();
    expect(skillAgenciaPorId('lead-copy')?.label).toBe('Lead Copy');
  });

  // O valor do Hub aqui é não recomeçar do zero: o briefing sai com o que a
  // marca já tem cadastrado.
  it('monta o briefing com os dados reais da marca', () => {
    const texto = briefingDaSkill('brandsdecoded-diagnostico-marca', marca);

    expect(texto).toContain('BlueprintPRO');
    expect(texto).toContain('Marca: GenkaiLabs');
    expect(texto).toContain('Nicho: IA aplicada a pequenos negócios');
    expect(texto).toContain('Público: Donos de óticas e clínicas no DF');
    expect(texto).toContain('Tom de voz: Direto, sem jargão');
    expect(texto).toContain('A marca evita: Promessa de resultado, Emoji em excesso');
  });

  it('marca sem Brand Kit gera briefing sem contexto inventado', () => {
    const texto = briefingDaSkill('lead-copy', { name: 'Marca Nova' });

    expect(texto).toContain('Marca: Marca Nova');
    expect(texto).not.toContain('Público:');
    expect(texto).not.toContain('Tom de voz:');
  });

  it('acrescenta a observação de quem está pedindo, quando existe', () => {
    const texto = briefingDaSkill('landing-page-machine', marca, 'Oferta: turma de setembro, R$ 497');

    expect(texto).toContain('Observação: Oferta: turma de setembro, R$ 497');
  });

  it('skill inexistente não gera briefing', () => {
    expect(briefingDaSkill('nao-existe', marca)).toBe('');
  });

  it('abre o Claude com o briefing na caixa e cai na tela limpa quando o texto é longo demais', () => {
    const url = claudeUrl(briefingDaSkill('brandsdecoded-propostas', marca));

    expect(url.startsWith('https://claude.ai/new?q=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('GenkaiLabs');
    expect(claudeUrl('')).toBeNull();
    expect(claudeUrl('a'.repeat(9000))).toBe('https://claude.ai/new');
  });
});
