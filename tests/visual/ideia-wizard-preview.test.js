import { describe, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { IdeiaWizard } from '@/components/carrossel/IdeiaWizard';

// Mesma ideia das amostras de arte: teste unitário aprova a regra (o passo
// certo aparece, o botão trava sem assunto) e não aprova a TELA — hierarquia,
// aperto dentro dos 380px da gaveta e cartão de assunto ilegível só aparecem
// quando alguém olha. Esta prova escreve a página; o veredito é humano.
const OUT = fileURLToPath(new URL('./output/ideia-wizard-preview.html', import.meta.url));
const CSS_DIR = fileURLToPath(new URL('../../.next/static/css', import.meta.url));

const marca = { name: 'GenkaiLabs' };

const ASSUNTOS = [
  {
    id: 'casamento-jogador',
    titulo: 'Casamento de jogador domina as redes por três dias seguidos',
    resumo: 'A transmissão feita pelos convidados rendeu mais alcance que a cobertura oficial do evento.',
    angulo: 'Por que um acontecimento pessoal segura mais atenção que um anúncio produzido.',
    relacaoComNicho: 'O público da barbearia acompanhou a transmissão e comentou o visual dos noivos.',
    confirmado: true,
    fontes: [{ id: 'source-1', title: 'A repercussão do casamento', url: 'https://exemplo.com/a', publisher: 'Portal Exemplo', publishedAt: '2026-07-30', data: '30/07/2026' }]
  },
  {
    id: 'corte-viral',
    titulo: 'Corte de cabelo de personagem de série vira pedido em salão',
    resumo: 'Depois do último episódio, o corte apareceu em vídeos de rotina de barbearia no país inteiro.',
    angulo: 'O que a demanda repentina ensina sobre acompanhar a cultura pop no atendimento.',
    relacaoComNicho: 'É o serviço que a marca já executa, agora com nome que o cliente reconhece.',
    confirmado: false,
    fontes: [{ id: 'source-2', title: 'A febre do corte', url: 'https://exemplo.com/b', publisher: 'Revista Estilo', publishedAt: '', data: '' }]
  }
];

function estado(extra = {}) {
  return {
    brand: marca,
    etapa: 'tipo',
    onEtapa: () => {},
    contentType: 'analise-tendencia',
    onContentType: () => {},
    entryMode: 'ai',
    onEntryMode: () => {},
    modo: 'buscar',
    onModo: () => {},
    topic: '',
    onTopic: () => {},
    sourceMaterial: '',
    onSourceMaterial: () => {},
    material: '',
    onMaterial: () => {},
    assuntos: null,
    assuntosBusy: false,
    assuntosErro: '',
    assuntoEscolhidoId: null,
    onBuscarAssuntos: () => {},
    onUsarAssunto: () => {},
    onGerarPromessas: () => {},
    pastedScript: '',
    onPastedScript: () => {},
    pastedPreview: null,
    onAplicarColado: () => {},
    briefBusy: false,
    busy: false,
    ...extra
  };
}

const CENAS = [
  ['Passo 1 · tipo de carrossel', estado()],
  ['Passo 2 · buscar tendência (com resultado)', estado({
    etapa: 'assunto',
    assuntos: ASSUNTOS,
    assuntoEscolhidoId: 'casamento-jogador',
    topic: 'Casamento de jogador domina as redes por três dias seguidos'
  })],
  ['Passo 2 · fonte própria', estado({ etapa: 'assunto', modo: 'fonte', material: 'https://exemplo.com/materia' })],
  // Falha de busca zera a lista (o cliente faz setAssuntos(null)): o recado é
  // um só, ao lado do botão que a pessoa acabou de apertar.
  ['Passo 2 · busca sem fonte', estado({
    etapa: 'assunto',
    assuntosErro: 'A pesquisa não encontrou fontes verificáveis agora. Nenhum assunto foi inventado.'
  })],
  ['Roteiro colado', estado({ entryMode: 'paste', pastedScript: 'texto 1 - CAPA', pastedPreview: { ok: false, error: 'São necessários pelo menos 6 campos (3 slides).' } })]
];

describe('amostra visual da etapa Ideia', () => {
  it('escreve a página com os passos lado a lado', () => {
    // O CSS é o do build: as classes daqui (bg-surface, text-ink, accent-tint)
    // são tokens do projeto e não existem fora dele.
    let css = '';
    try {
      css = readdirSync(CSS_DIR)
        .filter((nome) => nome.endsWith('.css'))
        .map((nome) => readFileSync(`${CSS_DIR}/${nome}`, 'utf8'))
        .join('\n');
    } catch {
      css = '/* rode `npm run build` antes para a amostra sair com o CSS real */';
    }

    const cenas = CENAS.map(([titulo, props]) => `
      <figure class="cena">
        <figcaption>${titulo}</figcaption>
        <div class="gaveta">${renderToStaticMarkup(createElement(IdeiaWizard, props))}</div>
      </figure>`).join('\n');

    const html = `<!doctype html>
<html lang="pt-BR" data-theme="light">
<head><meta charset="utf-8" /><title>Etapa Ideia — amostra</title><style>${css}</style>
<style>
  body { margin: 0; padding: 24px; background: #e9e9ee; font-family: system-ui, sans-serif; }
  .grade { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
  .cena { margin: 0; }
  figcaption { font: 600 12px/1.4 system-ui; color: #333; margin-bottom: 8px; }
  /* A gaveta real tem 380px. Medir em outra largura mediria outra tela. */
  .gaveta { width: 380px; padding: 12px; background: var(--surface, #fff); border: 1px solid #d8d8de; border-radius: 12px; }
</style></head>
<body><div class="grade">${cenas}</div></body>
</html>`;

    mkdirSync(fileURLToPath(new URL('./output/', import.meta.url)), { recursive: true });
    writeFileSync(OUT, html, 'utf8');
  });
});
