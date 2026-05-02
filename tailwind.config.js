/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tell Tailwind which files to scan for class names
  content: ['./App.{ts,tsx}', './src/**/*.{ts,tsx}'],

  // NativeWind v4 preset — required
  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        // App background
        background: '#0a0a0a',

        // Surface hierarchy (cards, panels)
        surface: {
          DEFAULT: '#111111',
          2: '#141414',
          3: '#1a1a1a',
          4: '#222222',
          5: '#2a2a2a',
        },

        // Primary accent — violet/purple
        brand: {
          DEFAULT: '#a78bfa',
          light: '#c4b5fd',
          muted: '#7c5fc4',
        },

        // Semantic text shades
        ink: {
          DEFAULT: '#ffffff',
          2: '#aaaaaa',
          3: '#888888',
          4: '#666666',
          5: '#555555',
          6: '#444444',
        },

        // Interaction feedback
        success: '#4ade80',
        danger: '#f87171',
      },

      borderRadius: {
        '4xl': '2rem',
      },

      fontSize: {
        '2xs': '10px',
      },
    },
  },

  plugins: [],
};
