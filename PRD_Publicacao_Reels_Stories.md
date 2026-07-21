# PRD — Publicação Automática de Reels e Stories

**Versão:** 1.0
**Data:** 2026-07-20
**Status:** Pronto para implementação
**Escopo:** apenas Instagram
**Depende de:** `PRD_Social_Hub_Jornada_Instagram.md` §5.1 (planejar ≠ publicar) e §10.1 (registro de formatos)

---

## 1. Contexto

O PRD original já previu essa fase e deixou o caminho pronto de propósito: **"habilitar Reels no futuro deve ser: escrever o publicador, virar a flag no registro. Nada mais"** (`lib/formats.js`). Hoje os quatro formatos já são **planejados e produzidos** normalmente (roteiro de Reel, sequência de Stories), mas só imagem e carrossel são **publicados** automaticamente — Reel e Stories terminam como "pronto para postar", o usuário posta manualmente pelo próprio Instagram e confirma clicando em "postado por mim" (`markPostedManually`, em `lib/content-actions.js` / `components/content/ContentReview.jsx`).

Auditando o código para fechar essa lacuna, encontrei um bloqueador que não é sobre Reels/Stories em si, mas precisa ser resolvido primeiro — e uma decisão de produto que a própria Meta força, não o Social Hub.

## 2. Achados técnicos

### 2.1 Existem duas implementações da publicação, e uma delas não espera o vídeo processar

- `lib/meta/graph.js` (usado no fluxo manual de "publicar agora") cria o container, **espera o `status_code` virar `FINISHED`** (`waitContainerReady`) e só então publica.
- `supabase/functions/publish-due-posts/index.ts` (a Edge Function que o cron chama a cada 5 minutos, migrada em 19/07) **reimplementa a publicação em Deno sem esse polling** — cria o container e já tenta publicar em seguida.

Para imagem isso quase sempre passa despercebido (processa rápido). Para vídeo (Reels e Stories em vídeo), o processamento da Meta demora mais, e publicar sem esperar `FINISHED` falha ou publica conteúdo corrompido. **Isso precisa ser corrigido na Edge Function antes de habilitar qualquer formato de vídeo**, não é opcional.

### 2.2 Não existe upload de mídia no produto — hoje tudo vem de IA

Toda imagem publicada hoje é gerada pela Pollinations; não há nenhum campo de upload em `components/content/ContentReview.jsx` nem bucket de mídia do usuário. Reels são entregues como **roteiro para o usuário gravar**, e geração de vídeo por IA está fora de escopo (decisão já tomada no PRD original). Ou seja: **para publicar um Reel automaticamente, o vídeo tem que vir de algum lugar — e esse lugar só pode ser um upload do usuário**, porque o sistema não grava por ele.

O mesmo vale para Stories: cada card da sequência (`lib/ai/skills/story-planner`) é uma orientação de captura (foto, vídeo curto ou texto sobre cor) — quem grava é o usuário.

### 2.3 A API de Stories não aceita elementos interativos

A Graph API publica Stories como imagem ou vídeo simples. **Enquete, caixa de perguntas e outros elementos interativos não podem ser adicionados via API** — só manualmente, dentro do app do Instagram. O Story Planner já sugere esses elementos como parte natural da sequência (§9.10 do PRD original). Isso não é uma limitação de engenharia do Social Hub, é um limite da própria Meta.

**Decisão de produto necessária:** cards de Stories sem elemento interativo podem ser publicados automaticamente; cards com enquete/caixa de pergunta continuam exigindo postagem manual, mesmo depois desta fase. A tela precisa deixar isso visualmente claro por card, não só por formato inteiro.

---

## 3. Requisitos

### 3.1 Corrigir a publicação por vídeo na Edge Function (pré-requisito)

**RF-01:** Adicionar polling de `status_code` (`FINISHED`/`ERROR`, com tentativas e intervalo) em `supabase/functions/publish-due-posts/index.ts` antes de chamar `media_publish` — replicando o que `lib/meta/graph.js` já faz no fluxo manual, para as duas implementações pararem de divergir.

**RF-02:** Considerar consolidar num só lugar a lógica de publicação (hoje duplicada entre `lib/meta/graph.js`/`lib/publishers` e a Edge Function Deno), para o próximo formato não exigir corrigir os dois pontos de novo. Se a consolidação for grande demais para esta fase, ao menos documentar a duplicação como dívida conhecida.

