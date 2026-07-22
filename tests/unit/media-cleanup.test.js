import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanOrphanedTempMedia, PROTECTED_STATUSES, ELIGIBLE_STATUSES } from '../../lib/media-cleanup';

describe('cleanOrphanedTempMedia', () => {
  let supabase;
  let defaultBuilder;
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    defaultBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
      then: vi.fn((resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject))
    };

    supabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          list: vi.fn(),
          remove: vi.fn().mockResolvedValue({ data: [{}], error: null })
        })
      },
      from: vi.fn().mockReturnValue(defaultBuilder)
    };
  });

  afterEach(() => {
    delete process.env.MEDIA_GC_DRY_RUN;
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

  it('deve suportar dryRun passado por parâmetro sem remover do storage nem atualizar banco', async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [{ name: 'dry.jpg', created_at: oldDate, metadata: {} }],
      error: null
    });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24, dryRun: true });

    expect(result.ok).toBe(true);
    expect(result.removedPaths).toEqual(['temp/dry.jpg']);
    expect(result.simulatedPaths).toEqual(['temp/dry.jpg']);
    expect(supabase.storage.from('media').remove).not.toHaveBeenCalled();
    expect(defaultBuilder.update).not.toHaveBeenCalled();
  });

  it('deve suportar dryRun via variável de ambiente MEDIA_GC_DRY_RUN=true', async () => {
    process.env.MEDIA_GC_DRY_RUN = 'true';
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [{ name: 'env-dry.mp4', created_at: oldDate, metadata: {} }],
      error: null
    });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24 });

    expect(result.ok).toBe(true);
    expect(result.removedPaths).toEqual(['temp/env-dry.mp4']);
    expect(result.simulatedPaths).toEqual(['temp/env-dry.mp4']);
    expect(supabase.storage.from('media').remove).not.toHaveBeenCalled();
  });

  it('deve processar itens órfãos do temp e mídias expiradas de posts_media e posts com deleted_at IS NULL e status elegível', async () => {
    supabase.storage.from('media').list.mockResolvedValueOnce({
      data: [],
      error: null
    });

    const updatedTables = [];
    supabase.from.mockImplementation((table) => {
      const b = {
        select: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockImplementation(() => {
          if (table === 'posts_media') {
            return Promise.resolve({
              data: [
                { id: 'm-1', post_id: 'p-1', storage_path: 'brand-1/img.jpg', deletion_attempts: 0 },
                { id: 'm-protected', post_id: 'p-prot', storage_path: 'brand-1/prot.jpg', deletion_attempts: 0 }
              ],
              error: null
            });
          }
          return b;
        }),
        in: vi.fn().mockImplementation((col, vals) => {
          if (table === 'posts' && col === 'status') {
            // first call is PROTECTED_STATUSES, second call is ELIGIBLE_STATUSES
            if (vals === PROTECTED_STATUSES) {
              return Promise.resolve({
                data: [{ id: 'p-prot', status: 'draft', media_url: 'brand-1/prot.jpg' }],
                error: null
              });
            } else if (vals === ELIGIBLE_STATUSES) {
              return Promise.resolve({
                data: [{ id: 'p-2', status: 'published', media_url: 'brand-1/post-2.jpg' }],
                error: null
              });
            }
          }
          if (table === 'posts' && col === 'id' && b._isUpdate) {
            updatedTables.push({ table, ids: vals, data: b._updateData });
            return Promise.resolve({ data: [], error: null });
          }
          if (table === 'posts_media' && col === 'id' && b._isUpdate) {
            updatedTables.push({ table, ids: vals, data: b._updateData });
            return Promise.resolve({ data: [], error: null });
          }
          if (table === 'posts_media' && col === 'post_id') {
            return Promise.resolve({ data: [], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockImplementation((data) => {
          b._isUpdate = true;
          b._updateData = data;
          return b;
        }),
        then: vi.fn((res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej))
      };
      return b;
    });

    supabase.storage.from('media').remove.mockResolvedValueOnce({
      data: [{ name: 'brand-1/img.jpg' }, { name: 'brand-1/post-2.jpg' }],
      error: null
    });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24, dryRun: false });

    expect(result.ok).toBe(true);
    // Deve incluir brand-1/img.jpg e brand-1/post-2.jpg mas não brand-1/prot.jpg porque o post p-prot é 'draft' (protegido)
    expect(result.removedPaths).toContain('brand-1/img.jpg');
    expect(result.removedPaths).toContain('brand-1/post-2.jpg');
    expect(result.removedPaths).not.toContain('brand-1/prot.jpg');

    expect(supabase.storage.from('media').remove).toHaveBeenCalledWith(
      expect.arrayContaining(['brand-1/img.jpg', 'brand-1/post-2.jpg'])
    );

    // Verifica que atualizou deleted_at no banco
    expect(updatedTables).toContainEqual({
      table: 'posts_media',
      ids: ['m-1'],
      data: expect.objectContaining({ deleted_at: expect.any(String) })
    });
    expect(updatedTables).toContainEqual({
      table: 'posts',
      ids: ['p-2'],
      data: expect.objectContaining({ deleted_at: expect.any(String) })
    });
  });

  it('deve excluir no storage em lotes de 50 e registrar erros em last_deletion_error / deletion_attempts em caso de falha', async () => {
    supabase.storage.from('media').list.mockResolvedValueOnce({ data: [], error: null });

    // Gera 60 itens para testar lotes de 50
    const mediaList = Array.from({ length: 60 }, (_, i) => ({
      id: `media-${i}`,
      post_id: null,
      storage_path: `batch/file-${i}.jpg`,
      deletion_attempts: 1
    }));

    const updatedMediaErrors = [];
    const updatedMediaSuccess = [];

    supabase.from.mockImplementation((table) => {
      const b = {
        select: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockImplementation(() => {
          if (table === 'posts_media') return Promise.resolve({ data: mediaList, error: null });
          return b;
        }),
        in: vi.fn().mockImplementation((col, vals) => {
          if (table === 'posts_media' && col === 'id' && b._isUpdate) {
            updatedMediaSuccess.push({ ids: vals, data: b._updateData });
            return Promise.resolve({ data: [], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
        eq: vi.fn().mockImplementation((col, val) => {
          if (table === 'posts_media' && col === 'id' && b._isUpdate) {
            updatedMediaErrors.push({ id: val, data: b._updateData });
            return Promise.resolve({ data: [], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
        update: vi.fn().mockImplementation((data) => {
          b._isUpdate = true;
          b._updateData = data;
          return b;
        }),
        then: vi.fn((res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej))
      };
      return b;
    });

    // Simula falha no primeiro lote e sucesso no segundo
    supabase.storage.from('media').remove
      .mockResolvedValueOnce({ data: null, error: { message: 'Storage error on batch 1' } })
      .mockResolvedValueOnce({ data: Array.from({ length: 10 }, () => ({})), error: null });

    const result = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24 });

    expect(supabase.storage.from('media').remove).toHaveBeenCalledTimes(2);
    expect(supabase.storage.from('media').remove.mock.calls[0][0].length).toBe(50);
    expect(supabase.storage.from('media').remove.mock.calls[1][0].length).toBe(10);

    // Os 50 primeiros falharam, devem atualizar last_deletion_error e deletion_attempts = 2
    expect(updatedMediaErrors.length).toBe(50);
    expect(updatedMediaErrors[0]).toEqual({
      id: 'media-0',
      data: expect.objectContaining({
        deletion_attempts: 2,
        last_deletion_error: 'Storage error on batch 1'
      })
    });

    // Os 10 últimos obtiveram sucesso, devem atualizar deleted_at
    expect(updatedMediaSuccess.length).toBe(1);
    expect(updatedMediaSuccess[0].ids.length).toBe(10);
    expect(updatedMediaSuccess[0].data).toHaveProperty('deleted_at');
  });
});
