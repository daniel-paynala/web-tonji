/**
 * Carnet des commerces payables, côté client Tonji.
 *
 * Mêmes routes que l'app Flutter — `/api/mobile/marchands` et
 * `/api/mobile/marchands/resoudre` — servies par le même service côté serveur,
 * qui est aussi celui du bot WhatsApp. Un commerce payable depuis l'app doit
 * l'être depuis le web, au même taux.
 *
 * **À ne pas confondre avec `marchandApi.ts`**, qui est le client du PORTAIL
 * marchand : deux publics, deux sessions. Ici c'est le client Tonji qui paie ;
 * là-bas c'est le commerçant qui consulte ses encaissements.
 */

import { api } from '@/lib/api'

export interface Marchand {
  id: string
  nom: string
  /** Code affiché à la caisse — ce que le client tape le plus souvent. */
  code: string | null
  /**
   * Taux RÉSOLU, en **DÉCIMAL** : `0.03` vaut 3 %. Celui de la fiche s'il en
   * porte un, sinon celui du projet — le client n'a pas à savoir qu'il existe
   * des taux négociés, il voit ce qui sera prélevé pour CE commerce.
   *
   * ⚠️ À afficher avec `pourcent()` de `fraisApi`. L'oubli de la conversion ne
   * casse rien : il annonce « 0,03 % » à qui sera prélevé de 3 %.
   */
  frais: number
  /** Numéro qui encaisse : le client doit pouvoir le lire avant de valider. */
  numero: string | null
  titulaire: string | null
  ville: string | null
  categorie: string | null
}

/** Numéro d'un commerce en forme lisible : 0X XX XX XX XX. */
export function numeroFormate(m: Marchand): string {
  const local = (m.numero ?? '').replace(/^\+241/, '0').replace(/\D/g, '')
  if (local.length !== 9) return m.numero ?? ''
  return `${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`.trim()
}

/** Fiches actives, éventuellement filtrées par nom. */
export async function listerMarchands(recherche?: string): Promise<Marchand[]> {
  const q = recherche?.trim() ? `?q=${encodeURIComponent(recherche.trim())}` : ''
  const r = await api.get<{ marchands: Marchand[] }>(`/api/mobile/marchands${q}`)
  return r?.marchands ?? []
}

/**
 * Résout une saisie : code d'enseigne ou numéro.
 *
 * **Plusieurs réponses sont normales.** Une chaîne encaisse sur un seul numéro
 * pour plusieurs points de vente : le numéro seul ne dit donc pas QUI est payé,
 * et c'est précisément ce que le code lève. Dans ce cas c'est au client de
 * désigner l'établissement — on ne choisit pas pour lui, le nom affiché sur le
 * bouton doit être celui qu'il a validé.
 */
export async function resoudreMarchand(saisie: string): Promise<Marchand[]> {
  const r = await api.get<{ marchands: Marchand[] }>(
    `/api/mobile/marchands/resoudre?saisie=${encodeURIComponent(saisie.trim())}`,
  )
  return r?.marchands ?? []
}
