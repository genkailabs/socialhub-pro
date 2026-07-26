# Orphan cleanup fix report

## Resultado

O cleanup de mídia órfã da geração diária agora é durável mesmo quando o worker perde o claim antes de conseguir marcar o pacote como `failed`.

- Foi criada a migration aditiva `20260726000300_daily_content_cleanup_jobs.sql`.
- A fila é independente de `daily_content_packages.status` e de `claim_token`.
- Cada job pertence a uma marca, usa RLS vinculada ao proprietário e é deduplicado por `(brand_id, storage_path)`.
- O banco e o adapter aceitam somente paths no formato `<brand_uuid>/daily/<claim_uuid>/ai-<timestamp>-<index>.<png|jpg>`.
- Uma falha de remoção enfileira o path antes de tentar finalizar o pacote com o claim fenced.
- Uma chamada futura de preparação tenta limpar a fila e removê-la antes de reservar um novo pacote.
- O fencing existente de heartbeat, `markReady` e `markFailed` não foi relaxado.

## RED/GREEN

RED executado antes da implementação:

```text
npm.cmd test -- tests/unit/daily-content-actions.test.js
5 failed, 27 passed
```

As falhas cobriram:

1. perda de claim junto com falha de delete não persistia um job owner-scoped;
2. jobs duráveis não eram tentados antes de uma geração futura;
3. persistência ainda dependia de update do pacote `failed`;
4. path genérico não era rejeitado pelo adapter da fila;
5. a migration da fila não existia.

GREEN após a implementação:

```text
npm.cmd test -- tests/unit/daily-content-actions.test.js
32 passed
```

## Verificação final

```text
npm.cmd test
108 test files passed
969 tests passed
```

```text
npm.cmd run build
Compiled successfully
26/26 static pages generated
postbuild completed
```

```text
git diff --check
exit 0
```

`npm.cmd run lint` não pôde ser usado como verificação não interativa porque o projeto ainda não possui configuração ESLint e o Next abriu o prompt de configuração. O `next build` concluiu o lint/type-check integrado sem erro. Permaneceram apenas warnings preexistentes do Sentry sobre global error handler/source maps.

## Limites respeitados

- Migration não aplicada.
- Nenhum deploy executado.
- Nenhuma alteração fora do mecanismo de cleanup diário e de suas regressões.
