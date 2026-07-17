# PRD — Social Hub: Jornada Assistida de Social Media para Instagram

**Versão:** 1.0  
**Status:** Pronto para planejamento técnico  
**Produto:** Social Hub  
**Escopo:** Evolução incremental do MVP existente  
**Canal inicial:** Instagram  
**Público inicial de validação:** profissionais liberais e pequenas empresas  
**Exemplos:** psicólogos, advogados, médicos, dentistas, arquitetos, clínicas e agências

---

## 1. Contexto

O Social Hub já possui um MVP funcional com:

- autenticação via Supabase;
- gerenciamento de múltiplas marcas;
- conexão real com Instagram/Facebook via Meta OAuth;
- publicação no Instagram;
- dashboard e métricas;
- Composer manual;
- geração de conteúdo com IA;
- Brand Kit / Brand DNA;
- calendário editorial;
- fluxo de aprovação;
- piloto automático;
- controle de custos de IA;
- integrações e módulos iniciais do YouTube.

Este PRD **não propõe reconstruir o produto do zero**.

O objetivo é reorganizar e completar a experiência atual para que o Social Hub deixe de parecer apenas um agendador de redes sociais e passe a funcionar como um **Social Media Assistido por IA**.

A IA deverá analisar, planejar, produzir e aprender. O usuário continuará no controle, aprovando, editando e decidindo o que será publicado.

---

## 2. Problema

Pequenos empresários e profissionais liberais querem ter presença profissional no Instagram, mas normalmente enfrentam os seguintes problemas:

- não sabem o que publicar;
- não conhecem branding;
- não conseguem manter frequência;
- não sabem interpretar métricas;
- não têm tempo para planejar;
- não sabem criar um calendário editorial;
- têm receio de publicar conteúdo inadequado;
- consideram agências ou profissionais de social media caros;
- não querem aprender várias ferramentas complexas.

As plataformas tradicionais geralmente entregam ferramentas de criação, calendário e agendamento, mas ainda exigem que o usuário saiba montar uma estratégia.

O Social Hub deve reduzir essa dificuldade guiando o usuário por todo o processo.

---

## 3. Visão do produto

> O Social Hub será um Social Media Assistido por IA que entende a empresa, analisa o Instagram, constrói uma estratégia, planeja conteúdos, produz posts e acompanha resultados — sempre com o usuário no controle.

O produto não deve prometer autonomia total no MVP.

A proposta correta é:

> **A IA planeja e cria. O usuário revisa e decide.**

---

## 4. Objetivos

### 4.1 Objetivo principal

Criar uma jornada guiada para que uma pessoa sem conhecimento de marketing consiga sair do primeiro acesso até uma semana de conteúdos planejados, produzidos e agendados.

### 4.2 Objetivos secundários

- aproveitar as funcionalidades já existentes;
- reduzir telas soltas e desconectadas;
- transformar os módulos atuais em uma jornada coerente;
- controlar o consumo de IA;
- permitir uso manual e assistido;
- guardar decisões e preferências da marca;
- produzir relatórios simples, sem excesso de linguagem técnica;
- validar o produto inicialmente com usuários reais.

---

## 5. Fora do escopo desta versão

Não implementar nesta fase:

- TikTok;
- LinkedIn;
- X/Twitter;
- Pinterest;
- WhatsApp;
- Spotify;
- inbox unificada;
- respostas automáticas completas em comentários e DMs;
- criação automática de campanhas de tráfego pago;
- análise automática de concorrentes por scraping;
- publicação totalmente autônoma sem aprovação;
- múltiplos agentes executando em paralelo;
- geração completa de vídeo por IA;
- reformulação completa da arquitetura existente;
- substituição desnecessária de módulos que já funcionam.

Esses recursos poderão ser avaliados em versões futuras.

---

## 6. Princípios obrigatórios da experiência

### 6.1 Jornada guiada

O usuário deve saber:

- onde está;
- o que está sendo feito;
- por que aquela informação é necessária;
- qual é o próximo passo.

### 6.2 Linguagem simples

Evitar termos como:

- “framework de conteúdo”;
- “arquétipo de marca”;
- “topo de funil”;
- “taxa de retenção”;
- “análise semântica”.

Quando o termo for necessário, explicar em linguagem comum.

### 6.3 IA sob demanda

A IA não deve ser chamada desnecessariamente.

Usar:

- código normal para cálculos;
- banco para dados persistentes;
- templates para estruturas previsíveis;
- IA apenas para interpretação, estratégia e criação.

### 6.4 Aprovação humana

No MVP, nenhum conteúdo gerado no modo assistido deve ser publicado sem uma ação explícita do usuário.

### 6.5 Edição manual sempre disponível

O usuário deve poder editar:

- estratégia;
- pilares;
- temas;
- legendas;
- slides;
- CTA;
- hashtags;
- imagens;
- datas;
- horários.

Editar manualmente não deverá consumir créditos de IA.

