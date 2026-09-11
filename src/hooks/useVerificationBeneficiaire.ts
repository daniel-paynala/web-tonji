import { useCallback, useEffect, useRef, useState } from 'react'
import { verifierNumeroRetrait } from '@/lib/cagnottesApi'

/**
 * Verdict de la vérification du numéro du bénéficiaire d'un reversement.
 *
 * `pas_de_compte` est le seul état qui interdit d'aller plus loin : c'est le
 * seul où l'on SAIT que le transfert échouera chez l'opérateur. Un service
 * injoignable ne prouve rien et ne doit pas condamner un reversement légitime.
 */
export type VerdictNumero =
  | 'idle'
  | 'en_cours'
  | 'ok'
  | 'pas_de_compte'
  | 'indisponible'
  | 'moov'
  | 'operateur_inconnu'

export interface VerificationBeneficiaire {
  verdict: VerdictNumero
  /** Nom du titulaire, renseigné seulement quand le compte est vérifié. */
  titulaire: string | null
  /** Vrai quand le verdict interdit le reversement. */
  interdit: boolean
  /** À brancher sur le `onBlur` du champ numéro. */
  verifier: () => void
  /** À appeler quand un membre est choisi : le verdict n'a plus d'objet. */
  reinitialiser: () => void
}

/**
 * Vérifie que le numéro du bénéficiaire porte un compte Mobile Money, et
 * récupère le nom de son titulaire.
 *
 * Déclenchée à la SORTIE du champ — l'utilisateur a fini de taper et passe au
 * montant. Assez tôt pour qu'il corrige, assez tard pour ne pas interroger
 * l'opérateur à chaque frappe.
 *
 * Le nom compte autant que le verdict : deux chiffres intervertis ne donnent
 * pas une erreur, ils donnent un AUTRE numéro valide — et l'argent part chez
 * quelqu'un d'autre, sans retour possible.
 *
 * Partagé par la page mobile et la page desktop : une seule définition de ce
 * qui autorise un reversement.
 *
 * @param numero        Saisie locale à 9 chiffres (0XXXXXXXX), sans indicatif.
 * @param membreChoisi  Vrai si un membre est sélectionné dans les chips : son
 *                      numéro est connu du serveur, il n'y a rien à vérifier.
 */
export function useVerificationBeneficiaire(
  numero: string,
  membreChoisi: boolean,
): VerificationBeneficiaire {
  const [verdict, setVerdict] = useState<VerdictNumero>('idle')
  const [titulaire, setTitulaire] = useState<string | null>(null)
  // Dernier numéro effectivement vérifié : un aller-retour de focus sur un
  // numéro inchangé ne doit pas relancer l'appel.
  const verifieRef = useRef<string | null>(null)
  // Une réponse tardive ne doit pas écraser le verdict d'un numéro plus récent.
  const demandeRef = useRef(0)

  const reinitialiser = useCallback(() => {
    demandeRef.current += 1
    verifieRef.current = null
    setVerdict('idle')
    setTitulaire(null)
  }, [])

  // Le numéro change → tout verdict précédent devient caduc. Laisser le nom du
  // numéro d'avant sous un numéro en cours de correction produirait exactement
  // la méprise que cette vérification doit empêcher.
  useEffect(() => {
    if (verifieRef.current !== null && numero.trim() !== verifieRef.current) {
      reinitialiser()
    }
  }, [numero, reinitialiser])

  const verifier = useCallback(() => {
    if (membreChoisi) return

    const local = numero.trim()
    // Numéro incomplet : on n'interroge pas pour rien. La validation du
    // formulaire signale déjà un format invalide.
    if (!/^0\d{8}$/.test(local)) return
    if (local === verifieRef.current) return

    const demande = ++demandeRef.current
    setVerdict('en_cours')
    setTitulaire(null)

    verifierNumeroRetrait(local)
      .then(res => {
        if (demande !== demandeRef.current) return
        verifieRef.current = local
        setTitulaire(res.titulaire ?? null)
        setVerdict(
          res.operateur === 'airtel'
            ? res.kyc_ok === true
              ? 'ok'
              : res.kyc_ok === false
                ? 'pas_de_compte'
                : 'indisponible'
            : res.operateur === 'moov'
              ? 'moov'
              : 'operateur_inconnu',
        )
      })
      .catch(() => {
        // Réseau coupé, limite de débit atteinte : on n'interdit pas le
        // reversement pour autant. Le serveur refusera de lui-même un numéro
        // impossible, et bloquer sur un hoquet réseau empêcherait un
        // décaissement parfaitement légitime.
        if (demande !== demandeRef.current) return
        setVerdict('indisponible')
        setTitulaire(null)
      })
  }, [numero, membreChoisi])

  return {
    verdict,
    titulaire,
    interdit: verdict === 'pas_de_compte',
    verifier,
    reinitialiser,
  }
}
