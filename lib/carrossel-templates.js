import { OBJETIVOS, TIPOS } from '@/lib/carrossel-tipos';

// Catálogo de templates de carrossel. Ele é definido no repo do Carrossel
// Studio (`src/lib/templates/index.ts`) — aqui só se consome. Duplicar a lista
// criaria duas verdades que divergem no primeiro template novo.
const STUDIO_URL = process.env.NEXT_PUBLIC_CARROSSEL_STUDIO_URL || 'http://localhost:3100';

// Espelho mínimo para quando o Studio não responde: a Biblioteca continua de
// pé, sem prévia, e diz que a prévia está fora — em vez de mostrar grade vazia
// como se a marca não tivesse template nenhum.
const FALLBACK = [
  { id: 'editorial-dark', name: 'Editorial Noturno', blurb: 'Foto sangrada, gradiente e manchete serif.', funnelStage: 'Topo' },
  { id: 'bold-numbers', name: 'Números em Destaque', blurb: 'Dado grande na capa, para prova e resultado.', funnelStage: 'Topo' },
  { id: 'quote-card', name: 'Citação', blurb: 'Bloco de cor com citação centralizada.', funnelStage: 'Topo' },
  { id: 'split-frame', name: 'Quadro Dividido', blurb: 'Meia foto, meio texto.', funnelStage: 'Meio' },
  { id: 'numbered-list', name: 'Lista Numerada', blurb: 'Passos numerados, um por slide.', funnelStage: 'Meio' },
  { id: 'before-after', name: 'Antes e Depois', blurb: 'Comparação lado a lado.', funnelStage: 'Meio' },
  { id: 'paper-card', name: 'Papel', blurb: 'Fundo claro, ar de manifesto impresso.', funnelStage: 'Meio' }
];

/** Quais tipos de conteúdo usam este template — e, por eles, quais objetivos. */
export function tiposDoTemplate(templateId) {
  return TIPOS.filter((tipo) => tipo.templateSugerido === templateId);
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
    // A prévia é servida pelo Studio; sem ele no ar não há imagem para mostrar.
    previewUrl: online && template.preview ? `${STUDIO_URL}${template.preview}` : null,
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
