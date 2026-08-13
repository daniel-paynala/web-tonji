/**
 * Actions de gestion d'une cagnotte — miroir des méthodes de
 * CagnottesRepositoryHttp (mobile/lib/features/cagnottes/data/cagnottes_repository.dart)
 * non encore exposées dans cagnottesApi.ts.
 *
 * Endpoints (identiques au repository Flutter) :
 *  - quitter               → DELETE /api/mobile/cagnottes/:id/participants/moi
 *  - fermer                → POST   /api/mobile/cagnottes/:id/fermer
 *  - supprimer             → DELETE /api/mobile/cagnottes/:id
 *  - supprimerParticipant  → DELETE /api/mobile/cagnottes/:id/participants/:pid
 *  - reordonnerParticipants→ POST   /api/mobile/cagnottes/:id/participants/ordre  { ordre: [...] }
 *  - toggleReversementAuto → PATCH  /api/mobile/cagnottes/:id/reversement-auto    { reversement_auto }
 */

import { api } from '@/lib/api'

/// Le cotiseur quitte la cagnotte (jamais le gérant — 403 côté backend sinon).
export async function quitterCagnotte(cagnotteId: string): Promise<void> {
  await api.delete(`/api/mobile/cagnottes/${cagnotteId}/participants/moi`)
}

/// Clôture une cagnotte ouverte qui possède un historique (préserve les traces).
export async function fermerCagnotte(cagnotteId: string): Promise<void> {
  await api.post(`/api/mobile/cagnottes/${cagnotteId}/fermer`, {})
}

/// Supprime définitivement une cagnotte vierge (aucune transaction).
export async function supprimerCagnotte(cagnotteId: string): Promise<void> {
  await api.delete(`/api/mobile/cagnottes/${cagnotteId}`)
}

/// Retire un membre d'une tontine (les paiements déjà effectués restent en base).
export async function supprimerParticipant(
  cagnotteId: string,
  participantId: string,
): Promise<void> {
  await api.delete(`/api/mobile/cagnottes/${cagnotteId}/participants/${participantId}`)
}

/// Enregistre l'ordre de passage des participants (verrouillé au démarrage côté backend).
export async function reordonnerParticipants(
  cagnotteId: string,
  participantIds: string[],
): Promise<void> {
  await api.post(`/api/mobile/cagnottes/${cagnotteId}/participants/ordre`, { ordre: participantIds })
}

/// Active/désactive le reversement systématique (cotisation ouverte, gérant uniquement).
export async function toggleReversementAuto(
  cagnotteId: string,
  actif: boolean,
): Promise<void> {
  await api.patch(`/api/mobile/cagnottes/${cagnotteId}/reversement-auto`, { reversement_auto: actif })
}
