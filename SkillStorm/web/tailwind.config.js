/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      colors: {
        pastel: {
          pink: '#FFE0F0',
          mint: '#D0F5E8',
          lavender: '#E8E0FF',
          sky: '#D8F0FF',
          peach: '#FFE8D8',
          lemon: '#FFF8D0',
        },
        brand: {
          primary: '#6C5CE7',
          secondary: '#00CEC9',
          accent: '#FD79A8',
          warm: '#FDCB6E',
        },
      },
    },
  },
  plugins: [],
};
