import { useEffect, useState } from 'react'
import { fetchCgu, type Cgu } from '@/lib/cguApi'

/**
 * Charge les conditions d'utilisation produites par le serveur.
 *
 * Les cinq écrans qui les affichaient portaient chacun leur propre copie du
 * texte, et ces copies avaient divergé de la configuration réellement appliquée.
 * Ce hook est le seul point de lecture côté web.
 *
 * `null` tant que le chargement est en cours ou s'il a échoué : l'appelant
 * affiche alors un repli renvoyant vers tonji.ga/conditions.
 */
export function useCgu(operateur = 'airtel', pays = 'GA') {
  const [cgu, setCgu] = useState<Cgu | null>(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    let annule = false

    fetchCgu(operateur, pays)
      .then(c => { if (!annule) setCgu(c) })
      .catch(() => { if (!annule) setErreur(true) })

    // Évite un setState après démontage si l'utilisateur ferme la feuille.
    return () => { annule = true }
  }, [operateur, pays])

  return { cgu, erreur, chargement: !cgu && !erreur }
}