### 6.6 Evolução incremental

A implementação deverá reaproveitar:

- marcas;
- Brand DNA;
- Composer;
- calendário;
- aprovação;
- posts;
- métricas;
- custos de IA;
- integrações Meta;
- cron de publicação.

---

# 7. Modos de uso

## 7.1 Modo Manual

Indicado para usuários que desejam controle total.

O usuário:

1. escolhe o tema;
2. escreve ou solicita ajuda da IA;
3. edita;
4. escolhe imagem;
5. agenda;
6. publica.

A IA só é chamada quando o usuário solicitar.

## 7.2 Modo Assistido

Indicado para usuários sem experiência em redes sociais.

O Social Hub:

1. analisa a marca;
2. sugere estratégia;
3. cria um plano;
4. apresenta temas;
5. produz conteúdos aprovados;
6. recomenda horários;
7. acompanha resultados.

O usuário aprova cada etapa.

## 7.3 Modo Automático

Não faz parte desta entrega.

O sistema atual de piloto automático poderá continuar disponível como recurso experimental, mas não deve ser o centro da nova jornada até que o modo assistido esteja validado.

---

# 8. Jornada completa do usuário

## Etapa 1 — Criar conta

### Objetivo

Permitir acesso ao produto.

### Fluxo

1. Usuário abre o Social Hub.
2. Cria conta com nome, e-mail e senha.
3. Confirma o e-mail, caso exigido.
4. É encaminhado para criação da primeira marca.

### Reaproveitar

- autenticação atual;
- proteção de rotas;
- sessão Supabase.

---

## Etapa 2 — Criar ou selecionar uma marca

### Objetivo

Cadastrar o negócio que será gerenciado.

### Dados mínimos

- nome da marca;
- nome profissional;
- área de atuação em campo livre;
- descrição curta;
- cidade/região;
- site, opcional;
- WhatsApp, opcional;
- logotipo, opcional.

### Exemplo de área de atuação

> Psicóloga especializada em ansiedade e relacionamentos.

Não criar um dropdown com todas as profissões.

### Regra

Se o usuário já possui uma marca cadastrada, permitir:

- continuar a configuração;
- iniciar uma nova análise;
- entrar diretamente no dashboard.

---

## Etapa 3 — Conectar o Instagram

### Objetivo

Obter dados reais do perfil.

### Fluxo

1. Mostrar o benefício da conexão.
2. Usuário clica em **Conectar Instagram**.
3. Fluxo Meta OAuth.
4. Seleção da conta profissional.
5. Confirmação da conexão.
6. Início da sincronização.

### Mensagem sugerida

> Conecte seu Instagram profissional para que o Social Hub entenda seu conteúdo, suas métricas e seu histórico.

### Estados necessários

- não conectado;
- conectando;
- conectado;
- sincronizando;
- erro de permissão;
- token expirado;
- reconexão necessária.

### Reaproveitar

- conexão Meta existente;
- tokens sociais;
- página de conexões;
- fluxo de reconexão.

---

## Etapa 4 — Diagnóstico inicial do Instagram

### Objetivo

Mostrar ao usuário que o sistema compreendeu o perfil antes de propor uma estratégia.

### Dados coletados

Conforme disponibilidade e permissões da Meta:

- nome e biografia;
- quantidade de seguidores;
- posts recentes;
- legendas;
- formatos;
- frequência;
- alcance;
- impressões;
- curtidas;
- comentários;
- compartilhamentos;
- salvamentos;
- visitas ao perfil;
- melhores horários;
- posts de melhor desempenho.

### Processamento sem IA

O código deverá calcular previamente:

- média de frequência;
- formatos mais usados;
- posts com melhor desempenho;
- posts com desempenho abaixo da média;
- dias e horários;
- evolução de alcance;
- evolução de seguidores;
- taxa de engajamento adotada pelo produto.

### Processamento com IA

A IA recebe apenas um resumo estruturado.

Ela deverá produzir:

- pontos fortes;
- pontos de atenção;
- oportunidades;
- prioridades iniciais;
- perguntas que ainda precisam ser respondidas.

### Saída visual

Exibir no máximo:

- 3 pontos fortes;
- 3 pontos para melhorar;
- 3 prioridades.

Permitir abrir uma visão detalhada.

### Ações

- continuar;
- revisar dados;
- atualizar sincronização;
- refazer análise, sujeito a limite de uso.

---

## Etapa 5 — Entrevista guiada sobre o negócio

### Objetivo

Completar as informações que não podem ser descobertas apenas pelo Instagram.

### Regra de UX

Mostrar uma pergunta por vez, com progresso.

Exemplo:

> Etapa 2 de 6 — Entendendo seu público

### Perguntas mínimas

