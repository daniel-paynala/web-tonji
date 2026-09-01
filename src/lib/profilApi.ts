/**
 * Helper API profil — miroir de AuthRepository.updateProfil() et
 * AuthRepository.recheckKyc() (Flutter).
 *
 * Endpoints :
 *  - PATCH /api/mobile/profil           → met à jour sexe / adresse / email
 *  - POST  /api/mobile/profil/kyc-recheck → re-vérifie le numéro Mobile Money
 *
 * Conforme aux règles : on ne touche pas aux fichiers partagés (api.ts,
 * authApi.ts, authStore.ts). On réutilise le client `api` partagé pour les
 * appels, et on expose un mapper AuthUser → User (shape du store) pour
 * permettre à la page de rafraîchir le store via login(user, token).
 */

import { api } from './api'
import type { AuthUser } from './authApi'

/** Type local du User stocké côté store (copie du shape, pas d'import du store). */
export interface StoreUser {
  id: string
  nom: string
  prenom: string
  telephone: string
  typeClient: 'particulier' | 'entreprise' | 'marchand'
  typeCompte?: 'particulier' | 'association' | null
  dateNaissance?: string
  email?: string
  adresse?: string
  sexe?: string
}

/** Réponse backend pour /profil et /profil/kyc-recheck (enveloppe `user`). */
interface ProfilResponse {
  user: AuthUser
}

/**
 * GET /api/mobile/auth/me — recharge l'AuthUser complet (inclut kyc_valide
 * et sexe, absents du store zustand). Sert à hydrater le profil au montage
 * comme le fait le provider Riverpod côté Flutter (qui dérive d'authProvider
 * contenant l'AuthUser complet).
 */
export async function getMe(): Promise<AuthUser> {
  const res = await api.get<ProfilResponse>('/api/mobile/auth/me')
  return res.user
}

/**
 * PATCH /api/mobile/profil — n'envoie QUE les champs non null (miroir exact
 * du repository Dart). nom/prénom/numéro/date_naissance/type_client sont
 * immutables côté backend.
 */
export async function updateProfil(params: {
  sexe?: string
  adresse?: string
  email?: string
}): Promise<AuthUser> {
  // On construit le corps en n'incluant que les champs renseignés.
  const body: Record<string, string> = {}
  if (params.sexe != null) body.sexe = params.sexe
  if (params.adresse != null) body.adresse = params.adresse
  if (params.email != null) body.email = params.email

  const res = await api.patch<ProfilResponse>('/api/mobile/profil', body)
  return res.user
}

/**
 * POST /api/mobile/profil/kyc-recheck — vérifie si le numéro est un compte
 * Mobile Money actif. Lance ApiError si le KYC échoue / service indisponible.
 */
export async function recheckKyc(): Promise<AuthUser> {
  const res = await api.post<ProfilResponse>('/api/mobile/profil/kyc-recheck', {})
  return res.user
}

/**
 * Convertit un AuthUser (DTO API) vers le shape User du store zustand —
 * permet de rafraîchir le store après update sans toucher authStore.ts.
 */
export function authUserToStoreUser(u: AuthUser): StoreUser {
  return {
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    telephone: u.numero,
    typeClient: u.type_client as 'particulier' | 'entreprise' | 'marchand',
    typeCompte: (u.type_compte ?? null) as 'particulier' | 'association' | null,
    dateNaissance: u.date_naissance,
    email: u.email,
    adresse: u.adresse,
    // sexe : présent dans la réponse backend mais pas typé dans AuthUser ;
    // on le récupère défensivement pour le propager au store.
    sexe: (u as AuthUser & { sexe?: string }).sexe,
  }
}
