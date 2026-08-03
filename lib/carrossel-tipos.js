// Tipos de carrossel — a regra do produto, em um lugar só. Puro, sem I/O.
//
// Carrossel não é um formato só: cada tipo persegue um objetivo diferente
// (descoberta, relacionamento, venda) e tem uma receita própria. Antes disto o
// gerador editorial só sabia fazer o carrossel educativo de meio de funil, que
// é justamente o mais difícil de performar com quem ainda não segue a marca.
//
// Os dois carros-chefe — análise de tendência e case de sucesso — são os que
// alcançam desconhecido, e por isso exigem pesquisa: sem fonte, viram opinião
// com cara de dado. Os demais entram com o limite escrito, porque vender todos
// como iguais seria mentira: lista é rasa, prova social raramente sai da bolha
// e dump não viraliza.
//
// `pilares` é o que o roteiro precisa cumprir para ser entregue; `papeis` são
// os papéis de slide permitidos; `roteiro` é a sequência sugerida ao modelo.

export const OBJETIVOS = [
  { id: 'descoberta', label: 'Descoberta', resumo: 'Alcança quem ainda não te segue.' },
  { id: 'relacionamento', label: 'Relacionamento', resumo: 'Aprofunda com quem já te acompanha.' },
  { id: 'venda', label: 'Venda', resumo: 'Puxa lead e conversão.' }
];

export const TIPOS = [
  {
    id: 'analise-tendencia',
    label: 'Análise de tendência',
    objetivo: 'descoberta',
    carroChefe: true,
    promessa: 'Pega um movimento em alta e mostra o que ele significa. É o que mais alcança desconhecido.',
    limite: '',
    exigePesquisa: true,
    pilares: [
      { id: 'especificidade', label: 'Tendência específica', pergunta: 'Qual movimento exato, não "o mercado mudou"?' },
      { id: 'evidencia', label: 'Exemplo ou dado', pergunta: 'O que sustenta que isso está acontecendo?' },
      { id: 'porque', label: 'Por que acontece', pergunta: 'Qual a causa por trás do movimento?' },
      { id: 'implicacao', label: 'Implicação', pergunta: 'O que muda para quem está lendo?' }
    ],
    papeis: ['cover', 'sinal', 'evidencia', 'porque', 'implicacao', 'recap', 'cta'],
    roteiro: ['cover', 'sinal', 'evidencia', 'porque', 'implicacao', 'cta'],
    templateSugerido: 'editorial-dark'
  },
  {
    id: 'case-sucesso',
    label: 'Case de sucesso',
    objetivo: 'descoberta',
    carroChefe: true,
    promessa: 'Conta por que uma marca deu certo ou errado. Quem é citado costuma repostar.',
    limite: '',
    exigePesquisa: true,
    pilares: [
      { id: 'historia', label: 'História verdadeira', pergunta: 'De quem é o caso e o que aconteceu?' },
      { id: 'numeros', label: 'Números', pergunta: 'Que dado mostra o tamanho da história?' },
      { id: 'virada', label: 'Ponto de virada', pergunta: 'O que mudou o rumo?' },
      { id: 'licao', label: 'Lição prática', pergunta: 'O que o leitor faz com isso hoje?' }
    ],
    papeis: ['cover', 'historia', 'numeros', 'virada', 'licao', 'recap', 'cta'],
    roteiro: ['cover', 'historia', 'numeros', 'virada', 'licao', 'cta'],
    templateSugerido: 'paper-card'
  },
  {
    id: 'comparacao',
    label: 'Comparação',
    objetivo: 'descoberta',
    carroChefe: false,
    promessa: 'Antes e depois, caro e barato, lento e rápido. Fácil de fazer e de compartilhar.',
    limite: 'Ganha alcance e curtida, mas converte pouco em venda ou lead.',
    exigePesquisa: false,
    pilares: [
      { id: 'criterio', label: 'Critério da comparação', pergunta: 'Comparado em que exatamente?' },
      { id: 'lados', label: 'Os dois lados', pergunta: 'O que tem de cada lado, sem caricatura?' },
      { id: 'veredito', label: 'Veredito', pergunta: 'O que o leitor deveria escolher e quando?' }
    ],
    papeis: ['cover', 'criterio', 'antes', 'depois', 'veredito', 'cta'],
    roteiro: ['cover', 'criterio', 'antes', 'depois', 'veredito', 'cta'],
    templateSugerido: 'before-after'
  },
  {
    id: 'lista',
    label: 'Lista',
    objetivo: 'descoberta',
    carroChefe: false,
    promessa: 'Itens numerados sobre um tema. Rápido de produzir e de ler.',
    limite: 'Costuma ficar raso: serve para alcance, não para aprofundar.',
    exigePesquisa: false,
    pilares: [
      { id: 'promessa-numerica', label: 'Promessa clara', pergunta: 'Quantos itens e sobre o quê?' },
      { id: 'itens', label: 'Itens que se sustentam', pergunta: 'Cada item diz algo próprio?' },
      { id: 'fechamento', label: 'Fechamento', pergunta: 'O que amarra a lista no fim?' }
    ],
    papeis: ['cover', 'item', 'recap', 'cta'],
    roteiro: ['cover', 'item', 'item', 'item', 'recap', 'cta'],
    templateSugerido: 'numbered-list'
  },
  {
    id: 'educativo',
    label: 'Educativo',
    objetivo: 'relacionamento',
    carroChefe: false,
    promessa: 'Dica, framework ou passo a passo. Constrói autoridade com quem já te lê.',
    limite: 'Dica solta rende pouco alcance para quem ainda não te conhece.',
    exigePesquisa: false,
    pilares: [
      { id: 'tese', label: 'Tese', pergunta: 'Qual o ângulo, não o assunto genérico?' },
      { id: 'passo-a-passo', label: 'Passo a passo', pergunta: 'Como se faz, na ordem?' },
      { id: 'aplicacao', label: 'Aplicação', pergunta: 'O que o leitor faz hoje com isso?' }
    ],
    papeis: ['cover', 'traction', 'context', 'teach', 'apply', 'recap', 'cta'],
    roteiro: ['cover', 'traction', 'context', 'teach', 'apply', 'cta'],
    templateSugerido: 'split-frame'
  },
  {
    id: 'dump',
    label: 'Bastidor (dump)',
    objetivo: 'relacionamento',
    carroChefe: false,
    promessa: 'Fotos da semana com significado. Aproxima quem já te segue.',
    limite: 'Não viraliza: serve para comunidade, não para alcance.',
    exigePesquisa: false,
    pilares: [
      { id: 'bastidor', label: 'O que aconteceu', pergunta: 'Que cena real está sendo mostrada?' },
      { id: 'significado', label: 'O que isso diz', pergunta: 'Que posicionamento essa cena carrega?' }
    ],
    papeis: ['cover', 'bastidor', 'significado', 'cta'],
    roteiro: ['cover', 'bastidor', 'bastidor', 'significado', 'cta'],
    templateSugerido: 'quote-card'
  },
  {
    id: 'prova-social',
    label: 'Prova social',
    objetivo: 'venda',
    carroChefe: false,
    promessa: 'Resultado de cliente ou seu. Convence quem já está considerando comprar.',
    limite: 'Raramente sai da bolha: vende bem, alcança pouco.',
    exigePesquisa: false,
    pilares: [
      { id: 'resultado', label: 'Resultado', pergunta: 'Que número ou mudança concreta apareceu?' },
      { id: 'contexto', label: 'Ponto de partida', pergunta: 'De onde essa pessoa saiu?' },
      { id: 'evidencia', label: 'Evidência', pergunta: 'O que comprova o resultado?' }
    ],
    papeis: ['cover', 'contexto', 'resultado', 'evidencia', 'cta'],
    roteiro: ['cover', 'contexto', 'resultado', 'evidencia', 'cta'],
    templateSugerido: 'bold-numbers'
  },
  {
    id: 'oferta',
    label: 'Oferta',
    objetivo: 'venda',
    carroChefe: false,
    promessa: 'Apresenta produto, turma ou evento com prazo e condição.',
    limite: 'Use pouco: só em janela de venda, senão cansa a audiência.',
    exigePesquisa: false,
    pilares: [
      { id: 'oferta-clara', label: 'O que é', pergunta: 'Qual a oferta, em uma frase?' },
      { id: 'para-quem', label: 'Para quem', pergunta: 'Quem deveria comprar e quem não?' },
      { id: 'como-funciona', label: 'Como funciona', pergunta: 'O que a pessoa recebe, quando e como?' },
      { id: 'chamada', label: 'Chamada com prazo', pergunta: 'O que fazer agora e até quando?' }
    ],
    papeis: ['cover', 'oferta', 'para-quem', 'como-funciona', 'cta'],
    roteiro: ['cover', 'oferta', 'para-quem', 'como-funciona', 'cta'],
    templateSugerido: 'bold-numbers'
  }
];