1. Qual serviço ou produto você deseja divulgar primeiro?
2. Quem você deseja alcançar?
3. Qual é seu principal objetivo no Instagram?
4. Como você gostaria de ser percebido?
5. Como prefere se comunicar?
6. Quais assuntos não devem aparecer?
7. Existem regras profissionais ou legais que precisam ser respeitadas?
8. Quais serviços são prioridade comercial?
9. Existe uma oferta ou contato principal?
10. Quantas vezes por semana consegue publicar?

### Formato das respostas

Usar uma combinação de:

- opções sugeridas;
- múltipla escolha;
- campo de texto livre;
- opção “não sei, quero ajuda”.

### Regra

Salvar cada resposta imediatamente para evitar perda de progresso.

---

## Etapa 6 — Construção e aprovação do Brand DNA

### Objetivo

Criar a memória central da marca.

### Fontes

- dados cadastrados;
- entrevista;
- Instagram;
- posts anteriores;
- logo e paleta;
- site ou texto colado, quando disponível;
- sinais de aprovação, edição e rejeição.

### Estrutura mínima do Brand DNA

- resumo da marca;
- posicionamento;
- público;
- problemas do público;
- objetivos;
- diferenciais;
- tom de voz;
- palavras recomendadas;
- palavras proibidas;
- nível de formalidade;
- uso de emojis;
- estilo de CTA;
- pilares iniciais;
- regras visuais;
- cores;
- assuntos proibidos;
- regras profissionais;
- exemplos aprovados;
- exemplos rejeitados.

### Fluxo

1. IA gera uma proposta.
2. Usuário revisa cada bloco.
3. Usuário edita ou solicita nova versão.
4. Usuário aprova.
5. Versão aprovada fica ativa.

### Requisitos

- versionamento;
- data da última atualização;
- histórico de alterações;
- possibilidade de restaurar versão anterior;
- não sobrescrever automaticamente o DNA aprovado.

### Reaproveitar

- Brand Kit;
- Brand DNA existente;
- sinais de preferência já planejados.

---

## Etapa 7 — Seleção do modo de trabalho

### Opções

#### Manual

> Você cria e usa a IA somente quando precisar.

#### Assistido

> O Social Hub planeja e cria sugestões. Você revisa e aprova.

### Recomendação

Selecionar **Assistido** por padrão no onboarding, explicando que nada será publicado sem aprovação.

---

## Etapa 8 — Estratégia de conteúdo

### Objetivo

Definir por que a marca irá publicar antes de gerar posts.

### Saída da IA

- objetivo principal do ciclo;
- objetivos secundários;
- público prioritário;
- proposta editorial;
- pilares de conteúdo;
- formatos recomendados;
- frequência sugerida;
- equilíbrio entre educação, autoridade, relacionamento e conversão;
- regras específicas da profissão;
- indicadores que serão observados.

### Exemplo para psicóloga

- educação sobre ansiedade;
- dúvidas sobre terapia;
- autocuidado;
- autoridade profissional;
- humanização;
- convites éticos para atendimento.

### Ações

- aprovar;
- editar;
- substituir pilar;
- adicionar pilar manual;
- remover pilar;
- gerar nova sugestão.

### Regra

A estratégia deverá ter um período:

- semanal;
- quinzenal;
- mensal.

Para o MVP, usar mensal como padrão.

---

## Etapa 9 — Planejamento semanal

### Objetivo

Transformar a estratégia em temas concretos.

### Estrutura de cada item

- data sugerida;
- formato;
- tema;
- título provisório;
- objetivo;
- pilar;
- estágio da audiência;
- CTA sugerido;
- justificativa curta;
- status.

### Fluxo

1. Sistema cria uma sugestão semanal.
2. Usuário revisa os temas.
3. Usuário aprova, remove, troca ou adiciona ideias.
4. Somente temas aprovados seguem para produção.

### Regra de economia

Nesta etapa, não gerar legenda, imagem ou carrossel completo.

Produzir apenas o planejamento.

---

## Etapa 10 — Produção do conteúdo

### Objetivo

Gerar o conteúdo completo apenas para os temas aprovados.

### Tipos iniciais

- post de imagem única;
- carrossel;
- legenda;
- roteiro de Reel;
- sequência de Stories.

### Dados gerados

Conforme formato:

- título;
- hook;
- legenda;
- CTA;
- hashtags;
- texto dos slides;
- roteiro;
- orientação visual;
- prompt de imagem;
- imagem gerada, quando solicitada;
- texto alternativo;
- alerta de revisão profissional.

### Estados

- aguardando produção;
- gerando;
- gerado;
- em revisão;
- aprovado;
- rejeitado;
- agendado;
- publicado;
- falhou.

### Ações

- editar manualmente;
- pedir nova legenda;
- pedir outro hook;
- pedir outra imagem;
- reduzir texto;
- mudar tom;
- transformar formato;
- aprovar;
- rejeitar.

### Regra de custo

Cada regeneração deverá mostrar claramente que utilizará crédito de IA.

---

## Etapa 11 — Revisão de segurança e consistência

