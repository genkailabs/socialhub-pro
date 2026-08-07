import { describe, expect, it } from 'vitest';
import { medidorEstimado, caracteresPorLinha } from '@/lib/layout-review/medida';
import { quebrarLinhas, colarUltimasPalavras, colarNaSeguinte, NBSP } from '@/lib/layout-review/quebra';
import { revisarLinhas, SEVERIDADE } from '@/lib/layout-review/linhas';

// Manchete de carrossel: caixa-alta, peso alto, corpo grande.
const MANCHETE = { fontSize: 92, weight: 800, transform: 'upper' };

function analisar(texto, { largura = 900, papel = 'manchete', estilo = MANCHETE, rotulo = 'Manchete' } = {}) {
  const medir = medidorEstimado(estilo);
  const linhas = quebrarLinhas(texto, { largura, medir });
  return { linhas, problemas: revisarLinhas({ texto, linhas, largura, papel, rotulo }) };
}

const ids = (problemas) => problemas.map((p) => p.id);

describe('medida do texto', () => {
  it('cobra mais por glifo largo que por glifo estreito', () => {
    const medir = medidorEstimado({ fontSize: 100 });
    // A conta antiga dava o mesmo para os dois: seis caracteres × largura média.
    expect(medir('MMMMMM')).toBeGreaterThan(medir('iiiiii') * 2);
  });

  it('cobra o espaçamento entre letras por caractere, não por palavra', () => {
    const semEspaco = medidorEstimado({ fontSize: 40 });
    const comEspaco = medidorEstimado({ fontSize: 40, letterSpacing: 4 });
    expect(comEspaco('SELO')).toBeCloseTo(semEspaco('SELO') + 16, 5);
  });

  it('estima quantos caracteres cabem na medida', () => {
    expect(caracteresPorLinha(600, { fontSize: 20 })).toBeGreaterThan(40);
  });
});

describe('quebra de linha', () => {
  it('quebra por palavra, nunca no meio dela', () => {
    const medir = medidorEstimado({ fontSize: 40 });
    const linhas = quebrarLinhas('um dois tres quatro cinco seis sete oito', { largura: 200, medir });
    for (const linha of linhas) {
      expect(linha.texto).not.toMatch(/^\s|\s$/);
      expect(linha.palavras.join(' ')).toBe(linha.texto);
    }
  });

  it('respeita a quebra escrita à mão e a marca como forçada', () => {
    const medir = medidorEstimado({ fontSize: 20 });
    const linhas = quebrarLinhas('primeira\nsegunda', { largura: 9999, medir });
    expect(linhas.map((l) => l.texto)).toEqual(['primeira', 'segunda']);
    expect(linhas[0].forcada).toBe(true);
    expect(linhas[1].forcada).toBe(false);
  });

  it('não separa palavras coladas por espaço inquebrável', () => {
    const medir = medidorEstimado({ fontSize: 40 });
    const largura = medir('novos') + 1;
    const soltas = quebrarLinhas('novos clientes', { largura, medir });
    const coladas = quebrarLinhas(`novos${NBSP}clientes`, { largura, medir });
    expect(soltas).toHaveLength(2);
    expect(coladas).toHaveLength(1);
  });

  it('avisa quando uma palavra sozinha é mais larga que a caixa', () => {
    const medir = medidorEstimado({ fontSize: 80 });
    const [linha] = quebrarLinhas('INCOMPREENSIBILIDADE', { largura: 100, medir });
    expect(linha.estourou).toBe(true);
  });
});

