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
        soft: '0 1px 3px rgb(var(--c-shadow) / 0.08), 0 8px 24px rgb(var(--c-shadow) / 0.12)',
        lift: '0 4px 14px rgb(var(--c-shadow) / 0.12), 0 28px 60px rgb(var(--c-shadow) / 0.22)',
        glow: '0 0 0 4px rgb(var(--c-accent) / 0.18)'
      },
      borderRadius: { lg: '16px', xl: '20px', '2xl': '24px', '3xl': '32px', '4xl': '40px' },
      fontFamily: {
        sans: [
          'DM Sans', 'Outfit', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text',
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
