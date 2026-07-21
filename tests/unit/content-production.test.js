import { describe, expect, it } from 'vitest';
import {
  templateForFormat, rendersArtwork, initialStatus, statusAfterApproval,
  statusAfterReview, reviewableContent, contentTitle, contentBody, artworkCount
} from '@/lib/content-production';
import { statusMeta } from '@/lib/calendar';

describe('formato x template', () => {
  // Eixos diferentes: formato e o container, template e o tratamento visual.
  it('imagem e carrossel tem template de render', () => {
    expect(templateForFormat('image')).toBe('news');
    expect(templateForFormat('carousel')).toBe('tips_carousel');
  });

  it('reel e stories nao rendem arte: sao roteiro', () => {
    expect(templateForFormat('reel')).toBeNull();
    expect(rendersArtwork('reel')).toBe(false);
    expect(rendersArtwork('stories')).toBe(false);
  });

  it('formato desconhecido nao inventa template', () => {
    expect(templateForFormat('tiktok')).toBeNull();
  });
});

describe('estados', () => {
  it('conteudo novo sempre passa por aprovacao', () => {
    expect(initialStatus()).toBe('waiting_approval');
  });

  // §5.1 virando comportamento.
  it('publicavel aprovado vai para agendamento', () => {
    expect(statusAfterApproval('image')).toBe('scheduled');
    expect(statusAfterApproval('carousel')).toBe('scheduled');
  });

  it('reel e stories aprovados vao para o usuario postar', () => {
    expect(statusAfterApproval('reel')).toBe('ready_to_post');
    expect(statusAfterApproval('stories')).toBe('ready_to_post');
  });

  it('bloqueado pela revisao volta para rascunho, nao para aprovacao', () => {
    expect(statusAfterReview({ decision: 'bloqueado' })).toBe('draft');
  });

  it('atencao ainda segue para aprovacao: quem decide e o usuario', () => {
    expect(statusAfterReview({ decision: 'atencao' })).toBe('waiting_approval');
    expect(statusAfterReview({ decision: 'aprovado' })).toBe('waiting_approval');
  });

  it('sem revisao nao trava o fluxo', () => {
    expect(statusAfterReview(null)).toBe('waiting_approval');
  });

  // O rotulo nao pode sugerir que o sistema publicou o que a pessoa postou.
  it('os estados novos tem rotulo honesto no calendario', () => {
    expect(statusMeta('ready_to_post').label).toContain('você postar');
    expect(statusMeta('posted_manually').label).toBe('Você postou');
  });
});

describe('reviewableContent', () => {
  it('extrai o texto de um post', () => {
    const r = reviewableContent('image', { hook: 'Oi', caption: 'Legenda', cta: 'Salve', hashtags: ['#a'] });

    expect(r).toMatchObject({ hook: 'Oi', caption: 'Legenda', cta: 'Salve', hashtags: ['#a'] });
  });

  it('achata os slides do carrossel', () => {
    const r = reviewableContent('carousel', { slides: [{ title: 'Capa', body: 'Texto' }] });

    expect(r.slides).toEqual(['Capa — Texto']);
  });

  // A revisao le palavras: nao importa se vieram de card ou de cena.
  it('achata os cards de stories', () => {
    const r = reviewableContent('stories', {
      cards: [
        { type: 'abertura', screenText: 'Oi', cta: null },
        { type: 'cta_final', screenText: 'Me chame', cta: 'Agende' }
      ]
    });

    expect(r.hook).toBe('Oi');
    expect(r.slides).toEqual(['[abertura] Oi', '[cta_final] Me chame']);
    expect(r.cta).toBe('Agende');
  });

  it('achata as cenas do reel', () => {
    const r = reviewableContent('reel', {
      spokenHook: 'Voce sabe?', caption: 'Legenda', cta: 'Me chame',
      scenes: [{ speech: 'Falo isso', screenText: 'Texto' }]
    });

    expect(r.hook).toBe('Voce sabe?');
    expect(r.slides).toEqual(['Falo isso Texto']);
  });

  it('aguenta producao vazia', () => {
    expect(reviewableContent('image', null)).toMatchObject({ hook: '', caption: '' });
  });
});

describe('titulo e corpo', () => {
  it('post usa o hook como titulo', () => {
    expect(contentTitle('image', { hook: 'Cinco sinais' })).toBe('Cinco sinais');
  });

  it('reel usa o hook falado', () => {
    expect(contentTitle('reel', { spokenHook: 'Voce sabe?' })).toBe('Voce sabe?');
  });

  it('stories usa o objetivo da sequencia', () => {
    expect(contentTitle('stories', { objective: 'Educar sobre ansiedade' })).toBe('Educar sobre ansiedade');
  });

  it('corta titulo longo', () => {
    expect(contentTitle('image', { hook: 'x'.repeat(100) })).toHaveLength(60);
  });

  it('cai no fallback quando nao ha nada', () => {
    expect(contentTitle('image', {}, 'Sem titulo')).toBe('Sem titulo');
  });

  it('junta legenda e hashtags no corpo', () => {
    expect(contentBody('image', { caption: 'Oi', hashtags: ['#a'] })).toContain('#a');
  });

  // Stories nao tem legenda: o texto vive nos cards.
  it('stories guarda o objetivo em vez de legenda', () => {
    expect(contentBody('stories', { objective: 'Educar', cards: [] })).toBe('Educar');
  });
});

describe('artworkCount', () => {
  it('imagem rende uma arte', () => {
    expect(artworkCount('image', {})).toBe(1);
  });

  it('carrossel rende uma arte por slide', () => {
    expect(artworkCount('carousel', { slides: [{}, {}, {}] })).toBe(3);
  });

  it('reel e stories nao rendem arte', () => {
    expect(artworkCount('reel', {})).toBe(0);
    expect(artworkCount('stories', {})).toBe(0);
  });
});
