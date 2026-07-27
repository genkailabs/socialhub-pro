// Biblioteca de componentes reutilizáveis (PRD §5). Puro, sem I/O.
//
// Um componente NÃO é um desenho: é a descrição de um papel na peça (o que ele
// escreve, quanto texto aguenta, que tipo de camada vira no Composer e se o
// usuário pode trocar o conteúdo dele depois). Quem posiciona é a estrutura
// (§4); quem define a aparência é o estilo (§6). Essa separação é o que permite
// a mesma estrutura servir advogado e cafeteria (§7).
//
// `layerType` usa o vocabulário que o Composer já renderiza hoje
// (lib/composer-layer-style.js): text | button | shape | line | icon | sticker.
// Nada aqui inventa um tipo novo — a peça gerada tem que ser editável no canvas.

// `styleRole` conecta o componente à escala tipográfica do estilo. Sem isso cada
// componente teria tamanho fixo e a peça não responderia ao estilo escolhido.
export const STYLE_ROLES = ['eyebrow', 'title', 'subtitle', 'body', 'cta', 'meta', 'number'];

// `behavior`:
//   'dynamic' — o conteúdo vem do post (§11 "elementos dinâmicos");
//   'fixed'   — decoração/estrutura que o template preserva (§11 "elementos fixos").
export const COMPONENTS = [
  {
    id: 'titulo',
    label: 'Título',
    layerType: 'text',
    styleRole: 'title',
    behavior: 'dynamic',
    field: 'title',
    required: true,
    limits: { min: 3, max: 90 },
    defaults: { weight: 800, align: 'left', lh: 1.05, fill: 'transparent' }
  },
  {
    id: 'subtitulo',
    label: 'Subtítulo',
    layerType: 'text',
    styleRole: 'subtitle',
    behavior: 'dynamic',
    field: 'subtitle',
    limits: { max: 160 },
    defaults: { weight: 400, align: 'left', lh: 1.28, fill: 'transparent' }
  },
  {
    id: 'imagem-principal',
    label: 'Imagem principal',
    // A imagem principal não vira camada: ela ocupa `surface.media`, que é o
    // plano de fundo manipulável do Composer (zoom, arraste, corte).
    layerType: 'media',
    styleRole: null,
    behavior: 'dynamic',
    field: 'imageUrl'
  },
  {
    id: 'selo-categoria',
    label: 'Selo de categoria',
    layerType: 'button',
    styleRole: 'eyebrow',
    behavior: 'dynamic',
    field: 'eyebrow',
    limits: { max: 24 },
    defaults: { weight: 700, align: 'center', tt: 'upper', ls: 1, radius: 999 }
  },
  {
    id: 'logo',
    label: 'Logo',
    layerType: 'text',
    styleRole: 'meta',
    behavior: 'dynamic',
    field: 'brand',
    limits: { max: 32 },
    // §14 cobra distância da borda: a margem de segurança do logo é maior que a
    // dos demais porque ele é o elemento que o olho usa para achar a marca.
    safeMarginFactor: 1.4,
    defaults: { weight: 700, align: 'left', fill: 'transparent' }
  },
  {
    id: 'cta',
    label: 'CTA',
    layerType: 'button',
    styleRole: 'cta',
    behavior: 'dynamic',
    field: 'cta',
    limits: { max: 32 },
    defaults: { weight: 700, align: 'center', radius: 999 }
  },
  {
    id: 'numero-slide',
    label: 'Número do slide',
    layerType: 'text',
    styleRole: 'meta',
    behavior: 'dynamic',
    field: 'slideNumber',
    limits: { max: 6 },
    defaults: { weight: 700, align: 'right', fill: 'transparent' }
  },
  {
    id: 'rodape',
    label: 'Rodapé',
    layerType: 'text',
    styleRole: 'meta',
    behavior: 'dynamic',
    field: 'footer',
    limits: { max: 60 },
    defaults: { weight: 400, align: 'left', fill: 'transparent' }
  },
  {
    id: 'citacao',
    label: 'Bloco de citação',
    layerType: 'text',
    styleRole: 'title',
    behavior: 'dynamic',
    field: 'quote',
    limits: { max: 140 },
    // Aspas entram no texto da camada: continuam editáveis, ao contrário de um
    // ornamento desenhado por fora que o usuário não consegue remover.
    wrap: ['“', '”'],
    defaults: { weight: 700, align: 'left', italic: true, lh: 1.18, fill: 'transparent' }
  },
  {
    id: 'destaque-palavra',
    label: 'Destaque de palavra',
    layerType: 'text',
    styleRole: 'subtitle',
    behavior: 'dynamic',
    field: 'highlight',
    limits: { max: 28 },
    defaults: { weight: 800, align: 'center', tt: 'upper', bgMode: 'box', bgRadius: 8, fill: 'transparent' }
  },
  {
    id: 'estatistica',
    label: 'Bloco de estatística',
    layerType: 'text',
    styleRole: 'number',
    behavior: 'dynamic',
    field: 'stat',
    limits: { max: 10 },
    defaults: { weight: 800, align: 'left', lh: 1, fill: 'transparent' }
  },
  {
    id: 'estatistica-legenda',
    label: 'Legenda da estatística',
    layerType: 'text',
    styleRole: 'body',
    behavior: 'dynamic',
    field: 'statLabel',
    limits: { max: 90 },
    defaults: { weight: 400, align: 'left', lh: 1.25, fill: 'transparent' }
  },
  {
    id: 'comparacao',
    label: 'Comparação',
    // Um lado da comparação. A estrutura coloca dois, com `slotData` diferente.
    layerType: 'text',
    styleRole: 'body',
    behavior: 'dynamic',
    field: 'bullets',
    index: true,
    limits: { max: 70 },
    defaults: { weight: 600, align: 'left', lh: 1.25, radius: 14 }
  },
  {
    id: 'lista',
    label: 'Lista',
    layerType: 'text',
    styleRole: 'body',
    behavior: 'dynamic',
    field: 'bullets',
    index: true,
    limits: { max: 70 },
    defaults: { weight: 600, align: 'left', lh: 1.25, fill: 'transparent' }
  },
  {
    id: 'aviso',
    label: 'Aviso',
    layerType: 'text',
    styleRole: 'body',
    behavior: 'dynamic',
    field: 'warning',
    limits: { max: 120 },
    defaults: { weight: 600, align: 'left', lh: 1.25, radius: 12 }
  },
  {
    id: 'pergunta',
    label: 'Pergunta',
    layerType: 'text',
    styleRole: 'title',
    behavior: 'dynamic',
    field: 'question',
    limits: { max: 90 },
    // Sem "?" a pergunta lê como afirmação; o sufixo só entra se faltar.
    suffix: '?',
    defaults: { weight: 800, align: 'left', lh: 1.08, fill: 'transparent' }
  },
  {
    id: 'box-informativo',
    label: 'Box informativo',
    layerType: 'text',
    styleRole: 'body',
    behavior: 'dynamic',
    field: 'info',
    limits: { max: 180 },
    defaults: { weight: 400, align: 'left', lh: 1.3, radius: 16 }
  },
  {
    id: 'painel',
    label: 'Painel de fundo',
    layerType: 'shape',
    styleRole: null,
    behavior: 'fixed',
    defaults: { shape: 'rect', text: '', radius: 20 }
  },
  {
    id: 'sobreposicao',
    label: 'Sobreposição',
    // Véu sobre a foto. Sem ele, texto claro sobre imagem clara some — é a mesma
    // razão do `scrim` da arte rasterizada (lib/ai/art/primitives.js).
    layerType: 'shape',
    styleRole: null,
    behavior: 'fixed',
    defaults: { shape: 'rect', text: '', radius: 0, op: 0.55, fill: '#000000' }
  },
  {
    id: 'divisor',
    label: 'Divisor',
    layerType: 'line',
    styleRole: null,
    behavior: 'fixed',
    defaults: { dash: 'solid', cap: 'round', text: '' }
  },
  {
    id: 'data',
    label: 'Data',
    layerType: 'text',
    styleRole: 'meta',
    behavior: 'dynamic',
    field: 'date',
    limits: { max: 24 },
    defaults: { weight: 600, align: 'right', fill: 'transparent' }
  }
];

