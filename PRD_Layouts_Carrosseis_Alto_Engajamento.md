# PRD — Layouts de carrossel de alto engajamento

**Família:** `carrossel_editorial_tendencia`
**Onde vive:** `carrossel-studio/src/lib/templates/` (catálogo de templates do Studio)
**Data:** 2026-08-05
**Referências analisadas:** `docs/referencias-layout/carrossel/01-morte-dos-reels` (10 slides),
`02-cuidados-masculinos` (9 slides), `03-genkailabs-prints`

---

## 1. O problema

Hoje o Studio tem 7 templates e cada um sabe montar **três** tipos de slide:
capa, conteúdo e CTA (`TemplateDef.buildCover / buildContent / buildCta`). Um
carrossel de 9 slides sai com 7 slides de conteúdo **iguais** — mesma manchete,
mesma foto no meio, mesmo corpo embaixo. Quem quer uma lista com ✓ e ✗, uma
grade de prova social ou um print de perfil precisa montar tudo na mão,
elemento por elemento.

As referências de alto engajamento fazem o contrário: **cada slide tem uma
função narrativa diferente e um layout diferente**, e o que se repete é só o
cromo (topo, rodapé, cor de destaque, tipografia).

## 2. A decisão

Criar uma **família de layouts editoriais de tendência**: um template com
**seis modelos de slide** e uma **sequência automática** que escolhe o modelo
por posição e por formato do bloco de texto. Cores e fontes vêm do Brand Kit —
o layout é da família, a identidade é da marca.

Não é um template novo na lista dos sete. É a primeira família: um template
cujo `buildContent` deixa de ser único.

## 3. Anatomia observada nas referências

### 3.1 Cromo persistente (todos os slides)

| Zona | Conteúdo | Observado em |
|---|---|---|
| Topo esquerdo | assinatura fixa, mono, caixa-alta, ~11px @1080, cor esmaecida | todas |
| Topo direito | `@handle · MÊS ANO ®`, mesmo estilo | todas |
| Rodapé | barra de progresso: trilho fino + preenchimento em accent + `n/10` | 01 |
| Rodapé (variante) | badge de perfil com avatar e selo verificado | 01 capa, 02 |

A barra de progresso é o único elemento que **muda por slide** (o preenchimento
acompanha a posição). Isso já existe no modelo de dados: é `shape` com `frame.w`
calculado.

### 3.2 Tipografia

Duas vozes, nunca três:

- **Manchete** — condensada, caixa-alta, peso 800+, entrelinha 0.92–1.0.
  Palavras-chave em `brand-accent` **dentro da frase** (é o `wordStyles` que o
  Studio já tem).
- **Corpo** — sans humanista, peso 400/600 misturados na mesma frase para
  grifar (também `wordStyles`).

A referência 02 troca a manchete condensada por serif de display clara sobre
fundo navy. Mesma estrutura, outro Brand Kit — é exatamente o eixo que a
família precisa expor.

### 3.3 Cor

