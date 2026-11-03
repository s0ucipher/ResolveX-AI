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
        // Dark Mode Palette
        dark: {
          bg: '#080B18',
          secondary: '#0F1530',
          elevated: '#151D38',
          card: '#171F3B',
          text: '#F8FAFC',
          secondaryText: '#B6C2D9',
          muted: '#8493B0',
          violet: '#8B5CF6',
          purple: '#A78BFA',
          blue: '#60A5FA',
          cyan: '#22D3EE',
          mint: '#34D399',
          coral: '#FB7185',
          amber: '#FBBF24',
        },
        // Light Mode Palette
        light: {
          bg: '#F4F2FF',
          secondary: '#EEF5FF',
          lavender: '#F0E9FF',
          paleBlue: '#E7F4FF',
          pink: '#FFF0F5',
          mint: '#E8FFF5',
          peach: '#FFF4E8',
          card: '#FFFFFF',
          text: '#172033',
          secondaryText: '#475569',
          muted: '#64748B',
          violet: '#7C3AED',
          purple: '#8B5CF6',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          mintAccent: '#10B981',
          coral: '#F43F5E',
          amber: '#F59E0B',
        },
        // Core Accent Aliases
        primaryViolet: '#7C3AED',
        electricPurple: '#8B5CF6',
        brightBlue: '#3B82F6',
        cyanAccent: '#06B6D4',
        tealAccent: '#14B8A6',
        coralAccent: '#FB7185',
        mintGreen: '#10B981',
        amberAccent: '#F59E0B',
      },
      boxShadow: {
        'glossy-light': '0 10px 30px -5px rgba(124, 58, 237, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glossy-dark': '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 20px 2px rgba(139, 92, 246, 0.15)',
        'neon-violet': '0 0 25px -3px rgba(139, 92, 246, 0.45)',
        'neon-cyan': '0 0 25px -3px rgba(34, 211, 238, 0.45)',
        'neon-coral': '0 0 25px -3px rgba(251, 113, 133, 0.45)',
        'neon-amber': '0 0 25px -3px rgba(251, 191, 36, 0.45)',
        'neon-mint': '0 0 25px -3px rgba(52, 211, 153, 0.45)',
        'card-light': '0 2px 10px -2px rgba(124, 58, 237, 0.06), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 5s ease-in-out infinite',
        'float-reverse': 'floatReverse 6s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(6px)' },
        }
      }
    },
  },
  plugins: [],
}
