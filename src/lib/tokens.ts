// Palette « Forêt équatoriale » — source de vérité : paynala_colors.dart
export const T = {
  primary:        '#0F4C5C',
  primaryLight:   '#15616F',
  primaryLighter: '#1A6F7F',
  accent:         '#C97B4A',
  accentLight:    '#D08555',
  accentDark:     '#B76E45',
  surface:        '#F4ECE0',
  surfaceEl:      '#FBF7F0',
  surfaceDeep:    '#EAE0CF',
  textStrong:     '#1A1F1E',
  textSec:        '#5C625F',
  textTert:       '#8A8F8C',
  border:         '#D8CFC0',
  borderStr:      '#C4BAA8',
  success:        '#6B8E4E',
  warning:        '#D49B3F',
  error:          '#A04434',
} as const

export const grad = {
  primary: `linear-gradient(135deg, #0F4C5C 0%, #15616F 50%, #1A6F7F 100%)`,
  accent:  `linear-gradient(135deg, #C97B4A 0%, #B76E45 100%)`,
  cagnotte:`linear-gradient(135deg, #B76E45 0%, #C97B4A 50%, #D08555 100%)`,
} as const

export const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