// O padrão é o carro-chefe nº 1 da aula: quem abre o Studio sem escolher nada
// cai no tipo que mais alcança desconhecido.
export const TIPO_PADRAO = 'analise-tendencia';

export const TIPO_IDS = TIPOS.map((tipo) => tipo.id);

// Todos os papéis de slide existentes, para o schema do gerador editorial.
export const TODOS_OS_PAPEIS = [...new Set(TIPOS.flatMap((tipo) => tipo.papeis))];

export function tipoPorId(id) {
  if (typeof id !== 'string' || !id) return null;
  return TIPOS.find((tipo) => tipo.id === id) || null;
}

export function pilaresDoTipo(id) {
  return tipoPorId(id)?.pilares || [];
}

export function papeisDoTipo(id) {
  return tipoPorId(id)?.papeis || [];
}

export function exigePesquisa(id) {
  return Boolean(tipoPorId(id)?.exigePesquisa);
}

export function templateDoTipo(id) {
  return tipoPorId(id)?.templateSugerido || null;
}

// Agrupa para a tela de escolha. Carro-chefe primeiro dentro do grupo: é a
// recomendação da aula, e a ordem da tela é a recomendação na prática.
export function tiposPorObjetivo() {
  return OBJETIVOS.map((objetivo) => ({
    objetivo: objetivo.id,
    label: objetivo.label,
    resumo: objetivo.resumo,
    tipos: TIPOS
      .filter((tipo) => tipo.objetivo === objetivo.id)
      .sort((a, b) => Number(b.carroChefe) - Number(a.carroChefe))
  })).filter((grupo) => grupo.tipos.length);
}
