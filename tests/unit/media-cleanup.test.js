import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanOrphanedTempMedia } from '../../lib/media-cleanup';

describe('cleanOrphanedTempMedia', () => {
  let supabase;
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    supabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          list: vi.fn(),
          remove: vi.fn().mockResolvedValue({ data: [{}], error: null })
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    };
  });

  it('deve lançar erro se o cliente supabase não for fornecido', async () => {
    await expect(cleanOrphanedTempMedia()).rejects.toThrow('Cliente Supabase obrigatório.');
  });

  it('deve remover arquivos mais antigos que maxAgeHours se não houver posts ativos referenciando', async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [{ name: 'file1.jpg', created_at: oldDate, metadata: {} }],
      error: null
    });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24 });
    
    expect(result.ok).toBe(true);
    expect(result.scannedCount).toBe(1);
    expect(result.removedCount).toBe(1);
    expect(result.removedPaths).toEqual(['temp/file1.jpg']);
    expect(supabase.storage.from('media').remove).toHaveBeenCalledWith(['temp/file1.jpg']);
  });

  it('não deve remover arquivos mais novos que maxAgeHours', async () => {
    const recentDate = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [{ name: 'file2.jpg', created_at: recentDate, metadata: {} }],
      error: null
    });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24 });
    
    expect(result.ok).toBe(true);
    expect(result.scannedCount).toBe(1);
    expect(result.removedCount).toBe(0);
    expect(result.removedPaths).toEqual([]);
    expect(supabase.storage.from('media').remove).not.toHaveBeenCalled();
  });

  it('não deve remover arquivos antigos referenciados por post ativo', async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [{ name: 'file3.mp4', created_at: oldDate, metadata: {} }],
      error: null
    });

    supabase.from().in.mockResolvedValueOnce({
      data: [{ media_url: 'https://example.com/temp/file3.mp4' }],
      error: null
    });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24 });
    
    expect(result.ok).toBe(true);
    expect(result.scannedCount).toBe(1);
    expect(result.removedCount).toBe(0);
    expect(result.removedPaths).toEqual([]);
    expect(supabase.storage.from('media').remove).not.toHaveBeenCalled();
  });

  it('deve processar subpastas corretamente', async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    // root items
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [{ name: 'brand-123', id: null, metadata: null }], // folder
      error: null
    });

    // subfolder items
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [{ name: 'file4.jpg', created_at: oldDate, metadata: {} }], // file
      error: null
    });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24 });
    
    expect(result.ok).toBe(true);
    expect(result.scannedCount).toBe(1);
    expect(result.removedCount).toBe(1);
    expect(result.removedPaths).toEqual(['temp/brand-123/file4.jpg']);
  });
});
