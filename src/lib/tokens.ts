// Palette Tonji — brand board validé 2026-06-12.
// Source de vérité : paynala_colors.dart (mobile/lib/core/theme/)
// Ne jamais disséminer de hex en dur ailleurs dans le code.
export const T = {
  // ── Couleurs de marque ──────────────────────────────────────────────────────
  primary:        '#0A6847',   // Forêt — confiance, ancrage gabonais
  primaryLight:   '#0D7C5F',
  primaryLighter: '#1A9060',
  primaryDark:    '#064D34',

  accent:         '#E8A830',   // Or — valeur, prospérité
  accentLight:    '#F5D078',
  accentDark:     '#C48A1A',

  coral:          '#D94F3D',   // Corail — actions urgentes, erreurs
  coralLight:     '#E8715F',
  coralSoft:      '#FFF0EE',
  coralDark:      '#B83A2A',

  // ── Surfaces ────────────────────────────────────────────────────────────────
  surface:        '#F6F7F4',   // Ivoire — fond d'écran principal
  surfaceEl:      '#FFFFFF',   // Blanc — cartes, champs
  surfaceDeep:    '#ECEDE9',   // Légèrement plus profond
  surfaceDeeper:  '#DFE1DC',   // Pour dégradés intenses

  // ── Texte ───────────────────────────────────────────────────────────────────
  textStrong:     '#14202E',   // Encre — titres, texte principal
  textSec:        '#4A5568',   // Ardoise — descriptions
  textTert:       '#8A94A0',   // Gris — placeholders, meta

  // ── Structure ───────────────────────────────────────────────────────────────
  border:         '#E8EDE9',
  borderStr:      '#D4DAD5',

  // ── Sémantique ──────────────────────────────────────────────────────────────
  success:        '#1A7A50',
  successSoft:    '#EAF5EF',
  successLight:   '#2A9A68',

  warning:        '#C48A1A',
  warningSoft:    '#FFF8E6',

  error:          '#D94F3D',
  errorSoft:      '#FFF0EE',
} as const

export const grad = {
  primary:  `linear-gradient(135deg, #0A6847 0%, #0D7C5F 50%, #1A9060 100%)`,
  accent:   `linear-gradient(135deg, #E8A830 0%, #C48A1A 100%)`,
  cagnotte: `linear-gradient(135deg, #C48A1A 0%, #E8A830 50%, #F5D078 100%)`,
} as const

export const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
