/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#08090C',
          900: '#0D0F14',
          850: '#12151C',
          800: '#171B24',
          750: '#1E232E',
          700: '#252C3A',
          600: '#323B4E',
        },
        primary: {
          50: '#F0FDF9',
          100: '#CCFBEF',
          200: '#99F6E0',
          300: '#5EEAD4',
          400: '#39C6A4', // Exact Logo Color
          500: '#20B391',
          600: '#0E8A6E', // High-contrast, rich deep teal for white text (WCAG AA > 4.5:1)
          700: '#0B7059',
          800: '#095947',
          900: '#074537',
          950: '#032B22',
        },
        accent: {
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          violet: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Open Sans', 'Segoe UI', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        persian: ['Vazirmatn', 'Vazir', 'Tahoma', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 25px -4px rgba(57, 198, 164, 0.38)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
