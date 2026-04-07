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
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f2c12a',  // FERCO yellow
          600: '#d4a500',  // hover
          700: '#b08f00',  // active/ring
          800: '#1a1a1a',  // FERCO black
          900: '#111111',
        },
      },
    },
  },
  plugins: [],
}
