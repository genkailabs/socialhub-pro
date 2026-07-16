# Design: geração de imagens para notícias com IA

## Objetivo

Transformar a geração de imagem do Composer em uma ferramenta que crie artes visualmente ligadas ao assunto da notícia. A pessoa informa ou gera o conteúdo; o sistema entende o tema e cria opções de imagem coerentes para escolha antes da publicação.

Exemplos:

- Vibe Coding: ambiente de programação, IA, código e clima tecnológico.
- Futebol: campo, torcida, jogador ou bola, conforme o contexto do texto.
- Economia: gráficos, negócios ou elementos financeiros relacionados à notícia.

## Experiência proposta

No Composer, a seção de imagem passa a ter um bloco "Imagem da notícia" com:

1. Um resumo do tema identificado a partir do título e da legenda.
2. Um campo opcional "Direção visual" para o usuário orientar a imagem, por exemplo: "noturno, moderno, sem pessoas".
3. Botão "Criar opções" que gera quatro imagens relacionadas ao tema.
4. Uma grade com as quatro opções e seleção de uma delas.
5. Controle "Adicionar título na imagem".
6. Campo de título curto e controles simples de posição e estilo.
7. Prévia final da arte antes de salvar ou agendar o post.

## Texto na imagem

O modelo de imagem cria apenas o visual. O SocialHub insere o título depois, usando a tipografia e as cores da marca.

Isso evita palavras erradas ou ilegíveis geradas diretamente pela IA, mantém a identidade visual e permite ativar ou desativar o texto sem criar outra imagem. O título é opcional; com o controle desligado, a arte é usada sem texto.

## Qualidade de geração

O gerador atual privilegia velocidade e custo, usando Flux Schnell com poucos passos. A nova camada de geração será independente do fornecedor de imagem, permitindo usar um modelo de maior qualidade e trocar de fornecedor sem mudar a tela.

Cada geração recebe um prompt estruturado com: assunto, contexto da notícia, estilo visual, formato da rede, restrições de texto e elementos a evitar. A tela mostra qual opção foi escolhida e o custo estimado antes de salvar.

## Fluxo de dados

```text
Título + legenda + direção visual
            ↓
      resumo do tema
            ↓
 geração de 4 imagens sem texto
            ↓
      escolha de uma imagem
            ↓
 texto opcional aplicado pelo SocialHub
            ↓
      prévia, salvar ou agendar
```

## Erros e limites

- Se uma das opções falhar, as demais continuam disponíveis.
- Se todas falharem, a tela mostra uma mensagem simples e permite tentar novamente.
- O usuário pode editar a direção visual e gerar novas opções.
- A imagem original é preservada; a camada de texto pode ser ligada, desligada ou ajustada sem nova cobrança de geração.

## Validação futura

- Testar que o tema e a direção visual chegam ao prompt estruturado.
- Testar que quatro opções podem ser exibidas e uma pode ser escolhida.
- Testar que o texto opcional é aplicado somente quando ativado.
- Testar falhas parciais e falha total de geração.
