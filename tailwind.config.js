/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './data/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: c('--c-app'),
        panel: c('--c-panel'),
        surface: { DEFAULT: c('--c-surface'), 2: c('--c-surface-2'), 3: c('--c-surface-3') },
        line: { DEFAULT: c('--c-line'), strong: c('--c-line-strong') },
        ink: { DEFAULT: c('--c-ink'), 2: c('--c-ink-2') },
        muted: c('--c-muted'),
        faint: c('--c-faint'),
        accent: {
          DEFAULT: c('--c-accent'),
          soft: c('--c-accent-soft'),
          tint: c('--c-accent-tint'),
          ink: c('--c-accent-ink')
        },
        // Papéis do Aurora Grid: ciano é descoberta, lima é aprovação.
        cyan: { DEFAULT: c('--c-cyan'), tint: c('--c-cyan-tint'), ink: c('--c-cyan-ink') },
        lime: c('--c-lime'),
        success: { DEFAULT: c('--c-success'), tint: c('--c-success-tint') },
        warning: { DEFAULT: c('--c-warning'), ink: c('--c-warning-ink') },
        danger: c('--c-danger'),
        info: c('--c-info')
      },
      boxShadow: {
        // Superfícies chapadas com borda; sombra só onde há elevação real. No
        // Aurora a sombra puxa o azul do fundo (--c-shadow), não preto puro.
        soft: 'none',
        lift: '0 4px 16px -8px rgb(var(--c-shadow) / 0.22)',
        modal: '0 8px 30px rgb(var(--c-shadow) / 0.30)',
        canvas: '0 20px 60px rgb(var(--c-shadow) / 0.16)',
        glow: '0 0 0 4px rgb(var(--c-accent) / 0.18)',
        // Halo luminoso do hero e dos cards de criação. Usar com parcimônia:
        // se tudo brilha, nada brilha.
        aurora: '0 18px 48px -24px rgb(var(--c-accent) / 0.55)'
      },
      // Escala do DESIGN-SYSTEM: campos/botões 9-12, cards médios 16, cards
      // grandes 24. `3xl` é o raio dos painéis do redesign.
      borderRadius: { lg: '10px', xl: '12px', '2xl': '16px', '3xl': '24px', '4xl': '28px' },
      fontFamily: {
        sans: [
          'var(--font-ui)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
          'Helvetica', 'Arial', 'sans-serif'
        ],
        display: [
          'var(--font-ui)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
          'Helvetica', 'Arial', 'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace']
      },
      transitionTimingFunction: { emphasized: 'cubic-bezier(.22,1,.36,1)' }
    }
  },
  plugins: []
};
