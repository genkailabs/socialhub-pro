// Fala do mascote durante a geração (PRD §15). Puro, sem I/O.
//
// "O mascote não deverá ser apenas decorativo": cada frase aqui corresponde a
// uma decisão que o sistema tomou de verdade — tipo do conteúdo, estrutura,
// estilo, ajuste de texto e variação. Frase sem decisão por trás não entra.

import { componentById } from '@/lib/layouts/components';

const TYPE_PHRASE = {
  noticia: 'Este conteúdo é uma notícia.',
  educativo: 'Este conteúdo é educativo.',
  dado: 'Este conteúdo gira em torno de um número.',
  inspiracao: 'Este conteúdo é inspiracional.',
  engajamento: 'Este conteúdo abre conversa com o público.',
  promocao: 'Este conteúdo é uma oferta.',
  servico: 'Este conteúdo é um recado de serviço.',
  autoridade: 'Este conteúdo fortalece a sua autoridade.'
};

const FIX_PHRASE = {
  texto_cortado: 'O texto estava maior que a caixa, então reduzi o corpo para caber.',
  excesso_caracteres: 'O texto passava do limite do componente, então encurtei.',
  contraste_baixo: 'O contraste estava baixo, então escureci o texto para ficar legível.',
  fora_area_segura: 'Um elemento estava fora da área segura, então trouxe para dentro da margem.',
  logo_na_borda: 'A logo estava colada na borda, então afastei.',
  elementos_sobrepostos: 'Dois elementos se sobrepunham, então afastei um deles.',
  imagem_distorcida: 'A imagem estava esticada, então reenquadrei mantendo a proporção.'
};

const PENDING_PHRASE = {
  cta_ausente: 'Esta peça pede uma chamada para ação e ainda não tem uma.',
  slides_inconsistentes: 'Os slides estão com estruturas diferentes demais entre si.',
  texto_cortado: 'Ainda tem texto sem espaço suficiente — vale encurtar.',
  contraste_baixo: 'Ainda há um texto com contraste baixo sobre o fundo.'
};

/**
 * Monta a explicação do que aconteceu.
 *
 * @returns {string[]} frases na ordem em que devem ser lidas.
 */
export function mascotMessages({
  contentType = 'autoridade',
  structure = null,
  style = null,
  palette = null,
  applied = [],
  issues = [],
  skipped = [],
  repeatedStructure = false,
  repeatedStyle = false,
  brandName = ''
} = {}) {
  const lines = [];

  lines.push(TYPE_PHRASE[contentType] || TYPE_PHRASE.autoridade);

  if (structure) {
    lines.push(`Escolhi a estrutura "${structure.label}" porque ${lowerFirst(structure.description)}`);
  }
  if (style) {
    lines.push(palette?.followsBrandKit
      ? `Apliquei o estilo ${style.label} usando as cores${brandName ? ` da ${brandName}` : ' da sua marca'}.`
      : `Apliquei o estilo ${style.label}. A marca ainda não tem cores no Brand Kit, então usei a paleta do estilo.`);
  }

  // §13: quando não deu para variar, dizer é melhor que fingir que variou.
  if (repeatedStructure) lines.push('Esta estrutura já foi usada recentemente, mas é a que melhor aproveita este conteúdo.');
  else if (repeatedStyle) lines.push('Variei o estilo para a sequência não ficar sempre com a mesma cara.');

  for (const id of [...new Set(applied)]) {
    if (FIX_PHRASE[id]) lines.push(FIX_PHRASE[id]);
  }

  const missing = [...new Set(skipped)]
    .map((id) => componentById(id)?.label)
    .filter(Boolean);
  if (missing.length) {
    lines.push(`Deixei de fora ${listar(missing)} porque este conteúdo não trouxe essa informação.`);
  }

  for (const id of [...new Set(issues.map((item) => item.id))]) {
    if (PENDING_PHRASE[id]) lines.push(PENDING_PHRASE[id]);
  }

  return lines;
}

function lowerFirst(value = '') {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function listar(items = []) {
  if (items.length === 1) return items[0].toLowerCase();
  return `${items.slice(0, -1).map((i) => i.toLowerCase()).join(', ')} e ${items[items.length - 1].toLowerCase()}`;
}
