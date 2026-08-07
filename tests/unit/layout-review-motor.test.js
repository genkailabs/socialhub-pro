import { describe, expect, it } from 'vitest';
import {
  revisarSlide, revisarCarrossel, correcoesAutomaticas, ORDEM_DE_CORRECAO, SEVERIDADE,
} from '@/lib/layout-review';
import { CATEGORIA, ROTULO_CATEGORIA, calcularNota, veredito } from '@/lib/layout-review/nota';
import { revisarHierarquia } from '@/lib/layout-review/hierarquia';
import { revisarEspacamento } from '@/lib/layout-review/espacamento';
import { revisarGrade } from '@/lib/layout-review/grade';

const ids = (lista) => lista.map((p) => p.id);

function bloco(extra = {}) {
  return {
    id: extra.id || 'b1',
    papel: 'corpo',
    texto: 'texto de exemplo',
    caixa: { x: 10, y: 10, w: 80, h: 20 },
    fontSize: 40,
    peso: 400,
    fonte: 'Inter',
    entrelinha: 1.45,
    tracking: 0,
    transform: 'none',
    ...extra,
  };
}

describe('hierarquia', () => {
  it('acusa manchete e apoio no mesmo volume', () => {
    const problemas = revisarHierarquia({
      blocos: [
        bloco({ id: 'h', papel: 'manchete', fontSize: 44, peso: 800 }),
        bloco({ id: 'a', papel: 'apoio', fontSize: 40, peso: 400 }),
      ],
    });
    const fraca = problemas.find((p) => p.id === 'hierarquia_fraca');
    expect(fraca).toBeTruthy();
    expect(fraca.correcao.fontSizeSugerido).toBeGreaterThan(44);
  });

  it('aceita salto suficiente', () => {
    const problemas = revisarHierarquia({
      blocos: [
        bloco({ id: 'h', papel: 'manchete', fontSize: 92, peso: 800 }),
        bloco({ id: 'a', papel: 'apoio', fontSize: 34, peso: 400 }),
      ],
    });
    expect(ids(problemas)).not.toContain('hierarquia_fraca');
  });

  it('acusa CTA maior que a manchete', () => {
    const problemas = revisarHierarquia({
      blocos: [
        bloco({ id: 'h', papel: 'manchete', fontSize: 40 }),
        bloco({ id: 'c', papel: 'cta', fontSize: 60 }),
      ],
    });
    expect(ids(problemas)).toContain('cta_gritando');
  });

  it('acusa três famílias tipográficas', () => {
    const problemas = revisarHierarquia({
      blocos: [
        bloco({ id: '1', fonte: 'Inter' }),
        bloco({ id: '2', fonte: 'Archivo' }),
        bloco({ id: '3', fonte: 'Lora' }),
      ],
    });
    expect(ids(problemas)).toContain('excesso_de_fontes');
  });

  it('não acusa dois itens de lista de terem o mesmo peso', () => {
    const problemas = revisarHierarquia({
      blocos: [
        bloco({ id: 'h', papel: 'manchete', fontSize: 92, peso: 800 }),
        bloco({ id: '1', papel: 'corpo', fontSize: 34 }),
        bloco({ id: '2', papel: 'corpo', fontSize: 34 }),
      ],
    });
    expect(ids(problemas)).not.toContain('ordem_invertida');
  });
});

