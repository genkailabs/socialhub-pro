# Sistema Inteligente de Estruturas, Componentes e Estilos no Composer

**PRD:** v1.0 — Composer / Geração Automática de Conteúdo
**Escopo entregue:** §17 (MVP) — 12 estruturas, 8 estilos, 20 componentes, salvar como layout,
escolha automática pela IA, Brand Kit, validação, abertura no Composer, mascote.

## O que já existia e foi aproveitado

| PRD | Já no código | Como foi usado |
| --- | --- | --- |
| §7 Brand Kit | `lib/ai/art/palette.js` (`resolveArtPalette`, `ensureReadableInk`) | Reusado sem alteração para derivar a paleta da peça. |
| §14 Validação (contraste) | `lib/ai/art/quality.js` (`contrastRatio`, `parseHex`) | Reusado no validador de camadas. |
| §13 Evitar repetição | `lib/ai/art/layouts.js` (`selectLayout`) | Padrão de "não repete o recente" replicado para estruturas E estilos. |
| §16 Composer | `lib/composer-editor.js` (`makeSurface`, `addLayer`, `canvasSize`) | O motor emite exatamente o formato de camada que o editor já entende. |
| Componentes | `lib/composer-text-styles.js`, `data/element-icons.js` | Tipos de camada (`text`/`button`/`shape`/`line`/`icon`) já suportados pelo canvas e pelo render final. |

**A lacuna real:** `lib/ai/art/*` produz um nó do satori → PNG achatado. O PRD §4 exige
"objetos editáveis, e não imagens prontas" e §16 exige abrir montado no Composer.
Por isso o motor novo (`lib/layouts/`) emite **superfícies do Composer**, não nós de imagem.

## Módulos

- `lib/layouts/components.js` — 20 componentes reutilizáveis (§5).
- `lib/layouts/styles.js` — 8 estilos visuais (§6).
- `lib/layouts/structures.js` — 12 estruturas (§4), slots em coordenadas normalizadas.
- `lib/layouts/select.js` — classificação de conteúdo + escolha automática (§12) + antirrepetição (§13).
- `lib/layouts/build.js` — estrutura + componentes + estilo + Brand Kit + conteúdo → superfície do Composer.
- `lib/layouts/validate.js` — checklist (§14) e correção automática.
- `lib/layouts/mascot.js` — explicações do mascote (§15).
- `lib/layouts/templates.js` — "Salvar como layout" (§11): fixos vs dinâmicos.
- `lib/layouts/index.js` — orquestrador puro `composeSmartPost()`.
- `lib/layouts-data.js` / `lib/layout-actions.js` — leitura e escrita no Supabase.
- `supabase/migrations/20260726000200_layout_system.sql` — §8 (`layout_structures`,
  `layout_components`, `visual_styles`, `layout_templates`) + `layout_usage` para §13.
- `components/composer/LayoutsPanel.jsx` + aba "Layouts" no `VisualComposer`.

## Fora do MVP (§17 "não implementar ainda" + §9/§10)

Banco de referências (§9) e Laboratório de Layouts (§10) não estão na lista do §17 e
dependem de revisão humana de referências externas; ficaram de fora desta entrega.
