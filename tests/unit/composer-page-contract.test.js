import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Composer sem sobreposição flutuante', () => {
  it('não renderiza o assistente sobre o editor e as miniaturas', () => {
    const source = readFileSync(resolve('app/(app)/composer/page.jsx'), 'utf8');

    expect(source).not.toContain('MascotTip');
  });
});
