/**
 * Configuration centrale des deep links Tonji.
 *
 * Variables d'environnement à renseigner dans .env :
 *
 *   VITE_BASE_URL=https://app.tonji.ga
 *   VITE_APP_SCHEME=tonji
 *   VITE_WA_NUMBER=+24177XXXXXX
 *   VITE_APP_STORE_URL=https://apps.apple.com/us/app/tonji/id6772150068
 *   VITE_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.paynala.tonji
 *
 * ⚠️ Les deux plateformes n'ont PAS le même identifiant :
 *   iOS     → com.paynala.tondo  (PRODUCT_BUNDLE_IDENTIFIER)
 *   Android → com.paynala.tonji  (applicationId)
 * Confondre les deux casse silencieusement la vérification des App Links
 * (assetlinks.json) ou des Universal Links (apple-app-site-association).
 */

export const DEEPLINK = {
  /** URL de base du site (sans slash final). */
  baseUrl: (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://app.tonji.ga',

  /** Schéma custom iOS/Android — ex: tonji://rejoindre/183921 */
  appScheme: (import.meta.env.VITE_APP_SCHEME as string | undefined) ?? 'tonji',

  /** Bundle ID Flutter (com.paynala.tondo) — pour les fichiers .well-known */
  bundleId: 'com.paynala.tondo',

  /** Numéro WhatsApp du bot (format international sans espaces). */
  waNumber: (import.meta.env.VITE_WA_NUMBER as string | undefined) ?? '',

  /** Délai (ms) avant d'afficher le modal si l'app ne s'est pas ouverte. */
  openTimeout: 1500,

  /** URL App Store iOS (fallback = lien de prod si l'env n'est pas fourni). */
  appStoreUrl: (import.meta.env.VITE_APP_STORE_URL as string | undefined)
    ?? 'https://apps.apple.com/us/app/tonji/id6772150068',

  /** URL Google Play Store (fallback = lien de prod si l'env n'est pas fourni). */
  playStoreUrl: (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)
    ?? 'https://play.google.com/store/apps/details?id=com.paynala.tonji',
} as const

// ── Builders d'URL ────────────────────────────────────────────────────────────

/** URL universal link (web + app) pour rejoindre une cagnotte. */
export function urlRejoindre(token: string): string {
  return `${DEEPLINK.baseUrl}/rejoindre/${token}`
}

/** URL custom scheme pour ouvrir l'app directement. */
export function deepLinkRejoindre(token: string): string {
  return `${DEEPLINK.appScheme}://rejoindre/${token}`
}

/** URL WhatsApp bot avec le token pré-rempli. */
export function waRejoindre(token: string): string {
  if (!DEEPLINK.waNumber) return ''
  const numero = DEEPLINK.waNumber.replace(/^\+/, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(token)}`
}

/** URL universal link pour vérifier un reçu. */
export function urlRecu(transId: string): string {
  return `${DEEPLINK.baseUrl}/recu/${transId}`
}

/** Schéma tonji:// pour ouvrir l'accueil de l'app directement. */
export function deepLinkHome(): string {
  return `${DEEPLINK.appScheme}://home`
}
