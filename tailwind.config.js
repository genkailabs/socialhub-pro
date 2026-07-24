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
        success: { DEFAULT: c('--c-success'), tint: c('--c-success-tint') },
        warning: { DEFAULT: c('--c-warning'), ink: c('--c-warning-ink') },
        danger: c('--c-danger'),
        info: c('--c-info')
      },
      boxShadow: {
        // Padrão Apple: superfícies chapadas com borda; sombra só onde há elevação real.
        soft: 'none',
        lift: '0 4px 16px -8px rgb(var(--c-shadow) / 0.18)',
        modal: '0 8px 30px rgb(var(--c-shadow) / 0.25)',
        canvas: '0 20px 60px rgb(var(--c-shadow) / 0.12)',
        glow: '0 0 0 4px rgb(var(--c-accent) / 0.18)'
      },
      // Escala do handoff: inputs/botões 9-11, cards 16-18, hero 18-20, modais 20.
      borderRadius: { lg: '10px', xl: '12px', '2xl': '16px', '3xl': '18px', '4xl': '20px' },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI',
          'Helvetica', 'Arial', 'sans-serif'
        ],
        display: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI',
          'Helvetica', 'Arial', 'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace']
      },
      transitionTimingFunction: { emphasized: 'cubic-bezier(.22,1,.36,1)' }
    }
  },
  plugins: []
};
