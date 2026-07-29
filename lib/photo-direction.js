// Direção de foto (PRD 02 §4). Puro, sem I/O.
//
// Os mesmos controles servem a dois destinos diferentes, e é por isso que cada
// opção carrega dois vocabulários:
//
// - `search`: termos que entram na busca do banco de imagens. Em inglês porque
//   o acervo do Pexels é indexado em inglês — buscar "meio corpo" devolve menos
//   e pior que "waist up".
// - `prompt`: trecho que entra no prompt da imagem gerada por IA.
//
// O que este módulo NÃO faz: prometer que a foto obedece. Banco de imagens é
// busca, não encomenda — o filtro melhora o resultado, não o garante. Quem
// decide se serve é quem olha.

const GROUPS = [
  {
    id: 'enquadramento',
    label: 'Enquadramento',
    options: [
      { id: 'close', label: 'Close no rosto', search: 'close up face portrait', prompt: 'tight close-up of the face' },
      { id: 'meio-corpo', label: 'Meio corpo', search: 'waist up portrait', prompt: 'waist-up framing' },
      { id: 'corpo-inteiro', label: 'Corpo inteiro', search: 'full body', prompt: 'full body framing' }
    ]
  },
  {
    id: 'olhar',
    label: 'Olhar',
    options: [
      { id: 'camera', label: 'Para a câmera', search: 'looking at camera', prompt: 'looking straight at the camera' },
      { id: 'lado', label: 'Para o lado', search: 'looking away', prompt: 'looking away from the camera' }
    ]
  },
  {
    id: 'expressao',
    label: 'Expressão',
    options: [
      { id: 'confiante', label: 'Confiante', search: 'confident', prompt: 'confident expression' },
      { id: 'neutra', label: 'Neutra', search: 'neutral expression', prompt: 'neutral expression' },
      { id: 'alegre', label: 'Alegre', search: 'smiling happy', prompt: 'genuine smile' }
    ]
  },
  {
    id: 'fundo',
    label: 'Fundo',
    options: [
      { id: 'claro', label: 'Claro', search: 'light background', prompt: 'bright clean background' },
      { id: 'escuro', label: 'Escuro', search: 'dark background', prompt: 'dark moody background' },
      { id: 'desfocado', label: 'Desfocado', search: 'blurred background bokeh', prompt: 'shallow depth of field, blurred background' }
    ]
  },
  {
    id: 'estilo',
    label: 'Estilo',
    options: [
      { id: 'corporativo', label: 'Corporativo', search: 'business professional', prompt: 'corporate photography' },
      { id: 'editorial', label: 'Editorial', search: 'editorial magazine', prompt: 'editorial photography' },
      { id: 'lifestyle', label: 'Lifestyle', search: 'lifestyle candid', prompt: 'candid lifestyle photography' },
      { id: 'tecnologia', label: 'Tecnologia', search: 'technology modern', prompt: 'modern tech photography' },
      { id: 'moda', label: 'Moda', search: 'fashion', prompt: 'fashion photography' },
      { id: 'publicidade', label: 'Publicidade', search: 'advertising product', prompt: 'advertising product photography' }
    ]
  }
];

export const PHOTO_GROUPS = GROUPS;
export const PHOTO_GROUP_IDS = GROUPS.map((g) => g.id);

const OPTION_INDEX = new Map();
for (const group of GROUPS) {
  for (const option of group.options) OPTION_INDEX.set(`${group.id}:${option.id}`, option);
}

export function photoOption(groupId, optionId) {
  return OPTION_INDEX.get(`${groupId}:${optionId}`) || null;
}

// A seleção é um objeto { grupo: opcao }. Grupo sem escolha some da conta em vez
// de virar termo vazio na busca.
function selected(direction = {}) {
  return PHOTO_GROUP_IDS
    .map((groupId) => photoOption(groupId, direction[groupId]))
    .filter(Boolean);
}

/**
 * Consulta para o banco de imagens: o assunto vem primeiro, os modificadores
 * depois. Ordem importa — provedor de busca pesa os primeiros termos.
 */
export function searchQuery(subject = '', direction = {}) {
  const base = String(subject || '').trim();
  const termos = selected(direction).map((o) => o.search);
  return [base, ...termos].filter(Boolean).join(' ').trim();
}

/** Trecho de direção para o prompt da imagem gerada. Vazio quando nada foi escolhido. */
export function promptDirection(direction = {}) {
  return selected(direction).map((o) => o.prompt).join(', ');
}

/**
 * A direção fala de pessoa? Enquadramento, olhar e expressão só fazem sentido
 * com gente na foto — é o que liga o filtro "com pessoa" da busca (§3).
 */
export function impliesPerson(direction = {}) {
  return ['enquadramento', 'olhar', 'expressao'].some((g) => Boolean(photoOption(g, direction[g])));
}

/** Quantas decisões a pessoa tomou. Serve para a tela dizer o que está ativo. */
export function directionCount(direction = {}) {
  return selected(direction).length;
}
