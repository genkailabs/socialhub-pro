/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './data/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: c('--c-app'),
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
        warning: c('--c-warning'),
        danger: c('--c-danger'),
        info: c('--c-info')
      },
      boxShadow: {
        // Sombra do redesign: elevação sutil no light; no dark, só borda translúcida (sem sombra difusa)
        soft: '0 8px 24px -12px rgb(var(--c-shadow) / 0.08)',
        lift: '0 12px 32px -14px rgb(var(--c-shadow) / 0.12)',
        glow: '0 0 0 4px rgb(var(--c-accent) / 0.18)'
      },
      // Escala de raios corrigida (menos arredondado). Cards grandes 20, médios 16-18, pequenos 9-14.
      borderRadius: { lg: '12px', xl: '16px', '2xl': '18px', '3xl': '20px', '4xl': '24px' },
      fontFamily: {
        sans: [
          'Outfit', 'DM Sans', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text',
          'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'
        ],
        display: ['Outfit', 'DM Sans', 'Geist', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      transitionTimingFunction: { emphasized: 'cubic-bezier(.22,1,.36,1)' }
    }
  },
  plugins: []
};
