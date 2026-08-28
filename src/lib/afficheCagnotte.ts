/**
 * Génération de l'« affiche » PDF d'une cagnotte — un flyer imprimable/partageable
 * qui porte un QR code de participation.
 *
 * Le QR encode l'URL universelle `app.tonji.ga/rejoindre/<reference>` : scanné, il
 * ouvre l'app si installée, sinon WhatsApp, sinon le web (chaîne gérée par la page
 * /rejoindre). Ici on ne s'occupe QUE de fabriquer le PDF.
 *
 * Mise en page (A4 portrait) :
 *   • logo Tonji en haut à gauche
 *   • nom de la cagnotte en haut (centré)
 *   • QR code au milieu (dans une carte blanche)
 *   • numéro de la cagnotte en bas (pastille verte)
 *   • couleurs de la charte Tonji
 */

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { urlRejoindre } from './deeplink'

// Palette Tonji (miroir de @/lib/tokens et de la page /rejoindre).
const COL = {
  primary: '#0A6847',
  accent: '#E8A830',
  surface: '#F6F7F4',
  ink: '#14202E',
  textSec: '#4A5568',
  border: '#E8EDE9',
  white: '#FFFFFF',
} as const

/** Convertit un hex `#RRGGBB` en triplet [r, g, b] pour les setters jsPDF. */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Charge une image (asset dans /public) en dataURL + ratio largeur/hauteur. */
async function chargerImage(url: string): Promise<{ dataUrl: string; ratio: number }> {
  const res = await fetch(url)
  const blob = await res.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
  const ratio = await new Promise<number>((resolve) => {
    const im = new Image()
    im.onload = () => resolve(im.naturalHeight ? im.naturalWidth / im.naturalHeight : 3)
    im.onerror = () => resolve(3)
    im.src = dataUrl
  })
  return { dataUrl, ratio }
}

export interface AfficheCagnotte {
  /** Nom de la cagnotte (affiché en haut). */
  titre: string
  /** Référence numérique à 6 chiffres (affichée en bas + encodée dans le QR). */
  reference: string
}

/**
 * Génère et déclenche le téléchargement de l'affiche PDF d'une cagnotte.
 * S'exécute côté navigateur (utilise fetch / FileReader / Image).
 */
export async function telechargerAffichePdf({ titre, reference }: AfficheCagnotte): Promise<void> {
  const url = urlRejoindre(reference)

  // QR sombre sur blanc, grande résolution (affiche imprimée en grand format).
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 900,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#14202E', light: '#FFFFFF' },
  })

  // Logo clair (foreground de l'icône) — pensé pour ressortir sur fond vert.
  let logo: { dataUrl: string; ratio: number } | null = null
  try {
    logo = await chargerImage('/logo-tonji-fg.png')
  } catch {
    logo = null
  }

  // compress:true → flux compressés (FlateDecode) : PDF léger.
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = 210 // largeur A4
  const H = 297 // hauteur A4
  const M = 14 // marge latérale

  // Fond crème pleine page + ruban vert en haut.
  doc.setFillColor(...rgb(COL.surface))
  doc.rect(0, 0, W, H, 'F')
  doc.setFillColor(...rgb(COL.primary))
  doc.rect(0, 0, W, 8, 'F')

  // Logo dans un CERCLE VERT (haut à gauche) — la couleur de marque ressort.
  const cd = 26 // diamètre du cercle
  const ccx = M + cd / 2
  const ccy = 20 + cd / 2
  doc.setFillColor(...rgb(COL.primary))
  doc.circle(ccx, ccy, cd / 2, 'F')
  if (logo) {
    const s = cd * 0.9 // le fg (déjà "paddé") occupe 90 % du cercle
    doc.addImage(logo.dataUrl, 'PNG', ccx - s / 2, ccy - s / 2, s, s)
  }

  // Tagline — fait partie intégrante du logo (juste sous le cercle).
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...rgb(COL.primary))
  doc.text('Cotisez simplement.', M, ccy + cd / 2 + 5)

  // Sous-titre d'incitation.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...rgb(COL.accent))
  doc.text('SCANNEZ POUR PARTICIPER', W / 2, 62, { align: 'center' })

  // Nom de la cagnotte (grand, centré, retour à la ligne si trop long).
  doc.setFontSize(26)
  doc.setTextColor(...rgb(COL.ink))
  const lignes = doc.splitTextToSize(titre || 'Cagnotte', W - 2 * M) as string[]
  const titreY = 76
  doc.text(lignes, W / 2, titreY, { align: 'center' })
  const titreH = lignes.length * 10

  // Grande carte blanche + QR AU MAXIMUM.
  const cardSize = 150
  const cardX = (W - cardSize) / 2
  const cardTop = titreY + titreH + 4
  doc.setFillColor(...rgb(COL.white))
  doc.setDrawColor(...rgb(COL.border))
  doc.setLineWidth(0.6)
  doc.roundedRect(cardX, cardTop, cardSize, cardSize, 10, 10, 'FD')
  const qrSize = 138
  const qrX = (W - qrSize) / 2
  const qrY = cardTop + (cardSize - qrSize) / 2
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  // Numéro de la cagnotte en bas (pastille verte).
  const pillW = 100
  const pillH = 22
  const pillX = (W - pillW) / 2
  const pillY = cardTop + cardSize + 14
  doc.setFillColor(...rgb(COL.primary))
  doc.roundedRect(pillX, pillY, pillW, pillH, 11, 11, 'F')
  doc.setTextColor(...rgb(COL.white))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('NUMÉRO DE LA CAGNOTTE', W / 2, pillY + 8, { align: 'center' })
  doc.setFontSize(20)
  doc.text(reference, W / 2, pillY + 17, { align: 'center' })

  doc.save(`affiche-tonji-${reference}.pdf`)
}