### Objetivo

Reduzir erros antes da publicação.

### Verificações automáticas

- aderência ao Brand DNA;
- coerência com o tema;
- repetição de conteúdo;
- promessa exagerada;
- linguagem proibida;
- dados potencialmente inventados;
- exposição de informações pessoais;
- conteúdo sensível;
- regras profissionais cadastradas;
- presença de CTA;
- tamanho de legenda;
- formato correto.

### Saída

- aprovado pela revisão;
- atenção recomendada;
- bloqueado para revisão manual.

### Regra

O sistema não deverá afirmar conformidade legal definitiva.

Usar linguagem como:

> Este conteúdo pode exigir revisão profissional antes da publicação.

---

## Etapa 12 — Aprovação e agendamento

### Objetivo

Dar ao usuário a decisão final.

### Ações

- aprovar e agendar;
- aprovar e publicar;
- salvar como rascunho;
- editar;
- compartilhar para aprovação pública;
- rejeitar.

### Horário

O sistema poderá sugerir horário com base em:

1. dados históricos da marca;
2. heurística, quando não houver histórico.

### Reaproveitar

- calendário;
- aprovação pública;
- posts;
- cron de publicação;
- publicação Instagram.

---

## Etapa 13 — Dashboard principal

### Objetivo

Transformar a página inicial em um centro de trabalho, não apenas um painel de números.

### Cabeçalho sugerido

> Bom dia, [nome]. Veja o que está acontecendo com a sua marca.

### Blocos prioritários

#### Próxima ação

- concluir diagnóstico;
- aprovar Brand DNA;
- revisar planejamento;
- aprovar posts;
- reconectar Instagram;
- resolver falha de publicação.

#### Trabalho preparado pela IA

- temas sugeridos;
- posts gerados;
- itens aguardando aprovação;
- recomendações.

#### Calendário da semana

- posts planejados;
- posts aprovados;
- posts publicados.

#### Resultado recente

- melhor conteúdo;
- mudança no alcance;
- evolução de seguidores;
- recomendação principal.

#### Uso do plano

- gerações usadas;
- regenerações;
- limite restante;
- custo estimado, apenas quando adequado ao perfil administrativo.

### Regra

O dashboard deve priorizar ação e clareza, não volume de métricas.

---

## Etapa 14 — Publicação

### Objetivo

Publicar o conteúdo aprovado.

### Requisitos

- executar no horário;
- registrar tentativa;
- registrar resposta da Meta;
- atualizar status;
- evitar duplicidade;
- retentar falhas transitórias;
- informar falha permanente;
- oferecer reconexão quando necessário.

### Notificações

- publicado com sucesso;
- publicação falhou;
- Instagram precisa ser reconectado;
- conteúdo exige nova aprovação após alteração.

---

## Etapa 15 — Métricas e relatório semanal

### Objetivo

Traduzir números em decisões simples.

### Cálculos por código

- alcance médio;
- engajamento;
- crescimento;
- melhor post;
- melhor formato;
- melhor horário;
- salvamentos;
- compartilhamentos;
- visitas ao perfil;
- comparação com período anterior.

### Interpretação com IA

A IA recebe apenas os resultados consolidados.

### Relatório

- o que aconteceu;
- o que funcionou;
- o que não funcionou;
- hipótese;
- recomendação;
- teste para a próxima semana.

### Exemplo

> Os carrosséis educativos tiveram mais salvamentos. Na próxima semana, mantenha dois carrosséis e teste um Reel com uma chamada mais direta para visitar o perfil.

### Ação principal

**Criar a próxima semana usando estes resultados.**

---

## Etapa 16 — Aprendizado da marca

### Objetivo

Melhorar futuras gerações sem reescrever automaticamente o Brand DNA.

### Sinais armazenados

- aprovado sem edição;
- aprovado com edição;
- rejeitado;
- motivo da rejeição;
- alteração de tom;
- troca de CTA;
- mudança de imagem;
- tema removido;
- formato preferido;
- desempenho do post.

### Regra

Os sinais serão incluídos em análises futuras como contexto.

O Brand DNA só será alterado quando:

1. a IA sugerir uma atualização;
2. o usuário revisar;
3. o usuário aprovar.

---

# 9. Skills de IA

As skills são módulos de instruções especializadas.

Elas **não precisam ser modelos diferentes** e não devem ser apresentadas tecnicamente ao usuário.

Uma mesma IA poderá executar diversas skills, cada uma com:

- objetivo;
- entradas;
- regras;
- saída estruturada;
- limites;
- testes;
- versionamento.

## 9.1 Skill — Contexto da Marca

### Responsabilidade

Organizar as informações do negócio.

### Entrada

- cadastro;
- entrevista;
- site;
- texto colado;
- Instagram.

### Saída

- resumo da empresa;
- serviços;
- público;
- objetivo;
- diferenciais;
- restrições;
- perguntas pendentes.

---

