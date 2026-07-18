// Sugestões de tema pré-definidas (zero custo, sem IA). Templates com {tema}
// que se compõem com o assunto digitado pelo usuário. Modo Guiado usa isto no
// lugar de uma chamada de IA por tema — grátis, instantâneo e curado.

const UNIVERSAL = [
  { title: '3 erros comuns sobre {tema}', description: 'Alerta educativo' },
  { title: 'O que mudou em {tema} em 2026', description: 'Atualidade' },
  { title: '{tema}: Mito vs. Realidade', description: 'Desmistificação' },
  { title: '5 dicas práticas de {tema}', description: 'Tutorial rápido' },
  { title: 'Por que {tema} importa para você', description: 'Conexão pessoal' },
  { title: 'Perguntas frequentes sobre {tema}', description: 'FAQ' }
];

// Blocos por nicho (sobrepõem os universais quando o nicho casa). Chave =
// termo que deve aparecer no campo `niche` do Brand Kit (texto livre).
const BY_NICHE = {
  advocacia: [
    { title: '{tema}: o que a lei diz', description: 'Parecer simplificado' },
    { title: '3 cláusulas que você ignora em {tema}', description: 'Alerta de risco' },
    { title: 'Advogado explica: {tema}', description: 'Autoridade no assunto' }
  ],
  saude: [
    { title: 'Sintomas de {tema} que você não deve ignorar', description: 'Alerta de saúde' },
    { title: '{tema}: o que a ciência diz hoje', description: 'Evidência atualizada' },
    { title: 'Mitos sobre {tema} que prejudicam sua saúde', description: 'Desmistificação' },
    { title: '{tema}: antes e depois', description: 'Transformação visual' },
    { title: 'Quando procurar um especialista sobre {tema}', description: 'Orientação' }
  ],
  arquitetura: [
    { title: '{tema}: tendências para 2026', description: 'Inspiração' },
    { title: 'Antes e depois: {tema}', description: 'Transformação visual' },
    { title: '{tema} em espaços pequenos', description: 'Solução prática' }
  ]
};

// Termos livres → chave de bloco. Medicina e odontologia dividem o bloco saúde.
const NICHE_ALIASES = [
  { keys: ['advoca', 'juridic', 'direito'], block: 'advocacia' },
  { keys: ['medic', 'saude', 'odonto', 'dent', 'clinic', 'nutri', 'psic', 'fisio'], block: 'saude' },
  { keys: ['arquitet', 'design', 'interior', 'engenharia', 'obra'], block: 'arquitetura' }
];

function deaccent(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function nicheBlock(niche) {
  const n = deaccent(niche);
  const match = NICHE_ALIASES.find((a) => a.keys.some((k) => n.includes(k)));
  return match ? BY_NICHE[match.block] : [];
}

export function staticSuggestions({ topic, niche, count = 6 } = {}) {
  const theme = String(topic || '').trim();
  if (!theme) return [];
  // nicho primeiro (mais relevante), depois universais — ordem curada, estável.
  const list = [...nicheBlock(niche), ...UNIVERSAL].slice(0, count);
  return list.map((t) => ({
    title: t.title.replace(/\{tema\}/g, theme),
    description: t.description
  }));
}

// Presets de tom do Modo Guiado — 3 cards visuais em vez de jargão livre.
export const TONE_PRESETS = [
  { emoji: '😊', label: 'Leve e amigável', value: 'leve, amigável e acessível' },
  { emoji: '🎓', label: 'Sério e técnico', value: 'sério, técnico e preciso' },
  { emoji: '⚡', label: 'Direto e urgente', value: 'direto, objetivo e com senso de urgência' }
];
