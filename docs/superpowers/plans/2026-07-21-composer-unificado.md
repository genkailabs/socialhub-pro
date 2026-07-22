# Composer Unificado (Post, Carrossel, Story e Reel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar o Composer (`ComposerForm.jsx`) em uma interface dinâmica única suportando Post, Carrossel, Story e Reel, com upload temporário e exclusão automática para vídeos, sem alterar as regras e fluxos funcionais dos Posts existentes.

**Architecture:** Refatoração incremental do frontend com seletor de Tipo de formato (`image`, `carousel`, `stories`, `reel`), separação em subcomponentes reutilizáveis para edição e preview, evolução do pipeline de storage para vídeos temporários (`temp/`), e extensão dos publishers Graph API (`publishInstagramStory` para vídeo e `publishInstagramReel`) e do scheduler para limpeza de arquivos órfãos/pós-publicação.

**Tech Stack:** Next.js (React Client Components), Supabase Storage / Database, Facebook/Instagram Graph API v21.0, Tailwind CSS / Lucide Icons.

## Global Constraints

- **NÃO quebrar funcionalidades existentes:** O fluxo de publicação imediata, agendada e aprovação de Posts (Imagem única e Carrossel) deve continuar idêntico e funcional.
- **Armazenamento de vídeos:** Vídeos de Story e Reel são enviados para Storage temporário (`temp/`) e NUNCA devem permanecer armazenados permanentemente; devem ser excluídos automaticamente após a publicação ou se ficarem órfãos por mais de 24h.
- **Interface única:** O usuário escolhe apenas o Tipo e os campos/previews se adaptam sem recarregar a página ou criar páginas separadas.
- **Testes e Build:** Após cada tarefa, TypeScript/JSX sem erros, build passando (`npm run build`) e testes rodando (`npm test`).

---

### Task 1: Refatoração do Composer e Seletor de Tipo

**Files:**
- Create: `components/composer/ComposerTypeSelector.jsx`
- Modify: `components/composer/ComposerForm.jsx:20-80`
- Modify: `components/composer/ComposerForm.jsx:90-195`

**Interfaces:**
- Consumes: `FORMATS` (`lib/formats.js`)
- Produces: `ComposerTypeSelector({ value, onChange })` (recebe/emite `format`: `'image' | 'carousel' | 'stories' | 'reel'`).

- [ ] **Step 1: Criar o componente ComposerTypeSelector.jsx**

