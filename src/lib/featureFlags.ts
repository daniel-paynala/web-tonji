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
