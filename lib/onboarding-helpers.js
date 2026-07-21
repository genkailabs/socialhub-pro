export const DEFAULT_PALETTE = {
  accent: '#007AFF',
  bg: '#FFFFFF',
  surface: '#F4F4F5',
  ink: '#18181B'
};

export function isOnboardingComplete(kit) {
  if (!kit) return false;
  if (kit.onboarding_status === 'completed') return true;
  if (kit.dna_generated_at && kit.dna_generated_at !== '') return true;
  return false;
}

export function deriveBrandName(profile = {}, bio = '') {
  if (bio && typeof bio === 'string') {
    const match = bio.match(/(?:bem-vindo[s]? (?:a|à|ao)|conheça (?:a|o)|loja|clínica|consultório)\s+([A-ZÀ-Ú][a-zà-úA-ZÀ-Ú0-9\s]{2,25})/i);
    if (match && match[1]) {
      const clean = match[1].trim();
      if (clean.length >= 3) return clean;
    }
  }
  if (profile.full_name && profile.full_name.trim().length > 0) {
    return profile.full_name.trim();
  }
  if (profile.username && profile.username.trim().length > 0) {
    return profile.username.trim();
  }
  return 'Sua Marca';
}

export function derivePalettePriority(feedColors, avatarColor, segmentColor) {
  if (feedColors && feedColors.accent) {
    return {
      accent: feedColors.accent,
      bg: feedColors.bg || DEFAULT_PALETTE.bg,
      surface: feedColors.surface || DEFAULT_PALETTE.surface,
      ink: feedColors.ink || DEFAULT_PALETTE.ink
    };
  }
  if (avatarColor && typeof avatarColor === 'string') {
    return { ...DEFAULT_PALETTE, accent: avatarColor };
  }
  if (segmentColor && typeof segmentColor === 'string') {
    return { ...DEFAULT_PALETTE, accent: segmentColor };
  }
  return { ...DEFAULT_PALETTE };
}

export function classifyInstagramData(profile = {}, media = [], kitDraft = {}) {
  const bio = profile.biography || '';
  const name = kitDraft.name || deriveBrandName(profile, bio);
  
  let segment = kitDraft.segment || kitDraft.niche || '';
  if (!segment && bio.length > 0) {
    if (/caf[eé]|restaurante|bistr[oô]|hamburgueria/i.test(bio)) segment = 'Alimentação / Gastronomia';
    else if (/cl[ií]nica|m[eé]dic|dentista|psic[oô]log|sa[uú]de/i.test(bio)) segment = 'Saúde e Bem-estar';
    else if (/advogad|jur[ií]dic|direito/i.test(bio)) segment = 'Serviços Jurídicos';
    else if (/im[oô]ve|imobili[aá]ri|corretor/i.test(bio)) segment = 'Mercado Imobiliário';
    else if (/loja|roupa|moda|acess[oô]ri/i.test(bio)) segment = 'Moda e Varejo';
    else segment = 'Prestação de Serviços / Geral';
  }

  const classification = {
    name: profile.username || profile.full_name ? 'CONFIRMED' : 'NOT_FOUND',
    segment: segment ? 'INFERRED' : 'NOT_FOUND',
    audience: 'INFERRED',
    tone: 'INFERRED',
    style: 'INFERRED',
    palette: media && media.length > 0 ? 'CONFIRMED' : 'INFERRED'
  };

  return {
    name,
    segment: segment || 'Geral',
    audience: kitDraft.audience || 'Público interessado em ' + (segment || 'nossos serviços'),
    tone: kitDraft.tone || 'Profissional, Amigável, Consultiva',
    frequency: kitDraft.frequency || '5x_semana',
    themes: kitDraft.themes || ['Dicas práticas', 'Bastidores e dia a dia', 'Nossos diferenciais', 'Depoimentos e resultados'],
    style: kitDraft.style || 'Moderno e Limpo',
    classification
  };
}
