// Grade, alinhamento e área segura. Puro, sem I/O e sem DOM.
//
// A regra 1 do guia — "use eixos e colunas, evite elementos soltos" — não se
// verifica desenhando uma grade e conferindo se tudo encosta nela: carrossel
// não tem grade declarada. O que dá para medir é o efeito dela: elementos que
// compartilham eixo. Um elemento cujo lado não coincide com o lado de NENHUM
// outro é o "elemento solto" que faz a peça parecer amadora.
//
// Todas as medidas aqui são em % do slide, para valer igual em 1080×1350,
// 1080×1080 e 1080×1920.

import { SEVERIDADE } from "@/lib/layout-review/linhas";

/** Dois eixos a menos disto um do outro são o MESMO eixo — só que torto. */
const TOLERANCIA_EIXO = 1.2;

/**
 * Piso absoluto de margem.
 *
 * Era 5%, e reprovava famílias inteiras de template que usam 4% de propósito —
 * o revisor abria acusando a convenção da própria peça, que é a forma mais
 * rápida de alguém desligar um revisor. 3% de 1080px são 32px: abaixo disso o
 * conteúdo encosta de verdade, e no formato 9:16 entra debaixo da interface do
 * Instagram.
 *
 * Margem entre 3% e o padrão do slide não é erro — é decisão de quem desenhou.
 * Quem cuida disso é `margemDestoante`, comparando cada peça com o RESTO do
 * slide em vez de com um número absoluto.
 */
export const AREA_SEGURA = 3;

/** Diferença de margem, em pontos, que faz uma peça destoar do próprio slide. */
const DESVIO_DE_MARGEM = 2.5;

/** Sobreposição que deixa de ser composição e vira defeito. */
const MAX_SOBREPOSICAO = 0.3;

function problema(id, severidade, mensagem, extra = {}) {
  return { id, severidade, mensagem, ...extra };
}

/** Os três eixos verticais de uma caixa: esquerda, centro e direita. */
function eixosX(caixa) {
  return [caixa.x, caixa.x + caixa.w / 2, caixa.x + caixa.w];
}

function eixosY(caixa) {
  return [caixa.y, caixa.y + caixa.h / 2, caixa.y + caixa.h];
}

function area(caixa) {
  return Math.max(0, caixa.w) * Math.max(0, caixa.h);
}

/** Mediana, não média: um logo colado no canto não pode puxar o padrão. */
function medianaDe(valores) {
  const ordem = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordem.length / 2);
  return ordem.length % 2 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2;
}

