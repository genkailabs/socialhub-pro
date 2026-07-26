# Meta Ads: configuração segura

Esta integração é somente leitura. Ela pede `ads_read` e `business_management`; nunca pede `ads_management` e não cria, pausa ou altera campanhas.

## Antes do teste real

1. Cadastre em **Valid OAuth Redirect URIs** a URL pública exata: `APP_URL/api/meta/ads/callback`.
2. No servidor, cadastre apenas `APP_URL`, `META_APP_ID`, `META_APP_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` como variáveis privadas.
3. Mantenha o app em modo de desenvolvimento e teste apenas com a conta administradora autorizada.
4. Rotacione qualquer Client Token exposto antes de testar; ele não é usado nem deve ser enviado ao SocialHub.

## Resultado esperado

O SocialHub guarda o token apenas no banco protegido para servidor, lê até 30 dias de insights de campanha e mostra os dados em `/paid-traffic`. Se a Meta devolver mais de uma conta, a pessoa escolhe uma delas no SocialHub antes da primeira leitura.
