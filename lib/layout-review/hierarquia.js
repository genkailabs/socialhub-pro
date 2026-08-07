// Hierarquia tipográfica: o olho precisa saber o que ler primeiro.
// Puro, sem I/O e sem DOM.
//
// O defeito que o guia chama de "hierarquia fraca" quase nunca é falta de
// capricho — é o título e o corpo terem tamanhos parecidos demais. Quando tudo
// grita no mesmo volume, ninguém grita, e o slide vira parede de texto.

import { SEVERIDADE } from "@/lib/layout-review/linhas";

/**
 * Salto mínimo entre um nível e o seguinte.
 *
 * A escala modular clássica usa 1.25 (terça maior) ou 1.333 (quarta). Em
 * carrossel o salto precisa ser MAIOR: a peça é lida a 8cm do polegar, rolando,
 * e um contraste de 1.25 se perde no scroll. 1.4 é o piso em que a manchete
 * ainda vence a linha de apoio numa olhada de meio segundo.
 */
const SALTO_MINIMO = 1.4;

/** Acima de duas famílias no mesmo slide a peça perde unidade. */
const MAX_FAMILIAS = 2;

/** Ordem de leitura pretendida. Índice menor = deve ser mais forte. */
const NIVEL = { manchete: 0, apoio: 1, corpo: 2, legenda: 3, selo: 3, cta: 3 };

function problema(id, severidade, mensagem, extra = {}) {
  return { id, severidade, mensagem, ...extra };
}

/** Peso visual aproximado: corpo da fonte puxado pelo peso do traço. */
function forca(bloco) {
  const peso = Number(bloco.peso) || 400;
  return (Number(bloco.fontSize) || 0) * (1 + (peso - 400) / 2000);
}

/**
 * @param {{blocos:object[]}} slide
 * @returns {{id:string, severidade:string, mensagem:string}[]}
 */
export function revisarHierarquia({ blocos = [] } = {}) {
  const problemas = [];
  const comTexto = blocos.filter((b) => String(b.texto ?? "").trim().length > 0);
  if (comTexto.length < 2) return problemas;

  const manchete = comTexto.find((b) => b.papel === "manchete");
  const apoio = comTexto.find((b) => b.papel === "apoio" || b.papel === "corpo");

  // 1. Manchete e apoio no mesmo volume: o slide não diz por onde começar.
  if (manchete && apoio) {
    const razao = forca(manchete) / (forca(apoio) || 1);
    if (razao < SALTO_MINIMO) {
      problemas.push(problema(
        "hierarquia_fraca",
        SEVERIDADE.ATENCAO,
        `Manchete e apoio estão a ${razao.toFixed(2)}× um do outro; abaixo de ${SALTO_MINIMO}× competem pela mesma atenção.`,
        {
          blocoId: manchete.id,
          correcao: {
            tipo: "abrir_escala",
            descricao: `Aumentar a manchete ou reduzir o apoio até o salto passar de ${SALTO_MINIMO}×.`,
            fontSizeSugerido: Math.round(forca(apoio) * SALTO_MINIMO),
          },
        },
      ));
    }
  }

  // 2. Nada é manchete: alguma coisa tem que ser a maior da peça.
  if (!manchete && comTexto.length >= 3) {
    problemas.push(problema(
      "sem_manchete",
      SEVERIDADE.ATENCAO,
      "O slide não tem manchete: nada disputa o primeiro olhar.",
    ));
  }

  // 3. O CTA grita mais que a mensagem. O botão é o destino, não o assunto.
  const cta = comTexto.find((b) => b.papel === "cta");
  if (cta && manchete && forca(cta) > forca(manchete)) {
    problemas.push(problema(
      "cta_gritando",
      SEVERIDADE.ATENCAO,
      "O CTA está maior que a manchete e rouba a leitura da mensagem.",
      { blocoId: cta.id, correcao: { tipo: "reduzir_corpo", descricao: "Deixar o CTA abaixo da manchete na escala." } },
    ));
  }

  // 4. Excesso de famílias.
  const familias = [...new Set(comTexto.map((b) => b.fonte).filter(Boolean))];
  if (familias.length > MAX_FAMILIAS) {
    problemas.push(problema(
      "excesso_de_fontes",
      SEVERIDADE.ATENCAO,
      `O slide usa ${familias.length} famílias tipográficas: ${familias.join(", ")}.`,
      { correcao: { tipo: "unificar_fontes", descricao: `Ficar em no máximo ${MAX_FAMILIAS}.` } },
    ));
  }

  // 5. Ordem invertida: um nível de baixo ficou mais forte que o de cima.
  //    Só vale entre níveis DIFERENTES — dois itens de lista têm o mesmo peso
  //    de propósito, e acusar isso enche a tela de aviso inútil.
  const ordenados = comTexto
    .filter((b) => NIVEL[b.papel] !== undefined)
    .sort((a, b) => NIVEL[a.papel] - NIVEL[b.papel]);
  for (let i = 0; i < ordenados.length - 1; i++) {
    const acima = ordenados[i];
    const abaixo = ordenados[i + 1];
    if (NIVEL[acima.papel] === NIVEL[abaixo.papel]) continue;
    if (forca(abaixo) <= forca(acima)) continue;
    problemas.push(problema(
      "ordem_invertida",
      SEVERIDADE.ATENCAO,
      `"${abaixo.rotulo || abaixo.papel}" está mais forte que "${acima.rotulo || acima.papel}", que deveria vir primeiro.`,
      { blocoId: abaixo.id },
    ));
    break;
  }

  return problemas;
}

/**
 * Consistência de hierarquia ENTRE slides. O carrossel pode variar a
 * composição — capa forte, lista, prova, fecho — mas se a manchete muda de
 * corpo a cada slide o conjunto deixa de parecer uma peça só.
 */
export function revisarHierarquiaDoCarrossel(slides = []) {
  const manchetes = slides
    .map((slide) => (slide.blocos || []).find((b) => b.papel === "manchete"))
    .filter(Boolean);
  if (manchetes.length < 3) return [];

  const corpos = manchetes.map((b) => Number(b.fontSize) || 0).filter(Boolean);
  const menor = Math.min(...corpos);
  const maior = Math.max(...corpos);
  // A capa pode ser maior de propósito; o resto não deveria dançar.
  if (menor > 0 && maior / menor > 1.8) {
    return [problema(
      "manchete_inconstante",
      SEVERIDADE.SUGESTAO,
      `As manchetes variam de ${Math.round(menor)}px a ${Math.round(maior)}px entre os slides.`,
    )];
  }
  return [];
}
