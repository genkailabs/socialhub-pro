import { describe, expect, it } from 'vitest';
import {
  TIPOS, TIPO_PADRAO, tipoPorId, pilaresDoTipo, papeisDoTipo, tiposPorObjetivo
} from '@/lib/carrossel-tipos';

// O catálogo é a regra do produto: cada tipo de carrossel tem objetivo,
// receita (pilares) e papéis de slide próprios. O gerador editorial, a tela de
// escolha e a revisão leem daqui — se o catálogo mentir, os três mentem juntos.
describe('catálogo de tipos de carrossel', () => {
  it('tem os oito tipos, sem id repetido', () => {
    expect(TIPOS).toHaveLength(8);
    expect(new Set(TIPOS.map((t) => t.id)).size).toBe(8);
  });

  it('marca os dois carros-chefe, que são os de descoberta com pesquisa', () => {
    const chefes = TIPOS.filter((t) => t.carroChefe);

    expect(chefes.map((t) => t.id)).toEqual(['analise-tendencia', 'case-sucesso']);
    for (const tipo of chefes) {
      expect(tipo.objetivo).toBe('descoberta');
      expect(tipo.exigePesquisa).toBe(true);
      expect(tipo.pilares.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('todo tipo tem objetivo conhecido, promessa e ao menos dois pilares', () => {
    for (const tipo of TIPOS) {
      expect(['descoberta', 'relacionamento', 'venda']).toContain(tipo.objetivo);
      expect(tipo.label.length).toBeGreaterThan(2);
      expect(tipo.promessa.length).toBeGreaterThan(10);
      expect(tipo.pilares.length).toBeGreaterThanOrEqual(2);
      expect(new Set(tipo.pilares.map((p) => p.id)).size).toBe(tipo.pilares.length);
    }
  });

  // Quem não é carro-chefe carrega o aviso honesto da aula: alcance limitado,
  // conteúdo raso ou uso pontual. Vender todos como iguais seria mentira.
  it('tipo que não é carro-chefe diz qual é a limitação dele', () => {
    for (const tipo of TIPOS.filter((t) => !t.carroChefe)) {
      expect(tipo.limite.length).toBeGreaterThan(10);
    }
  });

  it('todo roteiro sugerido começa na capa, termina no CTA e usa papéis permitidos', () => {
    for (const tipo of TIPOS) {
      expect(tipo.papeis).toContain('cover');
      expect(tipo.papeis).toContain('cta');
      expect(tipo.roteiro[0]).toBe('cover');
      expect(tipo.roteiro.at(-1)).toBe('cta');
      for (const papel of tipo.roteiro) expect(tipo.papeis).toContain(papel);
      expect(tipo.roteiro.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('cada tipo aponta um template que existe no Studio', () => {
    const doStudio = [
      'editorial-dark', 'quote-card', 'paper-card', 'bold-numbers',
      'split-frame', 'numbered-list', 'before-after'
    ];

    for (const tipo of TIPOS) expect(doStudio).toContain(tipo.templateSugerido);
  });

  it('o padrão é o carro-chefe de tendência', () => {
    expect(TIPO_PADRAO).toBe('analise-tendencia');
    expect(tipoPorId(TIPO_PADRAO)?.carroChefe).toBe(true);
  });

  it('busca por id devolve null para tipo inventado, em vez de cair no primeiro', () => {
    expect(tipoPorId('carrossel-magico')).toBeNull();
    expect(tipoPorId('')).toBeNull();
    expect(tipoPorId(undefined)).toBeNull();
    expect(tipoPorId('case-sucesso')?.label).toBeTruthy();
  });

  it('pilares e papéis de tipo desconhecido vêm vazios, não do tipo errado', () => {
    expect(pilaresDoTipo('nao-existe')).toEqual([]);
    expect(papeisDoTipo('nao-existe')).toEqual([]);
    expect(pilaresDoTipo('analise-tendencia').map((p) => p.id))
      .toEqual(['especificidade', 'evidencia', 'porque', 'implicacao']);
  });

  it('agrupa por objetivo com os carros-chefe na frente', () => {
    const grupos = tiposPorObjetivo();

    expect(grupos.map((g) => g.objetivo)).toEqual(['descoberta', 'relacionamento', 'venda']);
    expect(grupos[0].tipos[0].carroChefe).toBe(true);
    expect(grupos.flatMap((g) => g.tipos)).toHaveLength(TIPOS.length);
  });
});
