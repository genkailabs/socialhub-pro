// Medida de texto: quanto uma sequência de caracteres ocupa numa linha.
// Puro, sem I/O e sem DOM.
//
// Quem mede DE VERDADE é quem desenha — o navegador com `measureText`, ou o
// render headless com a fonte carregada. Este módulo existe para os dois casos
// em que não dá para desenhar antes de decidir:
//
//   1. o Hub escolhe o corpo da fonte ANTES de montar a peça;
//   2. o teste roda em Node, sem canvas.
//
// A conta antiga (`lib/layouts/build.js`) usava UMA largura média para todo
// caractere — 0.52 do corpo. Isso erra em dobro nos dois extremos: "MÍNIMO" e
// "illili" têm o mesmo número de letras e larguras muito diferentes. Como as
// regras de viúva e de quebra dependem de saber ONDE a linha termina, o erro
// da média deslocava a quebra e inventava defeito onde não havia.

/**
 * Largura de cada caractere em fração do corpo da fonte, para uma grotesca
 * comum (Inter, Helvetica, Archivo e parentes). Não é a métrica exata de
 * nenhuma delas — é a faixa em que todas caem.
 */
const LARGURA = new Map();

function registrar(caracteres, largura) {
  for (const c of caracteres) LARGURA.set(c, largura);
}

registrar("  ", 0.26);
registrar("iíìjlIÍ|!.,;:'`’", 0.25);
registrar("ftr()[]{}/\\-–—", 0.34);
registrar("szcçxkvyJ", 0.5);
registrar("abdeéêghnñopquúâãõà", 0.56);
registrar("0123456789", 0.56);
registrar("ABCDEFGHKLNOPQRSTUVXYZÁÂÃÀÉÊÍÓÔÕÚÇ", 0.66);
registrar("mwMW—", 0.86);
registrar("@%&", 0.85);

/** Largura de um caractere que não está na tabela. */
const PADRAO = 0.56;

/** O traço mais grosso do peso alto também alarga o glifo. */
function fatorPeso(weight) {
  const w = Number(weight) || 400;
  if (w >= 800) return 1.09;
  if (w >= 600) return 1.05;
  if (w <= 300) return 0.97;
  return 1;
}

/**
 * Medidor de fallback: devolve `(texto) => largura em px`.
 *
 * `letterSpacing` entra por caractere, não por palavra — é assim que o CSS
 * aplica, e é o que fazia o selo em caixa-alta vazar da pílula quando a conta
 * antiga o ignorava.
 *
 * @param {{fontSize:number, weight?:number, letterSpacing?:number, transform?:string}} estilo
 * @returns {(texto:string)=>number}
 */
export function medidorEstimado({ fontSize, weight = 400, letterSpacing = 0, transform } = {}) {
  const corpo = Number(fontSize) || 0;
  const peso = fatorPeso(weight);
  const espaco = Number(letterSpacing) || 0;
  return (texto) => {
    const s = transform === "upper" ? String(texto ?? "").toLocaleUpperCase("pt-BR") : String(texto ?? "");
    let total = 0;
    for (const c of s) total += (LARGURA.get(c) ?? PADRAO) * corpo * peso + espaco;
    return total;
  };
}

/**
 * Medidor exato quando existe um contexto de canvas — navegador ou render
 * headless. Preferir SEMPRE este ao estimado.
 *
 * @param {CanvasRenderingContext2D} ctx com `font` já aplicado
 * @param {number} [letterSpacing]
 */
export function medidorCanvas(ctx, letterSpacing = 0) {
  return (texto) => {
    const s = String(texto ?? "");
    return ctx.measureText(s).width + s.length * (Number(letterSpacing) || 0);
  };
}

/**
 * Quantos caracteres cabem na medida, em média. É a régua clássica de
 * legibilidade (Bringhurst fala em 45–75 para corpo de texto); serve para
 * avaliar a MEDIDA da coluna, não para quebrar linha.
 */
export function caracteresPorLinha(larguraCaixa, { fontSize, weight = 400, letterSpacing = 0 } = {}) {
  const medir = medidorEstimado({ fontSize, weight, letterSpacing });
  const larguraMedia = medir("aeioursntm") / 10;
  if (!larguraMedia) return 0;
  return Math.round(Number(larguraCaixa) / larguraMedia);
}
