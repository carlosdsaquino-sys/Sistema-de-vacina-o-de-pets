/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        // Verde oficial do VetFarm
        emerald: {
          50: '#F3FAEE',
          100: '#E4F4D8',
          200: '#C9EAB4',
          300: '#A5DA87',
          400: '#7AC557',
          500: '#65B52D',

          // PRINCIPAL
          600: '#569E1E',

          700: '#478719',
          800: '#386B17',
          900: '#294817',
          950: '#13280A',
        },

        // Também deixamos disponível como primary
        primary: {
          50: '#F3FAEE',
          100: '#E4F4D8',
          200: '#C9EAB4',
          300: '#A5DA87',
          400: '#7AC557',
          500: '#65B52D',
          600: '#569E1E',
          700: '#478719',
          800: '#386B17',
          900: '#294817',
          950: '#13280A',
        },
      },

      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },

      keyframes: {
        shimmer: {
          '0%': {
            'background-position': '200% 0',
          },
          '100%': {
            'background-position': '-200% 0',
          },
        },

        fadeIn: {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },

        slideUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },

        slideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
      },
    },
  },

  plugins: [],
};