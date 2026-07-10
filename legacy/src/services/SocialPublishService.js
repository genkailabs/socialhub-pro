// src/services/SocialPublishService.js
// Serviço Frontend para Publicação Imediata e Agendada nas Redes Sociais

export const SocialPublishService = {
  async publishPost({ brandId, postId, title, content, mediaUrl, networks }) {
    if (!brandId) {
      throw new Error('Marca não identificada para publicação.');
    }

    const response = await fetch('/api/social/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brand_id: brandId,
        post_id: postId,
        title,
        content,
        media_url: mediaUrl,
        networks
      })
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (e) {
      // Falha no parse JSON
    }

    if (!response.ok || (payload && !payload.success)) {
      const errorMsg = payload?.error || `Falha HTTP ${response.status} ao publicar na API oficial.`;
      throw new Error(errorMsg);
    }

    return payload;
  }
};
