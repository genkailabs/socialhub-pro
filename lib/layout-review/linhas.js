// Regras de quebra de linha: viúva, órfã, linha final curta, quebra semântica,
// escadinha e medida. Puro, sem I/O e sem DOM.
//
// Todas leem a MESMA entrada: as linhas já quebradas. Quem as produz muda por
// contexto — no Studio vêm medidas do DOM (exatas), no Hub vêm de
// `quebrarLinhas` com o medidor estimado — mas a regra é uma só, e é isso que
// faz o mesmo defeito ter o mesmo nome nos dois lugares.
//
// Nada aqui é lei. Bringhurst escreve para a página impressa, com corpo de 10pt
// e coluna justificada; carrossel é manchete em caixa-alta lida em dois
// segundos num retângulo de 1080px. Os princípios valem, os NÚMEROS não —
// os limiares abaixo saíram de olhar o render, não do livro.

import { colarNaSeguinte, colarUltimasPalavras, quebrarLinhas } from "@/lib/layout-review/quebra";

export const SEVERIDADE = { CRITICO: "critico", ATENCAO: "atencao", SUGESTAO: "sugestao" };

/**
 * Palavras que não terminam linha: sozinhas no fim, deixam o leitor pendurado
 * esperando o complemento. "os 3 erros de / precificação" faz o olho parar duas
 * vezes na mesma frase.
 *
 * É a regra que mais aparece em manchete de carrossel e a que menos gente sabe
 * nomear — quem edita só sente que "ficou esquisito".
 */
const PALAVRAS_PRESAS = new Set([
  // artigos
  "o", "a", "os", "as", "um", "uma", "uns", "umas",
  // preposições e contrações
  "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "num", "numa",
  "por", "pelo", "pela", "pelos", "pelas", "para", "pra", "pro", "com", "sem",
  "sob", "sobre", "ante", "após", "até", "entre", "contra", "desde", "perante",
  "ao", "à", "aos", "às", "num", "dum", "duma",
  // conjunções
  "e", "ou", "mas", "que", "se", "nem", "pois", "como", "quando", "porque",
  "porém", "logo", "então", "nem",
  // possessivos e demonstrativos
  "seu", "sua", "seus", "suas", "meu", "minha", "meus", "minhas",
  "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
  "aquele", "aquela", "aqueles", "aquelas", "cujo", "cuja", "qual", "quais",
]);

/** Faixa de caracteres por linha. Corpo segue a régua clássica; manchete é
 *  outro bicho — ela é lida de relance, e linha longa em caixa-alta cansa
 *  muito antes dos 66 caracteres do livro. */
export const MEDIDA = {
  corpo: { min: 40, max: 78 },
  manchete: { min: 12, max: 42 },
};

/** Abaixo disto a última linha parece um resto esquecido, mesmo com 2 palavras. */
const FRACAO_LINHA_CURTA = 0.3;

/**
 * Linha do MEIO do bloco muito mais curta que as vizinhas: o flanco direito
 * afunda e volta, e o bloco perde a forma.
 *
 * Não é viúva — viúva é no fim. É defeito de bandeira, e o conserto é outro:
 * colar palavra não resolve, porque a linha curta veio de a seguinte não caber.
 * Quem conserta é a largura da caixa ou o corpo da fonte.
 */
const FRACAO_BANDEIRA = 0.45;

/** Hífens seguidos que viram degrau no flanco direito do bloco. */
const DEGRAUS_ESCADINHA = 3;

/**
 * Palavras que o LEITOR vê na linha.
 *
 * `linha.palavras` são os pedaços QUEBRÁVEIS: "novos clientes" colado por
 * espaço inquebrável é um pedaço só, porque não pode partir. Mas na tela são
 * duas palavras, e viúva é defeito de quem olha — contar token faria a própria
 * correção continuar sendo acusada de viúva depois de aplicada.
 */
function palavrasVisiveis(linha) {
  const t = String(linha?.texto ?? "").trim();
  return t ? t.split(/\s+/u).length : 0;
}

