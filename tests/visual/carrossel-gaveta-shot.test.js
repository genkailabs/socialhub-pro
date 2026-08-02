// Markup estático da gaveta do roteiro, para OLHAR a dica de imagem e o card
// do Hub no lugar novo. Não é asserção — teste unitário aprova a regra e não
// aprova a peça (texto cortado, card espremido, dica ilegível).
// Sem JSX de propósito: esta config roda arquivos .js sem loader de JSX.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: { from: () => ({}) } }) }));
vi.mock('@/lib/posts-actions', () => ({ saveDraft: vi.fn(), deleteComposerDraft: vi.fn() }));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));

globalThis.React = React;

const OUT = process.env.CARROSSEL_SHOT_DIR;

const directions = {
  problem: 'A equipe repete trabalho manual todo dia.',
  learningOutcome: 'Escolher a primeira tarefa para automatizar.',
  headlineOptions: [{ id: 'headline-1', headline: 'O erro que faz milhares criarem produtos que nunca vendem', subheadline: 'A ferramenta nunca foi o verdadeiro problema.', angle: 'erro', rationale: 'Ataca a causa, não o sintoma.' }],
  narrative: [{ order: 1, role: 'cover' }]
};

const slides = [
  { order: 1, role: 'cover', headline: 'Cinco erros ao usar IA no escritório', readerTakeaway: 'A ferramenta nunca foi o problema.', imageIdea: { scene: 'sala de reunião pequena vista de cima, mesa vazia e luz de janela', searchTerms: ['empty meeting room', 'overhead view'], avoid: 'gente posando e sorrindo para a câmera' } },
  { order: 2, role: 'traction', headline: 'O time adota a ferramenta sem combinar quem revisa o resultado', body: 'Sem revisor, o erro da inteligência artificial chega ao cliente com a sua assinatura.', readerTakeaway: 'Defina o revisor antes de automatizar.' },
  { order: 3, role: 'teach', headline: 'Comece pela tarefa repetitiva que ninguém gosta de fazer', body: 'Meça quanto tempo ela consome hoje na equipe e compare depois de uma semana.', readerTakeaway: 'Meça antes para saber se ganhou tempo.' },
  { order: 4, role: 'cta', headline: 'Escolha uma tarefa esta semana', readerTakeaway: 'Um passo pequeno, medido, vale mais que um plano grande.' }
];

describe('markup da gaveta do carrossel para inspeção', () => {
  it('escreve o HTML estático', async () => {
    if (!OUT) return;
    const { CarouselStudioClient } = await import('@/components/carrossel/CarouselStudioClient');

    const markup = renderToStaticMarkup(React.createElement(CarouselStudioClient, {
      brandId: 'b1',
      brand: { name: 'GenkaiLabs' },
      embedded: true,
      draft: {
        id: 'd1',
        editorial: {
          directions,
          brief: { selectedHeadlineId: 'headline-1', slides },
          selectedHeadlineId: 'headline-1',
          sources: []
        }
      }
    }));

    // Roteiro já no Studio: é o estado em que a gaveta vira consulta, com a
    // dica de foto de cada slide aberta.
    const script = [
      'CINCO ERROS AO USAR IA NO ESCRITÓRIO', 'A ferramenta nunca foi o problema.',
      'O time adota a ferramenta sem combinar quem revisa', 'Sem revisor, o erro chega ao cliente com a sua assinatura.',
      'Comece pela tarefa repetitiva que ninguém gosta', 'Meça quanto tempo ela consome hoje na equipe.',
      'Escolha uma tarefa esta semana', 'Um passo pequeno, medido, vale mais que um plano grande.'
    ].map((bloco, index) => `texto ${index + 1} - ${bloco}`).join('\n\n');
    const aplicado = renderToStaticMarkup(React.createElement(CarouselStudioClient, {
      brandId: 'b1',
      brand: { name: 'GenkaiLabs' },
      embedded: true,
      draft: { id: 'd2', editorial: { source: 'pasted-script', script, slideCount: 4, approvedAt: '2026-08-01T00:00:00.000Z' } }
    }));

    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'gaveta.html'), markup);
    fs.writeFileSync(path.join(OUT, 'gaveta-aplicada.html'), aplicado);
  });
});
