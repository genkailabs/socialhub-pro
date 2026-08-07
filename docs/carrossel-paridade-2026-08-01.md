# Paridade do Carrossel Studio — auditoria de 01/08/2026

## Fonte e limite

- Vídeo auditado: `C:\Users\Damien\Videos\2026-08-01 12-31-10.mp4` (18:02).
- Ferramenta de referência: um editor de carrossel de mercado, estudado apenas no navegador.
- O vídeo é a fonte de verdade para o escopo solicitado. O changelog e as telas públicas servem apenas como apoio.
- Reproduzir capacidades e fluxos; não copiar marca, textos, templates ou materiais proprietários.

## Matriz de paridade

| Bloco | Demonstrado/pedido | Estado antes desta execução | Critério de pronto |
|---|---|---|---|
| Projetos | Criar, ordenar, renomear e excluir digitando o nome exato | Parcial | Exclusão só habilita com igualdade exata e remove os carrosséis do projeto |
| Novo carrossel | Nome, Brand Kit ou sem kit, funil e template | Parcial | Wizard exige nome e torna as três escolhas explícitas |
| Conteúdo | Cinco capas, revisão de headline e roteiro aprovado | Presente | Fluxo autenticado completo sem erro técnico no usuário |
| Imagem por IA | Gerar uma alternativa coerente por slide sem substituir upload | Ausente no Studio | Resultado pode ocupar um slot e continua editável |
| Mídia | Upload múltiplo, slots, limpar/substituir e distribuição automática | Parcial | Arquivos não entram como base64 no Server Action; reload restaura o documento |
| Frames | Miniaturas, tipo, menu, criar/duplicar/remover/reordenar | Presente | Operações refletem no canvas, preview e exportação |
| Canvas | Editar direto, mover, redimensionar, camadas, undo/redo | Parcial | Mudanças persistem por autosave, inclusive após undo/redo |
| Estilo | Texto completo, palavra, cores, fundo, gradiente, CTA e proporção | Parcial | Controles existentes passam smoke; lacunas explícitas ganham teste |
| Histórico | Snapshots com horário e restaurar | Defeituoso | Restaurar vira estado persistido e sobrevive ao reload |
| Estático | Slide atual, todos, ZIP e PDF em 1080×1350 | Presente | Downloads abrem e têm dimensões/quantidade corretas |
| Tendências | Ranking, busca/filtros, detalhe, fonte original e criar conteúdo | Ausente | Nenhuma métrica inventada; cada item mostra origem e data |
| Motion/Reels | MP4, efeitos/direção, duração, intensidade, delay, 4:5/9:16, um/todos | Ausente | Arquivos MP4 reproduzem e o lote contém o número esperado |
| Temporários | Entrega por Supabase e remoção posterior | Parcial no SocialHub | Caminho é temporário, tem expiração/limpeza e não cria registro permanente |
| Mobile | Operar editor e exportação em tela estreita | Ausente no Studio | Controles críticos acessíveis sem rail/inspector fixos bloqueando o canvas |

## Evidência do vídeo

- `00:30–00:59`: projetos e exclusão por nome.
- `01:07–02:21`: wizard com kit/sem kit e templates por funil.
- `02:58–04:35`: roteiro e headline externos; o SocialHub já tem fluxo próprio.
- `04:35–05:17`: pedido explícito de geração de imagem por IA.
- `06:48–09:48`: slots, aplicação automática, canvas, camadas, undo/redo e histórico.
- `09:48–10:36`: preview, slide/todos, ZIP, PDF e MP4.
- `10:36–12:28`: tendências com filtros, detalhe e prompt preenchido.
- `13:34–17:43`: Motion/Reels, efeitos, duração, delay, proporções e lote de vídeos.
- `15:16–15:35`: artefato temporário no Supabase e remoção depois da entrega.

## Regra de evidência final

Código, testes, build, deploy e aceitação autenticada são evidências diferentes. A tarefa só pode ser declarada concluída quando cada linha da matriz tiver resultado prático ou limitação explícita registrada.

## Defeito de produção confirmado

- Deploy observado: `efa14f62-464a-4a88-a661-315c9f86bfe0`.
- Log do SocialHub: `Body exceeded 1 MB limit`, HTTP `413`, digest `3682791594`.
- Causa: o Studio embarcado transformava mídia em `data:` URL e o autosave enviava o documento inteiro para uma Server Action.
- Correção exigida: o iframe solicita upload ao host; o documento persiste somente URL/caminho, sem base64.

## Resultado e evidências

- SocialHub: 134 arquivos de teste e 1.235 testes aprovados; lint sem alertas; build Next.js 14 aprovado com `/api/carrossel/image`, `/api/trends` e `/trends`.
- Studio: 32 testes de contrato aprovados; typecheck e build Next.js 16 aprovados; lint sem erros e com cinco alertas preexistentes de hooks/variável não usada.
- E2E local: exportação PNG/ZIP/PDF, embed com cinco slides, Motion atual/Reels/lote, upload/limpeza temporária, mobile 390 px e fluxo de projetos aprovados.
- Railway Studio: deploy `36db2783-c038-4d16-8f16-64b1f9a8e23f` em `SUCCESS`.
- Railway SocialHub: deploy `b1dccfa7-b298-4e12-ae57-96ae54c54a7d` em `SUCCESS`.
- Produção pública: `/login` e `/embed-studio` responderam `200`; `/composer` e `/trends` redirecionaram para login; CSP do Studio autoriza somente o próprio domínio e o SocialHub.
- E2E em produção: contrato cross-origin SocialHub → Studio exportou cinco PNGs; Motion produziu MP4 atual, Reels e ZIP, confirmou upload e exclusão do mesmo caminho temporário; projetos passaram criar, A–Z, renomear e exclusão exata.
- Aceitação visual autenticada do SocialHub permanece separada: o navegador interno já logado do usuário não expõe automação programática nesta execução. O vídeo autenticado foi auditado integralmente, mas não substitui o aceite visual do novo release dentro da conta.