const BY_ID = new Map(COMPONENTS.map((component) => [component.id, component]));

export function componentById(id) {
  return BY_ID.get(id) || null;
}

export function componentIds() {
  return COMPONENTS.map((component) => component.id);
}

// §11: o "Salvar como layout" precisa saber o que é fixo e o que é dinâmico.
export function dynamicComponentIds() {
  return COMPONENTS.filter((component) => component.behavior === 'dynamic').map((c) => c.id);
}

export function fixedComponentIds() {
  return COMPONENTS.filter((component) => component.behavior === 'fixed').map((c) => c.id);
}

// Corta no limite do componente sem partir palavra ao meio. É a correção do §14
// para "excesso de caracteres": encurtar é honesto, deixar estourar não.
export function trimToLimit(value, limit) {
  const text = String(value ?? '').trim();
  if (!limit || text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

/**
 * Texto final de um componente, já com limite, prefixo/sufixo e envelope.
 * Devolve string vazia quando o conteúdo não existe — quem decide se o slot
 * some é o build (§14: slot vazio não pode virar caixa fantasma).
 */
export function componentText(component, content = {}, slotIndex = null) {
  if (!component?.field) return '';
  const raw = component.index && Array.isArray(content[component.field])
    ? content[component.field][slotIndex ?? 0]
    : content[component.field];
  let text = trimToLimit(raw, component.limits?.max);
  if (!text) return '';
  if (component.suffix && !text.endsWith(component.suffix)) text += component.suffix;
  if (component.wrap) text = `${component.wrap[0]}${text}${component.wrap[1]}`;
  return text;
}
