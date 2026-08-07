// Entrelinha, tracking e respiro. Puro, sem I/O e sem DOM.
//
// Espaçamento é o que separa arte de mercado de arte de template: nada aqui
// muda o conteúdo, e tudo aqui muda a sensação. Por isso quase todo problema
// deste módulo é ATENÇÃO ou SUGESTÃO — nunca crítico. Corrigir agressivamente
// espaçamento estraga mais do que conserta, como o próprio PRD manda (§4.7).

import { SEVERIDADE } from "@/lib/layout-review/linhas";

/**
 * Faixas de entrelinha por papel, em múltiplo do corpo.
 *
 * Manchete grande pede entrelinha CURTA: com 92px de corpo, 1.4 abre um vão em
 * que cabe outra linha, e o bloco se desmancha em frases soltas. Corpo pequeno
 * pede o contrário — apertar abaixo de 1.25 gruda as linhas e o olho perde a
 * volta ao voltar para a esquerda.
 */
export const ENTRELINHA = {
  manchete: { min: 0.9, max: 1.25, ideal: 1.05 },
  apoio: { min: 1.15, max: 1.5, ideal: 1.3 },
  corpo: { min: 1.25, max: 1.7, ideal: 1.45 },
  cta: { min: 1, max: 1.4, ideal: 1.2 },
  selo: { min: 1, max: 1.4, ideal: 1.1 },
  legenda: { min: 1.2, max: 1.6, ideal: 1.4 },
};

/** Tracking em fração do corpo (em). Além disso a palavra deixa de ser palavra. */
const TRACKING = { min: -0.03, max: 0.16 };

/**
 * Caixa-alta quer tracking positivo: as maiúsculas foram desenhadas para
 * conviver com minúsculas, e enfileiradas ficam apertadas. É o ajuste que mais
 * "profissionaliza" uma manchete sem mexer em mais nada.
 */
const TRACKING_CAIXA_ALTA_MINIMO = 0.01;

/** Respiro entre blocos, em % da altura do slide. Menos que isso e colam. */
const RESPIRO_MINIMO = 1.5;

function problema(id, severidade, mensagem, extra = {}) {
  return { id, severidade, mensagem, ...extra };
}

function faixaDe(papel) {
  return ENTRELINHA[papel] ?? ENTRELINHA.corpo;
}

/** Tracking em `em`, a partir do valor em px que o editor guarda. */
function trackingEm(bloco) {
  const corpo = Number(bloco.fontSize) || 0;
  if (!corpo) return 0;
  return (Number(bloco.tracking) || 0) / corpo;
}

/**
 * O respiro entre blocos é medido em % da altura do slide, então a altura em
 * pixels não entra na conta — 1.5% valem o mesmo em 4:5 e em 9:16.
 *
 * @param {{blocos:object[]}} slide
 */