## 9.2 Skill — Auditor de Instagram

### Responsabilidade

Interpretar os dados consolidados do perfil.

### Entrada

- resumo do perfil;
- métricas calculadas;
- posts representativos;
- frequência;
- formatos.

### Saída

- pontos fortes;
- pontos de atenção;
- oportunidades;
- prioridades;
- nível de confiança.

### Restrição

Não inventar métricas indisponíveis.

---

## 9.3 Skill — Estrategista de Marca

### Responsabilidade

Criar ou atualizar a proposta de Brand DNA.

### Saída

- posicionamento;
- público;
- tom;
- regras;
- CTA;
- estilo;
- restrições.

---

## 9.4 Skill — Estrategista de Conteúdo

### Responsabilidade

Criar a estratégia editorial do ciclo.

### Saída

- objetivos;
- pilares;
- formatos;
- frequência;
- distribuição;
- indicadores;
- justificativas.

---

## 9.5 Skill — Planejador Editorial

### Responsabilidade

Transformar a estratégia em um plano semanal.

### Saída

Lista estruturada de conteúdos com:

- tema;
- formato;
- objetivo;
- pilar;
- data;
- CTA;
- justificativa.

---

## 9.6 Skill — Criador de Hooks

### Responsabilidade

Criar aberturas que chamem atenção sem exageros.

### Saída

- opções de hook;
- classificação por estilo;
- recomendação;
- alertas de clickbait.

---

## 9.7 Skill — Copywriter

### Responsabilidade

Criar legendas coerentes com a marca.

### Saída

- legenda;
- CTA;
- hashtags;
- versão curta;
- versão alternativa.

---

## 9.8 Skill — Especialista em Carrossel

### Responsabilidade

Transformar um tema em sequência lógica de slides.

### Saída

- capa;
- slides;
- conclusão;
- CTA;
- indicação visual por slide.

---

## 9.9 Skill — Roteirista de Reels

### Responsabilidade

Criar roteiro gravável pelo usuário.

### Saída

- hook falado;
- cenas;
- fala;
- texto na tela;
- duração;
- CTA;
- instruções simples de gravação.

---

## 9.10 Skill — Planejador de Stories

### Responsabilidade

Criar sequências curtas e interativas.

### Saída

- ordem dos Stories;
- texto;
- tipo de mídia;
- enquete ou caixa de perguntas;
- CTA.

---

## 9.11 Skill — Diretor Visual

### Responsabilidade

Definir direção de arte coerente.

### Entrada

- Brand DNA;
- paleta;
- logo;
- formato;
- tema.

### Saída

- composição;
- estilo;
- tipografia sugerida;
- hierarquia;
- prompt de imagem;
- regras negativas.

### Restrição

Não afirmar que identificou elementos visuais que não foram fornecidos ou analisados.

---

## 9.12 Skill — Revisor de Marca

### Responsabilidade

Verificar se o conteúdo respeita o Brand DNA.

### Saída

- aderência;
- problemas;
- correções;
- decisão recomendada.

---

## 9.13 Skill — Revisor de Segurança

### Responsabilidade

Detectar riscos e necessidade de revisão humana.

### Saída

- nível de atenção;
- trechos problemáticos;
- motivo;
- sugestão de correção.

---

## 9.14 Skill — Analista de Performance

### Responsabilidade

Traduzir métricas em recomendações.

### Entrada

Somente dados calculados e consolidados.

### Saída

- resumo;
- aprendizados;
- hipóteses;
- recomendações;
- experimento da próxima semana.

---

## 9.15 Skill — Reaproveitamento de Conteúdo

### Responsabilidade

Transformar um conteúdo aprovado em outro formato.

### Exemplos

- carrossel em Reel;
- Reel em legenda;
- post em Stories;
- post longo em versão curta.

### Regra

Preservar a ideia principal e adaptar ao formato.

---

# 10. Arquitetura sugerida para as skills

Estrutura conceitual:

```text
src/
  lib/
    ai/
      skills/
        brand-context/
          prompt.ts
          schema.ts
          tests/
        instagram-audit/
        brand-strategist/
        content-strategy/
        editorial-planner/
        hooks/
        copywriter/
        carousel/
        reels/
        stories/
        visual-director/
        brand-review/
        safety-review/
        performance-analysis/
        repurpose/
```

Cada skill deverá possuir:

- identificador;
- versão;
- descrição;
- entradas tipadas;
- saída validada por schema;
- prompt do sistema;
- regras;
- exemplos curtos;
- tratamento de erro;
- testes;
- custo registrado;
- modelo configurável.

Não copiar skills externas cegamente para produção.

Usar repositórios externos apenas como referência de estrutura, processo e boas práticas. Adaptar tudo ao contexto do Social Hub, à stack atual e às regras do produto.

---

# 11. Orquestração

## 11.1 Regra principal

Não chamar todas as skills em sequência automaticamente.

