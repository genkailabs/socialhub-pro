// Título curto de um post a partir da legenda.
//
// A grade do Calendário cortava a legenda crua no caractere 14, e legenda de
// carrossel começa com marcação: o dia 03 mostrava "** 🔺 Seus post". Asterisco
// não é conteúdo — é instrução de formatação que vazou para a interface.
// Aqui a marcação sai, a primeira linha com texto vira o título, e o corte
// acontece depois, sobre o texto limpo.

const MARCACAO = [
  [/^\s*#{1,6}\s+/, ''], // cabeçalho
  [/^\s*>+\s*/, ''], // citação
  [/^\s*[-*+]\s+/, ''], // lista
  [/^\s*\d+[.)]\s+/, ''] // lista numerada
];

/** Tira negrito, itálico, código e link de uma linha, deixando só o texto. */
function limparLinha(linha) {
  let texto = linha;
  for (const [padrao, troca] of MARCACAO) texto = texto.replace(padrao, troca);
  return texto
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [rótulo](url) → rótulo
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // negrito
    .replace(/(\*|_)(.*?)\1/g, '$2') // itálico
    .replace(/`+([^`]*)`+/g, '$1') // código
    .replace(/[*_`]+/g, '') // marcação solta que sobrou
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Título legível do post.
 *
 * @param {string} content legenda do post
 * @param {number} max quantos caracteres cabem no lugar onde vai aparecer
 * @param {string} fallback o que mostrar quando não sobra texto nenhum
 */
export function postTitle(content, max = 40, fallback = 'Post') {
  const linhas = String(content || '').split('\n');
  for (const linha of linhas) {
    const limpa = limparLinha(linha);
    if (!limpa) continue;
    return limpa.length > max ? `${limpa.slice(0, max).trimEnd()}…` : limpa;
  }
  return fallback;
}
