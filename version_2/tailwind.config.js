/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blush: '#EABEB0',
          cream: '#FDF6F2',
          warm: '#F5EDE8',
          dark: '#1a1a1a',
          muted: '#7a6560',
          muted2: '#a89390',
        },
        cloud: {
          light: '#dce8f5',
          mid: '#b8cce8',
          iris: '#c4b8e0',
        },
        butterfly: {
          pearl: '#ede9e4',
          silver: '#d0cbc5',
        },
        flower: {
          pink: '#f5c4c0',
          taffy: '#eba8b0',
        },
      },
      fontFamily: {
        display: ['Nunito', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'float-delayed': 'float 9s ease-in-out 2s infinite',
        'float-slow': 'float 11s ease-in-out 1s infinite',
        'fade-up': 'fadeUp 0.7s ease-out forwards',
        shimmer: 'shimmer 5s ease-in-out infinite',
        'scroll-left': 'scrollLeft 30s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-1deg)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        scrollLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
