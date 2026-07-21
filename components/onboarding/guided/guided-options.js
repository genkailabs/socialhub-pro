// components/onboarding/guided/guided-options.js
export const GUIDED_STEPS = [
  { step: 0, title: 'Boas-vindas', subtitle: 'Conheça como a inteligência artificial vai preparar tudo para você.' },
  { step: 1, title: 'Conectar Instagram', subtitle: 'Conecte sua conta para que a IA analise seu perfil e suas publicações.' },
  { step: 2, title: 'Análise e Confirmação', subtitle: 'Verifique e confirme os dados essenciais da sua marca.' },
  { step: 3, title: 'Objetivo da Marca', subtitle: 'Selecione o objetivo principal e até dois secundários.' },
  { step: 4, title: 'Frequência de Posts', subtitle: 'Escolha com que frequência deseja publicar.' },
  { step: 5, title: 'Revisão do Brand DNA', subtitle: 'Revise o DNA gerado pela IA antes de ativar.' },
  { step: 6, title: 'Planejamento da Semana', subtitle: 'Suas primeiras ideias de conteúdo prontas para produção.' }
];

export const OBJECTIVES = [
  { value: 'vender', label: 'Vender produtos ou serviços', hint: 'Foco em conversão, ofertas claras e chamadas diretas para compra.' },
  { value: 'educar', label: 'Educar o mercado', hint: 'Ensinar conceitos, tirar dúvidas e gerar autoridade técnica.' },
  { value: 'captar_leads', label: 'Captar leads e contatos', hint: 'Atrair interessados qualificados para conversas no WhatsApp ou formulários.' },
  { value: 'fortalecer_marca', label: 'Fortalecer a marca (Branding)', hint: 'Reconhecimento de marca, posicionamento, bastidores e valores.' },
  { value: 'gerar_autoridade', label: 'Gerar autoridade e referência', hint: 'Destaque para depoimentos, cases de sucesso e diferenciais.' }
];

export const FREQUENCIES = [
  { value: '3x_semana', label: '3x por semana', hint: 'Ideal para manter presença constante com tempo tranquilo de produção.' },
  { value: '5x_semana', label: '5x por semana', hint: 'Ritmo recomendado de segunda a sexta para engajamento contínuo.' },
  { value: 'diario', label: 'Diário (7x por semana)', hint: 'Máximo alcance e crescimento acelerado na rede.' },
  { value: 'ia_decide', label: 'IA decide a frequência', hint: 'A inteligência artificial ajusta conforme seu nicho e melhor alcance.' }
];

export const CLASSIFICATION_BADGES = {
  CONFIRMED: { label: 'Confirmado via Instagram', className: 'border-success/30 bg-success/10 text-success' },
  INFERRED: { label: 'Inferido pela IA', className: 'border-accent/30 bg-accent/10 text-accent' },
  NOT_FOUND: { label: 'Não encontrado', className: 'border-warning/30 bg-warning/10 text-warning' }
};
