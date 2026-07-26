import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { MARKETING_GRAPH_VERSION } from '@/lib/meta/marketing-api';

describe('cliente Meta Marketing API', () => {
  it('centraliza a versao da Graph API', () => {
    expect(MARKETING_GRAPH_VERSION).toMatch(/^v\d+\.\d+$/);
  });

  it('nao coloca access token na URL da requisicao', () => {
    const source = fs.readFileSync('lib/meta/marketing-api.js', 'utf8');
    expect(source).not.toContain("query.set('access_token'");
    expect(source).toContain('Authorization: `Bearer ${token}`');
  });
});
