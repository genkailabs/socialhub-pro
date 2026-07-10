import { Instagram, Facebook, Youtube, Linkedin, Music, MessageSquare, Video } from 'lucide-react';

// integrated=true → conectável de verdade no v1. false → mostrado como "Em breve".
export const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', subtitle: 'Feed, Reels & Stories', icon: Instagram, color: '#E1306C', integrated: true },
  { id: 'facebook', name: 'Facebook', subtitle: 'Página comercial', icon: Facebook, color: '#1877F2', integrated: true },
  { id: 'youtube', name: 'YouTube', subtitle: 'Canal & Shorts', icon: Youtube, color: '#FF0000', integrated: false },
  { id: 'tiktok', name: 'TikTok', subtitle: 'Creator / Business', icon: Video, color: '#010101', integrated: false },
  { id: 'linkedin', name: 'LinkedIn', subtitle: 'Company Page', icon: Linkedin, color: '#0A66C2', integrated: false },
  { id: 'twitter', name: 'X / Twitter', subtitle: 'Posts & métricas', icon: MessageSquare, color: '#111111', integrated: false },
  { id: 'pinterest', name: 'Pinterest', subtitle: 'Pins & pastas', icon: Music, color: '#E60023', integrated: false },
  { id: 'whatsapp', name: 'WhatsApp', subtitle: 'Business API', icon: MessageSquare, color: '#25D366', integrated: false },
  { id: 'spotify', name: 'Spotify', subtitle: 'Podcasts & músicas', icon: Music, color: '#1DB954', integrated: false }
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