describe('espaçamento', () => {
  const duasLinhas = [{ texto: 'uma' }, { texto: 'duas' }];

  it('manchete com entrelinha de corpo fica solta', () => {
    const problemas = revisarEspacamento({
      blocos: [bloco({ papel: 'manchete', entrelinha: 1.5, linhas: duasLinhas })],
    });
    expect(ids(problemas)).toContain('entrelinha_solta');
  });

  it('corpo apertado é acusado', () => {
    const problemas = revisarEspacamento({
      blocos: [bloco({ papel: 'corpo', entrelinha: 1.0, linhas: duasLinhas })],
    });
    expect(ids(problemas)).toContain('entrelinha_apertada');
  });

  it('bloco de uma linha não tem entrelinha para reclamar', () => {
    const problemas = revisarEspacamento({
      blocos: [bloco({ papel: 'manchete', entrelinha: 1.9, linhas: [{ texto: 'só uma' }] })],
    });
    expect(ids(problemas)).not.toContain('entrelinha_solta');
  });

  it('caixa-alta sem espaçamento vira sugestão, não erro', () => {
    const problemas = revisarEspacamento({
      blocos: [bloco({ papel: 'manchete', transform: 'upper', tracking: 0, linhas: duasLinhas })],
    });
    const aviso = problemas.find((p) => p.id === 'caixa_alta_sem_respiro');
    expect(aviso.severidade).toBe(SEVERIDADE.SUGESTAO);
    expect(aviso.correcao.valor).toBeGreaterThan(0);
  });

  it('acusa tracking exagerado', () => {
    const problemas = revisarEspacamento({
      blocos: [bloco({ fontSize: 40, tracking: 10, linhas: duasLinhas })],
    });
    expect(ids(problemas)).toContain('tracking_exagerado');
  });

  it('acusa blocos colados na vertical', () => {
    const problemas = revisarEspacamento({
      blocos: [
        bloco({ id: 'a', caixa: { x: 10, y: 10, w: 80, h: 20 } }),
        bloco({ id: 'b', caixa: { x: 10, y: 30.5, w: 80, h: 20 } }),
      ],
    });
    expect(ids(problemas)).toContain('blocos_colados');
  });

  it('não confunde duas colunas lado a lado com blocos colados', () => {
    const problemas = revisarEspacamento({
      blocos: [
        bloco({ id: 'a', caixa: { x: 5, y: 10, w: 40, h: 20 } }),
        bloco({ id: 'b', caixa: { x: 55, y: 30.2, w: 40, h: 20 } }),
      ],
    });
    expect(ids(problemas)).not.toContain('blocos_colados');
  });
});

describe('grade', () => {
  it('manchete fora da área segura é crítico', () => {
    const problemas = revisarGrade({
      blocos: [bloco({ papel: 'manchete', caixa: { x: 1, y: 10, w: 80, h: 20 } })],
    });
    const fora = problemas.find((p) => p.id === 'fora_da_area_segura');
    expect(fora.severidade).toBe(SEVERIDADE.CRITICO);
  });

  it('elemento que sangra de propósito não é acusado', () => {
    const problemas = revisarGrade({
      blocos: [bloco({ sangra: true, caixa: { x: 0, y: 0, w: 100, h: 100 } })],
    });
    expect(ids(problemas)).not.toContain('fora_da_area_segura');
  });

  it('acha o elemento solto no meio de peças alinhadas', () => {
    const problemas = revisarGrade({
      blocos: [
        bloco({ id: 'a', caixa: { x: 10, y: 10, w: 60, h: 10 } }),
        bloco({ id: 'b', caixa: { x: 10, y: 30, w: 60, h: 10 } }),
        bloco({ id: 'solto', caixa: { x: 37.3, y: 55, w: 25.4, h: 8 } }),
      ],
    });
    const solto = problemas.find((p) => p.id === 'elemento_solto');
    expect(solto).toBeTruthy();
    expect(solto.blocoId).toBe('solto');
  });

  it('acusa quase-alinhamento, que lê como erro de execução', () => {
    const problemas = revisarGrade({
      blocos: [
        bloco({ id: 'a', caixa: { x: 10, y: 10, w: 60, h: 10 } }),
        bloco({ id: 'b', caixa: { x: 10.7, y: 30, w: 60, h: 10 } }),
        bloco({ id: 'c', caixa: { x: 10, y: 50, w: 60, h: 10 } }),
      ],
    });
    expect(ids(problemas)).toContain('quase_alinhado');
  });

  it('acusa sobreposição de conteúdo', () => {
    const problemas = revisarGrade({
      blocos: [
        bloco({ id: 'a', caixa: { x: 10, y: 10, w: 60, h: 40 } }),
        bloco({ id: 'b', caixa: { x: 15, y: 15, w: 50, h: 30 } }),
      ],
    });
    expect(ids(problemas)).toContain('sobreposicao');
  });

  it('painel decorativo pode ficar embaixo sem virar defeito', () => {
    const problemas = revisarGrade({
      blocos: [
        bloco({ id: 'painel', decorativo: true, caixa: { x: 8, y: 8, w: 84, h: 60 } }),
        bloco({ id: 'texto', caixa: { x: 12, y: 12, w: 70, h: 40 } }),
      ],
    });
    expect(ids(problemas)).not.toContain('sobreposicao');
  });
});

