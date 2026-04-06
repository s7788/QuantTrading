/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          bg: 'var(--color-bg)',
          card: 'var(--color-card)',
          sidebar: 'var(--color-sidebar)',
          hover: 'var(--color-hover)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        up: '#3fb950',
        down: '#f85149',
        accent: '#58a6ff',
        warn: '#d29922',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
