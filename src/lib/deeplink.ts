/**
 * Configuration centrale des deep links Tonji.
 *
 * Toutes les valeurs sensibles viennent des variables d'environnement.
 * Pour activer en production, ajouter dans .env :
 *
 *   VITE_BASE_URL=https://tonji.ga
 *   VITE_APP_SCHEME=tonji
 *   VITE_WA_NUMBER=+24177XXXXXX
 */

export const DEEPLINK = {
  /** URL de base du site (sans slash final). */
  baseUrl: (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://tonji.ga',

  /** Schéma custom iOS/Android — ex: tonji://rejoindre/183921 */
  appScheme: (import.meta.env.VITE_APP_SCHEME as string | undefined) ?? 'tonji',

  /** Bundle ID Flutter (com.paynala.tondo) — pour les fichiers .well-known */
  bundleId: 'com.paynala.tondo',

  /** Numéro WhatsApp du bot (format international sans espaces). */
  waNumber: (import.meta.env.VITE_WA_NUMBER as string | undefined) ?? '',

  /** Délai (ms) avant d'afficher le modal si l'app ne s'est pas ouverte. */
  openTimeout: 1500,
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
