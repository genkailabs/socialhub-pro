// Revisão de diagramação — porta de entrada do módulo. Puro, sem I/O e sem DOM.
//
// Um núcleo, dois consumidores:
//
//   • o Hub chama na GERAÇÃO, com as linhas estimadas por `quebrarLinhas` e o
//     medidor de fallback — porque ali ainda não existe pixel nenhum;
//   • o Studio chama na EDIÇÃO, com as linhas medidas do DOM — porque ali o
//     texto já quebrou de verdade e estimativa seria mentira.
//
// As regras são as mesmas nos dois casos. É isso que faz o mesmo defeito ter o
// mesmo nome, a mesma severidade e a mesma nota nos dois lugares.

import { revisarEspacamento, revisarEspacamentoDoCarrossel } from "@/lib/layout-review/espacamento";
import { revisarGrade, revisarGradeDoCarrossel } from "@/lib/layout-review/grade";
import { revisarHierarquia, revisarHierarquiaDoCarrossel } from "@/lib/layout-review/hierarquia";
import { revisarLinhas, SEVERIDADE } from "@/lib/layout-review/linhas";
import { medidorEstimado } from "@/lib/layout-review/medida";
import { quebrarLinhas } from "@/lib/layout-review/quebra";
import { calcularNota, veredito } from "@/lib/layout-review/nota";

export { SEVERIDADE } from "@/lib/layout-review/linhas";
export { CATEGORIA, ROTULO_CATEGORIA, calcularNota, veredito } from "@/lib/layout-review/nota";
export { medidorEstimado, medidorCanvas, caracteresPorLinha } from "@/lib/layout-review/medida";
export { quebrarLinhas, colarUltimasPalavras, colarNaSeguinte, NBSP } from "@/lib/layout-review/quebra";

/**
 * @typedef {object} BlocoRevisao
 * @property {string} id
 * @property {"manchete"|"apoio"|"corpo"|"cta"|"selo"|"legenda"} papel
 * @property {string} texto
 * @property {string} [rotulo] nome que aparece na mensagem
 * @property {{x:number,y:number,w:number,h:number}} [caixa] em % do slide
 * @property {number} [fontSize] px no espaço de 1080
 * @property {number} [peso]
 * @property {string} [fonte]
 * @property {number} [entrelinha] multiplicador
 * @property {number} [tracking] px
 * @property {"none"|"upper"|"lower"} [transform]
 * @property {boolean} [decorativo] painel, véu, divisor — fica fora da conta
 * @property {boolean} [sangra] encosta na borda de propósito
 * @property {object[]} [linhas] linhas JÁ medidas; quando vêm, valem mais que
 *   qualquer estimativa e o módulo não recalcula nada
 */

/** Papéis que a régua de medida trata como manchete. */
const PAPEL_MANCHETE = new Set(["manchete", "selo"]);

/**
 * Garante que cada bloco tem linhas para as regras lerem.
 *
 * Quem passou `linhas` mandou a verdade — o DOM já quebrou o texto. Quem não
 * passou recebe a estimativa, que é o melhor possível antes de desenhar.
 */
function comLinhas(bloco, larguraSlide) {
  if (Array.isArray(bloco.linhas) && bloco.linhas.length) return bloco;
  const largura = bloco.caixa ? (bloco.caixa.w / 100) * larguraSlide : 0;
  if (!largura || !bloco.fontSize) return { ...bloco, linhas: [] };
  const medir = medidorEstimado({
    fontSize: bloco.fontSize,
    weight: bloco.peso,
    letterSpacing: bloco.tracking,
    transform: bloco.transform,
  });
  return { ...bloco, linhas: quebrarLinhas(bloco.texto, { largura, medir }), _medir: medir, _largura: largura };
}

/**
 * @typedef {object} Problema
 * @property {string} id
 * @property {"critico"|"atencao"|"sugestao"} severidade
 * @property {string} mensagem
 * @property {string} [blocoId]
 * @property {number} [slide]
 * @property {{tipo:string, descricao?:string, texto?:string, valor?:number, margem?:number, fontSizeSugerido?:number}} [correcao]
 */

/**
 * @typedef {object} Revisao
 * @property {number} nota
 * @property {Record<string,number>} categorias
 * @property {Problema[]} problemas
 * @property {{id:string, categoria:string, pontos:number, mensagem:string}[]} descontos
 * @property {Record<string,number>} porSeveridade
 * @property {boolean} [limitadoPorCritico]
 */