describe('nota', () => {
  it('toda regra do motor tem categoria — senão não afeta a nota', () => {
    const slide = revisarSlide({
      blocos: [
        bloco({ id: 'h', papel: 'manchete', texto: 'a inteligência artificial está mudando como empresas conseguem novos clientes', fontSize: 92, peso: 800, transform: 'upper', entrelinha: 1.6, caixa: { x: 2, y: 10, w: 70, h: 40 } }),
        bloco({ id: 'a', papel: 'apoio', fontSize: 88, entrelinha: 1.0, caixa: { x: 37.9, y: 55, w: 24.2, h: 10 } }),
        bloco({ id: 'c', papel: 'cta', fontSize: 120, caixa: { x: 10, y: 70, w: 40, h: 8 } }),
      ],
    });
    expect(slide.problemas.length).toBeGreaterThan(3);
    for (const problema of slide.problemas) {
      expect(CATEGORIA[problema.id], `sem categoria: ${problema.id}`).toBeTruthy();
      expect(ROTULO_CATEGORIA[CATEGORIA[problema.id]]).toBeTruthy();
    }
  });

  it('slide limpo tira 100', () => {
    const { nota } = calcularNota([]);
    expect(nota).toBe(100);
    expect(veredito(nota)).toBe('Pronto para publicar.');
  });

  it('crítico pesa mais que sugestão', () => {
    const critico = calcularNota([{ id: 'sobreposicao', severidade: SEVERIDADE.CRITICO }]);
    const sugestao = calcularNota([{ id: 'quase_alinhado', severidade: SEVERIDADE.SUGESTAO }]);
    expect(critico.nota).toBeLessThan(sugestao.nota);
  });

  it('cada ponto perdido aponta o problema que o tirou', () => {
    const { descontos } = calcularNota([
      { id: 'viuva', severidade: SEVERIDADE.ATENCAO, mensagem: 'x' },
      { id: 'sobreposicao', severidade: SEVERIDADE.CRITICO, mensagem: 'y' },
    ]);
    expect(descontos).toHaveLength(2);
    expect(descontos[0]).toMatchObject({ id: 'viuva', categoria: 'quebras' });
    expect(descontos[1].pontos).toBeGreaterThan(descontos[0].pontos);
  });

  it('nota alta é impossível quando existe crítico', () => {
    // Uma peça com texto vazando não é "publicável, falta acabamento" só
    // porque o estrago se concentrou numa categoria e as outras cinco ficaram
    // intactas. A média sozinha dizia 80.
    const um = calcularNota([{ id: 'sobreposicao', severidade: SEVERIDADE.CRITICO }]);
    expect(um.nota).toBeLessThanOrEqual(54);
    expect(um.limitadoPorCritico).toBe(true);
    expect(veredito(um.nota)).not.toContain('Pronto');
  });

  it('o teto não é aplicado quando não há crítico', () => {
    const so = calcularNota([{ id: 'viuva', severidade: SEVERIDADE.ATENCAO }]);
    expect(so.nota).toBeGreaterThan(54);
    expect(so.limitadoPorCritico).toBe(false);
  });

  it('a nota não passa de 100 nem cai abaixo de 0', () => {
    const muitos = Array.from({ length: 40 }, () => ({ id: 'sobreposicao', severidade: SEVERIDADE.CRITICO }));
    const n = calcularNota(muitos).nota;
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(54);
    expect(calcularNota([]).nota).toBe(100);
  });
});

