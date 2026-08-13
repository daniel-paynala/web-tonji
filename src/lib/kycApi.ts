/**
 * Helper KYC pour l'inscription — miroir de AuthRepository.kycCheck() Flutter.
 *
 * Endpoint : GET /api/mobile/auth/kyc-check?numero=0XXXXXXXX
 *
 * Le client partagé `api` (lib/api.ts) ne gère pas les query params, donc on
 * passe par un fetch direct ici (fichier dédié, conforme aux règles : on ne
 * modifie pas les fichiers partagés). On reproduit la gestion d'erreur de
 * lib/api.ts (ApiError) pour rester homogène.
 */

import { ApiError } from './api'

// Base API alignée sur lib/api.ts (même variable d'env, même défaut).
const BASE = import.meta.env.VITE_API_URL ?? 'http://51.44.254.213'

/** Lit le token Sanctum stocké par le store zustand (clé 'tonji-auth'). */
function token(): string | null {
  try {
    const raw = localStorage.getItem('tonji-auth')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}

/**
 * Résultat du contrôle KYC + existence de compte — miroir de KycResultat (Dart).
 *
 * Règle : si `bloque` est true, l'app NE doit PAS passer à l'étape suivante,
 * même si le service est temporairement indisponible (pas de pass-through).
 */
export interface KycResultat {
  /** true = un compte Tonji complet existe déjà → aller se connecter. */
  user_exists: boolean
  /** Opérateur détecté ('airtel', 'moov', null si inconnu). */
  operateur: string | null
  /** true = compte Airtel Money actif confirmé. false/null sinon. */
  kyc_ok: boolean | null
  /** true = blocage (compte existant, opérateur bloqué, service KO, KYC négatif). */
  bloque: boolean
  /** Nom de famille retourné par Airtel KYC. */
  nom: string | null
  /** Prénom retourné par Airtel KYC. */
  prenom: string | null
  /** 'particulier' ou 'entreprise' dérivé du grade Airtel. */
  type_client: string | null
  /** Message lisible pour l'UI (badge / toast). */
  message: string | null
}

/**
 * GET /auth/kyc-check?numero=… — vérifie le numéro avant l'étape identité.
 *
 * Lance ApiError en cas d'erreur réseau / serveur : l'appelant doit alors
 * traiter ce numéro comme bloqué (RÈGLE : pas de pass-through).
 */
export async function kycCheck(numero: string): Promise<KycResultat> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const t = token()
  if (t) headers['Authorization'] = `Bearer ${t}`

  const url = `${BASE}/api/mobile/auth/kyc-check?numero=${encodeURIComponent(numero)}`
  const res = await fetch(url, { method: 'GET', headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Même logique d'extraction de message que lib/api.ts (message / errors).
    const msg =
      (data as { message?: string }).message ||
      Object.values((data as { errors?: Record<string, string[]> }).errors ?? {})
        .flat()
        .join(' ') ||
      `Erreur ${res.status}`
    throw new ApiError(res.status, msg)
  }

  // Normalisation : on garantit les champs attendus même si l'API en omet.
  const d = data as Partial<KycResultat>
  return {
    user_exists: d.user_exists ?? false,
    operateur: d.operateur ?? null,
    kyc_ok: d.kyc_ok ?? null,
    bloque: d.bloque ?? false,
    nom: d.nom ?? null,
    prenom: d.prenom ?? null,
    type_client: d.type_client ?? null,
    message: d.message ?? null,
  }
}