A orquestração deverá executar apenas o necessário para cada ação.

### Exemplo: diagnóstico

1. buscar dados;
2. calcular métricas;
3. chamar Auditor de Instagram;
4. salvar resultado.

### Exemplo: planejamento

1. carregar Brand DNA;
2. carregar estratégia;
3. carregar sinais;
4. chamar Planejador Editorial;
5. salvar plano.

### Exemplo: produção de carrossel

1. carregar tema aprovado;
2. carregar Brand DNA;
3. chamar Hook;
4. chamar Carrossel ou usar uma execução estruturada única;
5. chamar revisão;
6. salvar conteúdo.

## 11.2 Estratégia para reduzir chamadas

Quando fizer sentido, uma única execução poderá retornar:

- hook;
- legenda;
- CTA;
- hashtags;
- estrutura do carrossel.

Separar em múltiplas chamadas apenas quando houver benefício mensurável.

---

# 12. Controle de custos e limites

## 12.1 Unidade de uso

Internamente, registrar:

- tokens de entrada;
- tokens de saída;
- custo estimado;
- modelo;
- skill;
- marca;
- usuário;
- ação;
- data;
- sucesso ou erro.

## 12.2 Ações gratuitas de IA no onboarding

Definir uma franquia de ativação para:

- primeiro diagnóstico;
- primeiro Brand DNA;
- primeira estratégia;
- primeiro planejamento semanal.

## 12.3 Ações que consomem crédito

- gerar conteúdo;
- regenerar;
- criar imagem;
- refazer diagnóstico;
- refazer estratégia;
- transformar formatos;
- gerar novas opções.

## 12.4 Ações que não consomem IA

- editar manualmente;
- mover no calendário;
- aprovar;
- rejeitar;
- agendar;
- publicar;
- calcular métricas;
- consultar histórico;
- reutilizar conteúdo salvo.

## 12.5 Limites iniciais sugeridos para teste

Por marca, por mês:

- 1 diagnóstico completo;
- 1 Brand DNA principal;
- 1 estratégia mensal;
- 4 planejamentos semanais;
- até 12 conteúdos completos;
- até 12 regenerações de texto;
- limite separado para imagens;
- 1 relatório semanal.

Esses números deverão ser configuráveis, não fixos no código.

## 12.6 Proteções

- limite por usuário;
- limite por marca;
- limite diário;
- limite mensal;
- impedir chamadas duplicadas;
- idempotência;
- cooldown para regenerações;
- aviso antes de ações caras;
- fallback de modelo;
- timeout;
- retry controlado.

---

# 13. Modelo de dados

A implementação deverá primeiro auditar as tabelas existentes.

Criar novas tabelas apenas quando as atuais não forem suficientes.

Entidades conceituais necessárias:

## 13.1 `brand_onboarding`

- id;
- brand_id;
- current_step;
- status;
- answers;
- completed_at;
- created_at;
- updated_at.

## 13.2 `instagram_audits`

- id;
- brand_id;
- source_snapshot;
- calculated_metrics;
- ai_analysis;
- confidence;
- skill_version;
- created_at.

## 13.3 `brand_dna_versions`

Caso a estrutura atual não tenha versionamento:

- id;
- brand_id;
- version;
- content;
- status;
- approved_by;
- approved_at;
- created_at.

## 13.4 `content_strategies`

- id;
- brand_id;
- period_start;
- period_end;
- objectives;
- pillars;
- formats;
- frequency;
- status;
- skill_version.

## 13.5 `editorial_plans`

- id;
- brand_id;
- week_start;
- status;
- created_at;
- approved_at.

## 13.6 `editorial_plan_items`

- id;
- plan_id;
- post_id, opcional;
- date;
- format;
- topic;
- title;
- objective;
- pillar;
- CTA;
- rationale;
- status.

## 13.7 `brand_signals`

- id;
- brand_id;
- source_type;
- source_id;
- signal_type;
- original_content;
- edited_content;
- reason;
- created_at.

## 13.8 `ai_usage_events`

Reaproveitar o controle de custos atual quando possível.

Campos mínimos:

- brand_id;
- user_id;
- skill_id;
- skill_version;
- model;
- input_tokens;
- output_tokens;
- estimated_cost;
- status;
- created_at.

---

# 14. Navegação e telas

## 14.1 Manter rotas existentes

- `/dashboard`
- `/composer`
- `/calendar`
- `/connections`
- `/approvals`
- `/brand-kit`
- `/autopilot`
- `/ai-costs`
- `/metrics`

## 14.2 Novas rotas ou adaptações sugeridas

- `/onboarding`
- `/instagram/diagnostico`
- `/strategy`
- `/planning`
- `/content/[id]/review`

A decisão entre criar novas rotas ou adaptar telas existentes deverá acontecer após auditoria do código.

## 14.3 Navegação principal sugerida

- Início;
- Planejamento;
- Conteúdos;
- Calendário;
- Resultados;
- Marca;
- Conexões.

