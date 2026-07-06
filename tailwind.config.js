/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F26526",
          light: "#F5834D",
          dark: "#D4490E",
        },
        secondary: {
          DEFAULT: "#1A73E8",
          light: "#4285F4",
          dark: "#1557B0",
        },
        accent: {
          DEFAULT: "#1F2937",
          light: "#374151",
          dark: "#111827",
        },
        background: {
          light: "#F9FAFB",
          dark: "#0F172A",
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
