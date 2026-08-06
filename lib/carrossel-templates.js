import { OBJETIVOS, TIPOS } from '@/lib/carrossel-tipos';

// Catálogo de templates de carrossel. Ele é definido no repo do Carrossel
// Studio (`src/lib/templates/index.ts`) — aqui só se consome. Duplicar a lista
// criaria duas verdades que divergem no primeiro template novo.
const STUDIO_URL = process.env.NEXT_PUBLIC_CARROSSEL_STUDIO_URL || 'http://localhost:3100';

// Espelho mínimo para quando o Studio não responde: a Biblioteca continua de
// pé, sem prévia, e diz que a prévia está fora — em vez de mostrar grade vazia
// como se a marca não tivesse template nenhum.
const FALLBACK = [
  { id: 'editorial-dark', name: 'Retrato Manchete', blurb: 'Retrato sangrado, selo no topo e manchete colada na base.', funnelStage: 'Topo' },
  { id: 'recorte-editorial', name: 'Recorte Editorial', blurb: 'Pessoa à direita, coluna de texto à esquerda.', funnelStage: 'Topo' },
  { id: 'palavra-marcada', name: 'Palavra Marcada', blurb: 'Sem foto: manchete gigante com palavra em vermelho.', funnelStage: 'Topo' },
  { id: 'manchete-noticia', name: 'Manchete de Notícia', blurb: 'Tarja de editoria, subtítulo e faixa de rodapé.', funnelStage: 'Topo' },
  { id: 'split-frame', name: 'Foto em Cima', blurb: 'Foto sangrada na metade de cima, texto embaixo.', funnelStage: 'Meio' },
  { id: 'foto-embaixo', name: 'Foto Embaixo', blurb: 'Serifada no topo e foto ancorada na metade de baixo.', funnelStage: 'Meio' },
  { id: 'bloco-sobre-foto', name: 'Bloco Sobre Foto', blurb: 'Foto em tela cheia com cartão de texto por cima.', funnelStage: 'Meio' },
  { id: 'revista-cultural', name: 'Revista Cultural', blurb: 'Índigo, serifada creme e subtítulo manteiga.', funnelStage: 'Meio' },
  { id: 'paper-card', name: 'Papel Serifado', blurb: 'Bege e serifada, coluna estreita e assinatura.', funnelStage: 'Meio' },
  { id: 'chapado-brasa', name: 'Chapado Brasa', blurb: 'Vermelho na arte inteira, dois pesos opostos.', funnelStage: 'Meio' },
  { id: 'preto-foto-central', name: 'Preto com Foto Central', blurb: 'Foto colorida centralizada dentro do preto.', funnelStage: 'Meio' },
  { id: 'branco-respiro', name: 'Branco Respiro', blurb: 'Muito vazio, régua fina e conclusão no pé.', funnelStage: 'Meio' },
  { id: 'mosaico-provas', name: 'Mosaico de Provas', blurb: 'Três fotos como prova e linhas de checagem.', funnelStage: 'Meio' },
  { id: 'print-no-texto', name: 'Print no Texto', blurb: 'Captura pequena embutida no texto corrido.', funnelStage: 'Meio' },
  { id: 'numbered-list', name: 'Lista com Imagem', blurb: 'Linhas com seta e lead-in, com foto no pé.', funnelStage: 'Meio' },
  { id: 'quote-card', name: 'Citação com Retrato', blurb: 'Etiqueta, filete vertical e citação sobre retrato.', funnelStage: 'Meio' },
  { id: 'texto-longo', name: 'Texto Longo', blurb: 'Sem foto: dois parágrafos que aguentam texto de verdade.', funnelStage: 'Meio' },
  { id: 'before-after', name: 'Antes e Depois', blurb: 'Duas fotos rotuladas e um veredito embaixo.', funnelStage: 'Meio' },
  { id: 'bold-numbers', name: 'Dado em Destaque', blurb: 'Número gigante ao lado da manchete.', funnelStage: 'Meio' },
  { id: 'fecho-palavra', name: 'Fecho com Palavra', blurb: 'Moldura e uma palavra gigante pedindo comentário.', funnelStage: 'Fecho' }
];

/**
 * Quais tipos de conteúdo usam este template — e, por eles, quais objetivos.
 *
 * Conta o sugerido e os alternativos: a biblioteca tem mais formas do que
 * tipos, e um template só ligado ao "sugerido" sumiria do filtro por objetivo
 * como se não servisse para nada.
 */
export function tiposDoTemplate(templateId) {
  return TIPOS.filter((tipo) => (
    tipo.templateSugerido === templateId
    || (tipo.templatesAlternativos || []).includes(templateId)
  ));
}

export function objetivosDoTemplate(templateId) {
  const ids = new Set(tiposDoTemplate(templateId).map((tipo) => tipo.objetivo));
  return OBJETIVOS.filter((objetivo) => ids.has(objetivo.id));
}

/**
 * Card da Biblioteca a partir do template do Studio.
 *
 * `href` já leva o tipo junto quando existe um: escolher "Editorial Noturno" e
 * cair no Studio sem tipo faria a pessoa responder duas vezes a mesma pergunta.
 */
function toCard(template, { online }) {
  const tipos = tiposDoTemplate(template.id);
  const tipo = tipos.find((item) => item.carroChefe) || tipos[0] || null;
  const params = new URLSearchParams({ format: 'carrossel', template: template.id });
  if (tipo) params.set('tipo', tipo.id);

  return {
    kind: 'template',
    id: `template:${template.id}`,
    name: template.name,
    blurb: template.blurb,
    funnelStage: template.funnelStage,
    // De qual padrão das referências a planta saiu. Sem isso a Biblioteca vira
    // uma vitrine de nomes bonitos e ninguém consegue auditar a escolha.
    reference: template.reference || null,
    // A prévia é servida pelo Studio; sem ele no ar não há imagem para mostrar.
    previewUrl: online && template.preview ? `${STUDIO_URL}${template.preview}` : null,
    // Capa, miolo e fecho. É o que a prévia da Biblioteca abre: julgar layout
    // pela capa foi exatamente o erro que fez a biblioteca anterior parecer
    // sete vezes o mesmo template.
    previewSlides: online && Array.isArray(template.previewSlides)
      ? template.previewSlides.map((slide) => `${STUDIO_URL}${slide}`)
      : [],
    objetivos: objetivosDoTemplate(template.id).map((objetivo) => objetivo.id),
    tipoLabel: tipo?.label || null,
    format: 'carrossel',
    href: `/composer?${params.toString()}`
  };
}

/**
 * Busca o catálogo no Studio. Revalida a cada hora: template novo é evento de
 * deploy, não de request.
 */
export async function listStudioTemplates() {
  try {
    const response = await fetch(`${STUDIO_URL}/api/templates`, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    const templates = Array.isArray(data?.templates) ? data.templates : [];
    if (!templates.length) throw new Error('catálogo vazio');
    return { online: true, cards: templates.map((template) => toCard(template, { online: true })) };
  } catch {
    return { online: false, cards: FALLBACK.map((template) => toCard(template, { online: false })) };
  }
}
