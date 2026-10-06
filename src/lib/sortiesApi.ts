/**
 * Ce qu'une collecte autorise comme sortie d'argent, à cet instant.
 *
 * Même route que l'app Flutter — `GET /api/mobile/cagnottes/:ref/sorties` — et
 * donc le même verrou, décidé à un seul endroit côté serveur. Deux booléens et
 * rien d'autre : c'est assez léger pour être redemandé à chaque moment
 * sensible, sans faire relire la collecte entière.
 */

import { api } from '@/lib/api'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface SortiesAutorisees {
  transfert: boolean
  marchand: boolean
  /**
   * Le SERVICE « payer un commerce » est-il ouvert pour ce type de compte ?
   *
   * Distinct de `marchand`, qui dit si CETTE collecte l'autorise. La différence
   * pilote deux rendus qu'il ne faut pas confondre :
   *
   *   - service fermé → le bouton n'est pas CONSTRUIT. Ce n'est pas
   *     « momentanément suspendu », ça n'existe pas encore.
   *   - service ouvert, collecte verrouillée → bouton grisé, avec la raison.
   *
   * C'est ce qui remplace l'ancien drapeau de compilation : l'interrupteur du
   * dashboard ferme le service partout, sans redéploiement du web.
   */
  marchandActif: boolean
}

/**
 * Tout ouvert — l'état supposé TANT QUE la réponse n'est pas arrivée.
 *
 * Un repli fermé ferait clignoter les boutons à chaque entrée sur l'écran :
 * gris, puis verts dès la réponse. L'interface paraîtrait hésiter alors que
 * dans la quasi-totalité des cas rien n'est verrouillé.
 *
 * Supposer ouvert ne crée aucun risque : le clic revérifie, et c'est le serveur
 * qui refuse. Au pire, l'utilisateur touche un bouton qui lui répond aussitôt
 * que la sortie est suspendue — sans avoir rien saisi.
 */
export const SORTIES_OUVERTES: SortiesAutorisees = {
  transfert: true,
  marchand: true,
  // Supposer le service ouvert pendant le chargement, comme le reste : si le
  // dashboard l'a fermé, la réponse arrive et le bouton disparaît. L'inverse
  // le ferait apparaître après coup, ce qui se remarque bien davantage.
  marchandActif: true,
}

export async function lireSorties(reference: string): Promise<SortiesAutorisees> {
  const r = await api.get<{ transfert?: boolean; marchand?: boolean; marchand_actif?: boolean }>(
    `/api/mobile/cagnottes/${reference}/sorties`,
  )
  return {
    transfert: r?.transfert === true,
    marchand: r?.marchand === true,
    // Absent d'un serveur plus ancien : on se rabat sur le verrou effectif
    // plutôt que de fermer le service, sinon un web à jour devant un serveur
    // en retard n'afficherait plus jamais le bouton.
    marchandActif: r?.marchand_actif ?? r?.marchand === true,
  }
}

/**
 * Droits de sortie d'une collecte, relus à chaque arrivée sur l'écran.
 *
 * `revalider()` refait l'appel et rend le résultat frais : à brancher sur le
 * CLIC d'un bouton et avant la validation d'un formulaire. Le verrou a pu
 * tomber pendant que l'écran était affiché — sans ce second contrôle,
 * l'utilisateur saisirait un montant pour s'entendre refuser à la fin.
 *
 * Une lecture qui échoue ne ferme rien : l'état reste celui d'avant. Un hoquet
 * réseau n'est pas un verrou, et la sûreté vient du refus du serveur.
 */
export function useSortiesAutorisees(reference: string | undefined) {
  const [sorties, setSorties] = useState<SortiesAutorisees>(SORTIES_OUVERTES)
  // Une réponse tardive ne doit pas écraser l'état d'une demande plus récente.
  const demandeRef = useRef(0)

  const revalider = useCallback(async (): Promise<SortiesAutorisees> => {
    if (!reference) return SORTIES_OUVERTES
    const demande = ++demandeRef.current
    try {
      const frais = await lireSorties(reference)
      if (demande === demandeRef.current) setSorties(frais)
      return frais
    } catch {
      return sorties
    }
  }, [reference, sorties])

  useEffect(() => {
    void revalider()
    // Volontairement sur la seule référence : `revalider` dépend de `sorties`,
    // et le remettre ici relancerait l'appel à chaque réponse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  return { sorties, revalider }
}
