import { Instagram, Facebook, Youtube, Linkedin, Music2, MessageCircle, Video, Twitter, Send } from 'lucide-react';

// integrated=true → conectável de verdade no v1. false → mostrado como "Em breve".
// gradient: stops da identidade da marca (usado no header do card). caps: o que dá pra publicar.
export const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', subtitle: 'Feed, Reels & Stories', icon: Instagram, color: '#E1306C',
    gradient: ['#FEDA75', '#FA7E1E', '#D62976', '#962FBF'], caps: ['Feed', 'Reels', 'Stories'], integrated: true, connectPath: '/api/meta/oauth' },
  { id: 'facebook', name: 'Facebook', subtitle: 'Página comercial', icon: Facebook, color: '#1877F2',
    gradient: ['#1877F2', '#0A5DC2'], caps: ['Página', 'Grupos'], integrated: true, connectPath: '/api/meta/oauth' },
  { id: 'youtube', name: 'YouTube', subtitle: 'Canal & Shorts', icon: Youtube, color: '#FF0000',
    gradient: ['#FF4E45', '#C4302B'], caps: ['Métricas', 'Analytics', 'Horários'], integrated: true, connectPath: '/api/youtube/oauth' },
  { id: 'tiktok', name: 'TikTok', subtitle: 'Creator / Business', icon: Video, color: '#FE2C55',
    gradient: ['#25F4EE', '#111111', '#FE2C55'], caps: ['Vídeos', 'Lives'], integrated: false },
  { id: 'linkedin', name: 'LinkedIn', subtitle: 'Company Page', icon: Linkedin, color: '#0A66C2',
    gradient: ['#0A66C2', '#004182'], caps: ['Company', 'Artigos'], integrated: false },
  { id: 'twitter', name: 'X / Twitter', subtitle: 'Posts & threads', icon: Twitter, color: '#111111',
    gradient: ['#2B2B2B', '#000000'], caps: ['Posts', 'Threads'], integrated: false },
  { id: 'pinterest', name: 'Pinterest', subtitle: 'Pins & pastas', icon: Music2, color: '#E60023',
    gradient: ['#E60023', '#AD081B'], caps: ['Pins', 'Pastas'], integrated: false },
  { id: 'whatsapp', name: 'WhatsApp', subtitle: 'Business API', icon: MessageCircle, color: '#25D366',
    gradient: ['#25D366', '#128C7E'], caps: ['Broadcast', 'Catálogo'], integrated: false },
  { id: 'spotify', name: 'Spotify', subtitle: 'Podcasts & músicas', icon: Send, color: '#1DB954',
    gradient: ['#1DB954', '#1AA34A'], caps: ['Podcasts', 'Playlists'], integrated: false }
];

export function integratedPlatforms() {
  return PLATFORMS.filter((p) => p.integrated);
}

export function isIntegrated(id) {
  return PLATFORMS.some((p) => p.id === id && p.integrated);
}

export function platformById(id) {
  return PLATFORMS.find((p) => p.id === id) || null;
}

export function platformGradient(p) {
  const stops = p?.gradient?.length ? p.gradient : [p?.color || '#007AFF', p?.color || '#007AFF'];
  return `linear-gradient(135deg, ${stops.join(', ')})`;
}

// URL do fluxo OAuth do provedor (Meta para IG/FB, Google para YouTube).
export function connectHref(p, brandId) {
  const base = p?.connectPath || '/api/meta/oauth';
  return `${base}?brand_id=${brandId}`;
}