Fundo alterna entre **claro (#f4f0ee)** e **escuro (#0e0e10)** ao longo do
carrossel; o accent é o mesmo nos dois (laranja #f03b12 na referência 01). A
alternância não é decorativa: separa "tese" de "prova".

## 4. Os seis modelos de slide

Medidas em % do slide (o `frame` do Studio é percentual). `PAD` = 6.5.

### M1 · Capa foto (`role: cover`)

Foto sangrada (`image` slot 0, frame 0/0/100/100, z 0) + gradiente escuro de
baixo (`darkGradient(78)`). Badge pill com avatar + `@handle` + selo, em
`y ≈ 50`. Manchete `y ≈ 56`, até 5 linhas, 96–116px, caixa-alta. Linha de
apoio com seta (`→ E COMO APLICAR...`) em mono, `y ≈ 90`. Barra de progresso.

**Quando:** slide 1, sempre.

### M2 · Tese (`role: content`, modelo `tese`)

Sem foto. Fundo liso. Manchete grande `y ≈ 20` (até 3 linhas, 86px) com
destaque em accent. Abaixo, corpo opcional `y ≈ 52`.

**Quando:** primeiro slide depois da capa, e sempre que o bloco de texto tiver
até 2 frases e nenhum marcador.

### M3 · Lista marcada (`role: content`, modelo `lista`)

Manchete curta no topo (`y ≈ 14`, 2 linhas). Abaixo, 2 a 5 itens; cada item é
um `icon` (check ou x) dentro de um `shape` quadrado de canto arredondado
(verde 12% / vermelho 12%) + texto de corpo à direita, alinhado ao topo do
ícone.

**Quando:** o bloco de texto vem em linhas que começam com `-`, `+`, `x`, `✓`
ou `✗`. Marcador `x` no início da linha vira item negativo.

**Depende de:** os elementos `icon` (entregues em 2026-08-05, commit
`2fae64f`).

### M4 · Prova em grade (`role: content`, modelo `prova`)

Grade horizontal de 2 ou 3 cartões de imagem (slots 1..3), altura ~32%,
cantos 18px, topo em `y ≈ 22`. Cada cartão pode carregar uma legenda flutuante
(pill claro: `10,2 mil curtidas / há 3 dias`). Manchete **abaixo** da grade,
`y ≈ 58`, e lista marcada opcional embaixo.

**Quando:** o slide tem 2+ imagens disponíveis nos slots e o texto é curto.

### M5 · Print em cartão (`role: content`, modelo `print`)

Um único cartão claro (shape branco, raio 24) ocupando `y 22 → 44`, com a
imagem do print dentro (slot n, `objectFit: contain`). Manchete abaixo,
`y ≈ 48`. Lista de números embaixo (`277 mil seguidores`, `R$ 4.000.000,00`),
com o número em peso 700 e o resto em 400 — de novo `wordStyles`.

**Quando:** o bloco cita métrica (regex de número + unidade) ou o slot aponta
para um print (proporção do arquivo ≠ 4:5).

### M6 · CTA de comentário (`role: cta`, modelo `comentario`)

Corpo de fechamento em 2 parágrafos (`y ≈ 34`), com trechos grifados em peso
600. Abaixo, cartão de borda fina (raio 28, `y 64 → 84`): rótulo pequeno
(`Comenta a palavra abaixo:`), **palavra-chave gigante** em accent (condensada,
110px) e uma linha de promessa. Rodapé: badge + `Envio automático via DM`.

**Quando:** último slide, sempre.

## 5. Sequência automática

Entrada: os blocos de texto que o Hub manda (`applyContent(blocks)`), hoje
`texto 1 — MANCHETE DA CAPA`, `texto 2 — …`.

```
slide 1                      → M1 (capa)
slide 2                      → M2 (tese)
slides 3..n-1                → classificador (abaixo)
último slide                 → M6 (CTA)
```

Classificador, na ordem — primeiro que casar vence:

1. linhas com marcador (`-`, `+`, `x`, `✓`, `✗`) → **M3 lista**
2. 2+ imagens livres nos slots E texto ≤ 140 caracteres → **M4 prova**
3. número com unidade (`\d[\d.,]*\s*(mil|milhões|%|R\$|k)`) → **M5 print**
4. senão → **M2 tese**

Regra de ritmo, aplicada depois: **nunca três slides seguidos do mesmo
modelo** — o terceiro cai para M2. E o fundo alterna claro/escuro a cada
mudança de modelo, nunca dentro do mesmo bloco.

A escolha fica **gravada no slide** (`slide.model`), não recalculada no render:
trocar uma palavra do texto não pode remontar o layout que a pessoa já ajustou.

## 6. Cores e fontes vêm do Brand Kit

A família declara **papéis**, não valores:

| Papel | Token | Uso |
|---|---|---|
| Fundo A | `brand-bg` | slides "tese" |
| Fundo B | `brand-bg-alt` (novo) | slides "prova"/"print" |
| Tinta | `brand-ink` | manchete e corpo |
| Destaque | `brand-accent` | palavras grifadas, barra, palavra do CTA |
| Apagado | `brand-muted` | cromo do topo, legendas |
| Positivo | `brand-ok` (novo) | item ✓ da lista |
| Negativo | `brand-no` (novo) | item ✗ da lista |

Três tokens novos. Quando o Brand Kit não os define, o padrão é derivado:
`brand-bg-alt` = inverso de `brand-bg`; `brand-ok` = verde 140°; `brand-no` =
vermelho 8°, ambos com 12% de opacidade no fundo do quadradinho.

Fontes: `fonts.title` (condensada ou serif de display), `fonts.body`,
`fonts.label` (mono) — contrato que já existe em `TemplateDef`.

## 7. Mudança de contrato

```ts
// hoje
interface TemplateDef {
  buildCover(headline, sub): Slide;
  buildContent(headline, body, index): Slide;
  buildCta(headline, body): Slide;
}

// proposto — aditivo, os sete templates atuais seguem válidos
interface TemplateDef {
  /** família à qual o template pertence; ausente = template solto */
  family?: string;
  /** modelos que este template sabe montar, além de cover/content/cta */
  models?: Record<SlideModel, (input: BlockInput) => Slide>;
  /** decide o modelo de cada bloco; ausente = sempre "content" */
  sequence?(blocks: BlockInput[]): SlideModel[];
  …
}
```

`Slide` ganha `model?: SlideModel` (persistido no documento). Documento antigo
sem `model` continua abrindo — o render não depende do campo, ele só informa
qual builder remonta o slide.

## 8. Critérios de aceite

1. Criar um carrossel na família com 9 blocos produz **pelo menos 3 modelos
   diferentes** entre os slides 3 e 8.
2. Nenhum modelo aparece três vezes seguidas.
3. Trocar o Brand Kit troca cor e fonte dos seis modelos sem mexer em geometria.
4. Editar o texto de um slide **não** troca o modelo daquele slide.
5. Os sete templates atuais abrem e exportam iguais ao que são hoje (contrato
   aditivo).
6. Exportar PNG dos seis modelos: nenhum texto estourando a moldura, barra de
   progresso proporcional, ícones da lista com traço uniforme.
7. Documento salvo antes desta mudança abre sem erro.

## 9. Fora de escopo

- Motion/Reels dos novos modelos (o plano de motion trata elemento, não modelo).
- Gerar as legendas de curtidas da M4 automaticamente — entram como texto.
- Segunda família (ex.: `carrossel_educacional`); a família editorial é a prova
  do contrato.

## 10. Riscos

- **Classificador errando o modelo.** Mitigação: a escolha é sugestão inicial e
  fica gravada; o painel "Template" precisa de um seletor de modelo por slide
  para corrigir na mão. Sem esse seletor, o classificador vira uma prisão.
- **Slots de imagem.** M4 consome 2–3 slots por slide; um carrossel de 9 slides
  tem 9 slots. Se o classificador escolher M4 duas vezes, faltam fotos.
  Mitigação: M4 só entra se houver slot livre, e no máximo uma vez por carrossel.
- **Alternância de fundo x contraste.** `brand-ink` costuma ser calibrada para
  um fundo só. Reaproveitar os avisos de contraste que o painel de fundo já tem
  (`contrastWarnings`).
