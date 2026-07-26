# Configuração Meta Ads — SocialHub

Esta é a etapa externa necessária antes de habilitar a conexão real na janela `/paid-traffic`.

## Pré-requisitos

1. A marca deve ter um administrador com acesso à conta de anúncios no Business Manager.
2. O app Meta deve ter o caso de uso/permissão `ads_read`; `ads_management` continua desativada nesta fase.
3. O callback de produção precisa usar `APP_URL`; não cadastrar origem interna do Render.
4. Testar primeiro com uma conta sandbox ou conta de anúncios controlada pela equipe.

## Evidência obrigatória antes de liberar

- `GET /me/adaccounts` retorna pelo menos uma conta permitida usando token de teste.
- `GET /act_<id>/campaigns` retorna leitura para a conta escolhida.
- O app passou pelo acesso/revisão Meta exigido para os usuários que usarão a integração.
- O token e o App Secret não foram colocados em `.env.example`, documentação, banco de snapshots, logs ou front-end.

## Limite desta entrega

Enquanto estes itens não tiverem sido validados, a janela apresenta o estado de preparação e não inicia OAuth, não persiste tokens e não faz chamadas externas à Meta. A criação, pausa e retomada de campanhas permanecem fora da interface.
