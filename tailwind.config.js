/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './data/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: '#F7F8FA',
        surface: '#FFFFFF',
        line: '#ECEEF2',
        ink: '#1F2430',
        muted: '#8B93A3',
        accent: { DEFAULT: '#6366F1', soft: '#A855F7', tint: '#EEF0FF' }
      },
      boxShadow: { soft: '0 1px 3px rgba(16,20,40,.08)' },
      borderRadius: { xl: '12px' },
      fontFamily: { sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] }
    }
  },
  plugins: []
};
