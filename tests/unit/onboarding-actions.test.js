import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveOnboardingProgress, completeOnboarding, resetOnboarding } from '@/lib/onboarding-actions';
import { revalidatePath } from 'next/cache';

// Mock do supabase server
const mockUpsert = vi.fn(async () => ({ error: null }));
const mockGetUser = vi.fn(async () => ({ data: { user: { id: 'usr-1' } } }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      upsert: mockUpsert,
      update: vi.fn(async () => ({ error: null }))
    }))
  }))
}));

// Mock do next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('onboarding-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'usr-1' } } });
    mockUpsert.mockResolvedValue({ error: null });
  });

  describe('saveOnboardingProgress', () => {
    it('saveOnboardingProgress exige brandId', async () => {
      const res = await saveOnboardingProgress({});
      expect(res.error).toBe('Marca não selecionada.');
    });

    it('retorna erro se sessão estiver expirada', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await saveOnboardingProgress({ brandId: 'brd-1' });
      expect(res.error).toBe('Sessão expirada.');
    });

    it('salva progresso com dados válidos', async () => {
      const res = await saveOnboardingProgress({
        brandId: 'brd-1',
        step: 2,
        answers: { segment: 'tech' },
        status: 'in_progress'
      });
      expect(res.ok).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          brand_id: 'brd-1',
          onboarding_status: 'in_progress',
          onboarding_step: 2,
          onboarding_answers: { segment: 'tech' }
        }),
        { onConflict: 'brand_id' }
      );
    });

    it('trata erro retornado pelo Supabase', async () => {
      mockUpsert.mockResolvedValueOnce({ error: { message: 'Database failure' } });
      const res = await saveOnboardingProgress({ brandId: 'brd-1' });
      expect(res.error).toBe('Database failure');
    });
  });

  describe('completeOnboarding', () => {
    it('completeOnboarding retorna ok e seta completed com revalidação', async () => {
      const res = await completeOnboarding({ brandId: 'brd-1' });
      expect(res.ok).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          brand_id: 'brd-1',
          onboarding_status: 'completed'
        }),
        { onConflict: 'brand_id' }
      );
      expect(revalidatePath).toHaveBeenCalledWith('/brand-kit');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
      expect(revalidatePath).toHaveBeenCalledWith('/onboarding');
    });

    it('exige brandId e não revalida se falhar', async () => {
      const res = await completeOnboarding({});
      expect(res.error).toBe('Marca não selecionada.');
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('resetOnboarding', () => {
    it('resetOnboarding retorna ok e seta not_started e step 0', async () => {
      const res = await resetOnboarding({ brandId: 'brd-1' });
      expect(res.ok).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          brand_id: 'brd-1',
          onboarding_status: 'not_started',
          onboarding_step: 0
        }),
        { onConflict: 'brand_id' }
      );
      expect(revalidatePath).toHaveBeenCalledWith('/onboarding');
      expect(revalidatePath).toHaveBeenCalledWith('/brand-kit');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('resetOnboarding exige brandId', async () => {
      const res = await resetOnboarding({});
      expect(res.error).toBe('Marca não selecionada.');
    });

    it('resetOnboarding retorna erro se sessão estiver expirada', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await resetOnboarding({ brandId: 'brd-1' });
      expect(res.error).toBe('Sessão expirada.');
    });
  });
});
