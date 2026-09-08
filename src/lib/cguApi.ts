import { api } from './api'

/** Une section détaillée des conditions d'utilisation. */
export interface BlocCgu {
  titre: string
  corps: string
}

/**
 * Conditions d'utilisation produites par le serveur.
 *
 * Les chiffres (plafonds, répercussion des frais de retrait) sont interpolés
 * à partir de la configuration de l'opérateur : rien n'est écrit en dur côté
 * client. C'est ce qui avait divergé auparavant, les écrans annonçant un modèle
 * de frais qui n'était plus celui appliqué.
 */
export interface Cgu {
  /** Empreinte du texte affiché — à comparer au `cgu_version` du compte. */
  version: string
  operateur: string
  /** Puces affichées directement, sans dépliage (RÈGLE 4-bis). */
  resume: string[]
  /** Sections détaillées. */
  blocs: BlocCgu[]
}

/**
 * Récupère les conditions en vigueur.
 *
 * Route PUBLIQUE : elles se lisent à l'inscription, avant d'avoir un compte.
 */
export async function fetchCgu(operateur = 'airtel', pays = 'GA'): Promise<Cgu> {
  const data = await api.get<{
    version: string
    operateur: string
    resume: string[]
    blocs: BlocCgu[]
  }>(`/api/mobile/config/cgu?operateur=${operateur}&pays=${pays}`)

  return {
    version: data.version ?? '',
    operateur: data.operateur ?? operateur,
    resume: data.resume ?? [],
    blocs: data.blocs ?? [],
  }
}

/**
 * Enregistre l'acceptation de `version` par l'utilisateur connecté.
 *
 * Le serveur refuse une version périmée (409) : le client doit alors recharger
 * les conditions et les faire relire.
 */
export async function accepterCgu(
  version: string,
  operateur = 'airtel',
  pays = 'GA',
): Promise<void> {
  await api.post('/api/mobile/config/cgu/accepter', { version, operateur, pays })
}
