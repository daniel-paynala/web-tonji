import { useCallback, useEffect, useRef, useState } from 'react'
import { verifierNumeroRetrait } from '@/lib/cagnottesApi'

/**
 * Verdict de la vérification du numéro du bénéficiaire d'un transfert.
 *
 * **Seul `ok` autorise à aller plus loin.** C'était auparavant le seul cas
 * `pas_de_compte` qui bloquait, pour ne pas condamner un transfert légitime
 * quand l'opérateur ne répond pas. La règle a été resserrée dans l'app :
 * tant que le compte n'est pas reconnu, on n'envoie pas — et le web doit dire
 * la même chose que l'app, sans quoi le même numéro serait refusé d'un côté et
 * accepté de l'autre.
 *
 * Conséquence assumée : une panne du KYC Airtel ou un bénéficiaire chez Moov
 * rend le transfert impossible depuis l'interface.
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
  /**
   * Prénom du titulaire, pour nommer le destinataire sur le bouton d'envoi.
   *
   * L'opérateur renvoie le titulaire dans un seul champ, sans garantir l'ordre
   * nom / prénom. On prend le premier mot : c'est le prénom sur la très grande
   * majorité des comptes, et le nom complet reste affiché au-dessus par le
   * verdict de vérification.
   */
  prenom: string | null
  /** Vrai tant que le compte n'est pas reconnu : le transfert est interdit. */
  interdit: boolean
  /** Numéro que l'opérateur a refusé, pour l'expliquer après l'avoir effacé. */
  numeroRefuse: string | null
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
 * @param surRefus      Appelé quand l'opérateur dit qu'il n'y a pas de compte :
 *                      l'écran doit alors VIDER le champ. Laisser neuf chiffres
 *                      faux à l'écran invite à les corriger un par un, alors
 *                      que c'est le plus souvent le mauvais numéro qui a été
 *                      dicté — on repart de zéro, comme dans l'app.
 */
export function useVerificationBeneficiaire(
  numero: string,
  membreChoisi: boolean,
  surRefus?: () => void,
): VerificationBeneficiaire {
  const [verdict, setVerdict] = useState<VerdictNumero>('idle')
  const [titulaire, setTitulaire] = useState<string | null>(null)
  const [numeroRefuse, setNumeroRefuse] = useState<string | null>(null)
  // Garde la dernière version du rappel sans le faire entrer dans les
  // dépendances de `verifier` : une fonction recréée à chaque rendu y
  // relancerait la vérification en boucle.
  const surRefusRef = useRef(surRefus)
  surRefusRef.current = surRefus
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
    setNumeroRefuse(null)
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
    setNumeroRefuse(null)

    verifierNumeroRetrait(local)
      .then(res => {
        if (demande !== demandeRef.current) return
        verifieRef.current = local
        const nouveau: VerdictNumero =
          res.operateur === 'airtel'
            ? res.kyc_ok === true
              ? 'ok'
              : res.kyc_ok === false
                ? 'pas_de_compte'
                : 'indisponible'
            : res.operateur === 'moov'
              ? 'moov'
              : 'operateur_inconnu'

        setTitulaire(nouveau === 'ok' ? (res.titulaire ?? null) : null)
        setVerdict(nouveau)

        // Pas de compte Mobile Money : on vide le champ et on garde le numéro
        // refusé pour pouvoir le citer. L'effet qui surveille `numero`
        // réinitialiserait le verdict au passage à vide — on le repose donc
        // juste après, dans le même tour.
        if (nouveau === 'pas_de_compte') {
          surRefusRef.current?.()
          verifieRef.current = null
          setNumeroRefuse(local)
          setVerdict('pas_de_compte')
        }
      })
      .catch(() => {
        // Réseau coupé, limite de débit atteinte : le compte n'est pas reconnu,
        // donc l'envoi reste fermé — même règle que l'app. On distingue
        // toutefois ce cas d'un refus, pour que le message dise « vérification
        // indisponible » et non « ce numéro n'a pas de compte ».
        if (demande !== demandeRef.current) return
        setVerdict('indisponible')
        setTitulaire(null)
        setNumeroRefuse(null)
      })
  }, [numero, membreChoisi])

  // Premier mot du titulaire : voir le commentaire de `prenom` plus haut.
  const prenom = verdict === 'ok' && titulaire?.trim()
    ? titulaire.trim().split(/\s+/)[0]
    : null

  return {
    verdict,
    titulaire,
    prenom,
    // Tant que le compte n'est pas reconnu, on n'envoie pas.
    interdit: verdict !== 'ok',
    numeroRefuse,
    verifier,
    reinitialiser,
  }
}
