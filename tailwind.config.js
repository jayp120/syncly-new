/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./index.html",
    "./*.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
    "./contexts/**/*.{js,ts,tsx}",
    "./hooks/**/*.{js,ts,tsx}",
    "./services/**/*.{js,ts,tsx}",
    "./utils/**/*.{js,ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Plus Jakarta Sans", "Inter", "sans-serif"] },
      colors: {
        primary: '#3b82f6', // blue-500
        'primary-hover': '#2563eb', // blue-600
        'primary-light': 'rgba(59, 130, 246, 0.1)',
        secondary: '#8b5cf6', // violet-500
        'secondary-hover': '#7c3aed', // violet-600
        accent: '#22d3ee', // cyan-400
        'accent-hover': '#06b6d4', // cyan-500
        
        // Refined Semantic Palette
        'surface-primary': 'rgba(255, 255, 255, 0.6)',
        'surface-secondary': 'rgba(241, 245, 249, 0.7)', // slate-100
        'surface-inset': 'rgba(226, 232, 240, 0.5)', // slate-200
        'surface-hover': 'rgba(226, 232, 240, 0.9)', // slate-200
        'text-primary': '#0f172a', // slate-900
        'text-secondary': '#475569', // slate-600
        'border-primary': 'rgba(203, 213, 225, 0.6)', // slate-300
        
        'dark-bg': '#0f172a', // slate-900
        'dark-surface-primary': 'rgba(30, 41, 59, 0.6)', // slate-800
        'dark-surface-secondary': 'rgba(51, 65, 85, 0.7)', // slate-700
        'dark-surface-inset': 'rgba(51, 65, 85, 0.4)', // slate-700
        'dark-surface-hover': 'rgba(51, 65, 85, 0.8)', // slate-700
        'dark-text': '#f1f5f9', // slate-100
        'dark-text-primary': '#f8fafc', // slate-50
        'dark-text-secondary': '#94a3b8', // slate-400
        'dark-border': 'rgba(51, 65, 85, 0.8)', // slate-700
      },
      animation: {
        'gradient-pan': 'gradient-pan 25s ease infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'orb-pulse': 'orb-pulse 8s infinite',
        'glare-anim': 'glare-anim 5s infinite linear',
        'input-glow': 'input-glow 1.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in-up': {
            'from': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
            'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'orb-pulse': {
          '0%, 100%': { boxShadow: '0 0 40px -10px #3b82f6, 0 0 20px -10px #3b82f6' },
          '50%': { boxShadow: '0 0 60px 0px #8b5cf6, 0 0 30px -5px #8b5cf6' },
        },
        'glare-anim': {
          '0%': { transform: 'translateX(-100%) translateY(-100%) rotate(45deg)' },
          '100%': { transform: 'translateX(100%) translateY(100%) rotate(45deg)' },
        },
        'input-glow': {
          '0%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
          '50%': { boxShadow: '0 0 10px 0 rgba(59, 130, 246, 0.4)' },
          '100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
