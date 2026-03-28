/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        polyglan: {
          primary: '#F4A900', // Mustard Yellow
          secondary: '#C1666B', // Terracotta
          beige: {
            light: '#EDE0D0', // Light Beige
            DEFAULT: '#D4B896', // Warm Beige
          },
          brown: {
            DEFAULT: '#000000', // Chocolate Brown 
            dark: '#2C2420', // Dark Brown
          },
          cream: '#FAF5EE', // Cream
          muted: '#8C7B72', // Text Secondary
        }
      },
      fontFamily: {
        sans: ['Nunito', 'DM Sans', 'sans-serif'],
        display: ['DM Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
