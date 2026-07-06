import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, se disponíveis
dotenv.config();

// Importação das funções das plataformas
import { postToInstagram, getMetaAnalytics } from './platforms/meta.js';
import { uploadYouTubeShort, getChannelStats } from './platforms/youtube.js';
import { postTikTokVideo, getTikTokAnalytics } from './platforms/tiktok.js';
import { getPodcastEpisodes, createShowNoteLink } from './platforms/spotify.js';
import { sendWhatsAppMessage, sendWhatsAppMedia } from './platforms/whatsapp.js';

// Inicialização do servidor MCP
const server = new Server(
  {
    name: 'social-hub-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * Handler para listar todas as 10 ferramentas de automação e engajamento do SocialHub
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // --- META (INSTAGRAM & FACEBOOK) ---
      {
        name: 'meta_post_instagram',
        description: 'Publicar foto ou vídeo no feed do Instagram com legenda usando a Graph API. Suporta modo sandbox se o token for de teste ou omitido.',
        inputSchema: {
          type: 'object',
          properties: {
            caption: { type: 'string', description: 'Legenda da publicação (suporta hashtags e emojis)' },
            media_url: { type: 'string', description: 'URL pública da imagem ou vídeo (ex: https://exemplo.com/foto.jpg)' },
            access_token: { type: 'string', description: 'Token de acesso da Graph API da Meta (ou "demo_token" para sandbox)' },
            account_id: { type: 'string', description: 'ID da conta comercial do Instagram' }
          },
          required: ['caption', 'media_url']
        }
      },
      {
        name: 'meta_get_analytics',
        description: 'Obter métricas, alcance, impressões e top posts do Instagram ou página do Facebook.',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['instagram', 'facebook'], description: 'Plataforma alvo para consulta de insights' },
            account_id: { type: 'string', description: 'ID da conta ou página na Meta' },
            access_token: { type: 'string', description: 'Token de acesso da Graph API' }
          },
          required: []
        }
      },

      // --- YOUTUBE ---
      {
        name: 'youtube_upload_short',
        description: 'Publicar um vídeo no formato YouTube Shorts com título, descrição e tags automáticas via YouTube Data API v3.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título do YouTube Short (máx 100 caracteres)' },
            description: { type: 'string', description: 'Descrição e hashtags que acompanharão o vídeo' },
            video_url: { type: 'string', description: 'URL pública do arquivo de vídeo para upload' },
            access_token: { type: 'string', description: 'Token OAuth2 do YouTube' }
          },
          required: ['title', 'video_url']
        }
      },
      {
        name: 'youtube_get_channel_stats',
        description: 'Consultar estatísticas detalhadas de um canal do YouTube (número de inscritos, total de visualizações e quantidade de vídeos).',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: { type: 'string', description: 'ID do canal do YouTube (ex: UC_x5XG1OV...)' },
            api_key: { type: 'string', description: 'Google Cloud API Key (com YouTube Data API habilitada)' }
          },
          required: []
        }
      },

      // --- TIKTOK ---
      {
        name: 'tiktok_post_video',
        description: 'Publicar um vídeo no TikTok com legenda via URL utilizando a TikTok Open API v2.',
        inputSchema: {
          type: 'object',
          properties: {
            caption: { type: 'string', description: 'Legenda do vídeo no TikTok com hashtags e menções' },
            video_url: { type: 'string', description: 'URL pública do arquivo MP4' },
            access_token: { type: 'string', description: 'Token de acesso OAuth do TikTok Developer' }
          },
          required: ['caption', 'video_url']
        }
      },
      {
        name: 'tiktok_get_analytics',
        description: 'Obter métricas de engajamento do perfil no TikTok (seguidores, curtidas totais, vídeos virais e taxa de engajamento).',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'Token de acesso OAuth do TikTok Developer' }
          },
          required: []
        }
      },

      // --- SPOTIFY ---
      {
        name: 'spotify_get_episodes',
        description: 'Listar episódios recentes de um show ou podcast no Spotify com duração, data de lançamento e links diretos.',
        inputSchema: {
          type: 'object',
          properties: {
            show_id: { type: 'string', description: 'ID do Show/Podcast no Spotify' },
            access_token: { type: 'string', description: 'Token de acesso da Spotify Web API' }
          },
          required: []
        }
      },
      {
        name: 'spotify_create_show_note_link',
        description: 'Adicionar ou atualizar um link promocional/patrocinado nas notas (Show Notes) de um episódio de podcast no Spotify.',
        inputSchema: {
          type: 'object',
          properties: {
            episode_id: { type: 'string', description: 'ID do episódio no Spotify' },
            link_url: { type: 'string', description: 'URL promocional ou material de apoio que será inserida' },
            access_token: { type: 'string', description: 'Token de acesso OAuth (Partner/Podcasters)' }
          },
          required: ['episode_id', 'link_url']
        }
      },

      // --- WHATSAPP CLOUD API ---
      {
        name: 'whatsapp_send_message',
        description: 'Enviar uma mensagem de texto em tempo real pelo WhatsApp usando a WhatsApp Cloud API da Meta.',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', description: 'Número do destinatário com DDI e DDD (ex: 5511999999999)' },
            message: { type: 'string', description: 'Conteúdo em texto da mensagem a ser enviada' },
            token: { type: 'string', description: 'Token da API do WhatsApp Business' },
            phone_id: { type: 'string', description: 'Phone Number ID registrado na Meta' }
          },
          required: ['phone_number', 'message']
        }
      },
      {
        name: 'whatsapp_send_media',
        description: 'Enviar uma imagem, vídeo ou documento com legenda via WhatsApp para um número de telefone.',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', description: 'Número do destinatário com DDI e DDD' },
            media_url: { type: 'string', description: 'URL pública do arquivo de mídia (imagem, vídeo ou PDF)' },
            caption: { type: 'string', description: 'Legenda opcional para acompanhar a mídia' },
            token: { type: 'string', description: 'Token da API do WhatsApp Business' },
            phone_id: { type: 'string', description: 'Phone Number ID da Meta' }
          },
          required: ['phone_number', 'media_url']
        }
      }
    ]
  };
});

