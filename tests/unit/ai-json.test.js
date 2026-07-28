import { describe, expect, it } from 'vitest';
import { jsonFromModelOutput } from '@/lib/ai/json';
import { parseSpec } from '@/lib/ai/spec';
import { normalizeDnaResult } from '@/lib/ai/dna/normalize';

// Existiam três extratores de JSON com resiliências diferentes. O mais fraco
// era o do Brand DNA, e foi ele que quebrou em produção. Estes testes fixam o
// comportamento único: os três caminhos aceitam exatamente as mesmas variações.
describe('jsonFromModelOutput', () => {
  it('aceita JSON puro', () => {
    expect(jsonFromModelOutput('{"a":1}')).toEqual({ a: 1 });
  });

  it('tira a cerca de markdown, com e sem a linguagem', () => {
    expect(jsonFromModelOutput('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(jsonFromModelOutput('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('conserta aspas tipográficas e vírgula sobrando', () => {
    expect(jsonFromModelOutput('{“a”:1,}')).toEqual({ a: 1 });
  });

  it('recorta o objeto quando vem cercado de conversa', () => {
    expect(jsonFromModelOutput('Claro! Aqui está:\n{"a":1}\nQualquer coisa é só pedir.')).toEqual({ a: 1 });
  });

  it('devolve o objeto quando já veio objeto', () => {
    const obj = { a: 1 };
    expect(jsonFromModelOutput(obj)).toBe(obj);
  });

  it('lança quando não há nada aproveitável', () => {
    expect(() => jsonFromModelOutput('não é json')).toThrow();
    expect(() => jsonFromModelOutput('')).toThrow();
    expect(() => jsonFromModelOutput(null)).toThrow();
  });
});

describe('os três caminhos compartilham a mesma tolerância', () => {
  const sujo = 'Claro! Aqui vai:\n```json\n{"headline":"Oi","dna":{},"report":{},}\n```';

  it('o Composer aceita', () => {
    expect(parseSpec(sujo).headline).toBe('Oi');
  });

  it('o Brand DNA aceita — antes morria aqui', () => {
    expect(() => normalizeDnaResult(sujo, { hasIg: false })).not.toThrow();
  });
});
