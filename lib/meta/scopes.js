// Permissões pedidas no OAuth da Meta.
//
// O que não estiver aqui o token nunca terá: não adianta liberar no painel da
// Meta se o app não pede. Foi exatamente assim que o diagnóstico ficou sem
// alcance e salvamentos — instagram_manage_insights não estava na lista, a
// Graph API respondia erro 10 e ninguém sabia por quê.
//
// Mudar esta lista só afeta quem reconectar: tokens já emitidos mantêm as
// permissões que tinham quando foram criados.
export const META_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',        // publicar na Página do Facebook
  'instagram_basic',           // perfil e mídia
  'instagram_content_publish', // publicar no Instagram
  'instagram_manage_insights', // alcance, impressões, salvamentos, visitas
  'business_management'
];

// Permissões sem as quais o produto perde função, mas continua de pé. A tela
// avisa em vez de mostrar zero (lib/meta/insights.js).
export const OPTIONAL_SCOPES = new Set(['instagram_manage_insights', 'pages_manage_posts']);

export function scopeString(scopes = META_SCOPES) {
  return scopes.join(',');
}

// Quais permissões pedidas não foram concedidas — usado para explicar ao usuário
// o que está faltando, em vez de deixar a métrica sumir sem explicação.
export function missingScopes(granted = []) {
  const set = new Set(granted);
  return META_SCOPES.filter((s) => !set.has(s));
}
