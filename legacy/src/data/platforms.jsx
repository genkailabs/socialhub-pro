// src/data/platforms.js
// Platform definitions and custom icons for social network connections

import {
  Instagram, Linkedin, Facebook, Youtube, Music,
  MessageSquare, Video
} from 'lucide-react';

export const IconX = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const IconPinterest = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
  </svg>
);

export const defaultNetworks = [
  {
    id: 'instagram', name: 'Instagram', subtitle: 'Feed, Reels & Stories',
    icon: Instagram, color: 'from-purple-500 via-pink-500 to-amber-500',
    bgLight: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como conectar o Instagram Business',
    steps: [
      'Configure sua conta como Profissional (Criador de Conteúdo ou Empresa).',
      'Vincule sua conta a uma Página pública do Facebook.',
      'Clique em "Conectar" e autorize o acesso a métricas e publicações.',
      'Após a confirmação, seu perfil aparecerá como Conectado.'
    ]
  },
  {
    id: 'facebook', name: 'Facebook', subtitle: 'Página Comercial',
    icon: Facebook, color: 'from-blue-600 to-indigo-700',
    bgLight: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Conexão Integrada com Facebook Pages',
    steps: [
      'Conectado automaticamente junto com seu Instagram Business.',
      'Para páginas separadas, clique em "Conectar" e selecione as páginas.',
      'Permite análise de visualizações, engajamento e compartilhamentos.'
    ]
  },
  {
    id: 'tiktok', name: 'TikTok', subtitle: 'Creator / Business',
    icon: Video, color: 'from-gray-900 via-purple-950 to-black',
    bgLight: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como autorizar postagens no TikTok',
    steps: [
      'Esteja logado na conta do TikTok que deseja conectar.',
      'Clique em "Conectar" e autorize na página oficial do TikTok.',
      'Autorize as permissões de publicação e leitura de perfil.',
      'Acompanhe taxa de viralidade e tempo médio de exibição.'
    ]
  },
  {
    id: 'linkedin', name: 'LinkedIn', subtitle: 'Company Page / Perfil',
    icon: Linkedin, color: 'from-[#0A66C2] to-blue-700',
    bgLight: 'bg-blue-50', textColor: 'text-[#0A66C2]', borderColor: 'border-blue-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como conectar a Página de Empresa do LinkedIn',
    steps: [
      'Você deve ser Administrador (Super Admin) da Company Page.',
      'Clique em "Conectar", faça login e conceda as permissões.',
      'Publique artigos, fotos e monitore impressões orgânicas vs patrocinadas.'
    ]
  },
  {
    id: 'youtube', name: 'YouTube', subtitle: 'Canal & Shorts',
    icon: Youtube, color: 'from-red-600 to-red-700',
    bgLight: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como vincular seu Canal do YouTube (Google OAuth)',
    steps: [
      'Clique em "Conectar" para abrir a janela segura do Google.',
      'Selecione a conta do Google que administra o canal.',
      'Permita a consulta de estatísticas avançadas.',
      'Gerencie vídeos longos e Shorts em uma interface unificada.'
    ]
  },
  {
    id: 'twitter', name: 'X / Twitter', subtitle: 'Pro API & Posts',
    icon: IconX, color: 'from-slate-900 via-gray-900 to-black',
    bgLight: 'bg-gray-50', textColor: 'text-gray-900', borderColor: 'border-gray-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como vincular seu Perfil Oficial do X',
    steps: [
      'Acesse sua conta oficial no X com permissões de leitura e escrita.',
      'Clique em "Conectar" para autorizar via OAuth 2.0 / X API Pro.',
      'Conceda acesso a estatísticas de tweets, impressões e retweets.',
      'Agende threads e monitore métricas virais.'
    ]
  },
  {
    id: 'pinterest', name: 'Pinterest', subtitle: 'Business (Pins & Pastas)',
    icon: IconPinterest, color: 'from-[#E60023] via-red-600 to-red-700',
    bgLight: 'bg-red-50', textColor: 'text-[#E60023]', borderColor: 'border-red-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como integrar sua Conta Comercial do Pinterest',
    steps: [
      'Configure sua conta como Conta Business (gratuita).',
      'Clique em "Conectar" e autorize a Pinterest API.',
      'Permita acesso aos quadros e métricas de Pins Salvos.',
      'Seu catálogo estará pronto para agendamentos e análises.'
    ]
  },
  {
    id: 'whatsapp', name: 'WhatsApp', subtitle: 'Business API / Atendimento',
    icon: MessageSquare, color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como conectar o WhatsApp via QR Code ou Meta Cloud API',
    steps: [
      'Abra o WhatsApp Business no celular oficial do seu negócio.',
      'Vá em Aparelhos Conectados e toque em Conectar um aparelho.',
      'Aponte a câmera para o QR Code gerado pelo nosso painel.',
      'Suas mensagens chegarão na aba Social Inbox com KPIs em tempo real.'
    ]
  },
  {
    id: 'spotify', name: 'Spotify', subtitle: 'Podcasters & Músicas',
    icon: Music, color: 'from-[#1DB954] to-emerald-700',
    bgLight: 'bg-green-50', textColor: 'text-[#1DB954]', borderColor: 'border-green-200',
    status: 'disconnected', handle: '', expiresIn: null,
    tutorialTitle: 'Como vincular seus Podcasts ou Lançamentos no Spotify',
    steps: [
      'Ideal para criadores, selos musicais e agências de artistas.',
      'Clique em "Conectar" e faça login com sua conta de artista.',
      'Autorize a leitura dos seus catálogos e análise de streams.',
      'Aproveite a pré-visualização interativa dos seus lançamentos.'
    ]
  }
];
