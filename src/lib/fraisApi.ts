/**
 * Grille tarifaire de l'opérateur — `GET /api/mobile/config/frais`.
 *
 * Même route et même lecture que l'app Flutter (`FraisConfig`). Les chiffres
 * ne sont écrits NULLE PART dans l'interface : ils viennent du serveur, pour
 * qu'une renégociation de barème change ce qui s'affiche sans redéployer.
 *
 * La commission Paynala n'est pas dans cette réponse — le serveur la retire
 * volontairement (RÈGLE 4-bis : l'interface de paiement n'expose pas le détail
 * du calcul). Elle figure en revanche dans les conditions d'utilisation.
 */

import { api } from '@/lib/api'
import { useEffect, useState } from 'react'

export interface FraisTranche {
  /** « pourcentage » → frais = round(net × valeur) ; « forfait » → valeur FCFA. */
  type: string
  /** Taux décimal (0.03 = 3 %) ou montant fixe, selon `type`. */
  valeur: number
  montantMin: number | null
  montantMax: number | null
}

export interface FraisConfig {
  operateur: string
  pays: string
  plafondParEnvoi: number
  /** Tranches du barème de retrait, triées par borne haute croissante. */
  tranches: FraisTranche[]
  /**
   * Taux prélevés sur le transfert du solde, par type de collecte puis type de
   * compte. Une matrice et non un taux unique : rien n'oblige une tontine et
   * une cagnotte, ni un particulier et une association, à être traités pareil.
   */
  fraisRetrait: Record<string, Record<string, number>>
  /** Taux prélevé quand une collecte règle un commerce (0.03 = 3 %). */
  fraisMarchand: number
  /**
   * Plafond du prélèvement sur un reversement, en FCFA.
   *
   * **Zéro veut dire « aucun plafond »**, pas « prélèvement nul » : c'est
   * `fraisRetrait` qui porte le taux. Un serveur plus ancien qui ne connaît pas
   * le champ laisse donc le taux s'appliquer sans borne, soit l'état d'avant.
   */
  plafondFraisRetrait: number
  /** Reversement gratuit sous ce montant, en FCFA. Zéro = aucune franchise. */
  franchiseRetrait: number
}

/** Matrice tolérante à l'absence de la clé — un serveur plus ancien ne casse rien. */
function matrice(brut: unknown): Record<string, Record<string, number>> {
  if (!brut || typeof brut !== 'object') return {}
  const out: Record<string, Record<string, number>> = {}
  for (const [k, v] of Object.entries(brut as Record<string, unknown>)) {
    if (v && typeof v === 'object') {
      out[k] = {}
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        out[k][k2] = typeof v2 === 'number' ? v2 : 0
      }
    }
  }
  return out
}

export async function lireFrais(operateur = 'airtel', pays = 'GA'): Promise<FraisConfig> {
  const r = await api.get<Record<string, unknown>>(
    `/api/mobile/config/frais?operateur=${operateur}&pays=${pays}`,
  )

  const tranches: FraisTranche[] = ((r?.tranches as unknown[]) ?? []).map(t => {
    const o = t as Record<string, unknown>
    return {
      type: String(o.type ?? 'pourcentage'),
      valeur: Number(o.valeur ?? 0),
      montantMin: o.montant_min == null ? null : Number(o.montant_min),
      montantMax: o.montant_max == null ? null : Number(o.montant_max),
    }
  }).sort((a, b) => {
    // Tranche ouverte (sans borne haute) en dernier, pour que la recherche
    // s'arrête à la première tranche réellement applicable.
    if (a.montantMax === null) return 1
    if (b.montantMax === null) return -1
    return a.montantMax - b.montantMax
  })

  return {
    operateur: String(r?.operateur ?? 'airtel'),
    pays: String(r?.pays ?? 'GA'),
    plafondParEnvoi: Number(r?.plafond_par_envoi ?? 500000),
    tranches,
    fraisRetrait: matrice(r?.frais_retrait),
    fraisMarchand: Number(r?.frais_marchand ?? 0),
    plafondFraisRetrait: Number(r?.plafond_frais_retrait ?? 0),
    franchiseRetrait: Number(r?.franchise_retrait ?? 0),
  }
}

