import { describe, expect, it } from 'vitest';
import {
  artSizeForFormat, rendersArtwork, initialStatus, statusAfterApproval,
  statusAfterReview, reviewableContent, contentTitle, contentBody, artworkCount,
  artContentFor, mediaTypeFor
} from '@/lib/content-production';
import { statusMeta } from '@/lib/calendar';

describe('formato x tamanho da arte', () => {
  it('post e carrossel sao quadrados', () => {
    expect(artSizeForFormat('image')).toBe('square');
    expect(artSizeForFormat('carousel')).toBe('square');
  });

  // MVP V2: Story e arte estatica vertical, pelo mesmo pipeline.
  it('story e vertical', () => {
    expect(artSizeForFormat('stories')).toBe('story');
    expect(rendersArtwork('stories')).toBe(true);
  });

  it('reel nao rende arte: e o unico que sobrou como roteiro', () => {
    expect(artSizeForFormat('reel')).toBeNull();
    expect(rendersArtwork('reel')).toBe(false);
  });

  it('formato desconhecido nao inventa tamanho', () => {
    expect(artSizeForFormat('tiktok')).toBeNull();
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

  it('story aprovado vai para agendamento como qualquer publicavel', () => {
    expect(statusAfterApproval('stories')).toBe('scheduled');
  });

  it('reel aprovado vai para o usuario postar', () => {
    expect(statusAfterApproval('reel')).toBe('ready_to_post');
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
        { type: 'abertura', title: 'Oi', support: '', cta: null },
        { type: 'cta_final', title: 'Me chame', support: 'Respondo hoje', cta: 'Agende' }
      ]
    });

    expect(r.hook).toBe('Oi');
    expect(r.slides).toEqual(['[abertura] Oi', '[cta_final] Me chame — Respondo hoje']);
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

  it('story rende uma arte por card', () => {
    expect(artworkCount('stories', { cards: [{}, {}, {}, {}] })).toBe(4);
  });

  it('reel nao rende arte', () => {
    expect(artworkCount('reel', {})).toBe(0);
  });
});

describe('artContentFor', () => {
  const seq = {
    cards: [
      { order: 1, type: 'abertura', title: 'Voce dorme mal?', support: '', cta: null },
      { order: 2, type: 'educativo', title: 'O sono tem fases', support: 'Cada uma cuida de uma coisa. Pular uma cobra depois.', cta: null },
      { order: 3, type: 'cta_final', title: 'Vamos conversar', support: '', cta: 'Chame no direct' }
    ]
  };

  it('cada card vira o texto de uma arte, na ordem', () => {
    const c = artContentFor('stories', seq, 1, 'marca');

    expect(c.title).toBe('O sono tem fases');
    expect(c.subtitle).toContain('Cada uma cuida');
    expect(c.brand).toBe('marca');
  });

  // Quem entra no meio da sequencia precisa saber onde esta.
  it('marca a posicao na sequencia', () => {
    expect(artContentFor('stories', seq, 0).eyebrow).toBe('1/3');
    expect(artContentFor('stories', seq, 2).eyebrow).toBe('3/3');
  });

  it('so o ultimo card leva o CTA que a skill escreveu', () => {
    expect(artContentFor('stories', seq, 0).cta).toBe('');
    expect(artContentFor('stories', seq, 2).cta).toBe('Chame no direct');
  });

  it('card inexistente nao inventa texto', () => {
    expect(artContentFor('stories', seq, 9).title).toBe('');
  });

  // A legenda inteira na arte e o erro classico: cabe no Instagram, nao na peca.
  it('post usa o gancho e so a primeira frase da legenda', () => {
    const c = artContentFor('image', { hook: 'Cinco sinais', caption: 'Primeira frase. Segunda frase que nao cabe.', cta: 'Salve' });

    expect(c.title).toBe('Cinco sinais');
    expect(c.subtitle).toBe('Primeira frase.');
  });

  it('carrossel repete o CTA so na ultima tela', () => {
    const carrossel = { slides: [{ title: 'Um', body: 'a' }, { title: 'Dois', body: 'b' }], cta: 'Salve' };

    expect(artContentFor('carousel', carrossel, 0).cta).toBe('');
    expect(artContentFor('carousel', carrossel, 1).cta).toBe('Salve');
  });
});

describe('mediaTypeFor', () => {
  it('story nao e carrossel: sobe uma arte por vez', () => {
    expect(mediaTypeFor('stories', ['a', 'b', 'c'])).toBe('story');
  });

  it('varias artes de feed sao carrossel', () => {
    expect(mediaTypeFor('carousel', ['a', 'b'])).toBe('carousel');
    expect(mediaTypeFor('image', ['a'])).toBe('image');
  });

  it('sem arte nao ha tipo de midia', () => {
    expect(mediaTypeFor('image', [])).toBeNull();
  });
});
