import { describe, expect, it } from 'vitest';
import {
  PHOTO_GROUPS, PHOTO_GROUP_IDS, photoOption,
  searchQuery, promptDirection, impliesPerson, directionCount
} from '@/lib/photo-direction';

describe('registro de direção de foto (PRD 02 §4)', () => {
  it('cobre os cinco grupos do PRD', () => {
    expect(PHOTO_GROUP_IDS).toEqual(['enquadramento', 'olhar', 'expressao', 'fundo', 'estilo']);
  });

  // Os dois vocabulários existem porque os destinos são diferentes: acervo
  // indexado em inglês e prompt de imagem. Faltar um quebra um dos caminhos
  // em silêncio.
  it('toda opção traz termo de busca e termo de prompt', () => {
    for (const group of PHOTO_GROUPS) {
      expect(group.options.length, group.id).toBeGreaterThan(1);
      for (const o of group.options) {
        expect(o.search, `${group.id}/${o.id}`).toBeTruthy();
        expect(o.prompt, `${group.id}/${o.id}`).toBeTruthy();
        expect(o.label, `${group.id}/${o.id}`).toBeTruthy();
      }
    }
  });

  it('não repete id de opção dentro do grupo', () => {
    for (const g of PHOTO_GROUPS) {
      expect(new Set(g.options.map((o) => o.id)).size, g.id).toBe(g.options.length);
    }
  });

  it('opção inexistente devolve null em vez de quebrar', () => {
    expect(photoOption('enquadramento', 'nao-existe')).toBeNull();
    expect(photoOption('nao-existe', 'close')).toBeNull();
  });
});

describe('consulta de busca', () => {
  it('põe o assunto na frente e os modificadores depois', () => {
    const q = searchQuery('padaria artesanal', { enquadramento: 'close', fundo: 'desfocado' });
    expect(q.startsWith('padaria artesanal')).toBe(true);
    expect(q).toContain('close up face portrait');
    expect(q).toContain('blurred background bokeh');
  });

  it('sem direção devolve só o assunto', () => {
    expect(searchQuery('padaria artesanal')).toBe('padaria artesanal');
  });

  it('grupo sem escolha não vira termo vazio', () => {
    const q = searchQuery('cafe', { enquadramento: '', olhar: null, estilo: 'editorial' });
    expect(q).toBe('cafe editorial magazine');
  });

  it('assunto vazio ainda produz consulta usável a partir da direção', () => {
    expect(searchQuery('', { estilo: 'moda' })).toBe('fashion');
    expect(searchQuery('')).toBe('');
  });
});

describe('direção para a imagem gerada', () => {
  it('junta os trechos escolhidos', () => {
    const d = promptDirection({ enquadramento: 'meio-corpo', expressao: 'alegre' });
    expect(d).toBe('waist-up framing, genuine smile');
  });

  it('sem escolha devolve vazio, para o prompt seguir sem sujeira', () => {
    expect(promptDirection({})).toBe('');
  });
});

describe('leitura da direção', () => {
  // Enquadramento, olhar e expressão só fazem sentido com gente na foto.
  it('reconhece quando a direção fala de pessoa', () => {
    expect(impliesPerson({ enquadramento: 'close' })).toBe(true);
    expect(impliesPerson({ expressao: 'neutra' })).toBe(true);
    expect(impliesPerson({ fundo: 'claro', estilo: 'moda' })).toBe(false);
    expect(impliesPerson({})).toBe(false);
  });

  it('conta quantas decisões foram tomadas', () => {
    expect(directionCount({})).toBe(0);
    expect(directionCount({ enquadramento: 'close', estilo: 'moda', fundo: 'invalido' })).toBe(2);
  });
});
