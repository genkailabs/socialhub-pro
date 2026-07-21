// Controle de qualidade automático da arte (§19). Puro, sem I/O.
//
// A regra do PRD: se algum item do checklist falha, a arte é refeita ANTES de
// ser entregue. Este módulo não refaz nada — ele diz, com precisão, o que está
// errado e o que ajustar. Quem orquestra a refação é o gerador.
//
// Só entram checagens que dá para fazer sobre a especificação da peça. "Parece
// profissional" não é verificável por regex, então viramos isso em critérios
// concretos: contraste, hierarquia, legibilidade no celular e ocupação.

import { hasTypographicHierarchy, MIN_TITLE_RATIO } from '@/lib/ai/art/style';

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHex(hex) {
  const texto = String(hex || '').trim();
  if (!HEX.test(texto)) return null;
  let corpo = texto.replace('#', '');
  if (corpo.length === 3) corpo = corpo.split('').map((c) => c + c).join('');
  return {
    r: parseInt(corpo.slice(0, 2), 16),
    g: parseInt(corpo.slice(2, 4), 16),
    b: parseInt(corpo.slice(4, 6), 16)
  };
}

// Luminância relativa (WCAG 2.1).
function luminance({ r, g, b }) {
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

// Razão de contraste WCAG: 1 (nenhum) a 21 (preto sobre branco).
export function contrastRatio(corA, corB) {
  const a = parseHex(corA);
  const b = parseHex(corB);
  if (!a || !b) return null;
  const la = luminance(a);
  const lb = luminance(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);
  return (claro + 0.05) / (escuro + 0.05);
}

// Texto grande (título) tem piso menor no WCAG; corpo exige 4.5.
export const MIN_CONTRAST_BODY = 4.5;
export const MIN_CONTRAST_TITLE = 3;

// Legibilidade no celular: a peça é vista com ~10% do tamanho no feed. Título
// muito longo deixa de ser título e vira parágrafo.
export const MAX_TITLE_CHARS = 90;
export const MAX_SUBTITLE_CHARS = 160;
export const MIN_TITLE_CHARS = 3;

// §17: peça com pouquíssimo conteúdo em área grande é exatamente o "muito
// espaço vazio" que o PRD manda evitar.
export const MIN_FILL_CHARS = 24;

function issue(id, message, fix) {
  return { id, message, fix };
}

/**
 * Avalia a arte antes de entregar.
 *
 * @param {object} art
 * @param {string} art.title      Título principal.
 * @param {string} art.subtitle   Texto de apoio.
 * @param {string[]} art.bullets  Itens (cards/comparativo).
 * @param {object} art.palette    { bg, ink, accent, muted }
 * @param {object} art.scale      Saída de typeScale().
 * @param {object} art.layout     Layout escolhido.
 * @param {boolean} art.hasImage  Se há imagem na composição.
 * @param {boolean} art.followsBrandKit Se a paleta veio do Brand Kit da marca.
 */
export function checkArt(art = {}) {
  const problemas = [];
  const titulo = String(art.title || '').trim();
  const subtitulo = String(art.subtitle || '').trim();
  const bullets = Array.isArray(art.bullets) ? art.bullets.filter(Boolean) : [];
  const palette = art.palette || {};
  const scale = art.scale || {};

  // 1. Texto legível
  if (titulo.length < MIN_TITLE_CHARS) {
    problemas.push(issue('titulo_ausente', 'A arte não tem título legível.', 'Gerar um título curto e direto.'));
  }
  if (titulo.length > MAX_TITLE_CHARS) {
    problemas.push(issue('titulo_longo', `Título com ${titulo.length} caracteres não se lê no feed.`, `Reduzir para até ${MAX_TITLE_CHARS} caracteres.`));
  }
  if (subtitulo.length > MAX_SUBTITLE_CHARS) {
    problemas.push(issue('subtitulo_longo', `Subtítulo com ${subtitulo.length} caracteres compete com o título.`, `Reduzir para até ${MAX_SUBTITLE_CHARS} caracteres.`));
  }

  // 2. Contraste alto
  const contrasteCorpo = contrastRatio(palette.ink, palette.bg);
  if (contrasteCorpo === null) {
    problemas.push(issue('paleta_invalida', 'A paleta não tem cores válidas para texto e fundo.', 'Usar a paleta padrão do nicho.'));
  } else if (contrasteCorpo < MIN_CONTRAST_BODY) {
    problemas.push(issue('contraste_baixo', `Contraste de ${contrasteCorpo.toFixed(2)}:1 entre texto e fundo.`, `Escurecer o texto ou clarear o fundo até ${MIN_CONTRAST_BODY}:1.`));
  }
  const contrasteAcento = contrastRatio(palette.accent, palette.bg);
  if (contrasteAcento !== null && contrasteAcento < MIN_CONTRAST_TITLE) {
    problemas.push(issue('acento_invisivel', `A cor de destaque quase some no fundo (${contrasteAcento.toFixed(2)}:1).`, 'Usar o acento só em área de cor sólida.'));
  }

  // 3. Hierarquia tipográfica (§16)
  if (!hasTypographicHierarchy(scale)) {
    problemas.push(issue('sem_hierarquia', `O título não é ao menos ${MIN_TITLE_RATIO}x o corpo.`, 'Aumentar o título ou reduzir o corpo.'));
  }

  // 4. Composição e ocupação (§17)
  const totalTexto = titulo.length + subtitulo.length + bullets.join('').length;
  if (totalTexto < MIN_FILL_CHARS && !art.hasImage) {
    problemas.push(issue('peca_vazia', 'Pouco conteúdo e nenhuma imagem: a arte fica com grandes áreas vazias.', 'Acrescentar subtítulo, itens ou imagem de fundo.'));
  }

  // 5. Imagem principal dominante — só cobra quando o layout promete imagem.
  if (art.layout?.requires?.image && !art.hasImage) {
    problemas.push(issue('imagem_ausente', `O layout "${art.layout.label || art.layout.id}" precisa de imagem e nenhuma foi gerada.`, 'Gerar a imagem ou escolher um layout sem imagem.'));
  }

  // 6. Identidade visual (§18)
  if (art.followsBrandKit === false) {
    problemas.push(issue('fora_do_brand_kit', 'A arte não usou as cores do Brand Kit da marca.', 'Aplicar a paleta do Brand Kit.'));
  }

  return { ok: problemas.length === 0, issues: problemas };
}

// Texto curto para o log/telas: o usuário precisa saber por que a arte foi
// refeita, senão parece que o sistema gastou crédito à toa.
export function describeIssues(issues = []) {
  if (!issues.length) return 'Arte aprovada no controle de qualidade.';
  return issues.map((i) => i.message).join(' ');
}
