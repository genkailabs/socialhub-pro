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
    // Imagem e carrossel dividem o produtor: uma chamada só devolve hook,
    // legenda, CTA, hashtags e slides (§11.2). Separar sairia mais caro sem
    // ganho — o que muda entre eles é a quantidade de telas.
    producerSkill: 'post-producer',
    publisher: 'instagram-image'
  },
  {
    id: 'carousel',
    label: 'Carrossel',
    hint: 'Varias telas, para ensinar passo a passo.',
    plannable: true,
    publishable: true,
    producerSkill: 'post-producer',
    publisher: 'instagram-carousel'
  },
  {
    id: 'reel',
    label: 'Reel',
    hint: 'Video curto, para alcancar quem ainda nao segue.',
    // MVP V2 §12: o MVP não gera roteiro de vídeo (cenas, falas, instruções de
    // câmera). Reel sai do planejamento e volta num módulo próprio,
    // "Assistente de Vídeos". O formato continua no registro para não quebrar
    // itens já planejados na base — só deixa de ser oferecido.
    plannable: false,
    // Entregue como roteiro: o usuário grava e posta (§5.1).
    publishable: false,
    producerSkill: 'reel-producer',
    publisher: null
  },
  {
    id: 'stories',
    label: 'Stories',
    hint: 'Sequencia do dia, para manter presenca e conversar.',
    plannable: true,
    // MVP V2: Story deixou de ser roteiro de gravação e virou arte estática
    // 1080x1920. Como o sistema gera a arte, ele também posta — via
    // media_type=STORIES na Graph API.
    publishable: true,
    producerSkill: 'story-planner',
    publisher: 'instagram-story'
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

// Ids que o Planejador pode escolher. Separado de formatIds() de propósito:
// formatIds() é tudo que existe (inclusive o que já está gravado na base),
// este é só o que se oferece hoje (§12).
export function plannableFormatIds() {
  return plannableFormats().map((f) => f.id);
}

export function publishableFormats() {
  return FORMATS.filter((f) => f.publishable);
}

// Formato desconhecido nunca é publicável: na dúvida, não posta no perfil de
// ninguém.
export function isPublishable(id) {
  return Boolean(formatById(id)?.publishable);
}

// Formato que o Social Hub não posta sozinho. A tela avisa que a postagem é
// sua — o sistema não pode afirmar ter publicado o que não publicou.
//
// Depende de publicabilidade, NÃO de o formato ainda ser oferecido: um Reel
// planejado antes do §12 continua existindo na base e continua sendo o usuário
// quem posta. Amarrar isso a `plannable` faria esses itens perderem o aviso.
export function needsManualPosting(id) {
  const f = formatById(id);
  return Boolean(f && !f.publishable);
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
