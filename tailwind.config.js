/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Los colores salen de variables CSS (src/index.css) para que el cambio de tema sea instantáneo.
      colors: {
        app: 'var(--bg-app)',
        side: 'var(--bg-side)',
        hover: 'var(--bg-hover)',
        line: 'var(--line)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
      },
    },
  },
  plugins: [],
};
