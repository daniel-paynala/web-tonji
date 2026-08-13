/**
 * Helpers reversement non présents dans cagnottesApi.ts (fichier partagé, non modifiable).
 * Miroir de CagnottesRepositoryHttp.fermer (Flutter) :
 *   POST /api/mobile/cagnottes/:id/fermer
 * Utilisé par MobileReversement en mode « fermeture » (reversement intégral + clôture).
 */

import { api } from '@/lib/api'

/// Clôture la cagnotte après un reversement intégral (mode fermeture).
/// Le backend rejette l'appel si des fonds restent dans la cotisation.
export async function fermerCagnotte(cagnotteId: string): Promise<void> {
  await api.post(`/api/mobile/cagnottes/${cagnotteId}/fermer`, {})
}
