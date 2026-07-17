# Railway - SocialHub MVP

Use dois servicos no mesmo projeto Railway, ambos apontando para este repositorio.

## 1. Servico do painel

- Start Command: `npm start`
- Healthcheck Path: `/login`
- Gere um dominio publico e copie-o para `APP_URL`.

## 2. Servico de automacao

- Start Command: `npm run cron:railway`
- Cron Schedule: `*/5 * * * *`
- Restart Policy: `NEVER`
- Use as mesmas variaveis de ambiente do painel.

O servico de automacao chama a rota protegida de publicacao e encerra ao terminar. Isso permite que o Railway execute a proxima rodada normalmente.

## Variaveis de ambiente

Copie as variaveis de `.env.example` para os dois servicos. Em `APP_URL`, use o dominio HTTPS gerado pelo Railway, por exemplo `https://seu-projeto.up.railway.app`.

Necessarias para a automacao: `APP_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `DEEPSEEK_API_KEY`, `DEAPI_API_KEY`, `META_APP_ID` e `META_APP_SECRET`.

## Deploy

1. Crie um projeto no Railway e conecte este repositorio do GitHub.
2. Crie o primeiro servico para o painel e configure as variaveis.
3. Gere o dominio, atualize `APP_URL` com ele e faca novo deploy.
4. Crie o segundo servico com o mesmo repositorio e configure o cron a cada cinco minutos.
5. Em Supabase Auth e no Meta Developers, inclua o novo dominio do Railway nas URLs permitidas de callback.
