# PRD — Jornada Guiada de Onboarding e Brand DNA

> **Observação:** Este documento consolida integralmente o PRD discutido para o onboarding do SocialHub.

## 1. Objetivo

Criar uma jornada guiada para o primeiro acesso, utilizando o Instagram como principal fonte para construir automaticamente o Brand DNA e preparar o primeiro planejamento.

## 2. Público

- Pequenas empresas
- Profissionais liberais
- Prestadores de serviço
- Agências (modo avançado)

## 3. Configuração

### 3.1 Básica

Fluxo:
1. Conectar Instagram
2. Analisar perfil
3. Confirmar informações
4. Definir objetivo
5. Definir frequência
6. Confirmar Brand DNA
7. Gerar planejamento

Não solicitar:
- Logo
- Website
- Manual da marca
- Paleta manual
- Fontes
- Templates

### 3.2 Avançada

Disponível após o onboarding em:

**Brand Kit → Melhorar precisão da IA**

Inclui:
- Logo
- Website
- Manual da marca
- Paleta
- Fontes
- Templates
- Referências

## 4. Regra de entrada

Se o usuário não concluiu o onboarding, iniciar automaticamente a jornada guiada.

## 5. Fluxo geral

Boas-vindas → Conectar Instagram → Analisar perfil → Confirmar dados → Objetivo → Frequência → Brand DNA → Planejamento → Dashboard

## 6. Boas-vindas

Mensagem simples explicando que a IA fará a configuração automaticamente.

## 7. Conectar Instagram

Usar OAuth existente. Em caso de falha, permitir nova tentativa.

## 8. Análise automática

Extrair:
- Nome
- Bio
- Categoria
- Segmento
- Público
- Tom
- Frequência
- Temas
- Cores
- Estilo visual

Mostrar mensagens de progresso.

## 9. Classificação dos dados

- CONFIRMED
- INFERRED
- NOT_FOUND

## 10. Confirmação

Permitir editar apenas os dados necessários.

## 11. Campos obrigatórios

- Nome da marca
- Segmento

## 12. Contas novas

Caso haja poucos dados:
- Nome
- Segmento
- Serviço principal
- Cidade

## 13. Nome da marca

Prioridade:
1. Bio
2. Nome do perfil
3. Nome do profissional
4. Username

## 14. Segmento

Inferir automaticamente e solicitar confirmação quando necessário.

## 15. Análise visual

Detectar:
- Paleta
- Contraste
- Fotos
- Artes
- Consistência
- Estilo

## 16. Paleta

Prioridade:
1. Feed
2. Avatar
3. Segmento
4. Fallback

## 17. Estilo

Sugerir combinação de características em vez de estilos fixos.

## 18. Objetivo

Selecionar objetivo principal e até dois secundários.

## 19. Frequência

Permitir:
- 3x semana
- 5x semana
- Diário
- IA decide

## 20. Brand DNA

Gerar automaticamente:
- Público
- Tom
- Personalidade
- Temas
- CTA
- Estilo
- Frequência
- Paleta

## 21. Revisão

Usuário confirma antes de salvar.

## 22. Planejamento

Gerar apenas ideias.
Não gerar conteúdo definitivo.

## 23. Formatos suportados

- Post
- Carrossel
- Story estático

Não gerar Reels nem vídeos.

## 24. Finalização

Redirecionar para Aprovações.

## 25. Configuração avançada

Melhorar precisão da IA sem reiniciar onboarding.

## 26. Organização

Separar:
- Identidade Visual
- Informações da Empresa

## 27. Barra de progresso

Mostrar etapa atual.

## 28. Salvamento automático

Salvar cada etapa.

## 29. Estados

- NOT_STARTED
- IN_PROGRESS
- COMPLETED

## 30. Retomada

Continuar exatamente da etapa salva.

## 31. Tratamento de erros

Sempre permitir nova tentativa preservando dados.

## 32. UX

- Um passo por tela
- Linguagem simples
- Sem dashboard vazio
- Sem campos técnicos obrigatórios

## 33. Microcopy

Usar linguagem amigável e objetiva.

## 34. Critérios de aceitação

- Onboarding automático
- Instagram obrigatório
- Brand DNA criado
- Planejamento inicial criado
- Dashboard liberado somente após conclusão

## 35. Testes

Cobrir:
- Fluxo feliz
- Retomada
- Conta nova
- Falhas
- Build
- Typecheck
- Testes automatizados
