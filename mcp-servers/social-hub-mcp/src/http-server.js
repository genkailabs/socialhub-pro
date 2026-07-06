import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

// Importação dos módulos das plataformas
import { postToInstagram, getMetaAnalytics } from './platforms/meta.js';
import { uploadYouTubeShort, getChannelStats } from './platforms/youtube.js';
import { postTikTokVideo, getTikTokAnalytics } from './platforms/tiktok.js';
import { getPodcastEpisodes, createShowNoteLink } from './platforms/spotify.js';
import { sendWhatsAppMessage, sendWhatsAppMedia } from './platforms/whatsapp.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de Diagnóstico e Health Check para o Railway / Vercel
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'SocialHub Automation Engine & MCP Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    capabilities: [
      'meta_post_instagram',
      'youtube_upload_short',
      'tiktok_post_video',
      'spotify_get_episodes',
      'whatsapp_send_message'
    ]
  });
});

// Endpoint Principal de Execução de Comandos / Publicações
app.post('/api/execute', async (req, res) => {
  const { tool, arguments: args } = req.body;

  if (!tool) {
    return res.status(400).json({ error: 'Parâmetro "tool" é obrigatório no body da requisição.' });
  }

  console.log(`⚡ [Railway/HTTP] Executando comando de automação: ${tool}`, args);

  try {
    let result;
    switch (tool) {
      // --- META / INSTAGRAM ---
      case 'meta_post_instagram': {
        const token = args?.access_token || process.env.META_ACCESS_TOKEN || 'demo_token';
        const accountId = args?.account_id || process.env.META_ACCOUNT_ID || 'mock_account_id';
        result = await postToInstagram(args?.caption, args?.media_url, token, accountId);
        break;
      }
      case 'meta_get_analytics': {
        const token = args?.access_token || process.env.META_ACCESS_TOKEN || 'demo_token';
        const accountId = args?.account_id || process.env.META_ACCOUNT_ID || 'mock_account_id';
        const platform = args?.platform || 'instagram';
        result = await getMetaAnalytics(platform, accountId, token);
        break;
      }

      // --- YOUTUBE ---
      case 'youtube_upload_short': {
        const token = args?.access_token || process.env.YOUTUBE_ACCESS_TOKEN || 'demo_token';
        result = await uploadYouTubeShort(args?.title, args?.description || '', args?.video_url, token);
        break;
      }
      case 'youtube_get_channel_stats': {
        const channelId = args?.channel_id || process.env.YOUTUBE_CHANNEL_ID || 'mock_channel_id';
        const apiKey = args?.api_key || process.env.YOUTUBE_API_KEY || 'demo_token';
        result = await getChannelStats(channelId, apiKey);
        break;
      }

      // --- TIKTOK ---
      case 'tiktok_post_video': {
        const token = args?.access_token || process.env.TIKTOK_ACCESS_TOKEN || 'demo_token';
        result = await postTikTokVideo(args?.caption, args?.video_url, token);
        break;
      }
      case 'tiktok_get_analytics': {
        const token = args?.access_token || process.env.TIKTOK_ACCESS_TOKEN || 'demo_token';
        result = await getTikTokAnalytics(token);
        break;
      }

      // --- SPOTIFY ---
      case 'spotify_get_episodes': {
        const showId = args?.show_id || process.env.SPOTIFY_SHOW_ID || 'mock_show_id';
        const token = args?.access_token || process.env.SPOTIFY_ACCESS_TOKEN || 'demo_token';
        result = await getPodcastEpisodes(showId, token);
        break;
      }
      case 'spotify_create_show_note_link': {
        const token = args?.access_token || process.env.SPOTIFY_ACCESS_TOKEN || 'demo_token';
        result = await createShowNoteLink(args?.episode_id, args?.link_url, token);
        break;
      }

      // --- WHATSAPP ---
      case 'whatsapp_send_message': {
        const token = args?.token || process.env.WHATSAPP_API_TOKEN || 'demo_token';
        const phoneId = args?.phone_id || process.env.WHATSAPP_PHONE_ID || 'mock_phone_id';
        result = await sendWhatsAppMessage(args?.phone_number, args?.message, token, phoneId);
        break;
      }
      case 'whatsapp_send_media': {
        const token = args?.token || process.env.WHATSAPP_API_TOKEN || 'demo_token';
        const phoneId = args?.phone_id || process.env.WHATSAPP_PHONE_ID || 'mock_phone_id';
        result = await sendWhatsAppMedia(args?.phone_number, args?.media_url, args?.caption, token, phoneId);
        break;
      }

      default:
        return res.status(404).json({ error: `Ferramenta '${tool}' não encontrada ou não suportada pelo motor.` });
    }

    res.status(200).json({ status: 'success', tool, data: result });
  } catch (err) {
    console.error(`❌ [Railway/HTTP] Erro ao executar ${tool}:`, err);
    res.status(500).json({ status: 'error', tool, error: err.message || 'Erro interno na execução do comando.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚂 SocialHub Automation Engine rodando com sucesso no Railway / Nuvem na porta ${PORT}!`);
  console.log(`🌐 Endpoint REST para Vercel/Painel: http://0.0.0.0:${PORT}/api/execute`);
});
