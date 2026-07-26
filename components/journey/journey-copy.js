// O que o Hub fala em cada etapa da jornada.
//
// Separado dos componentes porque texto muda muito mais do que comportamento —
// e porque assim dá para ler a jornada inteira de uma vez, como um roteiro.

export const JOURNEY_COPY = {
  brand: {
    title: 'Vamos começar pela sua marca',
    lines: [
      'Só preciso do nome por enquanto — o resto eu descubro com você.',
      'Cada marca tem seu próprio Instagram, seu DNA e seu calendário.'
    ]
  },
  connect: {
    title: 'Agora conecte o Instagram',
    lines: [
      'É de lá que eu leio seu perfil, seus posts e o que já funciona.',
      'A conta precisa ser Profissional e estar ligada a uma Página do Facebook.',
      'Não publico nada sem você aprovar.'
    ]
  },
  diagnose: {
    title: 'Deixa eu ler o seu perfil',
    lines: [
      'Vou olhar bio, últimos posts e métricas para entender o que já funciona.',
      'Isso leva alguns segundos e é o retrato de onde você está hoje.'
    ]
  },
  dna: {
    title: 'Quem é a sua marca?',
    lines: [
      'Com o que li do seu perfil, monto o Brand DNA: nicho, público, tom de voz.',
      'Você revisa e aprova — é ele que guia tudo o que vem depois.'
    ]
  },
  strategy: {
    title: 'Com que frequência você quer publicar?',
    lines: [
      'A partir do seu DNA eu monto a estratégia: pilares, formatos e ritmo.',
      'Escolha o ritmo que cabe na sua rotina, não o mais ambicioso.'
    ]
  },
  plan: {
    title: 'Último passo: o plano da semana',
    lines: [
      'Vou transformar a estratégia em ideias de post, dia a dia.',
      'Nada é publicado sozinho: você aprova tema por tema.'
    ]
  },
  done: {
    title: 'Pronto. O hub é seu.',
    lines: [
      'O menu está liberado — todas as telas já têm o que mostrar.',
      'Quando precisar, eu explico cada tela por dentro.'
    ]
  }
};

// Objetivos possíveis da marca. Herdados do wizard antigo, que era a única
// parte dele que fazia diferença no resultado: o objetivo entra no prompt do
// Brand DNA e depois na estratégia.
export const JOURNEY_OBJECTIVES = [
  { value: 'vender', label: 'Vender produtos ou serviços', hint: 'Conversão, ofertas claras, chamada direta para compra.' },
  { value: 'educar', label: 'Educar o mercado', hint: 'Ensinar conceitos, tirar dúvidas, gerar autoridade técnica.' },
  { value: 'captar_leads', label: 'Captar contatos', hint: 'Atrair interessados para o WhatsApp ou um formulário.' },
  { value: 'fortalecer_marca', label: 'Fortalecer a marca', hint: 'Reconhecimento, posicionamento, bastidores e valores.' },
  { value: 'gerar_autoridade', label: 'Virar referência', hint: 'Depoimentos, cases e diferenciais em destaque.' }
];

// Frequências oferecidas na jornada. `perWeek` é o que a estratégia entende;
// content_plans.posts_per_day não representa "3x por semana".
export const JOURNEY_FREQUENCIES = [
  { value: '3x_semana', label: '3x por semana', perWeek: 3, hint: 'Presença constante com tempo tranquilo de produção.' },
  { value: '5x_semana', label: '5x por semana', perWeek: 5, hint: 'Ritmo de segunda a sexta.' },
  { value: 'diario', label: 'Todo dia', perWeek: 7, hint: 'Máximo alcance, exige mais produção.' }
];
