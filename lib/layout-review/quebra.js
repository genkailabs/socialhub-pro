// Quebra de linha: onde cada linha do bloco termina de verdade.
// Puro, sem I/O e sem DOM.
//
// Este é o alicerce da revisão de diagramação. Viúva, órfã, linha final curta,
// escadinha e quebra semântica são todas perguntas sobre O FIM DA LINHA — e o
// motor antigo não sabia responder nenhuma, porque contava caracteres pela
// média (`estimateLines` em lib/layouts/build.js) e nunca soube o que é palavra.
//
// O algoritmo é o mesmo do navegador (guloso, da esquerda para a direita, sem
// otimização global à la TeX): acumula palavras enquanto couberem, e desce a
// próxima quando estourar. Copiar esse comportamento é obrigatório — não
// adianta o revisor apontar uma viúva que o render não vai produzir.

/** Espaço inquebrável: cola duas palavras para que viajem juntas. */
export const NBSP = " ";

/** Divide em pedaços quebráveis. O NBSP NÃO separa: é esse o ponto dele. */
function palavrasDe(linha) {
  return String(linha)
    .split(/[ \t]+/)
    .filter((p) => p.length > 0);
}

/**
 * Quebra o texto na largura dada, como o navegador quebraria.
 *
 * @param {string} texto conteúdo do bloco; `\n` é quebra forçada
 * @param {{largura:number, medir:(t:string)=>number}} opcoes
 * @returns {{texto:string, palavras:string[], largura:number, forcada:boolean, inicioForcado:boolean, estourou:boolean}[]}
 *   `forcada` = a linha terminou por `\n`, não por falta de espaço.
 *   `inicioForcado` = a linha começou depois de um `\n`.
 *
 *   Os dois existem porque o revisor não discute escolha de quem escreve. Uma
 *   palavra sozinha na última linha é viúva se o texto transbordou até ali; se
 *   ela veio de um `\n`, é decisão — e acusar decisão de defeito faz a pessoa
 *   desligar o revisor inteiro.
 *
 *   `estourou` = uma palavra sozinha é mais larga que a caixa.
 */
export function quebrarLinhas(texto, { largura, medir }) {
  const caixa = Number(largura);
  if (!caixa || typeof medir !== "function") return [];

  const linhas = [];
  const paragrafos = String(texto ?? "").split("\n");

  paragrafos.forEach((paragrafo, indice) => {
    const palavras = palavrasDe(paragrafo);
    const ultimoParagrafo = indice === paragrafos.length - 1;
    const primeiroParagrafo = indice === 0;
    let primeiraDoParagrafo = true;

    if (!palavras.length) {
      linhas.push({
        texto: "", palavras: [], largura: 0,
        forcada: !ultimoParagrafo, inicioForcado: !primeiroParagrafo, estourou: false,
      });
      return;
    }

    let atual = [];
    const fechar = (forcada) => {
      const t = atual.join(" ");
      linhas.push({
        texto: t,
        palavras: [...atual],
        largura: medir(t),
        forcada,
        inicioForcado: primeiraDoParagrafo && !primeiroParagrafo,
        estourou: atual.length === 1 && medir(t) > caixa,
      });
      primeiraDoParagrafo = false;
      atual = [];
    };

    for (const palavra of palavras) {
      if (!atual.length) {
        atual.push(palavra);
        // Palavra sozinha maior que a caixa: o navegador a deixa vazar (ou
        // parte, com `word-break`). Nos dois casos ela ocupa a linha inteira,
        // então fechar aqui reproduz o render — e `estourou` avisa o revisor.
        if (medir(palavra) > caixa) fechar(false);
        continue;
      }
      const tentativa = `${atual.join(" ")} ${palavra}`;
      if (medir(tentativa) <= caixa) atual.push(palavra);
      else fechar(false);
      if (!atual.length) atual.push(palavra);
    }
    if (atual.length) fechar(!ultimoParagrafo);
  });

  return linhas;
}

/**
 * Cola as duas últimas palavras com espaço inquebrável.
 *
 * É a correção canônica da viúva: a última palavra deixa de poder descer
 * sozinha, então ela arrasta a vizinha para baixo junto. Não muda uma letra do
 * texto — só proíbe uma quebra. Por isso vem ANTES de mexer em corpo, caixa ou
 * conteúdo na ordem de correção do PRD.
 */
export function colarUltimasPalavras(texto) {
  const s = String(texto ?? "");
  // Só o último parágrafo interessa: é onde a última linha nasce.
  const corte = s.lastIndexOf("\n");
  const cabeca = corte >= 0 ? s.slice(0, corte + 1) : "";
  const cauda = corte >= 0 ? s.slice(corte + 1) : s;

  const ultimo = cauda.search(/[ \t]+(?=[^ \t]+[ \t]*$)/);
  if (ultimo < 0) return s;
  const fim = cauda.slice(ultimo).replace(/^[ \t]+/, "");
  return `${cabeca}${cauda.slice(0, ultimo)}${NBSP}${fim}`;
}

/**
 * Cola uma palavra específica na seguinte. Serve à quebra semântica: "de",
 * "para" e "os" não terminam linha — descem junto do substantivo que regem.
 *
 * @param {string} texto
 * @param {number} indice posição da palavra que não pode ficar no fim da linha
 */
export function colarNaSeguinte(texto, indice) {
  const s = String(texto ?? "");
  let vista = -1;
  // Percorre preservando os separadores, para não normalizar o texto inteiro.
  return s.replace(/([^\s]+)(\s+)/g, (todo, palavra, separador) => {
    vista += 1;
    if (vista !== indice) return todo;
    if (separador.includes("\n")) return todo; // quebra escrita à mão: respeitar
    return `${palavra}${NBSP}`;
  });
}