/**
 * Revisa UM slide.
 *
 * @param {{blocos:BlocoRevisao[], largura?:number, altura?:number, indice?:number, areaSegura?:number}} slide
 * @returns {Revisao & {indice:number}}
 */
export function revisarSlide({ blocos = [], largura = 1080, altura = 1350, indice = 0, areaSegura } = {}) {
  const preparados = blocos.map((bloco) => comLinhas(bloco, largura));
  const problemas = [];

  for (const bloco of preparados) {
    if (!String(bloco.texto ?? "").trim()) continue;
    const larguraCaixa = bloco._largura ?? (bloco.caixa ? (bloco.caixa.w / 100) * largura : 0);
    problemas.push(
      ...revisarLinhas({
        texto: bloco.texto,
        linhas: bloco.linhas,
        largura: larguraCaixa,
        papel: PAPEL_MANCHETE.has(bloco.papel) ? "manchete" : "corpo",
        rotulo: bloco.rotulo || bloco.papel || "Texto",
        medir: bloco._medir,
      }).map((problema) => ({ ...problema, blocoId: problema.blocoId ?? bloco.id })),
    );
  }

  problemas.push(...revisarHierarquia({ blocos: preparados }));
  problemas.push(...revisarEspacamento({ blocos: preparados }));
  problemas.push(...revisarGrade({ blocos: preparados, areaSegura }));

  const ordenados = ordenarPorGravidade(problemas).map((p) => ({ ...p, slide: indice }));
  const { nota, categorias, descontos, porSeveridade, limitadoPorCritico } = calcularNota(ordenados);
  return { indice, problemas: ordenados, nota, categorias, descontos, porSeveridade, limitadoPorCritico };
}

/**
 * Revisa o carrossel inteiro: cada slide, mais o que só existe no conjunto.
 *
 * @param {{blocos:BlocoRevisao[]}[]} slides
 * @param {{largura?:number, altura?:number, areaSegura?:number}} [opcoes]
 */
export function revisarCarrossel(slides = [], { largura = 1080, altura = 1350, areaSegura } = {}) {
  const porSlide = slides.map((slide, indice) =>
    revisarSlide({ ...slide, largura, altura: slide.altura ?? altura, indice, areaSegura }),
  );

  const doConjunto = ordenarPorGravidade([
    ...revisarGradeDoCarrossel(slides),
    ...revisarHierarquiaDoCarrossel(slides),
    ...revisarEspacamentoDoCarrossel(slides),
  ]);

  const todos = [...porSlide.flatMap((s) => s.problemas), ...doConjunto];
  const { nota, categorias, descontos, porSeveridade } = calcularNota(todos);

  return {
    nota,
    veredito: veredito(nota),
    categorias,
    descontos,
    porSeveridade,
    slides: porSlide,
    conjunto: doConjunto,
    problemas: todos,
  };
}

const ORDEM = { [SEVERIDADE.CRITICO]: 0, [SEVERIDADE.ATENCAO]: 1, [SEVERIDADE.SUGESTAO]: 2 };

/** Crítico primeiro: quem tem trinta segundos precisa ver o que impede a leitura. */
export function ordenarPorGravidade(problemas = []) {
  return [...problemas].sort((a, b) => (ORDEM[a.severidade] ?? 3) - (ORDEM[b.severidade] ?? 3));
}

/**
 * Problemas que têm conserto determinístico, na ordem do §8 do PRD: primeiro o
 * que não toca no texto nem no layout, por último o que mexe no corpo.
 *
 * Ordem importa porque uma correção muda a quebra e pode apagar o problema
 * seguinte — aplicar tudo de uma vez às cegas conserta a mesma coisa duas vezes.
 */
export const ORDEM_DE_CORRECAO = [
  "colar_ultimas",
  "colar_seguinte",
  "alinhar",
  "trazer_para_dentro",
  "unificar_margem",
  "abrir_escala",
  "reduzir_corpo",
  "ajustar_entrelinha",
  "ajustar_tracking",
];

/** Só o que dá para consertar sozinho, já na ordem certa. */
export function correcoesAutomaticas(problemas = []) {
  return problemas
    .filter((p) => p.correcao && ORDEM_DE_CORRECAO.includes(p.correcao.tipo))
    .sort((a, b) => ORDEM_DE_CORRECAO.indexOf(a.correcao.tipo) - ORDEM_DE_CORRECAO.indexOf(b.correcao.tipo));
}
