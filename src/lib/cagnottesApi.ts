/**
 * API cagnottes — miroir de CagnottesRepositoryHttp (Flutter).
 * Liste : GET /api/mobile/cagnottes → { data: RawCagnotte[] }
 * Détail: GET /api/mobile/cagnottes/:id → { cagnotte: RawCagnotte }
 *         (RawCagnotte contient participants/historique/sorties imbriqués)
 */

import { api } from '@/lib/api'

// ── Types wire (JSON backend) ─────────────────────────────────────────────────

export type TypeCagnotteWire  = 'tontine_periodique' | 'cagnotte_ouverte'
export type StatutWire        = 'active' | 'en_cours' | 'cloturee'
export type RoleWire          = 'gerant' | 'cotiseur'
export type PeriodiciteWire   = 'hebdomadaire' | 'mensuelle'
export type JourSemaineWire   = 'lundi'|'mardi'|'mercredi'|'jeudi'|'vendredi'|'samedi'|'dimanche'
export type FreqPenaliteWire  = 'heure' | 'jour'
export type StatutPaiementWire = 'paye' | 'en_retard' | string

export interface RawParticipant {
  id: string
  nom: string
  prenom: string
  numero_masque: string
  statut_paiement?: StatutPaiementWire | null
  montant_paye?: number
  date_dernier_paiement?: string | null
  operateur?: string
  operateur_logo?: string
  is_me?: boolean
  ordre_passage?: number
  numero_retrait_masque?: string | null
  est_compte_light?: boolean
  montant_recu_reversement?: number | null
}

export interface RawPaiement {
  id: string
  participant_id?: string
  participant_nom?: string
  montant: number
  date: string
}

export interface RawReversement {
  id: string
  beneficiaire_nom?: string
  beneficiaire_numero?: string
  montant: number
  date: string
}

export interface RawCagnotte {
  reference: string
  titre: string
  type: TypeCagnotteWire
  statut: StatutWire
  montant_collecte: number
  nombre_participants: number
  nombre_inscrits: number
  date_creation: string
  role_utilisateur: RoleWire
  date_fin?: string | null
  montant_cible?: number | null
  montant_par_cycle?: number | null
  montant_avec_frais?: number | null
  periodicite?: PeriodiciteWire | null
  intervalle?: number
  jour_semaine?: JourSemaineWire | null
  jour_mois?: number | null
  numero_retrait_masque?: string | null
  rotation_terminee?: boolean
  penalite_active?: boolean
  penalite_montant?: number | null
  penalite_frequence?: FreqPenaliteWire | null
  penalite_courante?: number
  reversement_auto?: boolean
  reversement_auto_frequence_mois?: number | null
  prochain_retrait?: string | null
  // champs présents uniquement dans la réponse détail
  participants?: RawParticipant[]
  historique?: RawPaiement[]
  sorties?: RawReversement[]
  prochain_beneficiaire?: { nom?: string; prenom?: string; is_me?: boolean; ordre?: number } | null
}

// ── Modèle applicatif ─────────────────────────────────────────────────────────

export type TypeCagnotte    = 'tontine' | 'cotisation'
export type StatutCagnotte  = 'active' | 'en_cours' | 'cloturee'
export type RoleUtilisateur = 'gerant' | 'cotiseur'
export type Periodicite     = 'hebdomadaire' | 'mensuelle'
export type StatutPaiement  = 'paye' | 'en_attente' | 'en_retard'

export interface Participant {
  id: string
  nom: string
  prenom: string
  initiales: string
  nomComplet: string
  numeroMasque: string
  statutPaiement: StatutPaiement
  montantPaye: number
  dateDernierPaiement?: string
  operateur: string
  estMoi: boolean
  ordrePassage: number
  numeroRetraitMasque?: string
  estCompteLight: boolean
  montantRecu?: number
}

export interface Paiement {
  id: string
  participantId: string
  participantNom: string
  montant: number
  date: string
}

export interface Reversement {
  id: string
  beneficiaireNom: string
  beneficiaireNumero: string
  montant: number
  date: string
}

export interface Cagnotte {
  id: string            // = reference
  titre: string
  type: TypeCagnotte
  statut: StatutCagnotte
  montantCollecte: number
  nombreParticipants: number
  nombreInscrits: number
  dateCreation: string
  role: RoleUtilisateur
  dateFin?: string
  montantCible?: number
  montantParCycle?: number
  montantAvecFrais?: number
  periodicite?: Periodicite
  intervalle: number
  jourSemaine?: string
  jourMois?: number
  numeroRetraitMasque?: string
  rotationTerminee: boolean
  penaliteActive: boolean
  penaliteMontant?: number
  penaliteCourante: number
  reversementAuto: boolean
  prochaineDate?: string
}

export interface CagnotteDetail extends Cagnotte {
  participants: Participant[]
  historique: Paiement[]
  sorties: Reversement[]
  prochainBeneficiaire?: { nom: string; prenom: string; estMoi: boolean; ordrePassage: number }
}

// ── Mapping wire → applicatif ─────────────────────────────────────────────────

