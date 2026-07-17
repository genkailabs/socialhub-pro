// Registro de formatos do Instagram (PRD §5.1 / §10.1). Puro, sem I/O.
//
// Ponto único de verdade sobre o que existe e o que cada coisa sabe fazer.
//
// A regra que sustenta o resto: FORMATO e PUBLICABILIDADE são independentes.
// A IA planeja e produz os quatro formatos — uma semana real de Instagram tem
// Reels e Stories, e amarrar o Planejador ao que o publicador automatiza hoje
// produziria uma estratégia pobre, que teria de ser refeita depois.
//
// Nenhuma skill pergunta se um formato é publicável: isso é assunto do
// publicador. Ligar Reels no futuro = escrever o publicador e virar a flag.

export const FORMATS = [
  {
    id: 'image',
    label: 'Imagem',
    hint: 'Uma arte só, para fixar uma ideia.',
    plannable: true,
    publishable: true,
    producerSkill: 'copywriter',
    publisher: 'instagram-image'
  },
  {
    id: 'carousel',
    label: 'Carrossel',
    hint: 'Varias telas, para ensinar passo a passo.',
    plannable: true,
    publishable: true,
    producerSkill: 'carousel',
    publisher: 'instagram-carousel'
  },
  {
    id: 'reel',
    label: 'Reel',
    hint: 'Video curto, para alcancar quem ainda nao segue.',
    plannable: true,
    // Entregue como roteiro: o usuário grava e posta (§5.1).
    publishable: false,
    producerSkill: 'reels',
    publisher: null
  },
  {
    id: 'stories',
    label: 'Stories',
    hint: 'Sequencia do dia, para manter presenca e conversar.',
    plannable: true,
    // Entregue como sequência: o usuário posta (§5.1).
    publishable: false,
    producerSkill: 'story-planner',
    publisher: null
  }
];

const BY_ID = new Map(FORMATS.map((f) => [f.id, f]));

export function formatById(id) {
  return BY_ID.get(id) || null;
}

export function formatIds() {
  return FORMATS.map((f) => f.id);
}

export function plannableFormats() {
  return FORMATS.filter((f) => f.plannable);
}

export function publishableFormats() {
  return FORMATS.filter((f) => f.publishable);
}

// Formato desconhecido nunca é publicável: na dúvida, não posta no perfil de
// ninguém.
export function isPublishable(id) {
  return Boolean(formatById(id)?.publishable);
}

// Formato planejável que o Social Hub não posta sozinho. A tela avisa que a
// postagem é sua — o sistema não pode afirmar ter publicado o que não publicou.
export function needsManualPosting(id) {
  const f = formatById(id);
  return Boolean(f && f.plannable && !f.publishable);
}

export function producerOf(id) {
  return formatById(id)?.producerSkill || null;
}

export function publisherOf(id) {
  return formatById(id)?.publisher || null;
}

// Rótulos para o prompt: a IA escolhe entre estes, com a dica de quando usar.
export function formatMenu() {
  return plannableFormats().map((f) => `${f.id} (${f.label}: ${f.hint})`).join('; ');
}
