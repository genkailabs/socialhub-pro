# Configuração da integração Meta (Instagram) — SocialHub

Guia para habilitar o **connect real do Instagram** (OAuth). Você faz os passos no painel Meta e edita o `.env.local` você mesmo (segredos nunca passam pelo assistente).

## Pré-requisitos da conta

- Instagram em modo **Profissional** (Business ou Criador).
- Esse IG **vinculado a uma Página do Facebook** que você administra.
- Você é **admin** dessa Página **e** tem papel (admin/dev/testador) no app Meta.

## 1. Rotacionar o App Secret (obrigatório — o antigo vazou no git)

1. Acesse https://developers.facebook.com/apps e abra seu app (o App ID antigo era `1398041688806808`; se for seu, use esse).
2. Menu lateral: **Configurações → Básico** (Settings → Basic).
3. No campo **Chave Secreta do App** (App Secret), clique em **Mostrar** e depois em **Redefinir/Reset**. Confirme.
4. Copie o **novo** secret (você vai colar no `.env.local`, passo 4).

> O App ID fica nesse mesmo painel (é público). Anote-o.

## 2. Adicionar/Configurar o Facebook Login

1. No app: **Produtos** → adicione **Login do Facebook** (Facebook Login) se ainda não existir.
2. Em **Login do Facebook → Configurações**, no campo **URIs de redirecionamento do OAuth válidos** (Valid OAuth Redirect URIs), adicione:
   - Local: `http://localhost:3000/api/meta/callback`
   - Produção (quando publicar): `https://SEU-DOMINIO/api/meta/callback`
3. Salve.

> A `redirect_uri` enviada pelo app precisa bater **exatamente** com uma dessas. O app monta ela a partir de `APP_URL` (passo 4).

## 3. Permissões / modo do app

- Escopos usados: `public_profile, pages_show_list, pages_read_engagement, instagram_basic, instagram_content_publish, business_management`.
- Em **modo de Desenvolvimento**, esses escopos funcionam para quem tem **papel no app** (admin/dev/testador) — perfeito para você testar.
- Para **outros usuários** (produção), a Meta exige **Revisão do App** (App Review) desses escopos + **Verificação de Negócio**. Fica para depois.

## 4. Preencher `.env.local`

Abra `H:\GERENCIADOR REDES SOCIAIS\.env.local` e preencha (descomente as linhas):

```
META_APP_ID=seu_app_id
META_APP_SECRET=o_novo_secret_rotacionado
META_OAUTH_SCOPES=public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,business_management
APP_URL=http://localhost:3000
```

- `APP_URL` local = `http://localhost:3000` (precisa casar com a redirect URI do passo 2).
- **Não** precisa de `SUPABASE_SERVICE_ROLE_KEY` — a arquitetura nova usa a sessão do usuário + RLS.

## 5. Reiniciar e testar

1. Pare o `npm run dev` (Ctrl+C) e rode de novo — variáveis de ambiente só carregam no start.
2. Logue no app → crie/selecione uma marca → aba **Conexões** → **Conectar (OAuth real)** no Instagram.
3. Autorize no diálogo do Facebook. **Marque TODAS as caixas** das suas Páginas e do Instagram na tela de permissões.
4. Volta pro app com banner "Instagram @conta conectado". A rede aparece em **Conectado ● real**.

## Erros comuns (o app mostra a mensagem exata da Meta)

- **"Nenhuma Página retornada"** → na tela de autorização você não marcou as caixas das Páginas/IG. Refaça e marque tudo.
- **"Nenhuma conta Instagram Business vinculada"** → seu IG não está Profissional ou não está vinculado à Página. Ajuste no app do Instagram (Editar perfil → vincular Página).
- **"redirect_uri isn't allowed"** → a URI do passo 2 não bate com `APP_URL`. Confira porta/protocolo.
- **"Integração Meta não configurada"** → `META_APP_ID`/`SECRET` faltando no `.env.local` ou dev não reiniciado.
