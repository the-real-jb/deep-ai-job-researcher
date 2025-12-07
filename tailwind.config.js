/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0B',
        foreground: '#E5E5E5',
        accent: '#00FF88',
        'accent-hover': '#00DD77',
        console: '#1A1A1A',
        border: '#333333',
        gray: {
          900: '#0B0B0B',
          800: '#1A1A1A',
          700: '#333333',
          600: '#666666',
          500: '#999999',
          400: '#CCCCCC',
          300: '#DDDDDD',
          200: '#E5E5E5',
          100: '#F5F5F5',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} 