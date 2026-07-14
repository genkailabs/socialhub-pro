// Opções do Wizard de onboarding. Rótulos amigáveis; valores gravados nas colunas
// TEXT/TEXT[] existentes de brand_kits (a IA normaliza emoji/cta/visual no fim).

export const OBJECTIVES = [
  { value: 'vender', label: 'Vender', hint: 'Foco em conversão e ofertas.' },
  { value: 'educar', label: 'Educar', hint: 'Ensinar e gerar autoridade.' },
  { value: 'captar_leads', label: 'Captar leads', hint: 'Trazer contatos qualificados.' },
  { value: 'fortalecer_marca', label: 'Fortalecer marca', hint: 'Reconhecimento e presença.' }
];

// Passo 2 — tom (multi, até 3). Guardado como string única em `tone`.
export const TONES = [
  'Profissional', 'Amigável', 'Técnica', 'Inspiradora', 'Elegante',
  'Moderna', 'Divertida', 'Premium', 'Consultiva', 'Autoritária'
];

// Passo 3 — personalidade (multi, até 5). Guardado em `personality[]`.
export const PERSONALITIES = [
  'Inovadora', 'Confiável', 'Didática', 'Criativa', 'Moderna',
  'Premium', 'Humana', 'Sofisticada', 'Jovem', 'Minimalista'
];

// Passo 4
export const STORYTELLING = [
  { value: 'sim', label: 'Sim', hint: 'A IA prioriza histórias.' },
  { value: 'nao', label: 'Não', hint: 'A IA vai direto ao ponto.' }
];
export const EMOJIS = [
  { value: 'nunca', label: 'Nunca', impact: 'Sem emojis nos conteúdos.' },
  { value: 'poucos', label: 'Poucos', impact: 'Entre 0 e 3 emojis por conteúdo.' },
  { value: 'medio', label: 'Médio', impact: 'Alguns emojis, com equilíbrio.' },
  { value: 'muitos', label: 'Muitos', impact: 'Vários emojis, tom mais leve.' }
];
export const CAPTIONS = [
  { value: 'curta', label: 'Curta', impact: '~50 a 150 palavras.' },
  { value: 'média', label: 'Média', impact: '~150 a 300 palavras.' },
  { value: 'longa', label: 'Longa', impact: '300 palavras ou mais.' }
];
export const CTAS = [
  { value: 'sempre', label: 'Sempre vender', impact: 'CTA de venda em todo post.' },
  { value: 'educar', label: 'Educar', impact: 'Convida a aprender mais.' },
  { value: 'conversa', label: 'Gerar conversa', impact: 'Estimula comentários e respostas.' },
  { value: 'captar_leads', label: 'Captar leads', impact: 'Direciona para contato/cadastro.' },
  { value: 'nunca', label: 'Nunca', impact: 'Sem chamada para ação.' }
];

// Passo 5 — estilo das artes. Guardado em `visual_style` (TEXT).
export const STYLES = [
  { value: 'minimalista', label: 'Minimalista' },
  { value: 'moderno', label: 'Moderno' },
  { value: 'premium', label: 'Premium' },
  { value: 'criativo', label: 'Criativo' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'elegante', label: 'Elegante' }
];

export const STEP_TITLES = [
  'Sobre sua empresa',
  'Como sua marca conversa?',
  'Personalidade da marca',
  'Conteúdo',
  'Visual',
  'Fontes para a IA'
];