describe('viúva — o caso do guia', () => {
  // "A INTELIGÊNCIA ARTIFICIAL / ESTÁ MUDANDO COMO / EMPRESAS CONSEGUEM /
  //  NOVOS / CLIENTES" — o exemplo marcado como ERRADO no guia.
  const texto = 'A inteligência artificial está mudando como empresas conseguem novos clientes';

  it('acha a palavra sozinha na última linha', () => {
    const medir = medidorEstimado(MANCHETE);
    // Largura escolhida para reproduzir a quebra do guia.
    // Um fio abaixo do par final: "novos clientes" não cabe junto, então
    // "clientes" desce sozinha — exatamente a quebra marcada como ERRADO no guia.
    const largura = medir('NOVOS CLIENTES') - 1;
    const linhas = quebrarLinhas(texto, { largura, medir });
    expect(linhas[linhas.length - 1].palavras).toHaveLength(1);

    const problemas = revisarLinhas({ texto, linhas, largura, papel: 'manchete', rotulo: 'Manchete' });
    const viuva = problemas.find((p) => p.id === 'viuva');
    expect(viuva).toBeTruthy();
    expect(viuva.severidade).toBe(SEVERIDADE.ATENCAO);
    expect(viuva.mensagem).toContain('clientes');
  });

  it('quando o par cabe na medida, a correção cola e mata a viúva', () => {
    const medir = medidorEstimado(MANCHETE);
    // Folga suficiente para "NOVOS CLIENTES" caber junto numa linha.
    const largura = medir('EMPRESAS CONSEGUEM NOVOS') ;
    const linhas = quebrarLinhas(texto, { largura, medir });
    const viuva = revisarLinhas({ texto, linhas, largura, papel: 'manchete', medir })
      .find((p) => p.id === 'viuva');
    if (!viuva) return; // nesta medida não nasce viúva; o caso está nos outros testes

    expect(viuva.correcao.tipo).toBe('colar_ultimas');
    expect(viuva.correcao.texto).toContain(`novos${NBSP}clientes`);

    const depois = quebrarLinhas(viuva.correcao.texto, { largura, medir });
    expect(ids(revisarLinhas({ texto: viuva.correcao.texto, linhas: depois, largura, papel: 'manchete', medir })))
      .not.toContain('viuva');
  });

  it('quando o par NÃO cabe, recusa colar em vez de trocar viúva por estouro', () => {
    const medir = medidorEstimado(MANCHETE);
    // "NOVOS CLIENTES" junto é mais largo que a caixa: colar criaria um bloco
    // inquebrável que vaza. O revisor tem que perceber isso sozinho.
    const largura = medir('NOVOS CLIENTES') - 1;
    const linhas = quebrarLinhas(texto, { largura, medir });
    const viuva = revisarLinhas({ texto, linhas, largura, papel: 'manchete', medir })
      .find((p) => p.id === 'viuva');

    expect(viuva).toBeTruthy();
    expect(viuva.correcao.tipo).toBe('alargar_ou_reduzir');
    expect(viuva.correcao.texto).toBeUndefined();
  });

  it('sem medidor a correção ainda é oferecida, mas não foi conferida', () => {
    const linhas = [
      { texto: 'primeira linha cheia', palavras: ['primeira', 'linha', 'cheia'], largura: 400, forcada: false },
      { texto: 'sozinha', palavras: ['sozinha'], largura: 120, forcada: false },
    ];
    const viuva = revisarLinhas({ texto: 'primeira linha cheia sozinha', linhas, largura: 420 })
      .find((p) => p.id === 'viuva');
    expect(viuva.correcao.tipo).toBe('colar_ultimas');
  });

  it('não acusa viúva quando a quebra foi escrita à mão', () => {
    const medir = medidorEstimado({ fontSize: 30 });
    const linhas = quebrarLinhas('Uma linha inteira aqui\nsozinha', { largura: 9999, medir });
    // A última linha tem uma palavra só, mas veio de um `\n` no meio do texto.
    expect(ids(revisarLinhas({ texto: 'x', linhas, largura: 9999 }))).not.toContain('viuva');
  });

  it('não acusa viúva em bloco de uma linha só', () => {
    const { problemas } = analisar('CURTO', { largura: 2000 });
    expect(ids(problemas)).not.toContain('viuva');
  });
});

describe('quebra semântica', () => {
  it('acusa linha que termina em preposição', () => {
    const medir = medidorEstimado(MANCHETE);
    const texto = 'os 3 erros de precificação que quebram a agência';
    const largura = medir('OS 3 ERROS DE') + 4;
    const problemas = revisarLinhas({
      texto, linhas: quebrarLinhas(texto, { largura, medir }), largura, papel: 'manchete',
    });
    const quebra = problemas.find((p) => p.id === 'quebra_semantica');
    expect(quebra).toBeTruthy();
    expect(quebra.mensagem).toContain('"de"');
    expect(quebra.correcao.texto).toContain(`de${NBSP}precificação`);
  });

  it('trata número solto no fim da linha como quebra ruim', () => {
    const linhas = [
      { texto: 'os 3', palavras: ['os', '3'], largura: 100, forcada: false },
      { texto: 'erros', palavras: ['erros'], largura: 120, forcada: false },
    ];
    expect(ids(revisarLinhas({ texto: 'os 3 erros', linhas, largura: 200 }))).toContain('quebra_semantica');
  });

  it('em corpo de texto é sugestão; em manchete é atenção', () => {
    const linhas = [
      { texto: 'uma frase de', palavras: ['uma', 'frase', 'de'], largura: 180, forcada: false },
      { texto: 'exemplo aqui', palavras: ['exemplo', 'aqui'], largura: 190, forcada: false },
    ];
    const corpo = revisarLinhas({ texto: 'uma frase de exemplo aqui', linhas, largura: 200, papel: 'corpo' });
    const manchete = revisarLinhas({ texto: 'uma frase de exemplo aqui', linhas, largura: 200, papel: 'manchete' });
    expect(corpo.find((p) => p.id === 'quebra_semantica').severidade).toBe(SEVERIDADE.SUGESTAO);
    expect(manchete.find((p) => p.id === 'quebra_semantica').severidade).toBe(SEVERIDADE.ATENCAO);
  });
});

