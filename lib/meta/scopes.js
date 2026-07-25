// Permissões pedidas no OAuth da Meta.
//
// O que não estiver aqui o token nunca terá: não adianta liberar no painel da
// Meta se o app não pede. Foi exatamente assim que o diagnóstico ficou sem
// alcance e salvamentos — instagram_manage_insights não estava na lista, a
// Graph API respondia erro 10 e ninguém sabia por quê.
//
// A recíproca também morde: pedir permissão que o app da Meta NÃO declarou nos
// seus casos de uso derruba o diálogo inteiro com "Invalid Scopes: ..." e
// ninguém conecta nada. Por isso as permissões extras são opt-in por env: só
// entram no pedido depois de existirem no painel da Meta.
//
// Mudar estas listas só afeta quem reconectar: tokens já emitidos mantêm as
// permissões que tinham quando foram criados.

// Sem estas o produto não existe: ler a conta, listar Páginas e publicar.
export const REQUIRED_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',           // perfil e mídia
  'instagram_content_publish', // publicar no Instagram
  'business_management'
];

// Permissões sem as quais o produto perde função, mas continua de pé:
//   instagram_manage_insights → alcance/impressões/salvamentos no diagnóstico
//   pages_manage_posts        → publicar na Página do Facebook
// A tela avisa em vez de mostrar zero (lib/meta/insights.js).
export const OPTIONAL_SCOPE_LIST = ['instagram_manage_insights', 'pages_manage_posts'];
export const OPTIONAL_SCOPES = new Set(OPTIONAL_SCOPE_LIST);

// Todas as permissões que o produto conhece — não é o que se pede, é o catálogo.
export const META_SCOPES = [...REQUIRED_SCOPES, ...OPTIONAL_SCOPE_LIST];

// Opcionais liberadas no painel da Meta, declaradas em META_OPTIONAL_SCOPES.
// Ignora nome desconhecido de propósito: env com typo não pode quebrar o login.
export function enabledOptionalScopes(env = process.env) {
  const raw = env?.META_OPTIONAL_SCOPES || '';
  const wanted = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  return OPTIONAL_SCOPE_LIST.filter((s) => wanted.has(s));
}

// O que de fato vai no diálogo de OAuth.
export function requestedScopes(env = process.env) {
  return [...REQUIRED_SCOPES, ...enabledOptionalScopes(env)];
}

export function scopeString(scopes = requestedScopes()) {
  return scopes.join(',');
}

// Quais permissões pedidas não foram concedidas — usado para explicar ao usuário
// o que está faltando, em vez de deixar a métrica sumir sem explicação.
export function missingScopes(granted = [], requested = requestedScopes()) {
  const set = new Set(granted);
  return requested.filter((s) => !set.has(s));
}