```jsx
'use client';
import { Image, Layers, Smartphone, Film } from 'lucide-react';

const TYPES = [
  { id: 'image', label: 'Post', icon: Image },
  { id: 'carousel', label: 'Carrossel', icon: Layers },
  { id: 'stories', label: 'Story', icon: Smartphone },
  { id: 'reel', label: 'Reel', icon: Film }
];

export function ComposerTypeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-surface-2 p-1">
      {TYPES.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              active
                ? 'bg-surface text-accent shadow-soft'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Integrar o seletor em ComposerForm.jsx e adaptar o estado inicial**

Modificar `ComposerForm.jsx` para incluir o estado `format` (padrão `'image'`), sincronizar quando o usuário adicionar múltiplas imagens se estiver em `'image'` (mudando para `'carousel'`), e renderizar o `ComposerTypeSelector` no topo da área de edição.

- [ ] **Step 3: Verificar build e testes iniciais**

Rodar `npm run build` e verificar que não há erros de compilação JSX/TS.

---

### Task 2: Componente Story (Imagem e Vídeo)

**Files:**
- Create: `components/composer/StoryComposer.jsx`
- Modify: `components/composer/ComposerForm.jsx:125-155`

**Interfaces:**
- Consumes: estado do Composer (`media`, `setMedia`, `msg`, `setMsg`).
- Produces: `StoryComposer({ media, onAddMedia, onRemoveMedia })` para gerenciar 1 mídia (imagem ou vídeo vertical 9:16).

- [ ] **Step 1: Criar StoryComposer.jsx**

Permite selecionar 1 arquivo (imagem PNG/JPG ou vídeo MP4/MOV até 60s), exibe dica visual sobre formato vertical 9:16 e avisa que o vídeo ficará em armazenamento temporário até a publicação.

- [ ] **Step 2: Conectar StoryComposer condicionalmente em ComposerForm.jsx**

Quando `format === 'stories'`, substituir a área tradicional de imagens do Feed pelo `StoryComposer`.

- [ ] **Step 3: Rodar build e testes**

---

### Task 3: Componente Reel

**Files:**
- Create: `components/composer/ReelComposer.jsx`
- Modify: `components/composer/ComposerForm.jsx:125-155`

**Interfaces:**
- Consumes: `media`, `setMedia` para o arquivo de vídeo do Reel, e estado opcional para thumbnail/capa.
- Produces: `ReelComposer({ video, cover, onSelectVideo, onSelectCover })`.

- [ ] **Step 1: Criar ReelComposer.jsx**

Interface com upload de vídeo MP4/MOV (proporção vertical 9:16, até 90s), campo opcional para upload de capa (thumbnail), e aviso explicativo de que vídeos de Reels nunca são armazenados permanentemente e serão apagados após a postagem.

- [ ] **Step 2: Integrar ReelComposer no ComposerForm.jsx**

Quando `format === 'reel'`, renderizar `ReelComposer` junto aos campos compartilhados de legenda, hashtags e agendamento.

- [ ] **Step 3: Rodar build e testes**

---

### Task 4: Preview Inteligente Dinâmico

**Files:**
- Create: `components/composer/DynamicPreview.jsx`
- Modify: `components/composer/ComposerForm.jsx:195-230`

**Interfaces:**
- Consumes: `format`, `media`, `caption`, `tags`, `brandName`, `slide`, `setSlide`.
- Produces: `DynamicPreview` que alterna visualmente entre os 4 formatos sem recarregar a página.

- [ ] **Step 1: Criar DynamicPreview.jsx com 3 modos visuais (Feed/Carrossel, Story Vertical 9:16, Reel Vertical 9:16)**

- **Post / Carrossel:** Layout clássico de feed (quadrado com header da marca e barra de ícones de curtida/comentário abaixo).
- **Story:** Contêiner vertical 9:16 (aspect-[9/16]) com barra de progresso no topo, foto de perfil/nome sobrepostos, mídia preenchendo o fundo, e sem barra de interações de feed.
- **Reel:** Contêiner vertical 9:16 com o vídeo em preview (ou poster), ícone de Reels no canto, e legenda/hashtags truncadas sobrepostas no rodapé em gradiente escuro.

- [ ] **Step 2: Substituir a coluna da prévia estática do ComposerForm.jsx por DynamicPreview**

- [ ] **Step 3: Validar visualmente via build**

---

### Task 5: Storage Temporário e Uploads

**Files:**
- Modify: `lib/posts-media.js`
- Modify: `components/composer/ComposerForm.jsx:14-22`

**Interfaces:**
- Consumes: Supabase Client (`createClient`).
- Produces: `uploadTempMedia(brandId, file, prefix = 'temp')` que envia vídeos para o bucket `media` com o caminho `temp/${brandId}/${Date.now()}-${file.name}`.

- [ ] **Step 1: Adicionar uploadTempMedia em lib/posts-media.js**

```javascript
export async function uploadTempMedia(supabase, brandId, file) {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const path = `temp/${brandId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    upsert: true,
    contentType: file.type
  });
  if (error) throw new Error(`Falha no upload temporário: ${error.message}`);
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl, path };
}
```

- [ ] **Step 2: Atualizar ComposerForm.jsx para usar uploadTempMedia no envio de vídeos de Story/Reel**

---

### Task 6: Backend Story (Vídeo e Imagem)

**Files:**
- Modify: `lib/meta/graph.js:120-140`
- Modify: `lib/posts-actions.js:36-84`

**Interfaces:**
- Consumes: Graph API (`IMAGE_URL` ou `VIDEO_URL`, `MEDIA_TYPE=STORIES`).
- Produces: `publishInstagramStory({ igId, token, imageUrl, videoUrl })`.

- [ ] **Step 1: Atualizar publishInstagramStory em lib/meta/graph.js**

Suportar tanto `imageUrl` quanto `videoUrl`. Se for vídeo, enviar `video_url=videoUrl` com `media_type=STORIES`, aguardar `status_code === 'FINISHED'` no polling e chamar `publishContainer`.

- [ ] **Step 2: Atualizar publishNow em lib/posts-actions.js para tratar format === 'stories'**

Encaminhar para `publishInstagramStory` com a mídia apropriada e acionar remoção de arquivo temporário se for vídeo após o sucesso da postagem.

---

### Task 7: Backend Reel

**Files:**
- Modify: `lib/meta/graph.js:140-160`
- Modify: `lib/formats.js:35-48`
- Modify: `lib/posts-actions.js:36-84`

**Interfaces:**
- Consumes: Graph API (`MEDIA_TYPE=REELS`, `video_url`, `cover_url`, `share_to_feed=true`).
- Produces: `publishInstagramReel({ igId, token, caption, videoUrl, coverUrl })`.

- [ ] **Step 1: Criar publishInstagramReel em lib/meta/graph.js**

```javascript
export async function publishInstagramReel({ igId, token, caption, videoUrl, coverUrl }) {
  if (!videoUrl) throw new Error('Reel exige uma URL de vídeo.');
  const params = new URLSearchParams({
    video_url: videoUrl,
    media_type: 'REELS',
    share_to_feed: 'true',
    access_token: token
  });
  if (caption != null) params.set('caption', caption);
  if (coverUrl) params.set('cover_url', coverUrl);

  const res = await (await fetch(`${GRAPH}/${igId}/media?${params}`, { method: 'POST' })).json();
  if (res.error) throw new Error(`Reel Container: ${res.error.message}`);

  await waitContainerReady({ containerId: res.id, token, tries: 12, delay: 3000 });
  return publishContainer({ igId, token, creationId: res.id });
}
```

- [ ] **Step 2: Habilitar publishable: true e publisher: 'instagram-reel' em lib/formats.js**

- [ ] **Step 3: Conectar publishInstagramReel no publishNow em lib/posts-actions.js**

---

### Task 8: Agendamento Multi-Formato

**Files:**
- Modify: `lib/posts-actions.js:85-135` (`schedulePost`)
- Modify: `lib/publication-scheduler.js:20-80`

**Interfaces:**
- Consumes: tabela `posts` (campo `media_url`, `media_urls`, metadata ou `format`).
- Produces: Agendamento unificado e execução no scheduler/cron para `image`, `carousel`, `stories` e `reel`.

- [ ] **Step 1: Atualizar schedulePost em lib/posts-actions.js para salvar o formato e referências de vídeo/capa na tabela posts**

- [ ] **Step 2: Expandir lib/publication-scheduler.js para rotear a publicação por formato no momento do disparo do cron**

---

### Task 9: Limpeza Automática de Vídeos Temporários

**Files:**
- Create: `lib/media-cleanup.js`
- Modify: `lib/posts-actions.js`
- Modify: `lib/publication-scheduler.js`

**Interfaces:**
- Consumes: Supabase Storage (`media` bucket, pasta `temp/`).
- Produces: `deleteTempMedia(pathOrUrl)` e `cleanupOrphanTempUploads()`.

- [ ] **Step 1: Criar lib/media-cleanup.js**

```javascript
import { createClient } from '@/lib/supabase/server';

export async function deleteTempMedia(supabase, pathOrUrl) {
  if (!pathOrUrl) return;
  // Se for URL completa, extrair o caminho relativo no bucket
  const match = pathOrUrl.match(/media\/(temp\/.+)$/);
  const path = match ? match[1] : (pathOrUrl.startsWith('temp/') ? pathOrUrl : null);
  if (!path) return; // Só apaga o que for temporário
  await supabase.storage.from('media').remove([path]);
}

export async function cleanupOrphanTempUploads(supabase) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 horas atrás
  const { data: folders } = await supabase.storage.from('media').list('temp');
  if (!folders) return;
  for (const folder of folders) {
    const { data: files } = await supabase.storage.from('media').list(`temp/${folder.name}`);
    if (!files) continue;
    const toDelete = files
      .filter((f) => {
        const tsMatch = f.name.match(/^(\d+)-/);
        const fileTs = tsMatch ? parseInt(tsMatch[1], 10) : new Date(f.created_at).getTime();
        return fileTs < cutoff;
      })
      .map((f) => `temp/${folder.name}/${f.name}`);
    if (toDelete.length > 0) {
      await supabase.storage.from('media').remove(toDelete);
    }
  }
}
```

- [ ] **Step 2: Acionar deleteTempMedia após publicar com sucesso (imediato e agendado) e rodar cleanupOrphanTempUploads na rotina do scheduler**

---

### Task 10: Testes Finais e Validação

**Files:**
- Create: `tests/composer-unified.test.js`

**Interfaces:**
- Consumes: todo o ecossistema refatorado de formatos, helpers de mídia, limpeza e graph.

- [ ] **Step 1: Criar testes unitários em tests/composer-unified.test.js para validar:**
- `isPublishable('reel')` e `isPublishable('stories')` retornando `true`.
- Validações de limites e normalização de caminhos de mídia temporária (`temp/...`).
- Comportamento das rotinas de limpeza (`deleteTempMedia` ignorando mídias definitivas que não começam com `temp/`).

- [ ] **Step 2: Executar testes de regressão e build final**
Rodar `npm test` e `npm run build` para garantir zero erros ou quebras.
