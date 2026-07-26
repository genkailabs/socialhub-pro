// Prompt de arte externa (Gemini): montado por template, sem chamar IA.
// O SocialHub só escreve o texto; quem gera a imagem é o usuário, no Gemini,
// e a arte volta por upload manual.

export const GEMINI_URL = 'https://gemini.google.com/app';

export const EXTERNAL_ART_MIME = ['image/png', 'image/jpeg', 'image/webp'];
export const EXTERNAL_ART_MAX_BYTES = 15 * 1024 * 1024;

const FORMAT_LABEL = {
  post: 'Post',
  carrossel: 'Carrossel',
  story: 'Story',
  reel: 'Reel'
};

const RATIO_VALUE = {
  '1:1': 1,
  '4:5': 0.8,
  '3:4': 0.75,
  '1.91:1': 1.91,
  '9:16': 0.5625
};

export function ratioValue(ratio) {
  return RATIO_VALUE[ratio] || null;
}

// Story e Reel são sempre 9:16; Post e Carrossel usam a proporção escolhida
// no Composer. Nada aqui é digitado pelo usuário — vem do estado do editor.
export function artFormatLabel(format, ratio) {
  const label = FORMAT_LABEL[format] || FORMAT_LABEL.post;
  const effective = format === 'story' || format === 'reel' ? '9:16' : ratio || '1:1';
  return `${label} ${effective}`;
}

export function artRatio(format, ratio) {
  return format === 'story' || format === 'reel' ? '9:16' : ratio || '1:1';
}

function clean(value) {
  return String(value ?? '').trim();
}

function list(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value).split(/[\n,]+/).map(clean).filter(Boolean);
}

function paletteColors(palette) {
  if (!palette || typeof palette !== 'object') return [];
  return [palette.accent, palette.bg, palette.surface, palette.ink]
    .map(clean)
    .filter((color) => /^#?[0-9a-fA-F]{3,8}$/.test(color));
}

function block(title, body) {
  const text = clean(body);
  return text ? `${title}\n${text}` : '';
}

// Regras fixas do PRD §5 + o que a marca pede para evitar.
function rules(donts) {
  const base = [
    'manter boa leitura no celular',
    'não inventar logotipo',
    'não adicionar textos diferentes dos informados',
    'evitar excesso de elementos',
    'deixar espaço para inserir o logotipo depois',
    'gerar uma arte com aparência profissional'
  ];
  const avoid = list(donts);
  if (avoid.length) base.push(`evitar: ${avoid.join('; ')}`);
  return base.map((rule) => `- ${rule};`).join('\n').replace(/;$/, '.');
}

/**
 * Monta o prompt que o usuário leva para o Gemini.
 * Campos ausentes simplesmente somem — nada é inventado (PRD §4).
 */
export function buildExternalArtPrompt({
  fields = {},
  format = 'post',
  ratio = '1:1',
  brandKit = null,
  brandName = ''
} = {}) {
  const kit = brandKit || {};
  const colors = paletteColors(kit.palette);

  const identity = [
    ['Marca', clean(brandName)],
    ['Segmento', clean(kit.niche)],
    ['Público', clean(kit.audience)],
    ['Tom', clean(kit.tone)],
    ['Estilo', clean(kit.visual_style)],
    ['Cores', colors.join(', ')]
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}.`);

  // Cada bloco é separado por uma linha em branco — inclusive quando um campo
  // opcional fica vazio e some, para o prompt nunca sair com espaçamento torto.
  const blocks = [
    'Crie uma arte profissional para Instagram.',
    [`Formato: ${artFormatLabel(format, ratio)}.`, ...identity].join('\n'),
    block('Assunto:', fields.subject),
    block('Texto principal:', fields.headline),
    block('Texto secundário:', fields.subheadline),
    block('Chamada para ação:', fields.cta),
    block('Instruções adicionais:', fields.notes),
    `Regras:\n${rules(kit.donts)}`
  ];

  return blocks.filter(Boolean).join('\n\n').trim();
}

export function validateExternalArtFile(file) {
  if (!file) return { ok: false, error: 'Escolha o arquivo baixado do Gemini.' };
  const type = String(file.type || '').toLowerCase();
  if (!EXTERNAL_ART_MIME.includes(type)) {
    return { ok: false, error: 'Formato não suportado. Envie PNG, JPG, JPEG ou WEBP.' };
  }
  if (Number(file.size) > EXTERNAL_ART_MAX_BYTES) {
    return { ok: false, error: 'Arquivo acima de 15 MB. Reduza a imagem e tente de novo.' };
  }
  return { ok: true };
}

// Proporção diferente não bloqueia (PRD §8): só avisa que vai sobrar corte.
export function aspectWarning({ width, height }, format, ratio) {
  const expected = ratioValue(artRatio(format, ratio));
  const actual = Number(width) / Number(height);
  if (!expected || !Number.isFinite(actual) || actual <= 0) return '';
  if (Math.abs(actual - expected) / expected <= 0.02) return '';
  return `A imagem enviada não está em ${artRatio(format, ratio)}. Ela entra assim mesmo — ajuste o enquadramento no canvas.`;
}