describe('carrossel inteiro', () => {
  const slideBase = (i, margem) => ({
    blocos: [
      bloco({ id: `h${i}`, papel: 'manchete', texto: 'manchete do slide', fontSize: 92, peso: 800, entrelinha: 1.05, tracking: 3, caixa: { x: margem, y: 10, w: 70, h: 30 } }),
      bloco({ id: `a${i}`, papel: 'apoio', texto: 'linha de apoio com contexto', fontSize: 34, entrelinha: 1.3, caixa: { x: margem, y: 50, w: 70, h: 12 } }),
    ],
  });

  it('acusa margem que dança entre slides', () => {
    const revisao = revisarCarrossel([slideBase(1, 8), slideBase(2, 8), slideBase(3, 14)]);
    expect(ids(revisao.conjunto)).toContain('margens_inconstantes');
  });

  it('não acusa margem quando todos os slides usam a mesma', () => {
    const revisao = revisarCarrossel([slideBase(1, 8), slideBase(2, 8), slideBase(3, 8)]);
    expect(ids(revisao.conjunto)).not.toContain('margens_inconstantes');
  });

  it('devolve nota, veredito, categorias e os problemas por slide', () => {
    const revisao = revisarCarrossel([slideBase(1, 8), slideBase(2, 8)]);
    expect(revisao.nota).toBeGreaterThanOrEqual(0);
    expect(revisao.veredito).toBeTruthy();
    expect(Object.keys(revisao.categorias)).toEqual(
      expect.arrayContaining(['grade', 'tipografia', 'hierarquia', 'espacamento', 'quebras', 'consistencia']),
    );
    expect(revisao.slides).toHaveLength(2);
    for (const problema of revisao.slides[0].problemas) expect(problema.slide).toBe(0);
  });

  it('crítico vem primeiro na lista', () => {
    const revisao = revisarCarrossel([
      { blocos: [
        bloco({ id: 'x', caixa: { x: 1, y: 1, w: 98, h: 20 }, papel: 'manchete', texto: 'manchete colada na borda' }),
        bloco({ id: 'y', papel: 'corpo', texto: 'algo em caixa alta', transform: 'upper', tracking: 0, linhas: [{ texto: 'a' }, { texto: 'b' }] }),
      ] },
    ]);
    expect(revisao.problemas[0].severidade).toBe(SEVERIDADE.CRITICO);
  });
});

describe('correção automática', () => {
  it('só oferece o que tem conserto determinístico, na ordem do PRD', () => {
    const problemas = [
      { id: 'entrelinha_solta', correcao: { tipo: 'ajustar_entrelinha' } },
      { id: 'viuva', correcao: { tipo: 'colar_ultimas' } },
      { id: 'bandeira_irregular', correcao: { tipo: 'alargar_ou_reduzir' } },
      { id: 'fora_da_area_segura', correcao: { tipo: 'trazer_para_dentro' } },
    ];
    const auto = correcoesAutomaticas(problemas);
    expect(auto.map((p) => p.correcao.tipo)).toEqual(['colar_ultimas', 'trazer_para_dentro', 'ajustar_entrelinha']);
    // `alargar_ou_reduzir` fica de fora: não há um valor certo para aplicar
    // sozinho, e chutar um estragaria a arte com ar de autoridade.
    expect(ORDEM_DE_CORRECAO).not.toContain('alargar_ou_reduzir');
  });
});
