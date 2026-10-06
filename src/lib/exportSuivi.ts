/**
 * Exports du portail marchand — CSV et PDF.
 *
 * **Les deux emportent la PÉRIODE ENTIÈRE, pas la page affichée.** L'API
 * pagine à cinquante ; un export qui s'arrêterait là donnerait un total faux à
 * qui rapproche son solde Airtel, sans rien pour s'en apercevoir. C'est
 * exactement le genre d'écart silencieux qu'un outil de réconciliation ne doit
 * pas produire.
 */

import { suivi, type Suivi, type Transaction } from './marchandApi'

const LIBELLES: Record<string, string> = {
  succes: 'Reçu',
  echec: 'Échoué',
  en_cours: 'En cours',
  initie: 'En cours',
}

const montant = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

export type Filtres = { depuis?: string; jusqua?: string; statut?: string }

/**
 * Toutes les transactions de la période, page après page.
 *
 * Borné à quarante pages : au-delà, mieux vaut un export tronqué et annoncé
 * qu'un navigateur qui se fige sur un commerce à très gros volume.
 */
export async function toutesLesTransactions(
  filtres: Filtres,
): Promise<{ donnees: Suivi; lignes: Transaction[]; tronque: boolean }> {
  const premiere = await suivi({ ...filtres, page: 1 })
  const lignes = [...premiere.transactions]
  const pages = Math.min(premiere.pagination.pages, 40)

  for (let p = 2; p <= pages; p++) {
    const suite = await suivi({ ...filtres, page: p })
    lignes.push(...suite.transactions)
  }

  return { donnees: premiere, lignes, tronque: premiere.pagination.pages > 40 }
}

function telecharger(blob: Blob, nom: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nom
  a.click()
  URL.revokeObjectURL(a.href)
}

/** CSV — s'ouvre dans Excel comme dans LibreOffice, sans dépendance. */
export function versCsv(donnees: Suivi, lignes: Transaction[]): void {
  const table = [
    ['Reference', 'Date', 'Montant FCFA', 'Statut', 'Etablissement', 'Cagnotte', 'Payeur'],
    ...lignes.map((t) => [
      t.reference, t.date, String(t.montant),
      LIBELLES[t.statut] ?? t.statut, t.etablissement, t.cagnotte, t.payeur,
    ]),
  ]
  const csv = table
    .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  // BOM UTF-8 : sans lui, un Excel français affiche « Rémi » en « RÃ©mi ».
  telecharger(
    new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
    `tonji-suivi-${donnees.periode.depuis}-${donnees.periode.jusqua}.csv`,
  )
}

/**
 * PDF — relevé imprimable, destiné à être classé ou remis à un comptable.
 *
 * Le module est importé à la demande : jsPDF pèse plusieurs centaines de
 * kilo-octets, et la grande majorité des visites du portail ne l'ouvriront
 * jamais. Le charger au démarrage ferait payer ce poids à tout le monde.
 */
export async function versPdf(
  donnees: Suivi,
  lignes: Transaction[],
  entete: { numero: string; etablissements: string; demo: boolean },
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const M = 14                      // marge
  const L = 210 - M * 2             // largeur utile
  let y = M

  const trait = () => { doc.setDrawColor(232, 237, 233); doc.line(M, y, M + L, y); y += 5 }

  // ── En-tête ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(10, 104, 71)
  doc.text('Tonji — Relevé des encaissements', M, y + 2); y += 9

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(74, 85, 104)
  doc.text(entete.etablissements || entete.numero, M, y); y += 4.5
  doc.text(`Période du ${donnees.periode.depuis} au ${donnees.periode.jusqua}`, M, y); y += 4.5
  doc.text(`Édité le ${new Date().toLocaleString('fr-FR')}`, M, y); y += 6

  if (entete.demo) {
    // Un relevé imprimé circule sans son contexte : s'il est fictif, il doit
    // le dire sur le papier, pas seulement à l'écran.
    doc.setFont('helvetica', 'bold'); doc.setTextColor(160, 68, 52)
    doc.text('DÉMONSTRATION — montants fictifs, sans valeur', M, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setTextColor(74, 85, 104)
  }

  trait()

  // ── Totaux ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(10, 104, 71)
  doc.text(`${montant(donnees.totaux.encaisse)} FCFA`, M, y + 2); y += 7
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(74, 85, 104)
  doc.text(
    `${donnees.totaux.nb_succes} reçu(s) · ${donnees.totaux.nb_echec} échoué(s) · ${donnees.totaux.nb_encours} en cours`,
    M, y,
  )
  y += 7
  trait()

  // ── Tableau ──────────────────────────────────────────────────────────
  // Colonnes posées à la main : sans jspdf-autotable, c'est le moyen le plus
  // court d'obtenir un alignement stable, et le montant doit être calé à
  // DROITE pour que les chiffres se lisent en colonne.
  const COL = { ref: M, date: M + 34, montant: M + 78, statut: M + 82, reste: M + 104 }

  const enTeteTableau = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(20, 32, 46)
    doc.text('Référence', COL.ref, y)
    doc.text('Date', COL.date, y)
    doc.text('Montant', COL.montant, y, { align: 'right' })
    doc.text('Statut', COL.statut, y)
    doc.text('Cagnotte / Payeur', COL.reste, y)
    y += 2; trait()
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  }

  enTeteTableau()

  for (const t of lignes) {
    // Saut de page avant d'écrire, jamais après : une ligne à moitié sous le
    // bord serait pire qu'une page de plus.
    if (y > 275) { doc.addPage(); y = M; enTeteTableau() }

    doc.setTextColor(20, 32, 46)
    doc.text(t.reference, COL.ref, y)
    doc.setTextColor(74, 85, 104)
    doc.text(t.date, COL.date, y)
    doc.setTextColor(20, 32, 46)
    doc.text(montant(t.montant), COL.montant, y, { align: 'right' })
    doc.setTextColor(74, 85, 104)
    doc.text(LIBELLES[t.statut] ?? t.statut, COL.statut, y)
    doc.text(
      doc.splitTextToSize(`${t.cagnotte} · ${t.payeur}`, M + L - COL.reste)[0] ?? '',
      COL.reste, y,
    )
    y += 5
  }

  // ── Pied de page, sur chaque page ────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7.5); doc.setTextColor(138, 148, 160)
    doc.text('Tonji — service édité par Paynala', M, 290)
    doc.text(`${p} / ${pages}`, M + L, 290, { align: 'right' })
  }

  doc.save(`tonji-suivi-${donnees.periode.depuis}-${donnees.periode.jusqua}.pdf`)
}
