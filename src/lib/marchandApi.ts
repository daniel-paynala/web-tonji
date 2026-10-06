/**
 * Client du portail marchand.
 *
 * **Volontairement séparé de `api.ts`.** Celui-ci injecte le jeton du client
 * Tonji lu dans `tonji-auth` ; le portail a sa propre session, et mélanger les
 * deux enverrait un jeton de client sur les routes marchandes — et l'inverse.
 * Deux publics, deux sessions, deux clients.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'https://api.tonji.ga'

/**
 * Mode démonstration.
 *
 * Les écrans partent en production avant l'API : la production tourne sur
 * `main`, où les routes `/api/marchand` n'existent pas encore. Le portail
 * répond donc avec des données fabriquées, le temps de valider la forme.
 *
 * **Toute vue doit l'annoncer.** Un portail marchand qui affiche des montants
 * fictifs sans le dire ferait croire à un commerçant qu'il a encaissé de
 * l'argent qu'il n'a pas reçu — c'est pire que pas de portail du tout.
 */
export const MODE_DEMO = import.meta.env.VITE_PORTAIL_MOCK === '1'


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
 * Le serveur répond la même chose que le numéro existe ou non : l'interface ne
 * doit donc pas prétendre savoir si le numéro est enregistré, sous peine de
 * défaire la protection posée côté serveur.
 */
/** Latence simulée : sans elle, l'enchaînement est trop instantané pour être jugé. */
const attendre = (ms = 450) => new Promise((r) => setTimeout(r, ms))

/** Jeu de démonstration — montants et noms volontairement reconnaissables. */
function suiviFictif(): Suivi {
  const jours = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} à 1${n % 9}:2${n % 9}`
  }
  const lignes: Transaction[] = [
    ['TM-DEMO00001', 150000, 'succes',   'Anniversaire Maman', 'DOVI AKON Daniel'],
    ['TM-DEMO00002', 75000,  'succes',   'Mariage Nzeng',      'OBAME Sylvie'],
    ['TM-DEMO00003', 25000,  'en_cours', 'Tontine du marché',  'MBA Jean'],
    ['TM-DEMO00004', 40000,  'echec',    'Rentrée scolaire',   'NTOUTOUME Paul'],
    ['TM-DEMO00005', 310000, 'succes',   'Baptême Ella',       'KOUMBA Rachelle'],
  ].map(([reference, montant, statut, cagnotte, payeur], i) => ({
    reference: reference as string,
    trans_id: `DEMO${i}`,
    montant: montant as number,
    statut: statut as string,
    date: jours(i * 2),
    etablissement: 'TRAITEUR LE BARACHOIS',
    cagnotte: cagnotte as string,
    payeur: payeur as string,
    recu_url: null,
  }))

  const encaisse = lignes.filter((l) => l.statut === 'succes').reduce((t, l) => t + l.montant, 0)
  const aujourd = new Date().toISOString().slice(0, 10)

  return {
    periode: { depuis: aujourd, jusqua: aujourd },
    totaux: {
      encaisse,
      nb_succes: lignes.filter((l) => l.statut === 'succes').length,
      nb_echec: lignes.filter((l) => l.statut === 'echec').length,
      nb_encours: lignes.filter((l) => l.statut === 'en_cours').length,
    },
    transactions: lignes,
    pagination: { page: 1, pages: 1, total: lignes.length },
  }
}

export async function demanderCode(numero: string): Promise<string> {
  if (MODE_DEMO) {
    await attendre()
    return 'Démonstration : saisissez n\'importe quel code à 6 chiffres pour entrer.'
  }

  const r = await appel<{ message: string }>('/api/marchand/otp', {
    method: 'POST',
    body: JSON.stringify({ numero }),
  })
  return r.message
}

export async function ouvrirSession(numero: string, code: string): Promise<Session> {
  if (MODE_DEMO) {
    await attendre()
    const s: Session = {
      jeton: 'demo',
      numero,
      etablissements: [{ id: 'demo', nom: 'TRAITEUR LE BARACHOIS', code: 'BARACHOIS01', ville: 'Libreville' }],
      expireA: Date.now() + 7200 * 1000,
    }
    sessionStorage.setItem(CLE, JSON.stringify(s))
    return s
  }

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
  if (MODE_DEMO) {
    await attendre()
    return suiviFictif()
  }

  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) q.set(k, String(v))
  })
  const suffixe = q.toString() ? `?${q}` : ''
  return appel<Suivi>(`/api/marchand/transactions${suffixe}`, { method: 'GET' }, true)
}
