# Composer AI v2

> Tela `/composer`. O Composer funciona como um assistente de conteúdo para Instagram: sugere oportunidades, prepara texto e imagem, mostra a prévia e permite publicar, agendar, salvar ou enviar para aprovação.

## Pré-condições

- É necessário selecionar uma marca.
- A marca precisa ter uma conexão válida com o Instagram.
- O Brand Kit é opcional. Quando não existe, o Composer avisa que o conteúdo pode ficar menos alinhado à marca.

Arquivos principais: [página do Composer](../app/(app)/composer/page.jsx), [abas do Composer](../components/composer/ComposerTabs.jsx) e [assistente de IA](../components/ai/AIStudioPanel.jsx).

## Fluxo assistido

A aba **Gerar com IA** continua sendo a opção padrão.

### 1. Escolher uma oportunidade

A primeira tela mostra:

- uma saudação simples;
- a memória dos conteúdos publicados na semana;
- oportunidades vindas do plano editorial, estratégia, diagnóstico do Instagram e sugestões do nicho;
- a opção **Não sei. Me sugira algo.**

Essas oportunidades são montadas localmente. O cartão **Não sei. Me sugira algo.** escolhe uma sugestão local antes de iniciar a geração. Nenhuma chamada web extra é feita nessa escolha.

Quando o usuário escolhe uma oportunidade, o Composer define assunto, formato, tom e objetivo e inicia o fluxo guiado: gera o texto e as quatro opções de imagem. Os ajustes ficam disponíveis depois, mas não são obrigatórios para começar.

Ao trocar de oportunidade, o Composer limpa a geração anterior, incluindo texto, direção visual, opções de imagem, arte final e prévia. Isso evita misturar conteúdo de dois briefings diferentes.

O modo **Avançado** permanece disponível como opção secundária para preencher assunto, formato, tom e objetivo manualmente.

### 2. Revisar conteúdo

Depois da geração, o usuário pode editar:

- legenda;
- chamada para ação (CTA);
- hashtags;
- direção visual.

A CTA é obrigatória, normalizada pela spec de IA e adicionada ao final da legenda no envio, sem alterar o contrato das actions de publicação. O usuário pode editá-la, mas não pode publicar com ela vazia.

O prompt também recebe um resumo local do Composer: estratégia e plano editorial ativos, memória da semana e sinal de métricas/horários. URLs, e-mails, telefones e detalhes internos são removidos antes de chegar ao modelo. Esse contexto não faz novas chamadas web nem deve aparecer na publicação.

Quando o assunto exige informação atual, a pesquisa acontece no motor de geração. Se a pesquisa obrigatória falhar ou não houver confiança suficiente, o conteúdo não é inventado e o usuário recebe uma mensagem de erro.

### 3. Criar e finalizar a imagem

O Composer mantém o fluxo de quatro opções:

1. `generateNewsImages` cria exatamente quatro imagens relacionadas ao assunto, usando também o `image_prompt` da spec como direção base.
2. O usuário escolhe uma opção.
3. É possível adicionar um título e escolher sua posição: topo, centro ou base.
4. `finalizeNewsImage` prepara a arte final.

A publicação só é liberada depois que o usuário confirma **Usar esta imagem** e quando existem exatamente quatro opções. Se qualquer uma falhar, o Composer mostra erro claro e pede uma nova geração do lote completo.

### 4. Conferir a prévia

A prévia do Instagram permanece visível durante todo o fluxo. A partir do breakpoint `lg`, fica fixa na coluna direita. Em telas menores, aparece antes dos controles para continuar acessível sem apertar o formulário.

A prévia mostra:

- nome da marca;
- imagem selecionada ou estado vazio;
- título aplicado à imagem;
- legenda;
- CTA;
- hashtags.

### 5. Publicar ou agendar

As ações disponíveis são:

- **Publicar no Instagram** com `publishNow`;
- **Agendar publicação** com `schedulePost`;
- **Enviar para aprovação** com `submitForApproval`;
- **Salvar rascunho** com `saveDraft`.

No agendamento, o campo `datetime-local` foi substituído por uma seleção visual de próximos dias e horários. As opções vêm de `composerContext.recommendedSlots`.

Quando existem métricas suficientes, a interface explica que os horários são baseados no desempenho recente do Instagram. Sem sinal de métricas, os horários aparecem como sugestões iniciais.

A data escolhida é montada no fuso local do navegador e convertida para ISO antes de ser enviada para `schedulePost`.

## Fallbacks

Se `composerContext` estiver ausente ou incompleto:

- aparecem oportunidades locais genéricas;
- a opção **Não sei. Me sugira algo.** continua disponível;
- a memória semanal usa uma mensagem inicial;
- o calendário usa horários padrão em dias futuros;
- o fluxo avançado continua funcionando.

Se uma das quatro imagens falhar, o lote é descartado e o Composer pede uma nova geração completa. Sem quatro opções e uma imagem finalizada, publicar e agendar permanecem bloqueados.

## Aba Criar manual

`ComposerForm` mantém o fluxo escrito à mão, sem geração de IA, com publicação, agendamento e rascunho. Essa aba não usa as oportunidades do Composer AI v2.

## Motores e registro

| Etapa | Motor |
|---|---|
| Pesquisa de contexto atual | Pollinations `gemini-search`, somente quando necessário |
| Texto, hashtags e prompt visual | DeepSeek |
| Quatro opções de imagem | Pollinations `flux` |
| Título sobre a imagem | Renderização local |
| Publicação no Instagram | Meta Graph API |

Os custos técnicos continuam registrados em `generation_jobs` e podem ser consultados na área **Custos IA**. Eles não aparecem durante o fluxo de criação.

## Limites atuais

- O destino de publicação é o Instagram.
- A conexão Meta da marca precisa estar válida.
- A qualidade das recomendações de horário depende do histórico de métricas disponível.
