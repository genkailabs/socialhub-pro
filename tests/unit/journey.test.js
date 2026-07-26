import { describe, it, expect } from 'vitest';
import { JOURNEY_STEPS, resolveJourney, isConducting, isPathAllowed, stepDone } from '@/lib/journey';

const FULL = {
  hasBrand: true,
  igConnected: true,
  hasAudit: true,
  dnaApproved: true,
  strategyApproved: true,
  hasPlanItems: true
};

describe('resolveJourney', () => {
  it('sem nenhum fato, para no primeiro passo', () => {
    const j = resolveJourney({});
    expect(j.currentStep.id).toBe('brand');
    expect(j.currentIndex).toBe(0);
    expect(j.stepNumber).toBe(1);
    expect(j.totalSteps).toBe(6);
    expect(j.completed).toBe(false);
  });

  it('anda um passo por fato, na ordem da cadeia de dependencias', () => {
    const ordem = ['hasBrand', 'igConnected', 'hasAudit', 'dnaApproved', 'strategyApproved'];
    const esperado = ['connect', 'diagnose', 'dna', 'strategy', 'plan'];
    const facts = {};
    ordem.forEach((fato, i) => {
      facts[fato] = true;
      expect(resolveJourney(facts).currentStep.id).toBe(esperado[i]);
    });
  });

  it('com tudo feito, marca completed e nao aponta proximo passo', () => {
    const j = resolveJourney(FULL);
    expect(j.completed).toBe(true);
    expect(j.currentIndex).toBe(-1);
    expect(j.doneCount).toBe(JOURNEY_STEPS.length);
    // Ainda devolve um passo: a janela precisa ter o que mostrar no instante
    // entre concluir e o menu destravar.
    expect(j.currentStep.id).toBe('plan');
  });

  it('deriva cada passo do seu proprio fato', () => {
    expect(stepDone('dna', { dnaApproved: true })).toBe(true);
    expect(stepDone('dna', { strategyApproved: true })).toBe(false);
    expect(stepDone('passo-que-nao-existe', FULL)).toBe(false);
  });
});

describe('isConducting', () => {
  it('conduz marca vazia sem precisar de flag no banco', () => {
    expect(isConducting({ hasBrand: true }, null)).toBe(true);
  });

  // O caso que uma contagem no banco revelou: conectar o Instagram e parar por
  // ali e o comeco do caminho, nao o meio dele.
  it('conduz quem so conectou o Instagram e nao configurou mais nada', () => {
    expect(isConducting({ hasBrand: true, igConnected: true }, null)).toBe(true);
    expect(isConducting({ hasBrand: true, igConnected: true, hasAudit: true }, null)).toBe(true);
  });

  it('nao conduz quem ja passou do gate duro do produto', () => {
    expect(isConducting({ hasBrand: true, dnaApproved: true }, null)).toBe(false);
    expect(isConducting({ hasBrand: true, strategyApproved: true }, null)).toBe(false);
  });

  it('conduz quem entrou pelo agente e ainda nao terminou', () => {
    const kit = { onboarding_status: 'in_progress' };
    expect(isConducting({ hasBrand: true, igConnected: true, dnaApproved: true }, kit)).toBe(true);
  });

  it('fato vence flag: com plano pronto ninguem e conduzido', () => {
    const kit = { onboarding_status: 'in_progress' };
    expect(isConducting({ ...FULL }, kit)).toBe(false);
  });

  it('respeita quem pediu para sair (pending) e quem ja concluiu', () => {
    expect(isConducting({ hasBrand: true }, { onboarding_status: 'pending' })).toBe(false);
    expect(isConducting({ hasBrand: true }, { onboarding_status: 'completed' })).toBe(false);
  });

  // A assercao que impede o pior defeito possivel: reabrir o onboarding de quem
  // ja usa o app porque um token expirou.
  it('nao reabre a jornada quando um fato antigo regride', () => {
    const revogado = { ...FULL, igConnected: false, hasAudit: false };
    expect(isConducting(revogado, { onboarding_status: 'in_progress' })).toBe(false);
    expect(resolveJourney(revogado).conducting).toBe(false);
  });

  // Sem plano ainda, mas com DNA e estrategia aprovados: essa pessoa ja sabe
  // usar o app e nao pode ser jogada de volta ao comeco.
  it('deixa em paz quem configurou tudo e so nao gerou o primeiro plano', () => {
    const semPlano = { ...FULL, hasPlanItems: false };
    expect(isConducting(semPlano, null)).toBe(false);
  });
});

describe('isPathAllowed', () => {
  const conduzindo = resolveJourney(
    { hasBrand: true, igConnected: true, hasAudit: true },
    { onboarding_status: 'in_progress' }
  );

  it('libera apenas a rota da etapa atual', () => {
    expect(conduzindo.currentStep.route).toBe('/brand-kit');
    expect(isPathAllowed('/brand-kit', conduzindo)).toBe(true);
    expect(isPathAllowed('/calendar', conduzindo)).toBe(false);
    expect(isPathAllowed('/dashboard', conduzindo)).toBe(false);
  });

  it('nunca bloqueia /api', () => {
    expect(isPathAllowed('/api/meta/oauth', conduzindo)).toBe(true);
  });

  it('falha aberto quando falta informacao', () => {
    expect(isPathAllowed('', conduzindo)).toBe(true);
    expect(isPathAllowed('/calendar', null)).toBe(true);
    expect(isPathAllowed('/calendar', resolveJourney(FULL))).toBe(true);
  });
});
