# Railway - SocialHub MVP

Use dois servicos no mesmo projeto Railway, ambos apontando para este
repositorio. O terceiro (YouTube) esta pausado.

A Vercel foi desativada; o Railway e o unico ambiente de execucao. O banco e a
autenticacao continuam no Supabase.

## 1. Servico do painel

- Start Command: `npm start`
- Healthcheck Path: `/login`
- Gere um dominio publico e copie-o para `APP_URL`.

## 2. Servico de publicacao

- Start Command: `npm run cron:railway`
- Cron Schedule: `*/5 * * * *`
- Restart Policy: `NEVER`
- Use as mesmas variaveis de ambiente do painel.

Publica os posts vencidos e dispara o piloto automatico, que tem trava propria de
~20h e nao gera a cada rodada. A janela de 5 minutos e o que permite respeitar o
horario agendado.

## 3. Servico de sincronizacao do YouTube (PAUSADO)

> Nao criar por enquanto. O foco atual e o Instagram. Sem este servico, as
> metricas do YouTube em `/metrics` param no ultimo dado sincronizado — nada
> quebra, so congela. O runner ja esta pronto para quando for retomado.

- Start Command: `npm run cron:youtube`
- Cron Schedule: `0 6 * * *`
- Restart Policy: `NEVER`
- Precisa tambem de `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

Este cron vivia no `vercel.json`; diario e suficiente e evita gastar cota da API
do YouTube.

Os dois servicos de cron chamam uma rota protegida por `CRON_SECRET` e encerram
ao terminar, o que permite ao Railway executar a proxima rodada normalmente.

## Variaveis de ambiente

Copie as variaveis de `.env.example` para os dois servicos. Em `APP_URL`, use o dominio HTTPS gerado pelo Railway, por exemplo `https://seu-projeto.up.railway.app`.

Necessarias para a automacao: `APP_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `DEEPSEEK_API_KEY`, `DEAPI_API_KEY`, `META_APP_ID` e `META_APP_SECRET`.

`APP_URL` precisa apontar para o dominio do painel no Railway: e para ele que os
servicos de cron fazem a chamada HTTPS.

## Deploy

1. Crie um projeto no Railway e conecte este repositorio do GitHub.
2. Crie o primeiro servico para o painel e configure as variaveis.
3. Gere o dominio, atualize `APP_URL` com ele e faca novo deploy.
4. Crie o segundo servico com o mesmo repositorio e configure o cron a cada cinco minutos.
5. Em Supabase Auth e no Meta Developers, inclua o novo dominio do Railway nas URLs permitidas de callback.
