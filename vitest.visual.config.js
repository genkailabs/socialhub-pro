import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Config separada do `npm test` de propósito: estas "provas" rasterizam PNG de
// verdade (next/og), demoram e escrevem arquivo. O que elas produzem não é um
// veredito automático — é a arte para um humano OLHAR.
//
// Existe porque teste unitário aprova a regra (contraste calculado, hierarquia
// na escala) e não aprova a peça: texto cortado, desalinhamento e proporção
// quebrada só aparecem depois de rasterizar.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.js', import.meta.url))
    }
  },
  test: { environment: 'node', include: ['tests/visual/**/*.test.js'], testTimeout: 180000 }
});
