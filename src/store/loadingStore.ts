import { create } from 'zustand'

/**
 * Compteur global de requêtes mutantes (POST/PATCH/DELETE) en vol.
 *
 * Alimenté automatiquement par le client API (`api.ts`) : tout appel mutant
 * incrémente au départ et décrémente à la fin. L'overlay de chargement
 * (`LoadingOverlay`) s'affiche dès que `count > 0` — ce qui **bloque l'écran**
 * pendant l'action et empêche les **double-clics**, sans avoir à câbler chaque
 * bouton individuellement.
 */
interface LoadingState {
  count: number
  start: () => void
  stop: () => void
}

export const useLoadingStore = create<LoadingState>((set) => ({
  count: 0,
  start: () => set((s) => ({ count: s.count + 1 })),
  stop: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))
