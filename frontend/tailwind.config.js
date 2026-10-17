/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandGreen: '#1A4D32',    // Deep Forest Green (Primary)
        brandMidGreen: '#2D6A4F',  // Medium Green (Accents)
        brandLightGreen: '#E8F5E9', // Very soft green (Page backgrounds)
        brandGrey: '#F9FAFB',     // Light grey (Card backgrounds)
        textDark: '#1F2937',      // Dark charcoal for text
      },
    },
  },
  plugins: [],
}
