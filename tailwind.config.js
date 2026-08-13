/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette de marque Tonji (vert forêt / or) — ALIGNÉE sur les tokens
        // mobile (src/lib/tokens.ts → T) qui sont la source de vérité couleur.
        // (Remplace l'ancienne « Forêt équatoriale » teal/terracotta.)
        primary: {
          DEFAULT: '#0A6847',   // T.primary
          light:   '#0D7C5F',   // T.primaryLight
          lighter: '#1A9060',   // T.primaryLighter
          dark:    '#064D34',   // T.primaryDark
        },
        accent: {
          DEFAULT: '#E8A830',   // T.accent (or)
          light:   '#F5D078',   // T.accentLight
          dark:    '#C48A1A',   // T.accentDark
        },
        surface: {
          DEFAULT:  '#F6F7F4',  // T.surface (ivoire)
          elevated: '#FFFFFF',  // T.surfaceEl
          deep:     '#ECEDE9',  // T.surfaceDeep
          deeper:   '#DFE1DC',  // T.surfaceDeeper
        },
        text: {
          strong:    '#14202E', // T.textStrong
          secondary: '#4A5568', // T.textSec
          tertiary:  '#8A94A0', // T.textTert
          inverse:   '#F6F7F4', // texte sur fond sombre = surface
        },
        border: {
          DEFAULT: '#E8EDE9',   // T.border
          strong:  '#D4DAD5',   // T.borderStr
        },
        success:  '#1A7A50',    // T.success
        warning:  '#C48A1A',    // T.warning
        error:    '#D94F3D',    // T.error / coral
        info:     '#3B7A8A',
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        xl:   '20px',
        '2xl':'28px',
        full: '9999px',
      },
      boxShadow: {
        xs:    '0 1px 2px rgba(26,31,30,0.06)',
        sm:    '0 1px 4px rgba(26,31,30,0.08), 0 1px 2px rgba(26,31,30,0.04)',
        md:    '0 4px 16px rgba(26,31,30,0.10), 0 2px 6px rgba(26,31,30,0.06)',
        lg:    '0 8px 32px rgba(26,31,30,0.12), 0 4px 12px rgba(26,31,30,0.08)',
        xl:    '0 16px 48px rgba(26,31,30,0.16), 0 8px 20px rgba(26,31,30,0.10)',
        glow:  '0 0 24px rgba(232,168,48,0.30)',
        'glow-primary': '0 0 24px rgba(10,104,71,0.35)',
        inner: 'inset 0 2px 4px rgba(26,31,30,0.06)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0A6847 0%, #064D34 100%)',
        'gradient-accent':  'linear-gradient(135deg, #E8A830 0%, #C48A1A 100%)',
        'gradient-mesh':    'linear-gradient(135deg, #064D34 0%, #0A6847 50%, #1A9060 100%)',
        'gradient-surface': 'linear-gradient(180deg, #FFFFFF 0%, #F6F7F4 100%)',
        'gradient-card':    'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(246,247,244,0.7) 100%)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight:   '-0.02em',
        wide:    '0.04em',
        wider:   '0.08em',
        widest:  '0.16em',
      },
    },
  },
  plugins: [],
}
