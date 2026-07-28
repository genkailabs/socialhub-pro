// O que os itens do painel Layouts provocam na peça — dito ao vivo, no campo.
//
// O campo dizia "Vira lista, comparação ou carrossel" e escondia a regra:
// quantas linhas produzem o quê. Eram três limiares invisíveis para o usuário
// segurar de cabeça, sem nenhuma confirmação de que acertou.
//
// A regra de ouro aqui é NÃO PROMETER o que o motor não garante:
//
// - Carrossel é determinístico (composeSmartCarousel monta capa + um slide por
//   item), então a contagem de slides pode ser afirmada.
// - Estrutura manual é forçada em composeSmartPost sem checar `structureFits`,
//   então escolher "Lista" com um item monta uma lista vazia — isso vira alerta.
// - "A IA escolhe" passa por scoreStructure, que é pontuação e não regra, e a
//   antirrepetição pode desviar a escolha. Aí o texto diz "habilita", nunca
//   "vira": os itens tornam a estrutura elegível, não certa.

import { structureById } from '@/lib/layouts/structures';
import { IG_CAROUSEL_MAX } from '@/lib/posts-media';

// Teto de itens que viram slide: a capa ocupa um dos lugares do carrossel.
export const MAX_BULLET_SLIDES = IG_CAROUSEL_MAX - 1;

/** Mesma leitura que o Composer faz antes de mandar para o servidor. */
export function countBullets(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .length;
}

const plural = (n, singular, pluralWord) => `${n} ${n === 1 ? singular : pluralWord}`;

function carrosselHint(count) {
  if (!count) return { message: 'Sem itens: monta um slide só.', tone: 'neutro' };
  if (count > MAX_BULLET_SLIDES) {
    return {
      message: `Só os ${MAX_BULLET_SLIDES} primeiros viram slides — o Instagram aceita ${IG_CAROUSEL_MAX}.`,
      tone: 'alerta'
    };
  }
  return {
    message: `${plural(count, 'item', 'itens')} · viram ${count + 1} slides (capa + ${count}).`,
    tone: 'ok'
  };
}

function manualHint(count, structure) {
  const req = structure.requires || {};
  const min = req.minBullets || 0;
  const max = Number.isInteger(req.maxBullets) ? req.maxBullets : null;

  if (min && max === min) {
    if (count === min) return { message: `${plural(count, 'item', 'itens')} · é exatamente o que ${structure.label} usa.`, tone: 'ok' };
    return {
      message: `${structure.label} usa exatamente ${min} itens — você tem ${count}.`,
      tone: 'alerta'
    };
  }

  if (count < min) {
    return {
      message: `${structure.label} precisa de ${min} itens — você tem ${count}.`,
      tone: 'alerta'
    };
  }

  if (max !== null && count > max) {
    return {
      message: `${structure.label} usa no máximo ${max} itens — você tem ${count}.`,
      tone: 'alerta'
    };
  }

  if (!count) {
    return { message: `${structure.label} não precisa de itens.`, tone: 'neutro' };
  }

  return { message: `${plural(count, 'item', 'itens')} · ${structure.label} vai usar todos.`, tone: 'ok' };
}

function autoHint(count) {
  if (!count) return { message: 'Sem itens: a arte sai com título e subtítulo.', tone: 'neutro' };
  if (count === 1) return { message: '1 item · com mais um, habilita o layout de Comparação.', tone: 'neutro' };
  if (count === 2) return { message: '2 itens · habilita o layout de Comparação.', tone: 'ok' };
  return { message: `${count} itens · habilita o layout de Lista.`, tone: 'ok' };
}

/**
 * @param {object} params
 * @param {string} params.text     conteúdo cru do campo, uma linha por item
 * @param {string} params.format   post | carrossel | story | reel
 * @param {string} params.structureId estrutura escolhida à mão; vazio = a IA escolhe
 * @returns {{ count: number, message: string, tone: 'neutro'|'ok'|'alerta' }}
 */
export function bulletsHint({ text = '', format = 'post', structureId = '' } = {}) {
  const count = countBullets(text);

  // O carrossel manda em tudo: é o único caminho onde o número de itens muda a
  // quantidade de peças, e isso interessa mais do que qual estrutura sai.
  if (format === 'carrossel') return { count, ...carrosselHint(count) };

  const structure = structureId ? structureById(structureId) : null;
  if (structure) return { count, ...manualHint(count, structure) };

  return { count, ...autoHint(count) };
}
