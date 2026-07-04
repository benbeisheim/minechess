/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'darker-gray': '#242424',
        'darkest-gray': '#141414',
        'pearl': '#F5F5DC',
      },
      keyframes: {
        'walk-bounce': {
          '0%, 100%': { transform: 'translateX(calc(100cqi - 100%))' },
          '49.5%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(0) scaleX(-1)' },
          '99.5%': { transform: 'translateX(calc(100cqi - 100%)) scaleX(-1)' },
        },
      },
      animation: {
        'walk-bounce': 'walk-bounce 10s linear infinite',
      },
    },
  },
  plugins: [],
}