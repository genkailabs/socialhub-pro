import { describe, expect, it } from 'vitest';
import { nextVersionNumber, activeDna, canApprove, versionLabel, DNA_COLUMNS, pickDnaColumns } from '@/lib/dna-versions';

describe('nextVersionNumber', () => {
  it('primeira versao e 1', () => {
    expect(nextVersionNumber([])).toBe(1);
  });

  it('continua a partir da maior existente', () => {
    expect(nextVersionNumber([{ version: 1 }, { version: 2 }])).toBe(3);
  });

  // Nao reaproveita numero apos arquivar: v2 arquivada nao volta a ser v2.
  it('nao reaproveita numero de versao arquivada', () => {
    expect(nextVersionNumber([{ version: 1, status: 'archived' }, { version: 2, status: 'archived' }])).toBe(3);
  });

  it('ignora ordem da lista', () => {
    expect(nextVersionNumber([{ version: 5 }, { version: 2 }])).toBe(6);
  });
});

describe('activeDna', () => {
  it('devolve a versao aprovada', () => {
    const versions = [
      { id: 'a', version: 1, status: 'archived' },
      { id: 'b', version: 2, status: 'approved' },
      { id: 'c', version: 3, status: 'proposed' }
    ];

    expect(activeDna(versions).id).toBe('b');
  });

  // O ponto do RF-04: proposta nao vale como ativa ate alguem aprovar.
  it('proposta nao conta como ativa', () => {
    expect(activeDna([{ id: 'c', version: 1, status: 'proposed' }])).toBeNull();
  });

  it('sem versoes nao ha ativa', () => {
    expect(activeDna([])).toBeNull();
  });
});

describe('canApprove', () => {
  it('proposta pode ser aprovada', () => {
    expect(canApprove({ status: 'proposed' })).toBe(true);
  });

  // Restaurar versao anterior = aprovar de novo a arquivada.
  it('arquivada pode ser restaurada', () => {
    expect(canApprove({ status: 'archived' })).toBe(true);
  });

  it('aprovar de novo a ja aprovada nao faz sentido', () => {
    expect(canApprove({ status: 'approved' })).toBe(false);
  });

  it('versao inexistente nao pode ser aprovada', () => {
    expect(canApprove(null)).toBe(false);
  });
});

describe('pickDnaColumns', () => {
  it('mantem apenas colunas conhecidas do brand_kits', () => {
    const out = pickDnaColumns({ niche: 'psicologia', tone: 'acolhedor', inventado: 'x' });

    expect(out).toEqual({ niche: 'psicologia', tone: 'acolhedor' });
  });

  it('ignora campo nulo para nao apagar o que ja existe', () => {
    expect(pickDnaColumns({ niche: 'x', tone: null, audience: undefined })).toEqual({ niche: 'x' });
  });

  it('cobre as colunas de DNA do brand_kits', () => {
    expect(DNA_COLUMNS).toContain('personality');
    expect(DNA_COLUMNS).toContain('cta_policy');
    // objective e do wizard, nao da IA: a analise nao pode sobrescrever.
    expect(DNA_COLUMNS).not.toContain('objective');
  });
});

describe('versionLabel', () => {
  it('descreve o estado em portugues simples', () => {
    expect(versionLabel({ version: 2, status: 'approved' })).toBe('Versao 2 · em uso');
    expect(versionLabel({ version: 3, status: 'proposed' })).toBe('Versao 3 · aguardando sua aprovacao');
    expect(versionLabel({ version: 1, status: 'archived' })).toBe('Versao 1 · anterior');
  });
});
