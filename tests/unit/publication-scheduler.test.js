import { describe, expect, it } from 'vitest';
import { publicationFailurePatch, publicationStatusMeta } from '@/lib/publication-scheduler';

describe('agendamento pelo Supabase', () => {
  it('mantem o post agendado para nova tentativa antes do limite', () => {
    expect(publicationFailurePatch({ attempts: 1, error: 'timeout', maxAttempts: 3 }))
      .toMatchObject({ status: 'scheduled', publish_attempts: 1, last_publish_error: 'timeout' });
  });

  it('marca como falho ao atingir o limite de tentativas', () => {
    expect(publicationFailurePatch({ attempts: 3, error: 'Meta: 500', maxAttempts: 3 }))
      .toMatchObject({ status: 'failed', publish_attempts: 3, last_publish_error: 'Meta: 500' });
  });

  it('traduz os estados novos sem expor detalhes tecnicos', () => {
    expect(publicationStatusMeta('publishing').label).toBe('Publicando');
    expect(publicationStatusMeta('failed').label).toBe('Falhou');
    expect(publicationStatusMeta('cancelled').label).toBe('Cancelado');
  });
});
