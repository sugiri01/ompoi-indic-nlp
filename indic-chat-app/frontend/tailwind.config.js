
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10a37f', // ChatGPT green-ish
        dark: '#343541',
        sidebar: '#202123',
        input: '#40414f',
        user: '#343541', // Message bg
        bot: '#444654', // Message bg
      }
    },
  },
  plugins: [],
}