function statutPaiementFromWire(v?: string | null): StatutPaiement {
  if (v === 'paye') return 'paye'
  if (v === 'en_retard') return 'en_retard'
  return 'en_attente'
}

function participantFromRaw(r: RawParticipant): Participant {
  const prenom = r.prenom ?? ''
  const nom    = r.nom ?? ''
  return {
    id:                  r.id,
    nom,
    prenom,
    initiales:           `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase(),
    nomComplet:          `${prenom} ${nom}`.trim(),
    numeroMasque:        r.numero_masque ?? '',
    statutPaiement:      statutPaiementFromWire(r.statut_paiement),
    montantPaye:         r.montant_paye ?? 0,
    dateDernierPaiement: r.date_dernier_paiement ?? undefined,
    operateur:           r.operateur ?? '',
    estMoi:              r.is_me ?? false,
    ordrePassage:        r.ordre_passage ?? 0,
    numeroRetraitMasque: r.numero_retrait_masque ?? undefined,
    estCompteLight:      r.est_compte_light ?? false,
    montantRecu:         r.montant_recu_reversement ?? undefined,
  }
}

function paiementFromRaw(r: RawPaiement): Paiement {
  return {
    id:             r.id,
    participantId:  r.participant_id ?? '',
    participantNom: r.participant_nom ?? '',
    montant:        r.montant,
    date:           r.date,
  }
}

function reversementFromRaw(r: RawReversement): Reversement {
  return {
    id:                 r.id,
    beneficiaireNom:    r.beneficiaire_nom ?? 'Inconnu',
    beneficiaireNumero: r.beneficiaire_numero ?? '',
    montant:            r.montant,
    date:               r.date,
  }
}

function fromRaw(r: RawCagnotte): Cagnotte {
  return {
    id:                 r.reference,
    titre:              r.titre,
    type:               r.type === 'tontine_periodique' ? 'tontine' : 'cotisation',
    statut:             r.statut as StatutCagnotte,
    montantCollecte:    r.montant_collecte,
    nombreParticipants: r.nombre_participants,
    nombreInscrits:     r.nombre_inscrits,
    dateCreation:       r.date_creation,
    role:               r.role_utilisateur,
    dateFin:            r.date_fin ?? undefined,
    montantCible:       r.montant_cible ?? undefined,
    montantParCycle:    r.montant_par_cycle ?? undefined,
    montantAvecFrais:   r.montant_avec_frais ?? undefined,
    periodicite:        r.periodicite ?? undefined,
    intervalle:         r.intervalle ?? 1,
    jourSemaine:        r.jour_semaine ?? undefined,
    jourMois:           r.jour_mois ?? undefined,
    numeroRetraitMasque: r.numero_retrait_masque ?? undefined,
    rotationTerminee:   r.rotation_terminee ?? false,
    penaliteActive:     r.penalite_active ?? true,
    penaliteMontant:    r.penalite_montant ?? undefined,
    penaliteCourante:   r.penalite_courante ?? 0,
    reversementAuto:    r.reversement_auto ?? false,
    prochaineDate:      r.prochain_retrait ?? undefined,
  }
}

// ── Appels API ────────────────────────────────────────────────────────────────

export async function listerMesCagnottes(): Promise<Cagnotte[]> {
  const data = await api.get<{ data: RawCagnotte[] }>('/api/mobile/cagnottes')
  return (data.data ?? []).map(fromRaw)
}

export async function chargerCagnotte(id: string): Promise<CagnotteDetail | null> {
  try {
    // participants, historique, sorties sont des clés siblings de cagnotte dans la réponse
    // (pas imbriquées dans l'objet cagnotte) — voir cagnottes_repository.dart l.139-144
    const data = await api.get<{
      cagnotte:     RawCagnotte
      participants?: RawParticipant[]
      historique?:  RawPaiement[]
      sorties?:     RawReversement[]
    }>(`/api/mobile/cagnottes/${id}`)

    const raw   = data.cagnotte
    const benef = raw.prochain_beneficiaire

    return {
      ...fromRaw(raw),
      participants: (data.participants ?? []).map(participantFromRaw),
      historique:   (data.historique   ?? []).map(paiementFromRaw),
      sorties:      (data.sorties      ?? []).map(reversementFromRaw),
      prochainBeneficiaire: benef
        ? { nom: benef.nom ?? '', prenom: benef.prenom ?? '', estMoi: benef.is_me ?? false, ordrePassage: benef.ordre ?? 0 }
        : undefined,
    }
  } catch {
    return null
  }
}

export async function rejoindre(reference: string): Promise<void> {
  await api.post(`/api/mobile/cagnottes/${reference}/rejoindre`, {})
}

export async function genererReference(): Promise<string> {
  const data = await api.get<{ reference: string }>('/api/mobile/cagnottes/generate-reference')
  return data.reference
}

export async function verifierNumeroRetrait(numero9digits: string): Promise<{
  operateur: string
  kyc_ok?: boolean
  message?: string
}> {
  return api.post<{ operateur: string; kyc_ok?: boolean; message?: string }>('/api/mobile/kyc/verifier-numero', { numero: numero9digits })
}

export interface CreerCagnottePayload {
  type: 'tontine_periodique' | 'cagnotte_ouverte'
  titre: string
  numero_retrait: string
  reference: string
  // tontine
  montant_par_cycle?: number
  periodicite?: string
  intervalle?: number
  nombre_participants?: number
  jour_semaine?: string
  jour_mois?: number
  penalite_active?: boolean
  penalite_montant?: number
  penalite_frequence?: string
  // cotisation
  montant_cible?: number
  date_fin?: string
  reversement_auto?: boolean
  reversement_auto_frequence_mois?: number
}

export async function creerCagnotte(payload: CreerCagnottePayload): Promise<Cagnotte> {
  const data = await api.post<{ cagnotte: RawCagnotte }>('/api/mobile/cagnottes', payload)
  return fromRaw(data.cagnotte)
}

export interface CotisationResult {
  transId: string
  statut: string
  montantNet: number
  frais: number
  montantBrut: number
  message?: string
}

export async function cotiser(cagnotteReference: string, montant: number): Promise<CotisationResult> {
  const data = await api.post<{
    trans_id: string; statut: string; montant_net: number
    frais: number; montant_brut: number; message?: string
  }>('/api/mobile/cotisations', { cagnotte_reference: cagnotteReference, montant })
  return {
    transId: data.trans_id,
    statut: data.statut,
    montantNet: data.montant_net,
    frais: data.frais,
    montantBrut: data.montant_brut,
    message: data.message,
  }
}

export async function verifierStatutCotisation(transId: string): Promise<string> {
  const data = await api.get<{ statut: string }>(`/api/mobile/cotisations/${transId}/status`)
  return data.statut ?? 'initie'
}

export async function reverser(
  cagnotteId: string,
  montant: number,
  opts: { participantId?: string; numeroBeneficiaire?: string },
): Promise<void> {
  const body: Record<string, unknown> = { cagnotte_reference: cagnotteId, montant }
  if (opts.participantId) body.participant_id = opts.participantId
  if (opts.numeroBeneficiaire) body.numero_beneficiaire = opts.numeroBeneficiaire
  await api.post('/api/mobile/reversements', body)
}

export async function demarrerTontine(cagnotteId: string): Promise<void> {
  await api.post(`/api/mobile/cagnottes/${cagnotteId}/demarrer`, {})
}

export interface LookupResult {
  trouve: boolean
  id?: string
  nom?: string
  prenom?: string
  telephone?: string
  operateur?: string
  estCompteLight?: boolean
}

export async function rechercherParticipant(numero: string): Promise<LookupResult> {
  try {
    const data = await api.get<{
      trouve?: boolean; id?: string; nom?: string; prenom?: string
      telephone?: string; operateur?: string; est_compte_light?: boolean
    }>(`/api/mobile/users/lookup?numero=${encodeURIComponent(numero)}`)
    return {
      trouve: data.trouve ?? !!data.id,
      id: data.id,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
      operateur: data.operateur,
      estCompteLight: data.est_compte_light,
    }
  } catch {
    return { trouve: false }
  }
}

export async function ajouterParticipant(
  cagnotteId: string,
  opts: { numero: string; nom?: string; prenom?: string; estCompteLight?: boolean },
): Promise<Participant> {
  const body: Record<string, unknown> = { numero: opts.numero, est_compte_light: opts.estCompteLight ?? false }
  if (opts.nom) body.nom = opts.nom
  if (opts.prenom) body.prenom = opts.prenom
  const data = await api.post<{ participant: RawParticipant }>(`/api/mobile/cagnottes/${cagnotteId}/participants`, body)
  return participantFromRaw(data.participant)
}

export interface InfoCagnottePublique {
  titre: string
  type: TypeCagnotte
  statut: StatutCagnotte
  nombreParticipants: number
  nombreInscrits: number
  montantCollecte: number
  montantParCycle?: number
  montantCible?: number
  createur?: string
}

// Endpoint public — pas de token requis. Utilisé par InvitationPage et DetailCagnottePage (non connecté).
// Route backend suggérée : GET /api/public/cagnottes/:ref
export async function chargerInfoCagnottePublique(ref: string): Promise<InfoCagnottePublique | null> {
  const BASE = import.meta.env.VITE_API_URL ?? 'http://51.44.254.213'
  try {
    const resp = await fetch(`${BASE}/api/public/cagnottes/${ref}`, {
      headers: { Accept: 'application/json' },
    })
    if (!resp.ok) return null
    const data = await resp.json() as { cagnotte?: RawCagnotte } & RawCagnotte
    const raw: RawCagnotte = (data.cagnotte ?? data)
    return {
      titre:              raw.titre,
      type:               raw.type === 'tontine_periodique' ? 'tontine' : 'cotisation',
      statut:             raw.statut as StatutCagnotte,
      nombreParticipants: raw.nombre_participants ?? 0,
      nombreInscrits:     raw.nombre_inscrits ?? 0,
      montantCollecte:    raw.montant_collecte ?? 0,
      montantParCycle:    raw.montant_par_cycle ?? undefined,
      montantCible:       raw.montant_cible ?? undefined,
    }
  } catch {
    return null
  }
}
