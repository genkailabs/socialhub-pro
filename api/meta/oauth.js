// api/meta/oauth.js
// Endpoint Serverless da Vercel para iniciar o fluxo oficial de OAuth com a Meta / Instagram Graph API

export default async function handler(req, res) {
  const { brand_id, redirect_uri } = req.query;
  
  const appId = process.env.META_APP_ID || '1398041688806808';
  const baseUrl = process.env.VITE_APP_URL || 'https://socialhub-pro-steel.vercel.app';
  const callbackUrl = `${baseUrl}/api/meta/callback`;
  
  // O state armazena de forma segura o ID da marca e o timestamp para evitar CSRF
  const stateObj = {
    brand_id: brand_id || 'default-brand-pro',
    timestamp: Date.now()
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');
  
  // Escopos necessarios para acessar Instagram Business via Graph API
  // public_profile: autenticacao basica do usuario
  // pages_show_list + pages_read_engagement: listar Pages do usuario
  // instagram_basic: CRITICO - sem ele, instagram_business_account vem sempre null
  // instagram_content_publish: futuro agendamento de posts
  const scopes = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish'
  ].join(',');
  
  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  
  // Redireciona o navegador do usuário diretamente para a tela de autorização do Facebook/Meta
  res.redirect(302, authUrl);
}
