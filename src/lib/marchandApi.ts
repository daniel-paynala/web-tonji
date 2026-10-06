/**
 * Client du portail marchand.
 *
 * **Volontairement séparé de `api.ts`.** Celui-ci injecte le jeton du client
 * Tonji lu dans `tonji-auth` ; le portail a sa propre session, et mélanger les
 * deux enverrait un jeton de client sur les routes marchandes — et l'inverse.
 * Deux publics, deux sessions, deux clients.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'https://api.tonji.ga'


/** Clé de stockage propre au portail — jamais celle du client. */
const CLE = 'tonji-marchand'

export type Etablissement = {
  id: string
  nom: string
  code: string | null
  ville: string | null
}

export type Session = {
  jeton: string
  numero: string
  etablissements: Etablissement[]
  /** Instant d'expiration, calculé à la réception. */
  expireA: number
}

export type Transaction = {
  reference: string
  trans_id: string
  montant: number
  statut: 'succes' | 'echec' | 'en_cours' | string
  date: string
  etablissement: string
  cagnotte: string
  payeur: string
  recu_url: string | null
}

export type Suivi = {
  periode: { depuis: string; jusqua: string }
  totaux: { encaisse: number; nb_succes: number; nb_echec: number; nb_encours: number }
  transactions: Transaction[]
  pagination: { page: number; pages: number; total: number }
}

export class ErreurPortail extends Error {
  constructor(message: string, public readonly code?: string, public readonly statut?: number) {
    super(message)
  }
}

/** Session courante, ou null si absente ou périmée. */
export function session(): Session | null {
  try {
    const brut = sessionStorage.getItem(CLE)
    if (!brut) return null
    const s = JSON.parse(brut) as Session
    // Un jeton périmé est retiré ici plutôt que de laisser l'écran partir en
    // 401 : l'utilisateur doit voir « session expirée », pas une erreur.
    if (!s?.jeton || s.expireA < Date.now()) {
      sessionStorage.removeItem(CLE)
      return null
    }
    return s
  } catch {
    return null
  }
}

export function fermerSession(): void {
  sessionStorage.removeItem(CLE)
}

async function appel<T>(chemin: string, options: RequestInit = {}, avecJeton = false): Promise<T> {
  const entetes: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (avecJeton) {
    const s = session()
    if (!s) throw new ErreurPortail('Session expirée.', 'session_expiree', 401)
    entetes.Authorization = `Bearer ${s.jeton}`
  }

  const res = await fetch(`${BASE}${chemin}`, { ...options, headers: entetes })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401) fermerSession()
    throw new ErreurPortail(
      data?.message ?? 'Une erreur est survenue.',
      data?.code,
      res.status,
    )
  }

  return data as T
}

/**
 * Demande un code.
 *
 * Le serveur REFUSE désormais un numéro qui n'est pas marchand (404) et dit
 * aussi quand la fiche existe mais n'a pas d'adresse de contact (503). Dans les
 * deux cas `appel()` lève, l'écran affiche le message et **reste sur le
 * numéro** — il n'avance plus vers un champ code où rien n'arriverait jamais.
 *
 * La réponse était neutre avant, pour que cette page ne devienne pas un
 * annuaire des commerçants. Daniel a tranché le 2026-10-06 : laisser quelqu'un
 * attendre un code qui ne viendra pas coûte plus que ce risque — un numéro
 * marchand est un numéro commercial, affiché en vitrine.
 */
export async function demanderCode(numero: string): Promise<string> {
  const r = await appel<{ message: string }>('/api/marchand/otp', {
    method: 'POST',
    body: JSON.stringify({ numero }),
  })
  return r.message
}

export async function ouvrirSession(numero: string, code: string): Promise<Session> {
  const r = await appel<{
    jeton: string
    expire_dans: number
    numero: string
    etablissements: Etablissement[]
  }>('/api/marchand/session', {
    method: 'POST',
    body: JSON.stringify({ numero, code }),
  })

  const s: Session = {
    jeton: r.jeton,
    numero: r.numero,
    etablissements: r.etablissements ?? [],
    expireA: Date.now() + r.expire_dans * 1000,
  }

  // `sessionStorage` et non `localStorage` : un marchand consulte souvent
  // depuis un téléphone partagé ou l'ordinateur de la boutique. Fermer
  // l'onglet doit fermer la session.
  sessionStorage.setItem(CLE, JSON.stringify(s))
  return s
}

export async function suivi(params: {
  depuis?: string
  jusqua?: string
  statut?: string
  page?: number
}): Promise<Suivi> {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) q.set(k, String(v))
  })
  const suffixe = q.toString() ? `?${q}` : ''
  return appel<Suivi>(`/api/marchand/transactions${suffixe}`, { method: 'GET' }, true)
}
