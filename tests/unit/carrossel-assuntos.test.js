import { describe, expect, it } from 'vitest';
import {
  assuntoParaEntrada,
  consultaDeAssuntos,
  dataCurta,
  modosDeAssunto,
  normalizeAssuntos,
  rotuloDeFonte,
  verticalDoNicho
} from '@/lib/carrossel-assuntos';

const fontes = [
  { id: 'source-1', title: 'Jogador se casa e a web para', url: 'https://exemplo.com/casamento', publisher: 'Portal Exemplo', publishedAt: '2026-07-30' },
  { id: 'source-2', title: 'Coluna comenta a repercussão', url: 'https://exemplo.com/coluna', publisher: 'Coluna X', publishedAt: '' },
  { id: 'source-3', title: 'Sem relação', url: 'https://exemplo.com/outro', publisher: 'Outro', publishedAt: '2026-07-01' }
];

const brutos = [{
  titulo: 'Casamento de jogador domina as redes',
  resumo: 'A cerimônia virou assunto por causa da transmissão ao vivo feita pelos convidados.',
  angulo: 'Por que acontecimento pessoal gera mais atenção que anúncio pago.',
  relacaoComNicho: 'A marca vende para o mesmo público que acompanhou a transmissão.',
  confirmado: true,
  sourceIds: ['source-1', 'source-2']
}];

describe('nicho da marca escolhendo onde pesquisar', () => {
  it('reconhece a vertical pela pista, não pelo nome exato', () => {
    expect(verticalDoNicho('academia de bairro em Ceilândia').id).toBe('esportes');
    expect(verticalDoNicho('salão de beleza e sobrancelha').id).toBe('moda-beleza');
    expect(verticalDoNicho('SaaS de gestão para clínicas').id).toBe('tecnologia');
    expect(verticalDoNicho('consultoria contábil').id).toBe('negocios');
    expect(verticalDoNicho('produtora de podcast de humor').id).toBe('entretenimento');
  });

  it('sem nicho cai no geral em vez de fingir um recorte', () => {
    expect(verticalDoNicho('').id).toBe('geral');
    expect(verticalDoNicho(null).id).toBe('geral');
  });

  // O defeito que este módulo corrige: perguntar "tendências de conteúdo"
  // devolvia dica de marketing. A pergunta agora pede acontecimento com data.
  it('pergunta por acontecimento com fonte, nunca por estratégia de conteúdo', () => {
    const consulta = consultaDeAssuntos({ tipo: 'analise-tendencia', niche: 'barbearia' });

    expect(consulta).toContain('acontecimentos');
    expect(consulta).toContain('fonte original publicada e data');
    expect(consulta).toContain('revistas de moda e beleza');
    expect(consulta).not.toMatch(/estratégia de conteúdo|conteúdo humanizado/i);
  });

  it('case de sucesso procura história de quem fez, não a notícia da semana', () => {
    const consulta = consultaDeAssuntos({ tipo: 'case-sucesso', niche: 'consultoria contábil', audience: 'donos de pequenas empresas' });

    expect(consulta).toContain('cases reais');
    expect(consulta).toContain('por que funcionou');
    expect(consulta).toContain('donos de pequenas empresas');
  });
});

