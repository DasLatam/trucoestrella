// ----------------------------------------------------
// Archivo: frontend/tailwind.config.js
// Propósito: Le dice a Tailwind qué archivos de tu proyecto analizar.
// ----------------------------------------------------
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'truco-green': '#346751',
        'truco-brown': '#C87941',
        'dark-bg': '#111827',
        'light-bg': '#1f2937',
        'light-border': '#374151',
      }
    },
  },
  plugins: [],
}