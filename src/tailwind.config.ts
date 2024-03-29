import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#D53636',
        'secondary-1': '#C9EDF3',
        'secondary-2': '#FFD2CC',
        'neutral-dark': '#27284E',
        'neutral-light': '#FFFFFF',
      },
      fontFamily: {
        'overpass': ['Overpass', 'sans-serif'],
        'rubik': ['Rubik', 'sans-serif'],
      }
    },
  },
  plugins: [],
} satisfies Config

