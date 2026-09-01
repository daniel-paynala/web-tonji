import { api } from './api'

export interface RequestOtpResult {
  ok: boolean
  phone: string
  user_exists: boolean
  otp_sent: boolean
  dev_hint?: string
}

export interface AuthUser {
  id: string
  nom: string
  prenom: string
  numero: string        // E.164 (+241XXXXXXXX)
  type_client: string
  // Type de compte : 'particulier' | 'association' (null tant que pas choisi).
  // Seules les associations peuvent créer une cagnotte publique (crowdfunding).
  type_compte?: string | null
  kyc_valide: boolean
  date_naissance?: string
  email?: string
  adresse?: string
  // Sexe (M/F) — propagé au store pour le profil progressif (cf. MobileProfil).
  sexe?: string
}

export interface AuthSession {
  token: string
  created: boolean
  user: AuthUser
}

export type OtpIntent = 'login' | 'signup'

export function requestOtp(
  indicatif: string,
  numero: string,
  intent: OtpIntent = 'login',
): Promise<RequestOtpResult> {
  return api.post<RequestOtpResult>('/api/mobile/auth/request-otp', {
    indicatif,
    numero,
    intent,
  })
}

export function verifyOtpLogin(
  indicatif: string,
  numero: string,
  otp: string,
): Promise<AuthSession> {
  return api.post<AuthSession>('/api/mobile/auth/verify-otp', {
    indicatif,
    numero,
    otp,
    device_name: 'Tonji Web',
  })
}

export function verifyOtpSignup(
  indicatif: string,
  numero: string,
  otp: string,
  nom: string,
  prenom: string,
  // DDN optionnelle : vide ('') ⇒ compte « light » sans date de naissance fournie.
  // On retombe alors sur le placeholder, l'âge restant vérifié par certification.
  dateNaissance: string = '',
): Promise<AuthSession> {
  return api.post<AuthSession>('/api/mobile/auth/verify-otp', {
    indicatif,
    numero,
    otp,
    nom,
    prenom,
    // DDN fournie par l'appelant si présente, sinon placeholder par défaut.
    date_naissance: dateNaissance.trim() ? dateNaissance : '2000-01-01',
    certifie_majeur: true,
    type_client: 'particulier',
    device_name: 'Tonji Web',
  })
}

export function logout(): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/api/mobile/auth/logout', {})
}