describe('assuntos pesquisados virando cards honestos', () => {
  it('a data e o veículo vêm da fonte, não do modelo', () => {
    const [assunto] = normalizeAssuntos([{ ...brutos[0], publicadoEm: '01/01/1999' }], fontes);

    expect(assunto.fontes[0].data).toBe('30/07/2026');
    expect(assunto.fontes[0].publisher).toBe('Portal Exemplo');
    expect(assunto.publicadoEm).toBeUndefined();
  });

  it('assunto sem fonte citada some quando a fonte é exigida', () => {
    expect(normalizeAssuntos([{ ...brutos[0], sourceIds: [] }], fontes)).toHaveLength(0);
    expect(normalizeAssuntos([{ ...brutos[0], sourceIds: ['source-9'] }], fontes)).toHaveLength(0);
  });

  // Material colado pela pessoa não tem fonte pesquisada — e continua valendo.
  it('material próprio dispensa fonte pesquisada', () => {
    const [assunto] = normalizeAssuntos([{ ...brutos[0], sourceIds: [] }], [], { exigeFonte: false });

    expect(assunto.titulo).toBe('Casamento de jogador domina as redes');
    expect(assunto.fontes).toEqual([]);
  });

  it('ignora as fontes que o assunto não citou', () => {
    const [assunto] = normalizeAssuntos(brutos, fontes);

    expect(assunto.fontes.map((fonte) => fonte.id)).toEqual(['source-1', 'source-2']);
  });

  it('assunto sem ângulo não vira card: ângulo é o que o carrossel promete', () => {
    expect(normalizeAssuntos([{ ...brutos[0], angulo: '' }], fontes)).toHaveLength(0);
  });

  it('rótulo diz veículo e data, e admite quando a fonte não datou', () => {
    const [comData, semData] = normalizeAssuntos(
      [brutos[0], { ...brutos[0], titulo: 'Outro caso', sourceIds: ['source-2'] }],
      fontes
    );

    expect(rotuloDeFonte(comData)).toBe('Portal Exemplo · 30/07/2026');
    expect(rotuloDeFonte(semData)).toBe('Coluna X · sem data publicada');
    expect(rotuloDeFonte({ fontes: [] })).toBe('Sem fonte citada');
  });

  it('data ilegível volta inteira em vez de sumir', () => {
    expect(dataCurta('2026-07-30T10:00:00Z')).toBe('30/07/2026');
    expect(dataCurta('julho de 2026')).toBe('julho de 2026');
    expect(dataCurta('')).toBe('');
  });
});

describe('assunto escolhido virando entrada do gerador', () => {
  it('leva resumo, relação com a marca, ângulo e as fontes com data', () => {
    const [assunto] = normalizeAssuntos(brutos, fontes);
    const entrada = assuntoParaEntrada(assunto);

    expect(entrada.topic).toBe('Casamento de jogador domina as redes');
    expect(entrada.sourceMaterial).toContain('A cerimônia virou assunto');
    expect(entrada.sourceMaterial).toContain('Por que acontecimento pessoal');
    expect(entrada.sourceMaterial).toContain('mesmo público que acompanhou');
    expect(entrada.sourceMaterial).toContain('https://exemplo.com/casamento');
    expect(entrada.sourceMaterial).toContain('30/07/2026');
    expect(entrada.sourceMaterial).not.toContain('https://exemplo.com/outro');
    expect(entrada.sources).toHaveLength(2);
  });

  // Rumor não pode chegar ao roteiro como fato: o aviso viaja no material.
  it('boato viaja marcado como não confirmado', () => {
    const [assunto] = normalizeAssuntos([{ ...brutos[0], confirmado: false }], fontes);

    expect(assunto.confirmado).toBe(false);
    expect(assuntoParaEntrada(assunto).sourceMaterial).toContain('não foi confirmado');
  });

  it('assunto vazio não vira entrada silenciosamente', () => {
    expect(assuntoParaEntrada(null)).toEqual({ topic: '', sourceMaterial: '', sources: [] });
  });
});

describe('os três caminhos da etapa de assunto', () => {
  it('são sempre três: buscar, fonte própria e escrever', () => {
    expect(modosDeAssunto('analise-tendencia').map((modo) => modo.id)).toEqual(['buscar', 'fonte', 'proprio']);
  });

  it('em case de sucesso a busca procura case, não tendência', () => {
    expect(modosDeAssunto('case-sucesso')[0].label).toBe('Buscar cases reais');
    expect(modosDeAssunto('analise-tendencia')[0].label).toBe('Buscar tendências atuais');
  });
});