function intersecao(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * @param {{blocos:object[], areaSegura?:number}} slide blocos com `caixa` em %
 */
export function revisarGrade({ blocos = [], areaSegura = AREA_SEGURA } = {}) {
  const problemas = [];
  const pecas = blocos.filter((b) => b.caixa && !b.sangra);
  if (!pecas.length) return problemas;

  // 1. Área segura. Vem primeiro porque é o único defeito desta lista que o
  //    Instagram pode literalmente cortar da tela.
  for (const peca of pecas) {
    const c = peca.caixa;
    const estoura = c.x < areaSegura - 0.01
      || c.y < areaSegura - 0.01
      || c.x + c.w > 100 - areaSegura + 0.01
      || c.y + c.h > 100 - areaSegura + 0.01;
    if (!estoura) continue;
    problemas.push(problema(
      "fora_da_area_segura",
      peca.papel === "manchete" || peca.papel === "cta" ? SEVERIDADE.CRITICO : SEVERIDADE.ATENCAO,
      `"${peca.rotulo || peca.papel}" encosta na borda; conteúdo importante precisa de ${areaSegura}% de margem.`,
      { blocoId: peca.id, correcao: { tipo: "trazer_para_dentro", margem: areaSegura } },
    ));
  }

  // 2. Margem que destoa do resto do slide. O slide inteiro a 4% é coerente;
  //    uma peça a 4% e outra a 9% é que faz a arte parecer montada às pressas.
  const margens = pecas.map((p) => Math.min(p.caixa.x, 100 - (p.caixa.x + p.caixa.w)));
  if (pecas.length >= 3) {
    const padrao = medianaDe(margens);
    pecas.forEach((peca, i) => {
      const desvio = margens[i] - padrao;
      // Só a peça que ENTRA demais destoa; sobrar margem é respiro, não erro.
      if (desvio >= -DESVIO_DE_MARGEM || margens[i] < areaSegura) return;
      problemas.push(problema(
        "margem_destoante",
        SEVERIDADE.SUGESTAO,
        `"${peca.rotulo || peca.papel}" tem ${margens[i].toFixed(1)}% de margem; o slide usa ${padrao.toFixed(1)}%.`,
        { blocoId: peca.id, correcao: { tipo: "trazer_para_dentro", margem: Number(padrao.toFixed(1)) } },
      ));
    });
  }

  // 3. Elemento solto: nenhum eixo dele coincide com o de outra peça.
  //    Com menos de três peças não existe "eixo compartilhado" que valha —
  //    duas caixas sempre parecem intencionais.
  if (pecas.length >= 3) {
    for (const peca of pecas) {
      const meus = [...eixosX(peca.caixa), ...eixosY(peca.caixa)];
      const alinha = pecas.some((outra) => {
        if (outra.id === peca.id) return false;
        const dela = [...eixosX(outra.caixa), ...eixosY(outra.caixa)];
        return meus.some((m, i) => dela.some((d, j) => {
          // Só compara eixo vertical com vertical e horizontal com horizontal.
          if (i < 3 !== j < 3) return false;
          return Math.abs(m - d) <= TOLERANCIA_EIXO;
        }));
      });
      if (alinha) continue;
      problemas.push(problema(
        "elemento_solto",
        SEVERIDADE.ATENCAO,
        `"${peca.rotulo || peca.papel}" não divide nenhum eixo com o resto do slide.`,
        { blocoId: peca.id, correcao: { tipo: "alinhar", descricao: "Encostar num eixo já usado por outro elemento." } },
      ));
    }
  }

  // 4. Quase-alinhamento: dois eixos a um fio de distância. É pior que o
  //    desalinho franco — o olho lê como erro de execução, não como escolha.
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      const a = pecas[i];
      const b = pecas[j];
      const par = [
        [eixosX(a.caixa), eixosX(b.caixa), "vertical"],
        [eixosY(a.caixa), eixosY(b.caixa), "horizontal"],
      ];
      let achou = null;
      for (const [ea, eb, sentido] of par) {
        for (const m of ea) {
          for (const d of eb) {
            const dist = Math.abs(m - d);
            if (dist > 0.15 && dist <= TOLERANCIA_EIXO) achou = { sentido, dist };
          }
        }
      }
      if (!achou) continue;
      problemas.push(problema(
        "quase_alinhado",
        SEVERIDADE.SUGESTAO,
        `"${a.rotulo || a.papel}" e "${b.rotulo || b.papel}" estão a ${achou.dist.toFixed(1)}% de dividir o mesmo eixo ${achou.sentido}.`,
        { blocoId: b.id, correcao: { tipo: "alinhar", descricao: "Encaixar no eixo em vez de quase." } },
      ));
      break;
    }
  }

  // 5. Sobreposição de conteúdo. Painel e véu existem para ficar embaixo —
  //    quem marca `decorativo` está fora da conta.
  const conteudo = pecas.filter((p) => !p.decorativo);
  for (let i = 0; i < conteudo.length; i++) {
    for (let j = i + 1; j < conteudo.length; j++) {
      const a = conteudo[i];
      const b = conteudo[j];
      const sobra = intersecao(a.caixa, b.caixa);
      if (!sobra) continue;
      const menor = Math.min(area(a.caixa), area(b.caixa));
      if (menor > 0 && sobra / menor > MAX_SOBREPOSICAO) {
        problemas.push(problema(
          "sobreposicao",
          SEVERIDADE.CRITICO,
          `"${a.rotulo || a.papel}" cobre ${Math.round((sobra / menor) * 100)}% de "${b.rotulo || b.papel}".`,
          { blocoId: b.id },
        ));
      }
    }
  }

  return problemas;
}

/**
 * Margens que mudam de slide para slide. É o defeito de consistência que mais
 * aparece e o menos percebido: cada slide sozinho parece bem, e o carrossel
 * inteiro parece montado por três pessoas diferentes.
 */
export function revisarGradeDoCarrossel(slides = []) {
  const margens = slides
    .map((slide) => {
      const pecas = (slide.blocos || []).filter((b) => b.caixa && !b.sangra && !b.decorativo);
      if (!pecas.length) return null;
      return Math.min(...pecas.map((p) => p.caixa.x));
    })
    .filter((m) => m !== null);

  if (margens.length < 3) return [];
  const menor = Math.min(...margens);
  const maior = Math.max(...margens);
  if (maior - menor <= 1.5) return [];

  return [problema(
    "margens_inconstantes",
    SEVERIDADE.ATENCAO,
    `A margem esquerda varia de ${menor.toFixed(1)}% a ${maior.toFixed(1)}% entre os slides.`,
    { correcao: { tipo: "unificar_margem", valor: Number(menor.toFixed(1)) } },
  )];
}
