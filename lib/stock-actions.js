'use server';

import { createClient } from '@/lib/supabase/server';
import { pexelsSearch, hasPexelsKey, StockUnavailableError } from '@/lib/ai/pexels';
import { searchQuery } from '@/lib/photo-direction';

// Ponte entre o Composer e o banco de imagens (PRD 02 §2/§3).
//
// Existe para a chave ficar no servidor: se o navegador chamasse a API direto,
// a chave viajaria no bundle. Aqui ela nunca sai daqui.

/** A busca está ligada neste ambiente? A tela usa para não oferecer o que não funciona. */
export async function stockEnabled() {
  return hasPexelsKey();
}

/**
 * Busca fotos para a peça.
 *
 * @param {object} p
 * @param {string} p.subject      assunto escrito pelo usuário
 * @param {object} p.direction    seleção de lib/photo-direction (§4)
 * @param {string} p.orientation  'portrait' | 'landscape' | 'square' | ''
 * @param {string} p.person       'com' | 'sem' | ''
 * @param {number} p.page
 */
export async function searchStockPhotos({ subject = '', direction = {}, orientation = '', person = '', page = 1 } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Busca custa cota da chave da casa: só para quem está logado.
  if (!user) return { error: 'Sessão expirada.' };

  const query = searchQuery(subject, direction);
  if (!query) return { error: 'Escreva o que você procura.' };

  try {
    const { photos, total } = await pexelsSearch({ query, orientation, person, page });
    return { photos, total, query };
  } catch (error) {
    // §8 do outro PRD vale aqui também: a superfície recebe texto que ajuda,
    // e o motivo técnico fica no detalhe.
    if (error instanceof StockUnavailableError) return { error: error.message, code: error.code };
    return { error: 'Não foi possível buscar imagens agora.', detail: error?.message || '' };
  }
}
