# Aula demonstrativa da plataforma — Desktop

**Arquivo-fonte:** `E:\Claude Curso\videos\Aula Demonstrativa Plataforma - Desktop.mp4`  
**Duração:** 26m56s.  
**Leitura:** transcrição local e inspeção de telas representativas em `analysis-assets/`.

## O produto demonstrado

Um editor de carrosséis baseado em **templates protegidos**, pensado para pessoas que não dominam Figma. O usuário pode editar conteúdo, mídia e marca sem quebrar a composição. A IA não está embutida no canvas: o texto vem de agentes externos e é aplicado ao template.

## Fluxo observado

1. Criar ou abrir um projeto (por cliente, mês ou organização escolhida pelo usuário).
2. Criar um carrossel escolhendo um template.
3. Trazer o texto de um agente externo e aplicar no template.
4. Ajustar texto, imagens, marca e CTA dentro de limites visuais.
5. Conferir o preview, salvar automaticamente e exportar slides ou vídeo.

## Requisitos funcionais extraídos

### Estrutura e experiência

- Biblioteca de projetos com carrosséis salvos automaticamente.
- Criação orientada por template, com seleção de variantes e novas categorias de template ao longo do tempo.
- Canvas central, painel lateral de controles e trilha de thumbnails dos slides.
- Preview de feed e zoom no canvas.
- Histórico/restauração de alterações.

### Texto seguro e editável

- Clique no texto para editar, com controles simples de fonte, tamanho, alinhamento e espaçamento horizontal/vertical.
- Estilo aplicado a uma **seleção dentro do texto**: cor, fundo, caixa alta, negrito, itálico, sublinhado, fonte e espaçamento.
- Limites de cada bloco para que reduzir/aumentar e reposicionar não destrua o template.
- Aplicar um pacote de copy pronto ao carrossel, mantendo liberdade para ajustes locais depois.

### Mídia

- Upload em lote para preencher placeholders sequencialmente, com possibilidade de trocar mídia slide a slide.
- Separar o gesto de mover/redimensionar a moldura do gesto de reposicionar a imagem dentro da moldura.
- Suporte a foto e vídeo por slide; o vídeo é exportado separadamente quando presente no carrossel.
- Controles de tamanho, posição e raio de borda da mídia.

### Marca, template e capa

- Campos globais: @, nome/descrição de marca, copyright e avatar, refletidos em todos os slides que os usam.
- Troca de template preservando texto e mídia sempre que houver mapeamento compatível.
- Variantes específicas de capa, sem obrigar a recriar o carrossel inteiro.
- Fundo e cores configuráveis; CTA opcional no último slide, com estilos de botão.
- Alternância entre proporção de feed e 9:16.

### Saída

- Exportar todos os slides ou somente um slide.
- Exportar vídeo/“modo reels” com duração por slide, entrada de elementos e controle de atraso/animação.

## O que muda na direção do Composer V2

O V2 deve ser **template-first e AI-optional**. A DeepSeek pode ajudar a gerar e revisar o briefing/copy, mas o usuário também precisa poder colar texto aprovado e aplicá-lo sem custo nem geração adicional. A estrutura recomendada passa a ser:

`projeto -> template -> copy manual ou IA -> aplicar em campos mapeados -> mídia/ajustes -> preview -> exportação`

## Recortes para não tentar construir tudo de uma vez

| Ordem | Entrega | Inclui |
| --- | --- | --- |
| 1 | Editor estático confiável | Projetos, templates, copy mapeada, texto em blocos, mídia em lote, tokens de marca, preview e PNG. |
| 2 | Edição avançada | Rich text parcial, variantes de capa, troca de template com mapeamento, histórico visível. |
| 3 | Mídia dinâmica | Vídeo dentro de slides e exportação individual de vídeo. |
| 4 | Motion/Reels | Timeline, duração por slide, animação por elemento e exportação de vídeo composto. |

O item 4 é um produto próprio de renderização e não deve bloquear o editor estático.

## Diferença que devemos preservar

A plataforma apresentada evita IA integrada para reduzir custo e manter controle. O SocialHub pode oferecer vantagem com DeepSeek, mas precisa manter o caminho manual e as aprovações: IA sugere; o usuário escolhe/aplica; o layout e a exportação são determinísticos.

## Captura de referência recebida

**Fonte:** `E:\Claude Curso\videos\screencapture-maquina-brandsdecoded-br-2026-07-29-23_46_46.png`.

A captura consolida o layout desktop que deve orientar o V2:

- **Topo:** navegação, breadcrumb de projeto/carrossel, nome da peça e ações `Preview`, `Salvar` e `Exportar`.
- **Coluna esquerda em acordeões:** template; criador de conteúdo; campos globais; texto; mídia; cores globais; fundo; gradiente; CTA; proporção; histórico.
- **Centro:** somente o canvas, com bastante espaço para concentração e controles discretos de zoom/desfazer abaixo.
- **Coluna direita:** frames/miniaturas para trocar o slide ativo rapidamente.
- **Campos globais observados:** @, nome secundário, copyright, avatar e verificação; alterações devem refletir em todos os slots conectados.
- **Controle de design observado:** cores por slide, força de gradiente com “aplicar em todos”, CTA opcional e proporção de exportação 4:5/9:16.

O V2 deve usar esta lógica de hierarquia, não reproduzir o visual ou marca da referência. A primeira tela precisa priorizar a peça no canvas e reduzir a sensação de um painel técnico cheio de controles concorrentes.