### 3.2 Upload de mídia do usuário

**RF-03:** Bucket no Supabase Storage para vídeos/fotos gravados pelo usuário, com acesso de leitura que a Graph API consiga buscar (URL pública ou assinada de duração suficiente para o processamento).

**RF-04:** Campo de upload em `ContentReview.jsx` para itens de formato Reel e Stories, substituindo o botão "postado por mim" por um fluxo de "enviar meu vídeo/foto" quando o item estiver pronto e o usuário quiser publicação automática (mantendo a opção "postado por mim" para quem preferir postar direto pelo Instagram, como hoje).

**RF-05:** Validação de especificações no upload, alinhada aos limites da Meta para Reels (formato de vídeo, proporção recomendada 9:16, duração e tamanho de arquivo) e para Stories (imagem ou vídeo curto). Rejeitar no upload, não na hora de publicar.

**RF-06:** Novo estado no pipeline de conteúdo para itens de vídeo aguardando o arquivo do usuário (ex.: `aguardando_upload`), antes de poderem entrar na fila de agendamento — um Reel aprovado sem vídeo enviado não pode virar `scheduled`.

### 3.3 Publishers e registro de formatos

**RF-07:** Implementar `publishInstagramReel` (container com `media_type=REELS`, `video_url`, `share_to_feed`) e `publishInstagramStory` (container com `media_type=STORIES`, `image_url` ou `video_url`, sem legenda) em `lib/meta/graph.js`, seguindo o mesmo padrão container→status→publish já usado para imagem/carrossel.

**RF-08:** Adicionar os publishers correspondentes em `lib/publishers/index.js` e na Edge Function (após RF-01/RF-02).

**RF-09:** Em `lib/formats.js`, virar `publishable: true` e preencher `publisher` para `reel` (`instagram-reel`) e, para `stories`, `publishable: true` **apenas quando o card não tiver elemento interativo** (RF a definir na revisão de segurança/conteúdo — ver 3.4) — cards com enquete/caixa de pergunta continuam `publishable: false` por card, não por formato inteiro.

### 3.4 Regra por card em Stories

**RF-10:** Como Stories são uma sequência de cards e a publicabilidade agora depende do conteúdo do card (interativo ou não), a checagem de `isPublishable` precisa acontecer por card, não só por formato — ajustar o ponto que hoje decide isso (`lib/formats.js` + fluxo de aprovação) para considerar essa granularidade nova só para Stories.

---

## 4. Fora de escopo

- Geração de vídeo por IA — continua sendo o usuário quem grava (decisão já tomada no PRD original).
- Publicação automática de Stories com elementos interativos — bloqueio da própria Meta, não do produto.
- Edição de vídeo dentro do Social Hub (corte, legenda embutida etc.) — o upload é do arquivo final, pronto.

## 5. Ordem de implementação

1. **RF-01/RF-02** — corrigir o polling na Edge Function. Pré-requisito de tudo o resto; sem isso, qualquer publicação de vídeo é instável.
2. **RF-03/RF-04/RF-05/RF-06** — upload de mídia e o novo estado de pipeline. Sem isso não há o que publicar.
3. **RF-07/RF-08** — os publishers de Reel e Story.
4. **RF-09/RF-10** — virar as flags do registro de formatos, com a granularidade por card em Stories.

## 6. Critérios de aceitação

- Um Reel aprovado, com vídeo enviado pelo usuário e dentro das specs, publica sozinho no horário agendado, sem exigir clique de "postado por mim".
- Um card de Stories sem elemento interativo publica automaticamente; um card com enquete continua exigindo postagem manual, com aviso claro na tela sobre por quê.
- A Edge Function nunca tenta publicar um container de vídeo antes do `status_code` virar `FINISHED`.
- Upload de vídeo fora de especificação é rejeitado no momento do envio, com mensagem clara, não como falha silenciosa na hora agendada de publicar.

## 7. Riscos

- Processamento de vídeo pela Meta pode demorar mais que o intervalo de tentativas padrão usado hoje para imagem — os tempos de espera/retry do RF-01 precisam ser maiores para vídeo do que os usados para imagem, não uma cópia direta do polling atual.
- Upload de arquivo grande (vídeo) muda o perfil de custo/armazenamento do Supabase Storage — vale checar limites do plano atual do Supabase antes de liberar a funcionalidade para todas as marcas.