Itens técnicos ou administrativos podem ficar em configurações.

---

# 15. Requisitos funcionais

## RF-01

O sistema deve permitir continuar o onboarding de onde o usuário parou.

## RF-02

O sistema deve analisar dados reais do Instagram quando disponíveis.

## RF-03

O sistema deve informar quando uma conclusão é baseada em poucos dados.

## RF-04

O usuário deve aprovar o Brand DNA antes de usá-lo como versão ativa.

## RF-05

O sistema deve gerar estratégia antes do planejamento.

## RF-06

O sistema deve gerar planejamento antes do conteúdo completo no modo assistido.

## RF-07

O usuário deve aprovar temas antes da produção em lote.

## RF-08

O usuário deve editar conteúdo sem consumir IA.

## RF-09

Regenerações devem ser rastreadas e limitadas.

## RF-10

O conteúdo deve passar por revisão de marca e segurança.

## RF-11

O usuário deve poder aprovar, rejeitar, editar, agendar e publicar.

## RF-12

O sistema deve registrar sinais de preferência.

## RF-13

O relatório semanal deve usar métricas calculadas no backend.

## RF-14

O sistema deve sugerir próximos passos no dashboard.

## RF-15

Todas as ações de IA devem aparecer no controle de uso e custos.

## RF-16

O sistema deve suportar múltiplas marcas sem misturar contexto.

## RF-17

Todas as consultas e gravações devem respeitar isolamento por usuário e marca.

---

# 16. Requisitos não funcionais

## Segurança

- respeitar RLS do Supabase;
- criptografar ou proteger tokens;
- não expor secrets no cliente;
- validar callbacks OAuth;
- validar permissões;
- registrar falhas sem vazar dados;
- sanitizar conteúdo externo.

## Performance

- não bloquear a interface durante gerações longas;
- usar jobs quando apropriado;
- mostrar progresso;
- evitar ressincronização desnecessária;
- usar cache de análises aprovadas.

## Confiabilidade

- idempotência;
- retry controlado;
- logs;
- estados claros;
- recuperação após falha;
- conteúdo não pode desaparecer após erro.

## Acessibilidade

- navegação por teclado;
- labels;
- contraste;
- mensagens de erro claras;
- progresso textual;
- não depender apenas de cores.

## Responsividade

Todas as etapas principais devem funcionar em desktop e celular.

---

# 17. Métricas de sucesso

## Ativação

- percentual que conecta Instagram;
- percentual que conclui entrevista;
- percentual que aprova Brand DNA;
- percentual que aprova primeira estratégia;
- percentual que chega ao primeiro planejamento.

## Valor

- tempo até o primeiro conteúdo aprovado;
- quantidade de conteúdos aprovados;
- percentual de conteúdos editados;
- taxa de rejeição;
- quantidade de publicações realizadas;
- retorno semanal.

## Qualidade

- aprovação sem edição;
- edição leve;
- regenerações;
- rejeições;
- motivos de rejeição;
- avaliação do usuário.

## Custo

- custo médio por marca;
- custo por conteúdo aprovado;
- custo de onboarding;
- custo de regeneração;
- margem por plano.

---

# 18. Critérios de aceitação do MVP

A entrega será considerada validável quando uma nova usuária conseguir:

1. criar a conta;
2. cadastrar a marca;
3. conectar o Instagram;
4. receber um diagnóstico;
5. responder à entrevista;
6. aprovar o Brand DNA;
7. escolher o modo assistido;
8. aprovar uma estratégia;
9. aprovar um plano semanal;
10. gerar pelo menos um conteúdo;
11. editar ou aprovar;
12. agendar;
13. publicar;
14. visualizar métricas;
15. receber uma recomendação para a próxima semana.

Tudo isso sem precisar entender marketing digital avançado.

---

# 19. Plano de implementação incremental

## Fase 0 — Auditoria e proteção do existente

- mapear rotas;
- mapear tabelas;
- mapear componentes;
- mapear server actions;
- mapear geração de IA;
- mapear cron;
- mapear Meta;
- mapear custos;
- listar alterações não commitadas;
- criar branch;
- garantir baseline de testes;
- não apagar funcionalidades existentes.

### Saída

Documento de impacto técnico.

---

## Fase 1 — Fundação das skills

- criar contrato comum;
- schemas;
- registro de versões;
- executor;
- logs;
- custos;
- testes;
- primeira skill de Contexto da Marca.

### Saída

Infraestrutura reutilizável.

---

## Fase 2 — Onboarding e diagnóstico

- progresso;
- entrevista;
- sincronização;
- cálculos;
- Auditor de Instagram;
- tela de diagnóstico.

### Saída

Usuário entende sua situação atual.

---

## Fase 3 — Brand DNA

- consolidar fontes;
- gerar proposta;
- editar;
- aprovar;
- versionar;
- ativar versão.

### Saída

