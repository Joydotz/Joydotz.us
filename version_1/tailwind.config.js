/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        joy: {
          // ── Canvas (Pantone 7520 C) ───────────────────────
          bg:       '#D4A090',   // body / main canvas
          deep:     '#C08070',   // nav, footer — slightly darker
          deeper:   '#A86858',   // pressed states, dividers
          card:     '#E2B8A8',   // message cards — lighter than canvas
          'card-lt':'#EDD0C4',   // hover on message cards

          // ── Surfaces (float on canvas) ────────────────────
          surface:      '#FAF4F0',  // primary white/cream panel
          'surface-alt':'#F5EDE8',  // warmer white panel

          // ── Text ─────────────────────────────────────────
          text:     '#2C1F1A',
          'text-mid':'#7A5A52',
          'text-soft':'#B89080',
          'text-on-bg':'#2C1F1A',  // text sitting directly on canvas

          // ── SKU accents ───────────────────────────────────
          cloud:        '#B8CDEA',
          'cloud-lt':   '#DCE9F7',
          butterfly:    '#D8D2CA',
          'butterfly-lt':'#EEEAE6',
          flower:       '#F2AEBB',
          'flower-lt':  '#FAD9E3',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft:    '0 4px 24px rgba(90, 40, 20, 0.10)',
        card:    '0 2px 16px rgba(90, 40, 20, 0.08)',
        float:   '0 8px 40px rgba(90, 40, 20, 0.14)',
        surface: '0 2px 20px rgba(90, 40, 20, 0.12)',
      },
      animation: {
        float:        'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        shimmer:      'shimmer 4s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-14px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
      },
    },
  },
  plugins: [],
}