/**
 * Handler principal para execução das ferramentas MCP (CallToolRequestSchema)
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;

  try {
    switch (name) {
      // --- META / INSTAGRAM ---
      case 'meta_post_instagram': {
        const token = args.access_token || process.env.META_ACCESS_TOKEN || 'demo_token';
        const accountId = args.account_id || process.env.META_ACCOUNT_ID || 'mock_account_id';
        result = await postToInstagram(args.caption, args.media_url, token, accountId);
        break;
      }
      case 'meta_get_analytics': {
        const token = args.access_token || process.env.META_ACCESS_TOKEN || 'demo_token';
        const accountId = args.account_id || process.env.META_ACCOUNT_ID || 'mock_account_id';
        const platform = args.platform || 'instagram';
        result = await getMetaAnalytics(platform, accountId, token);
        break;
      }

      // --- YOUTUBE ---
      case 'youtube_upload_short': {
        const token = args.access_token || process.env.YOUTUBE_ACCESS_TOKEN || 'demo_token';
        result = await uploadYouTubeShort(args.title, args.description || '', args.video_url, token);
        break;
      }
      case 'youtube_get_channel_stats': {
        const channelId = args.channel_id || process.env.YOUTUBE_CHANNEL_ID || 'mock_channel_id';
        const apiKey = args.api_key || process.env.YOUTUBE_API_KEY || 'demo_token';
        result = await getChannelStats(channelId, apiKey);
        break;
      }

      // --- TIKTOK ---
      case 'tiktok_post_video': {
        const token = args.access_token || process.env.TIKTOK_ACCESS_TOKEN || 'demo_token';
        result = await postTikTokVideo(args.caption, args.video_url, token);
        break;
      }
      case 'tiktok_get_analytics': {
        const token = args.access_token || process.env.TIKTOK_ACCESS_TOKEN || 'demo_token';
        result = await getTikTokAnalytics(token);
        break;
      }

      // --- SPOTIFY ---
      case 'spotify_get_episodes': {
        const showId = args.show_id || process.env.SPOTIFY_SHOW_ID || 'mock_show_id';
        const token = args.access_token || process.env.SPOTIFY_ACCESS_TOKEN || 'demo_token';
        result = await getPodcastEpisodes(showId, token);
        break;
      }
      case 'spotify_create_show_note_link': {
        const token = args.access_token || process.env.SPOTIFY_ACCESS_TOKEN || 'demo_token';
        result = await createShowNoteLink(args.episode_id, args.link_url, token);
        break;
      }

      // --- WHATSAPP ---
      case 'whatsapp_send_message': {
        const token = args.token || process.env.WHATSAPP_API_TOKEN || 'demo_token';
        const phoneId = args.phone_id || process.env.WHATSAPP_PHONE_ID || 'mock_phone_id';
        result = await sendWhatsAppMessage(args.phone_number, args.message, token, phoneId);
        break;
      }
      case 'whatsapp_send_media': {
        const token = args.token || process.env.WHATSAPP_API_TOKEN || 'demo_token';
        const phoneId = args.phone_id || process.env.WHATSAPP_PHONE_ID || 'mock_phone_id';
        result = await sendWhatsAppMedia(args.phone_number, args.media_url, args.caption, token, phoneId);
        break;
      }

      default:
        throw new Error(`Ferramenta MCP desconhecida ou não registrada: ${name}`);
    }

    // Formatação padronizada da resposta em JSON legível para o LLM e para o usuário
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            error: error.message || 'Erro interno na execução da ferramenta no servidor SocialHub MCP',
            tool_requested: name
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

/**
 * Conectar o servidor ao transporte Stdio (comunicação padrão para MCP com LLMs)
 */
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Servidor SocialHub MCP Sênior rodando com sucesso via Stdio Transport!');
}

runServer().catch((error) => {
  console.error('Erro fatal ao iniciar o servidor SocialHub MCP:', error);
  process.exit(1);
});
