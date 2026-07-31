# Handoff — estudo do Content Machine

Este material foi reunido antes de qualquer reconstrução do Composer. Não há implementação aprovada ou em andamento a partir dele.

## Conteúdo já analisado

- Content Machine: instalação, system prompt, regras de headlines, anti-slop, qualidade editorial, design, referências e boas práticas.
- Exemplo de preview de carrossel para ótica e a diferença entre preview HTML e exportação PNG.
- Modo educativo de meio de funil: insumo -> capas -> copy aprovada -> briefing visual -> preview -> exportação.
- Newsroom: notícia recente com fonte/data -> escolha -> headlines -> capa estática -> exportação.
- Vídeos de configuração e meio de funil; existe uma divergência documentada sobre memória: iniciar limpa versus reter preferências de marca.
- Aula 1: cada carrossel precisa funcionar para não seguidores; a jornada editorial é capa -> tração -> aprofundamento -> fechamento -> CTA.
- Aula 2: o fluxo deve permitir delegação segura; direção e aprovação ficam com a marca, enquanto a equipe/IA executa o rascunho editável.

## Estado do produto verificado em 29/07/2026

- O Composer atual já possui canvas editável, layouts, geração estruturada, preview, rascunho, publicação e testes.
- Há alterações locais não relacionadas no Composer; elas não devem ser sobrescritas.
- DeepSeek é adequado para geração editorial estruturada em JSON, mas pesquisa factual, validação de fontes, layout final, renderização e publicação precisam de componentes próprios e aprovação humana.
- O Pexels já está integrado no servidor, com busca no painel de mídia, filtros, autoria, origem e licença registradas. O caminho padrão para imagens deve ser upload da marca ou banco de imagens; geração por IA é opcional.
- Há um Carrossel Studio separado em `/carrossel`, incorporado por iframe e ligado a rascunhos/exportação/publicação. Ele precisa ser avaliado como possível base visual antes de iniciar outro editor do zero.

## Recomendação ainda pendente de aprovação

Avaliar primeiro o **Carrossel Studio** como base do Composer V2. A recomendação permanece: migrar em paralelo, sem apagar o Composer atual, e iniciar pelo fluxo **Educar / meio de funil**. A decisão do usuário ainda é necessária antes de especificação detalhada ou implementação.
