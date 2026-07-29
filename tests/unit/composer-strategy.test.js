import { describe, expect, it } from 'vitest';
import {
  MODES, DEFAULT_MODE_ID, modeById,
  OBJECTIVES, objectiveById, goalForPrompt,
  PIECE_TYPES, pieceTypeById, pieceTypesForFormat,
  fieldsForPieceType, structuresForPieceType, ALL_FIELDS
} from '@/lib/composer-strategy';
import { structureIds } from '@/lib/layouts/structures';

describe('modos de criação (§3)', () => {
  it('tem os três modos e o padrão é Assistido', () => {
    expect(MODES.map((m) => m.id)).toEqual(['manual', 'assistido', 'automatico']);
    expect(DEFAULT_MODE_ID).toBe('assistido');
    expect(modeById(DEFAULT_MODE_ID).asksApproval).toBe(true);
  });

  it('modo desconhecido cai no padrão em vez de quebrar a tela', () => {
    expect(modeById('inexistente').id).toBe(DEFAULT_MODE_ID);
  });

  it('só o manual dispensa a IA', () => {
    expect(MODES.filter((m) => !m.usesAi).map((m) => m.id)).toEqual(['manual']);
  });
});

describe('objetivo do conteúdo (§4)', () => {
  it('tem os nove objetivos do PRD', () => {
    expect(OBJECTIVES).toHaveLength(9);
    expect(new Set(OBJECTIVES.map((o) => o.id)).size).toBe(9);
  });

  // A frase existe para entrar em `brief.goal`, que o buildContentPrompt já lê.
  it('todo objetivo tem frase de objetivo para o prompt', () => {
    for (const o of OBJECTIVES) {
      expect(o.goal, o.id).toBeTruthy();
      expect(goalForPrompt(o.id)).toBe(o.goal);
    }
  });

  it('sem objetivo devolve null para o prompt usar o padrão dele', () => {
    expect(goalForPrompt('')).toBeNull();
    expect(goalForPrompt('nao-existe')).toBeNull();
    expect(objectiveById('nao-existe')).toBeNull();
  });
});

describe('tipo de peça (§5)', () => {
  it('tem os onze tipos do PRD, sem id repetido', () => {
    expect(PIECE_TYPES).toHaveLength(11);
    expect(new Set(PIECE_TYPES.map((p) => p.id)).size).toBe(11);
  });

  // A regra que impede o registro de mentir: nenhum tipo pode apontar para uma
  // estrutura que o motor não sabe montar.
  it('toda estrutura citada existe no catálogo', () => {
    const existentes = new Set(structureIds());
    for (const piece of PIECE_TYPES) {
      for (const sid of piece.structures) {
        expect(existentes.has(sid), `${piece.id} → ${sid}`).toBe(true);
      }
    }
  });

  it('todo tipo aponta para um formato do Composer', () => {
    for (const p of PIECE_TYPES) {
      expect(['post', 'carrossel', 'story', 'reel'], p.id).toContain(p.format);
    }
  });

  it('agrupa os tipos por formato', () => {
    expect(pieceTypesForFormat('story').map((p) => p.id)).toEqual(['story']);
    expect(pieceTypesForFormat('carrossel').length).toBeGreaterThan(1);
  });

  // §6: não exigir campo que não faz sentido para o tipo.
  it('mostra só os campos do tipo, e todos quando não há tipo', () => {
    expect(fieldsForPieceType('lista')).toEqual(['title', 'bullets', 'cta']);
    expect(fieldsForPieceType('lista')).not.toContain('subtitle');
    expect(fieldsForPieceType('')).toEqual(ALL_FIELDS);
  });

  it('todo campo declarado é um campo que existe', () => {
    for (const p of PIECE_TYPES) {
      for (const f of p.fields) expect(ALL_FIELDS, `${p.id} → ${f}`).toContain(f);
    }
  });

  it('devolve as estruturas candidatas do tipo', () => {
    expect(structuresForPieceType('lista')).toEqual(['lista']);
    expect(structuresForPieceType('nao-existe')).toEqual([]);
  });

  // Tipo sem estrutura própria é honesto sobre isso em vez de fingir.
  it('registra a lacuna quando o tipo ainda não tem estrutura propria', () => {
    expect(pieceTypeById('anuncio').missing).toBeTruthy();
    expect(pieceTypeById('tutorial').missing).toBeTruthy();
    expect(pieceTypeById('lista').missing).toBeUndefined();
  });
});
