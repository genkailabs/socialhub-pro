import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // 'server-only' é um marcador do Next (sem export). No Node de teste vira noop.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.js', import.meta.url))
    }
  },
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.js', 'tests/unit/**/*.test.jsx'] }
});
