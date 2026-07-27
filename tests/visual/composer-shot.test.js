// Gera o markup estático do Composer para inspeção visual. Não é asserção —
// é o passo de "olhar o render" que build e teste unitário não cobrem.
// Sem JSX de propósito: esta config roda arquivos .js sem loader de JSX.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { addLayer, makeComposerDocument } from '@/lib/composer-editor';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: { from: () => ({}) } }) }));
vi.mock('@/lib/posts-actions', () => ({ publishNow: vi.fn(), saveDraft: vi.fn(), schedulePost: vi.fn(), deleteComposerDraft: vi.fn() }));
vi.mock('@/lib/layout-actions', () => ({
  buildLayoutForContent: vi.fn(), generateLayoutFromBrief: vi.fn(),
  getLayoutTemplates: vi.fn(async () => ({ templates: [] })),
  saveLayoutTemplate: vi.fn(), deleteLayoutTemplate: vi.fn(), renameLayoutTemplate: vi.fn()
}));

// Esta config compila JSX no runtime clássico; sem o React global o componente
// quebra em React.createElement.
globalThis.React = React;

const OUT = process.env.COMPOSER_SHOT_DIR;
const BRAND_KIT = {
  visual_style: 'jornalistico',
  palette: { primary: '#3b82f6', accent: '#e0483c', ink: '#0f1317', paper: '#e6e8ec' }
};

describe('markup do Composer para inspeção', () => {
  it('escreve o HTML estático', async () => {
    if (!OUT) return;
    const { VisualComposer } = await import('@/components/composer/VisualComposer');

    const doc = makeComposerDocument();
    addLayer(doc.post, { text: 'Mais pessoas recorrem ao ChatGPT como terapeuta', fs: 34, weight: 800, x: 24, y: 232, w: 382, h: 100 }, [430, 430], 'l-titulo');
    addLayer(doc.post, { text: 'duas especialistas explicam porquê', fs: 15, x: 24, y: 344, w: 340, h: 30 }, [430, 430], 'l-sub');

    const base = { brandId: 'b1', brandName: 'genkailabs', brandLabel: 'GenkaiLabs', brandKit: BRAND_KIT };
    const cheio = renderToStaticMarkup(React.createElement(VisualComposer, {
      ...base,
      initialDraft: {
        id: 'd1',
        status: 'draft',
        editor_state: {
          format: 'post', ratio: '1:1', doc,
          caption: 'A busca por apoio emocional mudou de endereço.',
          hashtags: 'ia, saudemental'
        }
      }
    }));
    const vazio = renderToStaticMarkup(React.createElement(VisualComposer, base));

    // O CSS do build tem hashes diferentes dos que o bundler do teste gera:
    // usar um com o outro produz um PNG sem estilo nenhum, que mente sobre a
    // tela. Aqui o CSS bruto é reescrito com o mapa de classes deste render.
    // O objeto do CSS module não expõe as chaves neste ambiente, então o sufixo
    // sai do próprio markup: todas as classes saem como `_nome_hash`.
    const hash = cheio.match(/class="_[\w-]+_([a-z0-9]+)/)[1];
    const raw = fs.readFileSync(path.join(process.cwd(), 'components/composer/VisualComposer.module.css'), 'utf8');
    const globals = [];
    const css = raw
      // `:global(...)` sai do jogo antes da reescrita: `.dark` não é do módulo.
      .replace(/:global\(([^)]+)\)/g, (_, inner) => `__GLOBAL${globals.push(inner) - 1}__`)
      .replace(/\.([A-Za-z][\w-]*)/g, (_, name) => `._${name}_${hash}`)
      .replace(/__GLOBAL(\d+)__/g, (_, index) => globals[Number(index)]);

    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'composer.css'), css);
    fs.writeFileSync(path.join(OUT, 'markup.html'), cheio);
    fs.writeFileSync(path.join(OUT, 'markup-vazio.html'), vazio);
  });
});
