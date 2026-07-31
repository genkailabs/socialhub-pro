# Exemplo observado — carrossel para ótica

**Fonte:** conversa enviada em 29/07/2026 e preview anexado pelo usuário.

## O que o agente executou

- Adaptou o fluxo a um carrossel de 6 slides com paleta azul e estilo clássico.
- Preservou o ritmo visual final: capa, dark, light, dark, light e CTA light.
- Usou todas as cinco imagens recebidas: capa, slide 3, fundo com overlay no slide 4, image box no slide 5 e fundo suave no CTA.
- Gerou um HTML de preview e fez uma checagem visual por screenshot antes de entregar.

## Estado da entrega

O material mostrado é **preview HTML**, não a exportação final em PNG. A conversa termina pedindo a confirmação do usuário e o comando `exportar`.

## Limitação anotada

As fontes pretendidas (Playfair Display e DM Sans) não puderam ser baixadas no ambiente. Foram usadas alternativas locais embutidas: Liberation Serif para títulos e Liberation Sans para texto. Qualquer análise futura deve considerar que a fidelidade tipográfica ao design original não foi validada.

## O que estudar para o SocialHub

1. Controle explícito de aprovação entre texto, preview e exportação.
2. Regras para aplicar todas as imagens enviadas sem comprometer a legibilidade.
3. Preview visual como validação real — não assumir que o HTML está correto apenas porque foi gerado.
4. Estratégia de fontes que funcione em ambiente de exportação, sem depender de acesso externo durante a renderização.
