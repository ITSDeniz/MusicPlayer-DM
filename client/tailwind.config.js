/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        denzo: {
          dark: '#000000',       // Absolute pitch black base
          surface: '#09090b',    // Slightly elevated background
          card: '#121214',       // Card & item container surface
          border: '#27272a',     // Subtle border
          muted: '#71717a',      // Inactive/secondary text
          light: '#f4f4f5',      // Bright primary text
          pink: '#ec4899',       // Primary neon pink
          rose: '#f43f5e',       // Transition rose
          red: '#ef4444',        // Primary vibrant red
        },
      },
      backgroundImage: {
        'denzo-gradient': 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #ef4444 100%)',
        'denzo-gradient-hover': 'linear-gradient(135deg, #f472b6 0%, #fb7185 50%, #f87171 100%)',
      },
      boxShadow: {
        'denzo-glow': '0 0 25px -4px rgba(244, 63, 94, 0.45)',
        'denzo-glow-sm': '0 0 12px -2px rgba(236, 72, 153, 0.35)',
      },
    },
  },
  plugins: [],
};
