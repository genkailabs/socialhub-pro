// src/services/SocialSyncService.js
// Serviço Frontend para Sincronização de Dados Reais das Redes Sociais
// Respeita cache de 30 minutos por padrão e ignora cache quando forceRefresh = true.

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export const SocialSyncService = {
  getCacheKey(brandId) {
    return `socialhub_sync_cache_${brandId}`;
  },

  getLastSyncInfo(brandId) {
    try {
      const raw = localStorage.getItem(this.getCacheKey(brandId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        syncedAt: parsed.syncedAt,
        isExpired: Date.now() - new Date(parsed.syncedAt).getTime() > CACHE_TTL_MS,
        data: parsed.data
      };
    } catch {
      return null;
    }
  },

  async syncBrandNetworks(brandId, { forceRefresh = false } = {}) {
    if (!brandId) return null;

    // Se não for forçado, verifica cache válido de 30 min
    if (!forceRefresh) {
      const cached = this.getLastSyncInfo(brandId);
      if (cached && !cached.isExpired && cached.data) {
        return {
          fromCache: true,
          syncedAt: cached.syncedAt,
          data: cached.data
        };
      }
    }

    try {
      const response = await fetch(`/api/social/sync?brand_id=${encodeURIComponent(brandId)}&force_refresh=${forceRefresh}`);
      if (!response.ok) {
        throw new Error(`Falha HTTP ${response.status} ao sincronizar redes sociais.`);
      }

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || 'Erro retornado pelo servidor de sincronização.');
      }

      const syncResult = {
        fromCache: false,
        syncedAt: payload.syncedAt || new Date().toISOString(),
        data: payload.networks || {}
      };

      localStorage.setItem(this.getCacheKey(brandId), JSON.stringify({
        syncedAt: syncResult.syncedAt,
        data: syncResult.data
      }));

      return syncResult;
    } catch (err) {
      console.warn('Falha na consulta oficial. Preservando último cache válido de sincronização:', err.message);
      const cached = this.getLastSyncInfo(brandId);
      if (cached && cached.data) {
        return {
          fromCache: true,
          errorFallback: true,
          syncedAt: cached.syncedAt,
          data: cached.data,
          errorMessage: 'Não foi possível atualizar os dados da API oficial. Exibindo última sincronização válida.'
        };
      }

      return {
        fromCache: false,
        error: true,
        syncedAt: new Date().toISOString(),
        data: {},
        errorMessage: 'Nenhum dado real pôde ser consultado no momento.'
      };
    }
  }
};
