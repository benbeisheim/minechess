/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'darker-gray': '#1a1a1a',
        'darkest-gray': '#141414',  
      },
    },
  },
  plugins: [],
}
