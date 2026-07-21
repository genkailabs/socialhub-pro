export const DEFAULT_PALETTE = {
  accent: '#007AFF',
  bg: '#FFFFFF',
  surface: '#F4F4F5',
  ink: '#18181B'
};

export function isOnboardingComplete(kit) {
  const k = kit || {};
  if (k.onboarding_status === 'completed') return true;
  if (k.dna_generated_at && k.dna_generated_at !== '') return true;
  return false;
}

export function deriveBrandName(profile = {}, bio = '') {
  const p = profile || {};
  const b = (typeof bio === 'string' ? bio : '') || '';

  if (b) {
    const match = b.match(/(?:bem-vindo[s]? (?:a|à|ao)|conheça (?:a|o)|loja|clínica|consultório)\s+([A-ZÀ-Ú][a-zà-úA-ZÀ-Ú0-9\s]{2,25})/i);
    if (match && match[1]) {
      const clean = match[1].trim();
      if (clean.length >= 3) return clean;
    }
  }
  if (p.full_name && typeof p.full_name === 'string' && p.full_name.trim().length > 0) {
    return p.full_name.trim();
  }
  if (p.username && typeof p.username === 'string' && p.username.trim().length > 0) {
    return p.username.trim();
  }
  return 'Sua Marca';
}

export function derivePalettePriority(feedColors, avatarColor, segmentColor) {
  const fc = feedColors || {};
  if (fc.accent) {
    return {
      accent: fc.accent,
      bg: fc.bg || DEFAULT_PALETTE.bg,
      surface: fc.surface || DEFAULT_PALETTE.surface,
      ink: fc.ink || DEFAULT_PALETTE.ink
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
  const p = profile || {};
  const m = Array.isArray(media) ? media : [];
  const k = kitDraft || {};

  const bio = (typeof p.biography === 'string' ? p.biography : '') || '';
  const name = k.name || deriveBrandName(p, bio);
  
  let segment = k.segment || k.niche || '';
  if (!segment && bio.length > 0) {
    if (/caf[eé]|restaurante|bistr[oô]|hamburgueria/i.test(bio)) segment = 'Alimentação / Gastronomia';
    else if (/cl[ií]nica|m[eé]dic|dentista|psic[oô]log|sa[uú]de/i.test(bio)) segment = 'Saúde e Bem-estar';
    else if (/advogad|jur[ií]dic|direito/i.test(bio)) segment = 'Serviços Jurídicos';
    else if (/im[oô]ve|imobili[aá]ri|corretor/i.test(bio)) segment = 'Mercado Imobiliário';
    else if (/loja|roupa|moda|acess[oô]ri/i.test(bio)) segment = 'Moda e Varejo';
    else segment = 'Prestação de Serviços / Geral';
  }

  const classification = {
    name: (p.username || p.full_name) ? 'CONFIRMED' : 'NOT_FOUND',
    segment: segment ? 'INFERRED' : 'NOT_FOUND',
    audience: 'INFERRED',
    tone: 'INFERRED',
    style: 'INFERRED',
    palette: m.length > 0 ? 'CONFIRMED' : 'INFERRED'
  };

  return {
    name,
    segment: segment || 'Geral',
    audience: k.audience || 'Público interessado em ' + (segment || 'nossos serviços'),
    tone: k.tone || 'Profissional, Amigável, Consultiva',
    frequency: k.frequency || '5x_semana',
    themes: k.themes || ['Dicas práticas', 'Bastidores e dia a dia', 'Nossos diferenciais', 'Depoimentos e resultados'],
    style: k.style || 'Moderno e Limpo',
    classification
  };
}