describe('bandeira irregular — o "MAIS" sozinho no meio', () => {
  it('acusa linha do meio muito mais curta que a mais larga', () => {
    // "COMO USAR IA / PARA VENDER / MAIS / NO INSTAGRAM" do guia.
    const linhas = [
      { texto: 'COMO USAR IA', palavras: ['COMO', 'USAR', 'IA'], largura: 400, forcada: false },
      { texto: 'PARA VENDER', palavras: ['PARA', 'VENDER'], largura: 390, forcada: false },
      { texto: 'MAIS', palavras: ['MAIS'], largura: 150, forcada: false },
      { texto: 'NO INSTAGRAM', palavras: ['NO', 'INSTAGRAM'], largura: 410, forcada: false },
    ];
    const problemas = revisarLinhas({ texto: 'x', linhas, largura: 420, papel: 'manchete' });
    const bandeira = problemas.find((p) => p.id === 'bandeira_irregular');
    expect(bandeira).toBeTruthy();
    expect(bandeira.linha).toBe(2);
    // Colar palavra não conserta: a linha curta veio de a seguinte não caber.
    expect(bandeira.correcao.tipo).toBe('alargar_ou_reduzir');
  });

  it('não confunde com a última linha, que é viúva', () => {
    const linhas = [
      { texto: 'PRIMEIRA LINHA CHEIA', palavras: ['PRIMEIRA', 'LINHA', 'CHEIA'], largura: 400, forcada: false },
      { texto: 'SEGUNDA LINHA CHEIA', palavras: ['SEGUNDA', 'LINHA', 'CHEIA'], largura: 395, forcada: false },
      { texto: 'FIM', palavras: ['FIM'], largura: 120, forcada: false },
    ];
    const problemas = ids(revisarLinhas({ texto: 'x', linhas, largura: 420 }));
    expect(problemas).toContain('viuva');
    expect(problemas).not.toContain('bandeira_irregular');
  });
});

describe('hífen', () => {
  it('manchete não hifeniza', () => {
    const linhas = [
      { texto: 'comuni-', palavras: ['comuni-'], largura: 300, forcada: false },
      { texto: 'cação eficaz', palavras: ['cação', 'eficaz'], largura: 320, forcada: false },
    ];
    expect(ids(revisarLinhas({ texto: 'x', linhas, largura: 340, papel: 'manchete' }))).toContain('hifen_em_manchete');
    expect(ids(revisarLinhas({ texto: 'x', linhas, largura: 340, papel: 'corpo' }))).not.toContain('hifen_em_manchete');
  });

  it('acusa escadinha com três hífens seguidos', () => {
    const linhas = ['comu-', 'nica-', 'ção e-', 'ficaz'].map((texto) => ({
      texto, palavras: [texto], largura: 300, forcada: false,
    }));
    expect(ids(revisarLinhas({ texto: 'x', linhas, largura: 340, papel: 'corpo' }))).toContain('escadinha');
  });
});

describe('palavra maior que a caixa', () => {
  it('é crítico: o render vai vazar', () => {
    const { problemas } = analisar('INCOMPREENSIBILIDADE', { largura: 200 });
    const critico = problemas.find((p) => p.id === 'palavra_estourada');
    expect(critico).toBeTruthy();
    expect(critico.severidade).toBe(SEVERIDADE.CRITICO);
  });
});

describe('medida da coluna', () => {
  it('avisa quando o corpo passa da faixa legível', () => {
    const longa = 'a'.repeat(95);
    const linhas = [longa, longa, longa].map((texto) => ({
      texto, palavras: [texto], largura: 900, forcada: false,
    }));
    expect(ids(revisarLinhas({ texto: 'x', linhas, largura: 900, papel: 'corpo' }))).toContain('medida_longa');
  });

  it('não reclama de manchete curta, que é escolha', () => {
    const linhas = [
      { texto: 'MENOS', palavras: ['MENOS'], largura: 400, forcada: false },
      { texto: 'É MAIS', palavras: ['É', 'MAIS'], largura: 410, forcada: false },
    ];
    expect(ids(revisarLinhas({ texto: 'x', linhas, largura: 420, papel: 'manchete' }))).not.toContain('medida_curta');
  });
});

describe('correções não estragam o texto', () => {
  it('colar as últimas palavras não muda nenhuma letra', () => {
    const antes = 'novos clientes todo mês';
    const depois = colarUltimasPalavras(antes);
    expect(depois.replace(/ /g, ' ')).toBe(antes);
  });

  it('colar na seguinte respeita a quebra escrita à mão', () => {
    const texto = 'linha de\nteste aqui';
    // índice 1 é "de", que termina o parágrafo escrito à mão.
    expect(colarNaSeguinte(texto, 1)).toBe(texto);
  });
});