/**
 * Taux appliqué au transfert du solde vers un numéro, pour ce couple.
 *
 * Zéro quand la matrice ne dit rien : c'est l'état par défaut du produit, et
 * supposer un prélèvement qui n'existe pas annoncerait au créateur un montant
 * inférieur à ce qu'il recevra.
 */
export function tauxTransfert(
  cfg: FraisConfig,
  opts: { estTontine: boolean; estAssociation: boolean },
): number {
  const parType = cfg.fraisRetrait[opts.estTontine ? 'tontine' : 'cagnotte']
  return parType?.[opts.estAssociation ? 'association' : 'particulier'] ?? 0
}

/**
 * Frais d'un reversement de `montant` vers un compte Mobile Money.
 *
 * Même calcul que l'app Flutter (`AirtelFeesCalculator.fraisReversement`) :
 * gratuit sous la franchise, puis le taux, puis le plafond — dans cet ordre,
 * qui est celui du barème annoncé. Les trois valeurs viennent du serveur,
 * aucune n'est écrite ici.
 */
export function fraisReversement(
  cfg: FraisConfig,
  montant: number,
  opts: { estTontine: boolean; estAssociation: boolean },
): number {
  if (cfg.franchiseRetrait > 0 && montant < cfg.franchiseRetrait) return 0

  const brut = Math.round(montant * tauxTransfert(cfg, opts))
  const plafond = cfg.plafondFraisRetrait

  return plafond > 0 && brut > plafond ? plafond : brut
}

/**
 * Frais que l'opérateur prélève pour un retrait en espèces de `montant`.
 *
 * **Le barème de l'opérateur, et lui seul.** Le prélèvement du reversement ne
 * s'y ajoute pas : Daniel l'a tranché le 2026-10-08, contre l'illustration
 * « reversement puis retrait » du document remis à Airtel.
 */
export function fraisRetraitEspeces(cfg: FraisConfig, montant: number): number {
  for (const t of cfg.tranches) {
    const minOk = t.montantMin === null || montant >= t.montantMin
    const maxOk = t.montantMax === null || montant <= t.montantMax
    if (minOk && maxOk) {
      return t.type === 'pourcentage' ? Math.round(montant * t.valeur) : Math.trunc(t.valeur)
    }
  }
  return 0
}

/** Ce que le bénéficiaire touche réellement s'il retire `montant` en espèces. */
export function cashApresRetrait(cfg: FraisConfig, montant: number): number {
  return montant - fraisRetraitEspeces(cfg, montant)
}

/** `0.03` devient « 3 % » — sans décimale inutile. */
export function pourcent(taux: number): string {
  const valeur = taux * 100
  const texte = Number.isInteger(valeur)
    ? String(valeur)
    : valeur.toFixed(2).replace('.', ',')
  return `${texte} %`
}

/** Barème de retrait rendu depuis les tranches de l'opérateur. */
export function bareme(cfg: FraisConfig): string {
  const morceaux = cfg.tranches.map(t =>
    t.type === 'pourcentage'
      ? `${pourcent(t.valeur)} jusqu'à ${fmtFcfa(t.montantMax ?? 0)} FCFA`
      : `${fmtFcfa(Math.trunc(t.valeur))} FCFA au-delà`,
  )
  return morceaux.length === 0 ? "selon le barème de l'opérateur" : morceaux.join(', puis ')
}

export function operateurLisible(operateur: string): string {
  return operateur ? operateur[0].toUpperCase() + operateur.slice(1) : 'opérateur'
}

/** Entier avec des espaces comme séparateurs de milliers. */
export function fmtFcfa(n: number): string {
  return String(Math.trunc(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1 ')
}

/**
 * Config tarifaire, chargée une fois par montage.
 *
 * `null` tant qu'elle n'est pas là, et `null` si l'appel échoue : l'écran
 * n'affiche alors RIEN plutôt qu'un chiffre inventé. Annoncer des frais faux à
 * qui fixe un objectif est pire que de ne rien annoncer.
 */
export function useFraisConfig(): FraisConfig | null {
  const [cfg, setCfg] = useState<FraisConfig | null>(null)

  useEffect(() => {
    let vivant = true
    lireFrais()
      .then(c => { if (vivant) setCfg(c) })
      .catch(() => { if (vivant) setCfg(null) })
    return () => { vivant = false }
  }, [])

  return cfg
}
