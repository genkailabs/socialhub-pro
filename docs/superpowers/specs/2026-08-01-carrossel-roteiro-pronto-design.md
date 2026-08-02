# Importação de roteiro pronto no Carrossel Studio

## Objetivo

Adicionar ao guia editorial do Composer um segundo caminho de entrada, ao lado de **Gerar com IA**: **Colar roteiro pronto**. Esse caminho recebe a saída completa de um GPT externo e a aplica diretamente ao template do Studio, sem chamar o DeepSeek nem alterar a redação.

## Contrato

- Cada slide recebe dois campos consecutivos: título e corpo.
- O formato principal é `texto 1 - ...`, `texto 2 - ...`; `:`, travessão e conteúdo multilinha também são aceitos.
- Uma cerca Markdown que envolva todo o roteiro é removida; marcadores `texto N` incompletos são rejeitados, sem fallback para parágrafos soltos.
- São aceitos de 6 a 20 campos, sempre em pares: 3 a 10 slides.
- A contagem de slides é calculada pelo roteiro e enviada no `cs:init` já existente.
- O texto original e a versão normalizada ficam no rascunho para sobreviver a recarregamentos.
- Ao substituir um documento, o Composer espera o autosave pendente, salva sem as mídias anteriores e tenta removê-las depois, sem desfazer a importação se a limpeza falhar.
- O fluxo atual Tema → DeepSeek → escolha de capa → roteiro continua disponível e inalterado.

## Fluxo de interface

1. A pessoa escolhe **Colar roteiro pronto**.
2. Cola o roteiro na caixa grande.
3. O Composer mostra quantos campos e slides reconheceu ou explica o erro.
4. **Aplicar texto no Studio** salva a origem, remonta o iframe com a quantidade correta e fecha a guia para mostrar o resultado.

## Pronto quando

1. Um roteiro de 18 campos produz 9 slides.
2. Nenhuma chamada de IA ocorre na importação.
3. Campos incompletos, ímpares ou acima do limite não são aplicados.
4. O rascunho recarregado mantém o roteiro importado.
5. Testes do importador, interface e contrato do iframe passam.
