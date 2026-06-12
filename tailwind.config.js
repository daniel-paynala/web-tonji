/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette « Forêt équatoriale » — source de vérité : paynala_colors.dart
        primary: {
          DEFAULT: '#0F4C5C',
          light:   '#15616F',
          lighter: '#1A6F7F',
          dark:    '#0A3540',
        },
        accent: {
          DEFAULT: '#C97B4A',
          light:   '#D08555',
          dark:    '#B76E45',
        },
        surface: {
          DEFAULT:  '#F4ECE0',
          elevated: '#FBF7F0',
          deep:     '#EAE0CF',
          deeper:   '#D9D2C0',
        },
        text: {
          strong:    '#1A1F1E',
          secondary: '#5C625F',
          tertiary:  '#8A8F8C',
          inverse:   '#F4ECE0',
        },
        border: {
          DEFAULT: '#D8CFC0',
          strong:  '#C4BAA8',
        },
        success:  '#6B8E4E',
        warning:  '#D49B3F',
        error:    '#A04434',
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
        glow:  '0 0 24px rgba(201,123,74,0.30)',
        'glow-primary': '0 0 24px rgba(15,76,92,0.35)',
        inner: 'inset 0 2px 4px rgba(26,31,30,0.06)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0F4C5C 0%, #0A3540 100%)',
        'gradient-accent':  'linear-gradient(135deg, #C97B4A 0%, #B76E45 100%)',
        'gradient-mesh':    'linear-gradient(135deg, #0A3540 0%, #0F4C5C 50%, #15616F 100%)',
        'gradient-surface': 'linear-gradient(180deg, #FBF7F0 0%, #F4ECE0 100%)',
        'gradient-card':    'linear-gradient(145deg, rgba(251,247,240,0.95) 0%, rgba(244,236,224,0.7) 100%)',
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
