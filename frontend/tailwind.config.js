/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandGreen: '#1A4D32',    // Deep Forest Green
        brandMidGreen: '#2D6A4F',  // Medium Green
        brandLightGreen: '#F0F7F4', // Very soft page background
        brandGrey: '#F9FAFB',     // Card background
        accentGreen: '#4CAF50',   // Bright green for success/progress
        textDark: '#1F2937',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
