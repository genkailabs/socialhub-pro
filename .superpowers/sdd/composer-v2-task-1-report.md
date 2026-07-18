# Composer AI v2 - Task 1 Report

Status: DONE

## Entrega

- Criado `lib/composer-intelligence.js` com `getComposerContext({ brandId, brand, audit })`.
- O contexto retorna oportunidades locais, memoria semanal, horarios recomendados e sinal de metricas.
- As sugestoes usam plano editorial, estrategia e posts recentes quando houver dados; sem dados ou falhas, retornam sugestoes locais uteis.
- A opcao `Não sei. Me sugira algo.` e sempre incluida sem chamada de IA, web, DeepSeek ou Pollinations.
- Horarios medidos no diagnostico sao priorizados. Sem sinal medido, o retorno usa horarios iniciais e `hasMetricSignal: false`.
- Atualizado `buildContentPrompt` com regras eticas para nichos regulados e diretrizes de processo e inspiracao visual para arquitetura, sem alterar sua API.

## Testes

TDD executado para os helpers novos:

1. Criados testes para oportunidades, memoria semanal e horarios recomendados antes do modulo existir.
2. A primeira execucao falhou como esperado: modulo ausente e regras de nicho ainda nao presentes no prompt.
3. Implementacao criada e ajustada ate os testes passarem.

Comando final:

```text
npm test -- tests/unit/composer-intelligence.test.js tests/unit/ai.test.js
```

Resultado: 2 arquivos de teste aprovados, 43 testes aprovados, 0 falhas.

## Escopo do commit

- `lib/composer-intelligence.js`
- `lib/ai/prompt.js`
- `tests/unit/composer-intelligence.test.js`
- `tests/unit/ai.test.js`
- `.superpowers/sdd/composer-v2-task-1-report.md`

## Preocupacoes

- A leitura do Supabase foi protegida por fallbacks para manter a pagina funcional quando ainda nao houver historico, auditoria, estrategia ou plano editorial.
- A integracao visual do contexto no Composer fica para as proximas tarefas do PRD.

## Correcao apos revisao

- Objetivos da estrategia agora leem o JSONB persistido, priorizando `objectives.main`.
- A memoria semanal considera apenas posts publicados, incluindo publicacao manual, dentro da semana atual. Rascunhos, agendados e posts antigos ficam fora.
- O contexto consulta somente estrategia aprovada no periodo ativo, plano da semana atual e itens aprovados; itens sugeridos, rejeitados, produzidos e fora da semana sao descartados novamente no helper como protecao adicional.
- O diagnostico do Instagram agora gera oportunidades locais a partir de oportunidades, pontos de atencao e prioridades salvas.
- O prompt passou a ter orientacoes diferentes para advocacia, medicina, odontologia, psicologia e arquitetura.

Teste da correcao:

```text
npm test -- tests/unit/composer-intelligence.test.js tests/unit/ai.test.js tests/unit/strategy-plan.test.js
```

Resultado: 3 arquivos de teste aprovados, 71 testes aprovados, 0 falhas.

## Correcao P1 final

- Somente plano editorial com status `approved` e itens com status `approved` entram nas oportunidades do Composer.
- Itens `proposed`, `rejected`, `produced` ou fora da semana atual nao sao utilizados.

Teste da correcao P1:

```text
npm test -- tests/unit/composer-intelligence.test.js tests/unit/ai.test.js tests/unit/strategy-plan.test.js
```

Resultado: 3 arquivos de teste aprovados, 71 testes aprovados, 0 falhas.
