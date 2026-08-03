# Carrossel Studio (editor embarcado)

> Tela `/carrossel`. O editor de carrossel roda em outra aplicação — o **Carrossel
> Studio** (`H:\criador de carrossel\carrossel-studio`) — e entra aqui por iframe.
> O Composer continua responsável por post, story e reel.

## Por que iframe

Este projeto é Next 14 / React 18 / Tailwind 3 / JavaScript. O Studio é Next 16 /
React 19 / Tailwind 4 / TypeScript, e a paleta dele colide com os tokens daqui
(`panel`, `line`, `accent`, `danger`). Embarcar por iframe evita:

- conflito de versão de React e de Tailwind;
- vazamento de CSS nas duas direções;
- reescrever 2.186 linhas de `VisualComposer.jsx`.

O custo é um segundo deploy e uma ponte `postMessage`. Se um dia valer unificar,
o caminho é portar o módulo do Studio e renomear os tokens colidentes.

## Configuração

```bash
NEXT_PUBLIC_CARROSSEL_STUDIO_URL=http://localhost:3100   # dev
# produção: a URL onde o Studio está publicado
```

No Studio, libere este domínio para ser o pai do iframe:

```bash
EMBED_ALLOWED_ORIGINS="https://seu-gerenciador.com"
```

Em dev o Studio já libera `localhost:*`.

## Contrato (postMessage)

| Direção | Mensagem | Conteúdo |
|---|---|---|
| Studio → host | `cs:ready` | `{ version }` — pode enviar o init |
| host → Studio | `cs:init` | `{ version, doc?, brand?, templateId?, slideCount?, title?, script? }` |
| Studio → host | `cs:change` | `{ doc }` — a cada autosave |
| Studio → host | `cs:export` | `{ doc, images: [{ name, dataUrl }] }` — PNG 1080×1350 por slide |
| Studio → host | `cs:close` | usuário fechou o editor |

`brand` é o Brand Kit traduzido: `{ handle, name, copyright, avatarUrl, verified,
tokens }`. A conversão está em `lib/carrossel-studio-data.js`.

### Segurança do contrato V1

Todas as mensagens após o handshake levam `version: 1` e um `channelId` aleatório
criado pelo host. O host aceita mensagens apenas da origem configurada e da janela
do iframe montado; o Studio aceita `cs:init` apenas de `window.parent` e de
`EMBED_ALLOWED_ORIGINS`. Depois do init, os dois lados usam a origem exata em
`postMessage` (nunca `*`). Mensagens inválidas, de outra versão, janela, origem ou
canal são ignoradas. Erros retornam `cs:error`; um autosave confirmado retorna
`cs:draft-saved`.

## Fluxo

1. `/carrossel` resolve marca ativa, Brand Kit e o rascunho anterior do Studio.
2. O iframe carrega `/embed-studio`; no `cs:ready` mandamos `cs:init`.
3. O usuário edita. Cada autosave devolve `cs:change` — guardamos em memória.
4. Em **Usar no post**, o Studio renderiza os slides no navegador e manda
   `cs:export`.
5. `CarouselStudioClient` sobe cada PNG com `uploadTempMedia(supabase, brandId, file)`
   e chama `saveDraft({ format: 'carousel', imageUrls, editorState })`.
6. Agendar/publicar/aprovar continua pelo Calendário e pelas actions de post.

## Onde o dado fica

`posts.production` guarda:

```json
{ "source": "carrossel-studio", "version": 1, "editorState": { "source": "carrossel-studio", "version": 1, "doc": { …documento do Studio… } } }
```

Rascunhos do Composer continuam com `source: "visual-composer"`. Os dois convivem
sem se sobrescrever — `getStudioDraft` filtra por `source`. Sem `postId` ela abre o
rascunho mais recente; com `postId` (`/composer?format=carrossel&post=<id>`) abre
exatamente aquele carrossel, inclusive já agendado.

## O que mudou neste repositório

Só arquivos novos. Nada do Composer foi alterado:

- `app/(app)/carrossel/page.jsx`
- `components/carrossel/CarouselStudioFrame.jsx`
- `components/carrossel/CarouselStudioClient.jsx`
- `lib/carrossel-studio-data.js`
- este documento

Falta (decisão de produto): colocar o link "Carrossel" na navegação e decidir se
o botão Carrossel do Composer passa a apontar pra cá.

## Dica de imagem (que foto procurar)

Cada slide do roteiro mostra na gaveta que foto buscar. Isso é **host-side**: o
editor é outra aplicação (`/embed-studio`), então a dica vive aqui, ao lado do
texto que a originou.

- **Quem escreve:** a própria IA do roteiro, no campo opcional `imageIdea` de
  `lib/ai/skills/carousel-brief` (`scene` em PT-BR, `searchTerms` em inglês,
  `avoid`). Opcional de propósito — roteiro salvo antes do campo continua
  válido e um modelo que omita a dica não derruba a geração.
- **Reserva:** `lib/carrossel-image-hint.js`, puro e sem I/O, monta a dica a
  partir do texto do slide. Cobre roteiro antigo e roteiro colado de fora.
- **Idiomas:** cena em português (quem lê é a pessoa), termos em inglês (o
  acervo do Pexels é indexado em inglês) — mesma regra de
  `lib/photo-direction.js`, cujo vocabulário editorial é reaproveitado na busca.

## Onde o Hub explica esta tela

Dentro da gaveta do roteiro, a partir do passo 2 (`MascotTip variant="inline"`).
Era uma bolha `variant="floating"` fixa no canto inferior direito do Composer e
cobria as miniaturas dos slides do Studio; a bolha flutuante não é mais usada em
tela nenhuma.
