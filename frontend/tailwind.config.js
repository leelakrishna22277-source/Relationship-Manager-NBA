/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Classic Institutional Wealth Management Banking Palette
        'color-1': '#0F172A', // Slate 900 - Executive primary typography
        'color-2': '#0A3B66', // Institutional Sapphire Navy - Brand primary
        'color-3': '#082C4D', // Deep Navy hover
        'color-4': '#EFF6FF', // Slate/Blue subtle highlight tint
        'color-5': '#E2E8F0', // Slate 200 - Clean institutional border
        'color-6': '#F8FAFC', // Slate 50 - Inputs, table headers, subcontainers
        'color-7': '#FFFFFF', // Pure White - Card and panel surfaces
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'radius-sm': '0.375rem',
        'radius-md': '0.5rem',
        'radius-lg': '0.75rem',
        'radius-xl': '1rem',
      },
      spacing: {
        'space-1': '0.25rem',
        'space-1.5': '0.375rem',
        'space-2': '0.5rem',
        'space-2.5': '0.625rem',
        'space-3': '0.75rem',
        'space-4': '1rem',
        'space-5': '1.25rem',
        'space-6': '1.5rem',
        'space-8': '2rem',
        'space-12': '3rem',
      },
      fontSize: {
        'text-xs': ['0.75rem', { lineHeight: '1rem' }],
        'text-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'text-base': ['1rem', { lineHeight: '1.5rem' }],
        'text-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'text-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'text-2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
    },
  },
  plugins: [],
};
