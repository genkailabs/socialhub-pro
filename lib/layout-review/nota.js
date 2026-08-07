// Nota de diagramação. Puro, sem I/O e sem DOM.
//
// Nota é resumo, não juízo. Um "86/100" que ninguém sabe de onde veio é número
// bonito que não conserta arte nenhuma — por isso cada ponto perdido aqui
// aponta para o problema que o tirou, e `descontos` sai junto da nota.
//
// Os pesos são arbitrários, e assumidamente. Não existe medida objetiva de
// "quanto uma viúva estraga um carrossel"; existe uma ordem de gravidade que
// qualquer diretor de arte confirmaria, e é ela que está codificada.

import { SEVERIDADE } from "@/lib/layout-review/linhas";

/** Quanto cada nível de severidade tira da categoria. */
const PESO = {
  [SEVERIDADE.CRITICO]: 22,
  [SEVERIDADE.ATENCAO]: 9,
  [SEVERIDADE.SUGESTAO]: 3,
};

/**
 * A qual categoria cada problema pertence. Quem inventar regra nova precisa
 * registrar aqui — o teste de contrato quebra se ficar de fora, e problema sem
 * categoria seria problema que não afeta a nota.
 */
export const CATEGORIA = {
  // quebras de linha
  viuva: "quebras",
  linha_final_curta: "quebras",
  quebra_semantica: "quebras",
  bandeira_irregular: "quebras",
  hifen_em_manchete: "quebras",
  escadinha: "quebras",
  // tipografia
  palavra_estourada: "tipografia",
  medida_longa: "tipografia",
  medida_curta: "tipografia",
  texto_cortado: "tipografia",
  contraste_baixo: "tipografia",
  // hierarquia
  hierarquia_fraca: "hierarquia",
  sem_manchete: "hierarquia",
  cta_gritando: "hierarquia",
  excesso_de_fontes: "hierarquia",
  ordem_invertida: "hierarquia",
  // espaçamento
  entrelinha_apertada: "espacamento",
  entrelinha_solta: "espacamento",
  tracking_exagerado: "espacamento",
  tracking_apertado: "espacamento",
  caixa_alta_sem_respiro: "espacamento",
  blocos_colados: "espacamento",
  // grade
  fora_da_area_segura: "grade",
  margem_destoante: "grade",
  elemento_solto: "grade",
  quase_alinhado: "grade",
  sobreposicao: "grade",
  // consistência (só existe no carrossel inteiro)
  margens_inconstantes: "consistencia",
  manchete_inconstante: "consistencia",
  entrelinha_inconstante: "consistencia",
  slides_inconsistentes: "consistencia",
};

export const ROTULO_CATEGORIA = {
  grade: "Grid",
  tipografia: "Tipografia",
  hierarquia: "Hierarquia",
  espacamento: "Espaçamento",
  quebras: "Quebras de linha",
  consistencia: "Consistência",
};

/** Peso de cada categoria na nota final. Soma 1. */
const PESO_CATEGORIA = {
  grade: 0.2,
  tipografia: 0.2,
  hierarquia: 0.18,
  espacamento: 0.15,
  quebras: 0.17,
  consistencia: 0.1,
};

const CATEGORIAS = Object.keys(PESO_CATEGORIA);

/**
 * Teto da nota quando existe qualquer problema CRÍTICO.
 *
 * Sem ele a média mente: uma peça com texto vazando e manchete cortada pela
 * borda tirava 80, porque o estrago se concentrava numa categoria só e as
 * outras cinco continuavam em 100. Crítico é, por definição do §7, o que
 * prejudica a leitura — e nada que prejudica a leitura está "publicável".
 *
 * O valor fica logo abaixo da faixa de `veredito` que autoriza publicar.
 */
const TETO_COM_CRITICO = 54;

function limitar(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * @param {{id:string, severidade:string, mensagem?:string}[]} problemas
 * @returns {{
 *   nota:number,
 *   categorias:Record<string,number>,
 *   descontos:{id:string, categoria:string, pontos:number, mensagem:string}[],
 *   porSeveridade:Record<string,number>,
 *   limitadoPorCritico:boolean
 * }}
 */
export function calcularNota(problemas = []) {
  const categorias = Object.fromEntries(CATEGORIAS.map((c) => [c, 100]));
  const descontos = [];
  const porSeveridade = { critico: 0, atencao: 0, sugestao: 0 };

  for (const problema of problemas) {
    const categoria = CATEGORIA[problema.id];
    const peso = PESO[problema.severidade] ?? PESO[SEVERIDADE.SUGESTAO];
    porSeveridade[problema.severidade] = (porSeveridade[problema.severidade] ?? 0) + 1;
    // Problema sem categoria registrada não some da lista: ele aparece na tela
    // e fica de fora da nota, o que é honesto — inventar categoria mentiria.
    if (!categoria) continue;
    categorias[categoria] = Math.max(0, categorias[categoria] - peso);
    descontos.push({ id: problema.id, categoria, pontos: peso, mensagem: problema.mensagem });
  }

  const media = CATEGORIAS.reduce((soma, c) => soma + categorias[c] * PESO_CATEGORIA[c], 0);
  const nota = porSeveridade.critico > 0 ? Math.min(media, TETO_COM_CRITICO) : media;

  return {
    nota: limitar(nota),
    /** o teto do crítico entrou em ação? a tela precisa saber para explicar. */
    limitadoPorCritico: porSeveridade.critico > 0 && media > TETO_COM_CRITICO,
    categorias: Object.fromEntries(CATEGORIAS.map((c) => [c, limitar(categorias[c])])),
    descontos,
    porSeveridade,
  };
}

/** Uma frase que resume a nota, para quem não vai ler a lista. */
export function veredito(nota) {
  if (nota >= 90) return "Pronto para publicar.";
  if (nota >= 75) return "Publicável; há acabamento a fazer.";
  if (nota >= 55) return "Precisa de revisão antes de ir ao ar.";
  return "A diagramação está atrapalhando a leitura.";
}
