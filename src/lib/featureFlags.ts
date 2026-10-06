/**
 * Drapeaux de fonctionnalités (web mobile Tonji).
 *
 * Lancement prod « cagnottes uniquement » : les tontines sont désactivées
 * (grisées dans l'UI, actions bloquées). Repasser à `true` quand le volet
 * tontine sera prêt — aucune autre modification nécessaire.
 */
export const TONTINES_ACTIVES = false;

/**
 * Cagnottes publiques (crowdfunding ouvert à tous) désactivées au lancement :
 * toutes les cagnottes v1 sont privées (cadrage juridique). L'étape « Visibilité »
 * du parcours de création est retirée tant que ce flag est `false`.
 */
export const CAGNOTTES_PUBLIQUES_ACTIVES = false;

/**
 * « Payer un commerce » — le gérant envoie le solde d'une collecte chez un
 * marchand enregistré plutôt qu'à une personne.
 *
 * Pendant de `tondo.paiement_marchand_actif` (backend) et
 * `kPaiementMarchandActif` (Flutter) : les trois canaux doivent TOUJOURS porter
 * la même valeur, et `tonji:audit` le vérifie.
 */
export const PAIEMENT_MARCHAND_ACTIF = false;
