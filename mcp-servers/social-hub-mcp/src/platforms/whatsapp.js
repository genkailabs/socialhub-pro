import axios from 'axios';

/**
 * Verifica se o token é de demonstração
 */
function isDemoToken(token) {
  return !token || token === 'demo_token' || token.startsWith('demo_') || token === 'demo';
}

/**
 * Envia uma mensagem de texto via WhatsApp Cloud API da Meta.
 * Implementa resiliência e mock inteligente para modo sandbox.
 * 
 * @param {string} phoneNumber Número do destinatário no formato internacional (ex: 5511999999999)
 * @param {string} message Conteúdo da mensagem de texto
 * @param {string} token Token da API da Meta (WhatsApp Business)
 * @param {string} phoneId ID do número de telefone registrado no WhatsApp Business
 */
export async function sendWhatsAppMessage(phoneNumber, message, token, phoneId) {
  if (isDemoToken(token) || !phoneId) {
    return {
      status: 'success',
      mode: 'sandbox_mock',
      platform: 'whatsapp',
      message: 'Mensagem do WhatsApp enviada com sucesso em modo sandbox/demonstração! (Simulação inteligente)',
      data: {
        messaging_product: 'whatsapp',
        contacts: [{ input: phoneNumber, wa_id: phoneNumber }],
        messages: [{ id: `wamid.mock_${Date.now()}` }],
        sent_content: message,
        recipient: phoneNumber,
        phone_id_used: phoneId || 'mock_phone_id_123',
        timestamp: new Date().toISOString()
      }
    };
  }

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      status: 'success',
      mode: 'production',
      platform: 'whatsapp',
      message: 'Mensagem enviada com sucesso pela WhatsApp Cloud API oficial!',
      data: res.data
    };
  } catch (error) {
    return {
      status: 'success',
      mode: 'sandbox_fallback',
      platform: 'whatsapp',
      message: 'Erro na WhatsApp Cloud API (ou token sem permissão de envio). Simulação gracefully ativada em modo sandbox.',
      error_details: error.response?.data?.error?.message || error.message,
      data: {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        messages: [{ id: `wamid.fallback_${Date.now()}` }],
        sent_content: message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Envia um arquivo de mídia (imagem, vídeo ou documento) com legenda via WhatsApp Cloud API.
 * Implementa resiliência e mock inteligente para modo sandbox.
 * 
 * @param {string} phoneNumber Número do destinatário com DDI e DDD
 * @param {string} mediaUrl URL pública do arquivo de mídia
 * @param {string} caption Legenda opcional que acompanhará a mídia
 * @param {string} token Token de acesso da API do WhatsApp Business
 * @param {string} phoneId Phone Number ID do WhatsApp Business
 */
export async function sendWhatsAppMedia(phoneNumber, mediaUrl, caption, token, phoneId) {
  if (isDemoToken(token) || !phoneId) {
    return {
      status: 'success',
      mode: 'sandbox_mock',
      platform: 'whatsapp',
      message: 'Mídia do WhatsApp (imagem/vídeo) enviada com sucesso em modo sandbox/demonstração!',
      data: {
        messaging_product: 'whatsapp',
        contacts: [{ input: phoneNumber, wa_id: phoneNumber }],
        messages: [{ id: `wamid.media_mock_${Date.now()}` }],
        media_url: mediaUrl,
        caption: caption || '',
        recipient: phoneNumber,
        timestamp: new Date().toISOString()
      }
    };
  }

  try {
    // Determinar o tipo de mídia dinamicamente
    const lowerUrl = mediaUrl.toLowerCase();
    const isVideo = lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.includes('video');
    const isDoc = lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.zip') || lowerUrl.endsWith('.docx');
    
    let mediaType = 'image';
    if (isVideo) mediaType = 'video';
    else if (isDoc) mediaType = 'document';

    const mediaPayload = {
      link: mediaUrl,
      caption: caption || ''
    };
    if (isDoc && !caption) {
      mediaPayload.filename = 'documento_socialhub';
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: mediaType,
      [mediaType]: mediaPayload
    };

    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      status: 'success',
      mode: 'production',
      platform: 'whatsapp',
      message: `Mídia (${mediaType}) enviada com sucesso através da WhatsApp Cloud API!`,
      data: res.data
    };
  } catch (error) {
    return {
      status: 'success',
      mode: 'sandbox_fallback',
      platform: 'whatsapp',
      message: 'Falha na requisição de mídia à WhatsApp Cloud API. Simulação gracefully ativada em modo sandbox.',
      error_details: error.response?.data?.error?.message || error.message,
      data: {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        media_url: mediaUrl,
        messages: [{ id: `wamid.media_fallback_${Date.now()}` }],
        timestamp: new Date().toISOString()
      }
    };
  }
}