Memória aprovada da marca.

---

## Fase 4 — Estratégia e planejamento

- Estrategista de Conteúdo;
- Planejador Editorial;
- estratégia mensal;
- plano semanal;
- aprovação de temas.

### Saída

Semana planejada antes da geração.

---

## Fase 5 — Produção e revisão

- hooks;
- copy;
- carrossel;
- Reel;
- Stories;
- direção visual;
- revisão;
- regenerações;
- edição manual.

### Saída

Conteúdos prontos para aprovação.

---

## Fase 6 — Dashboard e jornada integrada

- próximo passo;
- trabalho da IA;
- calendário;
- aprovações;
- resultados;
- uso do plano.

### Saída

Experiência central reorganizada.

---

## Fase 7 — Métricas e aprendizado

- consolidação;
- relatório;
- recomendações;
- sinais;
- atualização assistida do DNA.

### Saída

Ciclo semanal completo.

---

## Fase 8 — Validação piloto

Testar com:

- uma profissional liberal;
- uma agência.

### Duração sugerida

2 a 4 semanas.

### Coletar

- gravações de uso autorizadas;
- dificuldades;
- tempo;
- aprovações;
- rejeições;
- custos;
- disposição para pagar;
- recursos considerados essenciais.

---

# 20. Estratégia de testes

## Unitários

- schemas;
- cálculos de métricas;
- ranking;
- limites;
- normalização;
- montagem de contexto;
- detecção de duplicidade;
- transições de status.

## Contrato das skills

- entrada válida;
- saída válida;
- campos obrigatórios;
- fallback;
- conteúdo insuficiente;
- restrições;
- não alucinação de métricas.

## Integração

- Supabase;
- Meta;
- custos;
- posts;
- calendário;
- aprovação;
- publicação.

## E2E

Fluxo principal:

1. criar marca;
2. conectar ou simular conexão;
3. concluir onboarding;
4. aprovar DNA;
5. aprovar estratégia;
6. aprovar plano;
7. gerar post;
8. editar;
9. agendar.

## Regressão

Garantir que continuem funcionando:

- login;
- marcas;
- Composer manual;
- calendário;
- conexão Meta;
- publicação;
- aprovação;
- métricas;
- YouTube;
- custos.

---

# 21. Instruções para o Codex

1. Não reconstruir o projeto do zero.
2. Primeiro auditar o código.
3. Não remover funcionalidades sem evidência.
4. Não substituir dependências sem necessidade.
5. Criar um plano por fases antes de alterar.
6. Reutilizar tabelas e componentes.
7. Fazer migrations reversíveis.
8. Aplicar TDD em regras puras.
9. Executar TypeScript, testes e build a cada fase.
10. Criar commits pequenos.
11. Não ativar piloto automático total.
12. Não publicar sem aprovação.
13. Não copiar repositórios externos integralmente.
14. Não adicionar agentes complexos antes de validar as skills.
15. Registrar custos de todas as chamadas.
16. Manter compatibilidade com o Composer manual.
17. Tratar dados do Instagram como fonte; IA apenas interpreta.
18. Documentar envs e passos manuais.
19. Atualizar README ao final.
20. Pausar e pedir decisão quando houver conflito arquitetural relevante.

---

# 22. Ordem recomendada de trabalho para o Codex

Antes de codificar:

1. ler este PRD;
2. auditar o repositório;
3. comparar o PRD com o que já existe;
4. criar uma matriz:

| Requisito | Já existe | Parcial | Ausente | Arquivo relacionado |
|---|---:|---:|---:|---|

5. propor as mudanças mínimas;
6. listar migrations;
7. listar riscos;
8. listar decisões pendentes;
9. criar plano de implementação em tarefas pequenas;
10. aguardar aprovação antes de executar mudanças grandes.

---

# 23. Decisões de produto já tomadas

- Instagram será o canal inicial.
- O projeto existente será evoluído.
- Haverá modo Manual e Assistido.
- Publicação sem aprovação não será padrão.
- A IA será organizada por skills.
- Skills não significam modelos diferentes.
- O Brand DNA será a memória central.
- A estratégia vem antes da geração.
- Temas são aprovados antes do conteúdo completo.
- Métricas são calculadas antes de serem interpretadas.
- Edições manuais não consomem IA.
- Regenerações serão limitadas.
- Aprendizado não altera o DNA sem aprovação.
- Novas redes ficam para depois da validação do Instagram.

---

# 24. Resultado esperado

Ao final, uma psicóloga que nunca estudou marketing deverá entrar no Social Hub e sentir que recebeu orientação profissional.

Ela não verá apenas um conjunto de ferramentas.

Ela percorrerá uma jornada:

> Entender minha marca → analisar meu Instagram → definir minha estratégia → planejar minha semana → produzir conteúdos → aprovar → publicar → aprender com os resultados.

Essa será a principal diferença do Social Hub em relação a um agendador tradicional.
