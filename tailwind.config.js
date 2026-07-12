/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './data/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: c('--c-app'),
        surface: { DEFAULT: c('--c-surface'), 2: c('--c-surface-2') },
        line: { DEFAULT: c('--c-line'), strong: c('--c-line-strong') },
        ink: c('--c-ink'),
        muted: c('--c-muted'),
        faint: c('--c-faint'),
        accent: {
          DEFAULT: c('--c-accent'),
          soft: c('--c-accent-soft'),
          tint: c('--c-accent-tint'),
          ink: c('--c-accent-ink')
        },
        success: c('--c-success'),
        warning: c('--c-warning'),
        danger: c('--c-danger'),
        info: c('--c-info')
      },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--c-shadow) / 0.05), 0 4px 14px rgb(var(--c-shadow) / 0.06)',
        lift: '0 2px 4px rgb(var(--c-shadow) / 0.06), 0 12px 32px rgb(var(--c-shadow) / 0.10)',
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.20), 0 8px 28px rgb(var(--c-accent) / 0.18)'
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      transitionTimingFunction: { emphasized: 'cubic-bezier(.22,1,.36,1)' }
    }
  },
  plugins: []
};
