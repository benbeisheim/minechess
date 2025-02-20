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
        'walk-across': {
          '0%': { transform: 'translateX(100%)' }, // Start offscreen on the right
          '49.9%': { transform: 'translateX(-100vw) scaleX(1)' }, // Move left without flipping
          '50%': { transform: 'translateX(-100vw) scaleX(-1)' }, // Flip instantly at midpoint
          '100%': { transform: 'translateX(100%) scaleX(-1)' }, // Loop back to the right
          
        },
      },
      animation: {
        'walk-across': 'walk-across 14s linear infinite', // 10s looped animation
      },
    },
  },
  plugins: [],
}