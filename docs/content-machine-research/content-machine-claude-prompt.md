---
title: Prompt Content Machine — operação no Claude
description: Síntese do fluxo editorial e dos limites de adaptação ao SocialHub.
tags:
  - content-machine
  - research
  - prompt
  - editorial
---
# Prompt Content Machine — operação no Claude

**Arquivo-fonte:** `E:\Claude Curso\Máquina de Carrosséis 7.0  Prompt\content-machine-claude.md.pdf`  
**Formato original:** prompt operacional de 6 páginas para Claude.  
**Leitura:** extração local de texto e síntese; este documento não reproduz o prompt proprietário.

## Fluxo editorial observado

1. O agente aguarda um gatilho e oferece dois caminhos: transformar conteúdo existente ou criar uma narrativa a partir de um insight.
2. Recebe um insumo, que pode ser texto, link, imagem ou transcrição.
3. No caminho de insight, pesquisa externamente para validar ou qualificar a hipótese.
4. Faz uma triagem com transformação, fricção central, ângulo narrativo e evidências.
5. Gera opções de ângulo para que uma seja escolhida antes da copy.
6. Produz um carrossel textual estruturado, com capa, desenvolvimento, fechamento e atribuição.

A separação entre insumo, triagem, escolha de ângulo e redação final é o padrão mais útil: reduz regenerações e torna a intenção editorial revisável antes de entrar no layout.

## Padrões editoriais aproveitáveis

- **Fricção, não apenas tema:** transformar o assunto em uma tensão concreta que justifique a leitura.
- **Ângulo antes da redação:** apresentar caminhos narrativos distintos e permitir escolha humana antes do texto completo.
- **Especificidade:** usar exemplos, referências e mecanismos concretos em vez de abstrações e slogans.
- **Capa independente:** hook e subhook devem funcionar por si, abrir curiosidade sem entregar a resolução e manter clareza.
- **Progressão narrativa:** cada bloco deve avançar o raciocínio até uma conclusão, sem repetir a capa.
- **Revisão de qualidade:** verificar naturalidade em PT-BR, gramática, clareza, densidade, tom e padrões de texto genérico gerado por IA.

## Restrições do prompt que não devem ser copiadas

| Restrição do curso | Tratamento adequado no SocialHub |
| --- | --- |
| Não exibir fontes ou URLs durante a triagem. | Preservar e mostrar fonte, data e status de verificação quando houver alegações factuais. |
| Estrutura fixa de 18 textos, com faixas rígidas de palavras. | Usar um schema configurável por formato, template e objetivo; validar limites do layout sem forçar toda pauta ao mesmo molde. |
| Assinatura fixa dizendo que a peça foi inspirada em um artigo. | Exigir direito de uso do insumo e aplicar atribuição apenas quando necessária, correta e aprovada. |
| Não perguntar objetivo ou plataforma. | Reutilizar contexto já conhecido da marca, mas permitir que objetivo e canal sejam confirmados ou alterados. |
| Vedações estilísticas absolutas. | Transformar em regras editoriais de marca configuráveis, com possibilidade de revisão e exceção humana. |

## Limites de pesquisa e fatos

O prompt orienta que hipóteses sejam pesquisadas, mas prevê esconder a evidência do usuário. No SocialHub, pesquisa factual precisa ser um estágio separado da geração: fonte, data, trechos de apoio e incertezas devem permanecer auditáveis. A IA pode sugerir interpretação; ela não deve inventar números, datas, locais, fontes ou causalidade.

## Leitura para o SocialHub

O maior valor do material é o **encadeamento editorial controlado**:

`insumo ou hipótese -> validação factual quando necessária -> triagem -> ângulos -> copy aprovada -> briefing visual -> preview -> exportação`

Isso reforça a direção já documentada para um futuro Composer V2: geração estruturada, renderização determinística, identidade isolada por marca e aprovação humana. Não é autorização para importar o prompt, a voz, as regras rígidas ou a marca do curso.
