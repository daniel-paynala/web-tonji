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
  kyc_valide: boolean
  date_naissance?: string
  email?: string
  adresse?: string
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
): Promise<AuthSession> {
  return api.post<AuthSession>('/api/mobile/auth/verify-otp', {
    indicatif,
    numero,
    otp,
    nom,
    prenom,
    date_naissance: '2000-01-01', // placeholder — âge vérifié par certification
    certifie_majeur: true,
    type_client: 'particulier',
    device_name: 'Tonji Web',
  })
}

export function logout(): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/api/mobile/auth/logout', {})
}