function normalizar(palavra) {
  return String(palavra ?? "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function problema(id, severidade, mensagem, extra = {}) {
  return { id, severidade, mensagem, ...extra };
}

/**
 * Prova a correção antes de oferecê-la.
 *
 * Colar com espaço inquebrável resolve a viúva ao custo de criar um bloco que
 * não pode mais quebrar. Se esse bloco for mais largo que a medida, a correção
 * troca a viúva por um estouro — defeito pior, e crítico. Sem essa prova o
 * revisor vira um botão que estraga a arte com ar de autoridade.
 *
 * Só dá para provar quando existe um medidor. Sem ele a correção continua
 * sendo oferecida, porque o texto colado é quase sempre melhor que a viúva —
 * mas quem chama sabe que não foi conferida.
 *
 * @param {(linhas:object[])=>boolean} [resolveu] o defeito sumiu de verdade?
 * @returns {boolean} `true` = pode oferecer
 */
function correcaoSustenta(textoNovo, { largura, medir }, resolveu) {
  if (typeof medir !== "function" || !largura) return true;
  const linhas = quebrarLinhas(textoNovo, { largura, medir });
  if (linhas.some((linha) => linha.estourou)) return false;
  return typeof resolveu === "function" ? resolveu(linhas) : true;
}

/**
 * Analisa um bloco de texto já quebrado.
 *
 * @param {object} entrada
 * @param {string} entrada.texto conteúdo original, para montar a correção
 * @param {{texto:string, palavras:string[], largura:number, forcada?:boolean, estourou?:boolean}[]} entrada.linhas
 * @param {number} entrada.largura medida da caixa, em px
 * @param {"manchete"|"corpo"} [entrada.papel]
 * @param {string} [entrada.rotulo] nome do elemento, para a mensagem
 * @param {(t:string)=>number} [entrada.medir] medidor da MESMA fonte que gerou
 *   as linhas. Opcional, mas com ele cada correção é conferida antes de virar
 *   botão na tela.
 * @returns {{id:string, severidade:string, mensagem:string, correcao?:object}[]}
 */
export function revisarLinhas({ texto, linhas, largura, papel = "corpo", rotulo = "Texto", medir }) {
  const problemas = [];
  if (!Array.isArray(linhas) || !linhas.length) return problemas;

  // Quem mede no DOM entrega o texto da linha e pouco mais. Completar aqui é
  // mais barato que obrigar cada chamador a montar o objeto inteiro — e evita
  // que o revisor derrube o editor por causa de um campo ausente.
  const uteis = linhas
    .filter((linha) => String(linha?.texto ?? "").trim().length > 0)
    .map((linha) => ({
      ...linha,
      palavras: Array.isArray(linha.palavras) && linha.palavras.length
        ? linha.palavras
        : String(linha.texto).trim().split(/\s+/u),
      largura: Number.isFinite(linha.largura) ? linha.largura : 0,
    }));
  if (!uteis.length) return problemas;

  const ultima = uteis[uteis.length - 1];
  const total = uteis.length;

  // 1. Palavra maior que a caixa — o render vai vazar ou partir no meio.
  //    Vem primeiro porque é o único defeito desta lista que impede a leitura.
  for (const linha of uteis) {
    if (linha.estourou) {
      problemas.push(problema(
        "palavra_estourada",
        SEVERIDADE.CRITICO,
        `"${linha.palavras[0]}" é mais larga que a caixa de "${rotulo}".`,
        { correcao: { tipo: "reduzir_corpo" } },
      ));
      break;
    }
  }

  // 2. Viúva: a última linha ficou com uma palavra só.
  //    Fora quando a quebra foi escolha de quem escreveu — `forcada` (terminou
  //    em `\n`) ou `inicioForcado` (começou depois de um). "Título\nsubtítulo"
  //    tem uma palavra na última linha e não tem defeito nenhum.
  const escolhida = (linha) => Boolean(linha.forcada || linha.inicioForcado);

  /** A correção de viúva e de linha curta é a mesma; a prova também. */
  const correcaoDoFim = (descricao) => {
    const proposta = colarUltimasPalavras(texto);
    // A prova é dupla: nada pode vazar E a última linha precisa terminar com
    // mais de uma palavra à vista. Sem a segunda, o par colado desceria inteiro
    // para uma linha nova e o bloco continuaria terminando num toco.
    const some = (linhas) => palavrasVisiveis(linhas[linhas.length - 1]) > 1;
    if (proposta !== texto && correcaoSustenta(proposta, { largura, medir }, some)) {
      return { tipo: "colar_ultimas", texto: proposta, descricao };
    }
    // O par colado não cabe na medida: prender as duas palavras trocaria a
    // viúva por um bloco que vaza. Sobra mexer na caixa ou no corpo.
    return {
      tipo: "alargar_ou_reduzir",
      descricao: "As duas últimas palavras juntas não cabem na medida: alargar a caixa ou reduzir o corpo.",
    };
  };

  if (total > 1 && palavrasVisiveis(ultima) === 1 && !escolhida(ultima) && !ultima.estourou) {
    problemas.push(problema(
      "viuva",
      SEVERIDADE.ATENCAO,
      `Viúva em "${rotulo}": "${ultima.texto.trim()}" ficou sozinha na última linha.`,
      { correcao: correcaoDoFim("Prender a última palavra na anterior, para descerem juntas.") },
    ));
  }

  // 3. Linha final curta: duas palavras, mas o bloco termina num toco.
  //    Só vale quando não é viúva — senão o mesmo defeito sai duas vezes.
  else if (total > 1 && !escolhida(ultima) && largura > 0 && ultima.largura < largura * FRACAO_LINHA_CURTA) {
    problemas.push(problema(
      "linha_final_curta",
      SEVERIDADE.ATENCAO,
      `Última linha de "${rotulo}" ocupa ${Math.round((ultima.largura / largura) * 100)}% da medida.`,
      { correcao: correcaoDoFim("Puxar mais uma palavra para a última linha.") },
    ));
  }

  // 4. Quebra semântica: linha terminando em palavra que rege a seguinte.
  //    A última linha do bloco está fora — ela não tem seguinte.
  let percorridas = 0;
  for (let i = 0; i < uteis.length - 1; i++) {
    const linha = uteis[i];
    const fim = normalizar(linha.palavras[linha.palavras.length - 1]);
    const indiceGlobal = percorridas + linha.palavras.length - 1;
    percorridas += linha.palavras.length;
    if (linha.forcada) continue;
    // Número solto no fim da linha separa a conta do que ela conta:
    // "os 3 / erros" perde a força que a manchete tinha.
    const numeroSolto = /^\d+$/.test(fim);
    if (!PALAVRAS_PRESAS.has(fim) && !numeroSolto) continue;
    const proposta = colarNaSeguinte(texto, indiceGlobal);
    const cabe = proposta !== texto && correcaoSustenta(proposta, { largura, medir });
    problemas.push(problema(
      "quebra_semantica",
      papel === "manchete" ? SEVERIDADE.ATENCAO : SEVERIDADE.SUGESTAO,
      `Quebra ruim em "${rotulo}": a linha ${i + 1} termina em "${linha.palavras[linha.palavras.length - 1]}".`,
      {
        correcao: cabe
          ? {
              tipo: "colar_seguinte",
              texto: proposta,
              descricao: "Prender a palavra na seguinte, para não terminarem a linha separadas.",
            }
          : {
              tipo: "alargar_ou_reduzir",
              descricao: "O par não cabe na medida: alargar a caixa ou reduzir o corpo.",
            },
      },
    ));
    break; // uma por bloco: consertada a primeira, as outras mudam de lugar
  }

  // 5. Bandeira irregular: linha do meio muito mais curta que a mais larga.
  //    "COMO USAR IA / PARA VENDER / MAIS / NO INSTAGRAM" — o "MAIS" sozinho
  //    no meio afunda o flanco. Colar palavra não conserta: ele está ali porque
  //    a linha seguinte não coube. Quem conserta é a caixa ou o corpo.
  const maisLarga = uteis.reduce((maior, linha) => Math.max(maior, linha.largura), 0);
  if (total > 2 && maisLarga > 0) {
    for (let i = 0; i < uteis.length - 1; i++) {
      const linha = uteis[i];
      if (escolhida(linha) || linha.largura >= maisLarga * FRACAO_BANDEIRA) continue;
      problemas.push(problema(
        "bandeira_irregular",
        SEVERIDADE.ATENCAO,
        `Linha ${i + 1} de "${rotulo}" tem ${Math.round((linha.largura / maisLarga) * 100)}% da linha mais larga e afunda o bloco.`,
        {
          correcao: {
            tipo: "alargar_ou_reduzir",
            descricao: "A linha seguinte não coube: alargar a caixa ou reduzir o corpo até o bloco fechar reto.",
          },
          linha: i,
        },
      ));
      break;
    }
  }

  // 6. Hífen em manchete. Título não hifeniza: "comuni-/cação" faz o leitor
  //    remontar a palavra, e manchete existe para ser lida de relance.
  if (papel === "manchete") {
    const comHifen = uteis.findIndex((linha, i) => i < uteis.length - 1 && /[-–]$/.test(linha.texto.trim()));
    if (comHifen >= 0) {
      problemas.push(problema(
        "hifen_em_manchete",
        SEVERIDADE.ATENCAO,
        `"${rotulo}" parte palavra com hífen na linha ${comHifen + 1}; manchete não hifeniza.`,
        {
          correcao: {
            tipo: "alargar_ou_reduzir",
            descricao: "Desligar a hifenização, ou dar largura à caixa até a palavra caber inteira.",
          },
          linha: comHifen,
        },
      ));
    }
  }

  // 7. Escadinha: três ou mais linhas seguidas terminando em hífen.
  let seguidas = 0;
  for (const linha of uteis) {
    seguidas = /[-–]$/.test(linha.texto.trim()) ? seguidas + 1 : 0;
    if (seguidas >= DEGRAUS_ESCADINHA) {
      problemas.push(problema(
        "escadinha",
        SEVERIDADE.ATENCAO,
        `"${rotulo}" tem ${seguidas} linhas seguidas terminando em hífen.`,
      ));
      break;
    }
  }

  // 8. Medida da coluna. É sugestão, não erro: manchete curta de propósito
  //    existe, e às vezes é justamente o que segura o dedo.
  const faixa = MEDIDA[papel] ?? MEDIDA.corpo;
  const media = uteis.reduce((soma, linha) => soma + linha.texto.length, 0) / total;
  if (total > 1 && media > faixa.max) {
    problemas.push(problema(
      "medida_longa",
      SEVERIDADE.SUGESTAO,
      `"${rotulo}" tem ${Math.round(media)} caracteres por linha; acima de ${faixa.max} o olho perde a volta.`,
    ));
  } else if (total > 2 && media < faixa.min) {
    problemas.push(problema(
      "medida_curta",
      SEVERIDADE.SUGESTAO,
      `"${rotulo}" tem ${Math.round(media)} caracteres por linha; abaixo de ${faixa.min} a leitura fica picada.`,
    ));
  }

  return problemas;
}
