// Ponte entre a superfície do Composer e o núcleo de revisão de diagramação.
// Puro, sem I/O.
//
// Fica AQUI e não em `lib/layout-review/` de propósito: aquela pasta é
// espelhada no Carrossel Studio, e este arquivo conhece `lib/layouts/components`,
// que só existe no Hub. Núcleo é compartilhado; tradução é de cada lado.
//
// A diferença para o adaptador do Studio é o que se sabe sobre o texto. Lá as
// linhas vêm medidas do DOM, porque o texto já quebrou. Aqui ainda não existe
// pixel nenhum — a peça está sendo montada — então o núcleo quebra as linhas
// com o medidor estimado. É a melhor verdade disponível antes de desenhar, e o
// bastante para a IA não entregar uma manchete com viúva.

import { componentById } from '@/lib/layouts/components';

/** `styleRole` do componente → papel que o núcleo entende. */
const PAPEL_POR_ROLE = {
  title: 'manchete',
  number: 'manchete',
  subtitle: 'apoio',
  body: 'corpo',
  cta: 'cta',
  eyebrow: 'selo',
  meta: 'legenda'
};

/** Componentes que existem para ficar embaixo dos outros. */
const DECORATIVOS = new Set(['painel', 'sobreposicao', 'divisor']);

/** Tipos de camada que carregam texto. */
const COM_TEXTO = new Set(['text', 'button', 'sticker']);

/**
 * Converte uma superfície do Composer na entrada do núcleo.
 *
 * As coordenadas da superfície são PIXELS DO CANVAS (que muda com o formato:
 * 1080×1350, 1080×1080, 430×430…). O núcleo trabalha em % do slide, para que a
 * mesma regra valha em qualquer proporção — daí a conversão.
 *
 * @param {{layers:object[]}} surface
 * @param {[number, number]} canvas [largura, altura] em px
 */
export function superficieParaRevisao(surface, canvas) {
  const [cw, ch] = canvas;
  if (!cw || !ch) return { blocos: [], largura: cw || 1080, altura: ch || 1350 };

  const blocos = (surface?.layers || []).map((layer) => {
    const component = componentById(layer.componentId);
    const decorativo = DECORATIVOS.has(layer.componentId) || !COM_TEXTO.has(layer.type);
    const papel = PAPEL_POR_ROLE[component?.styleRole] ?? 'corpo';

    return {
      id: layer.id,
      papel,
      texto: COM_TEXTO.has(layer.type) ? String(layer.text || '') : '',
      rotulo: component?.label || layer.componentId || 'Elemento',
      caixa: {
        x: (layer.x / cw) * 100,
        y: (layer.y / ch) * 100,
        w: (layer.w / cw) * 100,
        h: (layer.h / ch) * 100
      },
      fontSize: Number(layer.fs) || 0,
      peso: Number(layer.weight) || 400,
      fonte: layer.font || '',
      // `lh` só é gravado quando o componente pede algo diferente do padrão.
      entrelinha: Number(layer.lh) || Number(component?.defaults?.lh) || 1.2,
      tracking: Number(layer.ls) || 0,
      transform: layer.transform === 'upper' ? 'upper' : 'none',
      decorativo,
      // Sangria é escolha do componente, não acidente: `bleed` diz que a peça
      // encosta na borda de propósito e não deve ser cobrada por isso.
      sangra: Boolean(layer.bleed || component?.bleed)
    };
  });

  return { blocos, largura: cw, altura: ch };
}

/**
 * Converte vários slides de uma vez, para a revisão do carrossel inteiro.
 *
 * @param {{surface:object, canvas:[number,number]}[]} pecas
 */
export function slidesParaRevisao(pecas = []) {
  return pecas.map(({ surface, canvas }) => superficieParaRevisao(surface, canvas));
}