export function revisarEspacamento({ blocos = [] } = {}) {
  const problemas = [];
  const comTexto = blocos.filter((b) => String(b.texto ?? "").trim().length > 0);

  for (const bloco of comTexto) {
    const rotulo = bloco.rotulo || bloco.papel || "Texto";
    const faixa = faixaDe(bloco.papel);
    const lh = Number(bloco.entrelinha);

    // 1. Entrelinha fora da faixa do papel.
    //    Bloco de UMA linha não tem entrelinha visível: acusar ali é ruído.
    const linhas = Array.isArray(bloco.linhas) ? bloco.linhas.filter((l) => l.texto?.trim()).length : 2;
    if (Number.isFinite(lh) && lh > 0 && linhas > 1) {
      if (lh < faixa.min) {
        problemas.push(problema(
          "entrelinha_apertada",
          SEVERIDADE.ATENCAO,
          `Entrelinha de "${rotulo}" está em ${lh.toFixed(2)}; abaixo de ${faixa.min} as linhas se tocam.`,
          { blocoId: bloco.id, correcao: { tipo: "ajustar_entrelinha", valor: faixa.ideal, descricao: `Levar para ${faixa.ideal}.` } },
        ));
      } else if (lh > faixa.max) {
        problemas.push(problema(
          "entrelinha_solta",
          SEVERIDADE.ATENCAO,
          `Entrelinha de "${rotulo}" está em ${lh.toFixed(2)}; acima de ${faixa.max} o bloco se desmancha em frases soltas.`,
          { blocoId: bloco.id, correcao: { tipo: "ajustar_entrelinha", valor: faixa.ideal, descricao: `Levar para ${faixa.ideal}.` } },
        ));
      }
    }

    // 2. Tracking exagerado nos dois sentidos.
    const tr = trackingEm(bloco);
    if (tr > TRACKING.max) {
      problemas.push(problema(
        "tracking_exagerado",
        SEVERIDADE.ATENCAO,
        `"${rotulo}" tem ${tr.toFixed(2)}em de espaçamento entre letras; a palavra deixa de ser lida como palavra.`,
        { blocoId: bloco.id, correcao: { tipo: "ajustar_tracking", valor: Math.round(TRACKING.max * (bloco.fontSize || 0)) } },
      ));
    } else if (tr < TRACKING.min) {
      problemas.push(problema(
        "tracking_apertado",
        SEVERIDADE.ATENCAO,
        `"${rotulo}" tem ${tr.toFixed(2)}em de espaçamento; as letras se encavalam.`,
        { blocoId: bloco.id, correcao: { tipo: "ajustar_tracking", valor: 0 } },
      ));
    }

    // 3. Caixa-alta sem respiro entre as letras.
    const caixaAlta = bloco.transform === "upper"
      || (String(bloco.texto).length > 3 && String(bloco.texto) === String(bloco.texto).toLocaleUpperCase("pt-BR"));
    if (caixaAlta && tr < TRACKING_CAIXA_ALTA_MINIMO) {
      problemas.push(problema(
        "caixa_alta_sem_respiro",
        SEVERIDADE.SUGESTAO,
        `"${rotulo}" está em caixa-alta sem espaçamento entre letras.`,
        {
          blocoId: bloco.id,
          correcao: {
            tipo: "ajustar_tracking",
            valor: Math.round(0.03 * (Number(bloco.fontSize) || 0)),
            descricao: "Maiúsculas enfileiradas pedem um fio de espaço; 0.03em basta.",
          },
        },
      ));
    }
  }

  // 4. Blocos colados. Mede a distância vertical entre caixas que não se
  //    sobrepõem horizontalmente — duas colunas lado a lado não estão coladas.
  const ordenados = [...comTexto]
    .filter((b) => b.caixa)
    .sort((a, b) => a.caixa.y - b.caixa.y);
  for (let i = 0; i < ordenados.length - 1; i++) {
    const cima = ordenados[i];
    const baixo = ordenados[i + 1];
    const cruzamX = cima.caixa.x < baixo.caixa.x + baixo.caixa.w && baixo.caixa.x < cima.caixa.x + cima.caixa.w;
    if (!cruzamX) continue;
    const vao = baixo.caixa.y - (cima.caixa.y + cima.caixa.h);
    if (vao >= 0 && vao < RESPIRO_MINIMO) {
      problemas.push(problema(
        "blocos_colados",
        SEVERIDADE.SUGESTAO,
        `"${cima.rotulo || cima.papel}" e "${baixo.rotulo || baixo.papel}" têm ${vao.toFixed(1)}% de respiro entre si.`,
        { blocoId: baixo.id },
      ));
      break;
    }
  }

  return problemas;
}

/** Entrelinha que dança entre slides quebra o ritmo do carrossel. */
export function revisarEspacamentoDoCarrossel(slides = []) {
  const porPapel = new Map();
  for (const slide of slides) {
    for (const bloco of slide.blocos || []) {
      const lh = Number(bloco.entrelinha);
      if (!Number.isFinite(lh) || !lh) continue;
      const lista = porPapel.get(bloco.papel) || [];
      lista.push(lh);
      porPapel.set(bloco.papel, lista);
    }
  }

  const problemas = [];
  for (const [papel, valores] of porPapel) {
    if (valores.length < 3) continue;
    const distintos = [...new Set(valores.map((v) => v.toFixed(2)))];
    if (distintos.length > 2) {
      problemas.push(problema(
        "entrelinha_inconstante",
        SEVERIDADE.SUGESTAO,
        `A entrelinha de "${papel}" usa ${distintos.length} valores diferentes ao longo do carrossel.`,
      ));
    }
  }
  return problemas;
}
