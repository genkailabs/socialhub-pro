// Jornada do primeiro uso: do zero até o primeiro plano da semana.
//
// Regra que sustenta o arquivo inteiro: a etapa é DERIVADA de fatos do banco,
// nunca de um contador. Contador mente quando a pessoa faz algo por fora do
// agente (conecta o Instagram pela tela de Conexões, aprova o DNA no Brand Kit)
// e mente de novo quando o dado é legado. Fato não mente.
//
// Puro de propósito: roda igual no servidor, no cliente e no teste.
// A leitura do banco mora em lib/journey-data.js.

export const JOURNEY_STEPS = [
  {
    id: 'brand',
    route: '/dashboard',
    label: 'Criar a marca',
    short: 'Marca'
  },
  {
    id: 'connect',
    route: '/connections',
    label: 'Conectar o Instagram',
    short: 'Instagram'
  },
  {
    id: 'diagnose',
    route: '/instagram/diagnostico',
    label: 'Ler o seu perfil',
    short: 'Diagnóstico'
  },
  {
    id: 'dna',
    route: '/brand-kit',
    label: 'Aprovar o Brand DNA',
    short: 'Brand DNA'
  },
  {
    id: 'strategy',
    route: '/strategy',
    label: 'Aprovar a estratégia',
    short: 'Estratégia'
  },
  {
    id: 'plan',
    route: '/planning',
    label: 'Gerar o plano da semana',
    short: 'Plano'
  }
];

export const EMPTY_FACTS = {
  hasBrand: false,
  igConnected: false,
  hasAudit: false,
  dnaApproved: false,
  strategyApproved: false,
  hasPlanItems: false
};

// Um fato por passo. A tabela é a especificação: mudar a regra de um passo é
// mudar uma linha aqui, não caçar condição espalhada por tela.
const DONE_BY_STEP = {
  brand: (f) => !!f.hasBrand,
  connect: (f) => !!f.igConnected,
  diagnose: (f) => !!f.hasAudit,
  dna: (f) => !!f.dnaApproved,
  strategy: (f) => !!f.strategyApproved,
  plan: (f) => !!f.hasPlanItems
};

export function stepDone(stepId, facts = EMPTY_FACTS) {
  const rule = DONE_BY_STEP[stepId];
  return rule ? rule(facts || EMPTY_FACTS) : false;
}

// Quem é conduzido pelo agente.
//
// O divisor é o DNA APROVADO, e não "fez qualquer coisa". Foi uma contagem no
// banco que mostrou a diferença: uma marca com o Instagram conectado e mais
// nada — sem DNA, sem estratégia, sem plano — está no começo do caminho, não no
// meio. Tratar "conectou o IG" como "já se virou sozinho" deixava justamente
// quem mais precisa de condução sem condução.
//
// dna_generated_at é o único gate duro do produto: estratégia exige DNA
// aprovado, e planejamento exige estratégia aprovada. Quem passou dele já tem
// marca configurada e nunca é conduzido de volta.
//
// Acima de tudo: FATO VENCE FLAG. Com plano na mão ninguém é conduzido, mesmo
// que a flag no banco tenha ficado suja.
export function isConducting(facts = EMPTY_FACTS, kit = null) {
  const f = facts || EMPTY_FACTS;
  if (f.hasPlanItems) return false;
  if (kit?.onboarding_status === 'completed') return false;
  if (kit?.onboarding_status === 'in_progress') return true;
  // Quem pediu para explorar sozinho não é reconduzido.
  if (kit?.onboarding_status === 'pending') return false;

  return !f.dnaApproved && !f.strategyApproved;
}

// Estado completo da jornada. `currentIndex` é o PRIMEIRO passo não feito —
// nunca "último feito + 1". Com dado fora de ordem (tem plano mas nunca rodou
// diagnóstico, coisa que acontece em marca legada) a diferença entre as duas
// definições é a diferença entre conduzir e não conduzir.
export function resolveJourney(facts = EMPTY_FACTS, kit = null) {
  const f = { ...EMPTY_FACTS, ...(facts || {}) };
  const steps = JOURNEY_STEPS.map((step) => ({ ...step, done: stepDone(step.id, f) }));
  const doneCount = steps.filter((s) => s.done).length;
  const currentIndex = steps.findIndex((s) => !s.done); // -1 = tudo feito
  const completed = currentIndex === -1;

  return {
    facts: f,
    steps,
    currentIndex,
    // Terminou? o foco descansa no último passo, para a janela ter o que exibir
    // no instante entre concluir e o menu destravar.
    currentStep: completed ? steps[steps.length - 1] : steps[currentIndex],
    stepNumber: completed ? steps.length : currentIndex + 1,
    totalSteps: steps.length,
    doneCount,
    completed,
    conducting: isConducting(f, kit)
  };
}

// O gate. Enquanto o agente conduz, só a rota da etapa atual responde.
//
// Falha ABERTO em toda dúvida: sem jornada, sem pathname, ou fora da condução,
// tudo é permitido. Prender alguém por causa de um header ausente é pior do que
// deixar de conduzir.
export function isPathAllowed(pathname, journey) {
  if (!journey?.conducting) return true;
  if (!pathname) return true;
  if (pathname.startsWith('/api')) return true;
  return pathname === journey.currentStep?.route;
}
