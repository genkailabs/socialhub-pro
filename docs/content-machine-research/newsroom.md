# Newsroom — notícia quente para capa de Instagram

**Fontes originais:**

- `E:\Claude Curso\6. Newsroom - Como Transformar notícia quente em capa de Instagram\Newsroom-Guia-de-Instalacao.pdf`
- `E:\Claude Curso\6. Newsroom - Como Transformar notícia quente em capa de Instagram\newsroom-files\`

## O que é

Um fluxo de *news-jacking*: a partir de um nicho e um recorte regional, pesquisa notícias recentes, apresenta opções verificadas, cria headlines e produz **uma capa estática** em 1080×1350. Não é gerador de carrossel completo, vídeo ou publicação automática.

## Arquitetura do material

| Arquivo | Função |
| --- | --- |
| `newsroom-system-prompt.md` | Orquestra pesquisa, curadoria, headlines, imagem, render, exportação e legenda opcional. |
| `newsroom-design.md` | Regras para a capa única: foto, gradiente de legibilidade, headline e cor. |
| `newsroom-anti-slop.md` | Rejeita headlines vagas, clichês e construções genéricas. |
| `newsroom-banco-hooks.md` | Referência de padrões de hook para criar variações de headline. |

## Fluxo estudado

1. Usuário informa nicho, região e perfil/marca.
2. Busca traz 5–8 notícias recentes; cada opção precisa ter manchete, veículo, data específica e nível de potencial.
3. Usuário escolhe uma notícia e recebe 10 headlines, com o link lido para extrair contexto além do título.
4. Usuário escolhe/ajusta a headline e envia a imagem de capa.
5. Sistema gera preview HTML da capa, com cor/fonte da marca e possibilidade de ajustes.
6. Após aprovação, exporta PNG 1080×1350; legenda, fonte e CTA são opcionais.

## Regras que valem para o SocialHub

- Pesquisar com data atual, janela explícita e filtros duros: sem data precisa ou fonte confiável, a notícia não entra.
- Mostrar o link e o veículo de cada notícia; nunca preencher a lista com resultados antigos ou incertos só para completar quantidade.
- Tratar padrões de hooks e métricas de “lift” fornecidos pelo curso como referência criativa, não como uma garantia de performance.
- A legenda factual deve indicar a fonte/link da notícia. Quando houver divergência entre fontes, o produto deve expor a incerteza em vez de inventar uma leitura.
- A prioridade visual é legibilidade: foto sem texto concorrente, área livre para headline, contraste testado e visual da marca configurável.
- Separar preview de exportação e permitir comandos de ajuste local: nova busca, novo ângulo, ajuste de headline, troca de imagem e legenda.

## Limites do curso que não devem virar regra do produto

- A janela de “publicar em duas horas” é uma tese operacional do curso; podemos usá-la como referência de velocidade, não como promessa ao cliente.
- Paleta, fontes, `Powered by Newsroom`, templates e referências GenkaiLabs não pertencem ao SocialHub.
- A pesquisa não pode se apoiar apenas em blogs ou posts sociais sem confirmação de fonte primária/editorial.

## Possível encaixe futuro

Um modo separado no SocialHub: **Notícia quente / Newsroom**. Ele começaria por nicho + região, apresentaria uma seleção de notícias com evidência e levaria a uma capa estática. Esse modo não deve disputar nem substituir os fluxos de carrossel de topo ou meio de funil.
