// Questionário de posicionamento do mascote. Puro, sem I/O.
//
// Antes daqui o Hub perguntava uma coisa só — o objetivo — e deduzia o resto
// lendo o Instagram. Saía sempre a mesma casca: nicho, público, tom. Nicho,
// ICP, dor e tese não se leem num feed; eles se perguntam.
//
// A ordem é a do método BlueprintPRO (competência → grupo com dor → território
// → nicho → ICP → dor → tese), e o afunilamento é o coração dele: resposta
// genérica volta com repergunta, porque posicionamento é especificidade. Quem
// responde "todo mundo" não tem posicionamento, tem esperança.

export const RESPOSTA_MINIMA = 14;

// Palavras que denunciam o genérico. A lista é curta de propósito: pega o
// vício comum sem transformar a tela num juiz chato que reprova resposta boa.
const GENERICOS = [
  'todo mundo', 'todos', 'qualquer pessoa', 'qualquer um', 'geral',
  'empreendedores em geral', 'pessoas', 'quem quiser', 'diversos', 'vários nichos'
];

export const PERGUNTAS_POSICIONAMENTO = [
  {
    id: 'competencia',
    campo: 'competencia',
    pergunta: 'No que você é bom de verdade?',
    ajuda: 'A competência que entrega resultado, não a lista do seu currículo. Uma coisa só.',
    exemplo: 'Ex.: montar atendimento por WhatsApp que não perde cliente no meio da conversa'
  },
  {
    id: 'grupo',
    campo: 'grupo',
    pergunta: 'Quem sente a dor que você resolve?',
    ajuda: 'Um grupo que dá para reconhecer na rua. Se cabe todo mundo, não cabe ninguém.',
    exemplo: 'Ex.: donos de ótica no DF que atendem no balcão e respondem WhatsApp entre um cliente e outro'
  },
  {
    id: 'territorio',
    campo: 'territorio',
    pergunta: 'Qual assunto você quer que seja seu?',
    ajuda: 'O território é o tema que você repete até virar referência nele.',
    exemplo: 'Ex.: atendimento que vende, e não "marketing digital"'
  },
  {
    id: 'nicho',
    campo: 'nicho',
    pergunta: 'Em que nicho isso acontece?',
    ajuda: 'Mercado, região ou momento: onde essa dor dói mais e paga melhor.',
    exemplo: 'Ex.: varejo de óptica em cidades médias do Centro-Oeste'
  },
  {
    id: 'icp',
    campo: 'icp',
    pergunta: 'Como é o seu cliente ideal, o de verdade?',
    ajuda: 'Aquele que fecha rápido, paga bem e volta. Tamanho, rotina, quem decide.',
    exemplo: 'Ex.: ótica com duas lojas, dona no caixa, sem gente de marketing, fatura R$ 80 mil/mês'
  },
  {
    id: 'dor',
    campo: 'dor',
    pergunta: 'Qual é a dor, com as palavras dele?',
    ajuda: 'O que essa pessoa fala em voz alta quando reclama — não o diagnóstico técnico.',
    exemplo: 'Ex.: "mandam mensagem de madrugada e quando eu respondo já compraram em outro lugar"'
  },
  {
    id: 'tese',
    campo: 'tese',
    pergunta: 'Qual a sua tese — aquilo que você defende e quase ninguém no seu mercado diz?',
    ajuda: 'A Big Ideia: uma frase que você sustenta com prova e repete até colar.',
    exemplo: 'Ex.: ótica não perde venda por preço, perde por demora na resposta'
  }
];

export function perguntaPorId(id) {
  if (typeof id !== 'string' || !id) return null;
  return PERGUNTAS_POSICIONAMENTO.find((pergunta) => pergunta.id === id) || null;
}

/** Primeira pergunta ainda sem resposta. Null quando o questionário acabou. */
export function proximaPergunta(respostas = {}) {
  return PERGUNTAS_POSICIONAMENTO.find((pergunta) => !String(respostas?.[pergunta.id] || '').trim()) || null;
}

/**
 * Afunilamento: diz se a resposta serve e, quando não serve, por quê.
 *
 * Não é validação de formulário — é o guia cortando o raso antes de virar
 * posicionamento. Pergunta desconhecida passa direto: travar o fluxo por causa
 * de um id novo seria pior do que aceitar.
 */
export function avaliarResposta(id, valor) {
  if (!perguntaPorId(id)) return { ok: true, motivo: '' };
  const texto = String(valor || '').trim();

  if (texto.length < RESPOSTA_MINIMA) {
    return { ok: false, motivo: 'Muito curto para ser específico. Escreva como você explicaria para um amigo.' };
  }

  const minusculo = texto.toLowerCase();
  const generico = GENERICOS.find((termo) => minusculo.includes(termo));
  if (generico) {
    return { ok: false, motivo: `"${generico}" não é um grupo — é a ausência de um. Diga quem, onde e em que situação.` };
  }

  return { ok: true, motivo: '' };
}

/** Respostas → contexto rotulado para o prompt do Brand DNA. */
export function respostasParaManual(respostas = {}) {
  const manual = {};
  for (const [chave, valor] of Object.entries(respostas || {})) {
    const texto = String(valor || '').trim();
    if (texto) manual[chave] = texto;
  }
  return manual;
}
