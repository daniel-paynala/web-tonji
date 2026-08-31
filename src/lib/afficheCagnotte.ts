/**
 * Génération de l'« affiche » IMAGE (PNG) d'une cagnotte — un flyer
 * imprimable/partageable qui porte un QR code de participation.
 *
 * Le QR encode l'URL universelle `app.tonji.ga/rejoindre/<reference>` : scanné, il
 * ouvre l'app si installée, sinon WhatsApp, sinon le web (chaîne gérée par la page
 * /rejoindre). Ici on ne s'occupe QUE de fabriquer l'image PNG.
 *
 * Rendu : on dessine tout sur un <canvas> hors-DOM (ratio A4 portrait, haute
 * résolution) puis on exporte en PNG via canvas.toDataURL('image/png').
 *
 * Mise en page (même design que l'ancien export PDF) :
 *   • logo Tonji dans un cercle vert en haut à gauche
 *   • nom de la cagnotte en haut (centré)
 *   • QR code au milieu (dans une carte blanche)
 *   • numéro de la cagnotte en bas (pastille verte)
 *   • couleurs de la charte Tonji, pas d'URL ni de footer
 */

import QRCode from 'qrcode'
import { urlRejoindre } from './deeplink'

// Palette Tonji (miroir de @/lib/tokens et de la page /rejoindre).
// Utilisée telle quelle comme fillStyle/strokeStyle du contexte canvas.
const COL = {
  primary: '#0A6847',
  accent: '#E8A830',
  surface: '#F6F7F4',
  ink: '#14202E',
  border: '#E8EDE9',
  white: '#FFFFFF',
} as const

// Pile de polices sans-serif (équivalent du « helvetica » de l'ancien jsPDF).
const FONT = 'Helvetica, Arial, sans-serif'

/**
 * Charge une URL (asset dans /public OU data URL) dans un HTMLImageElement prêt
 * à être passé à ctx.drawImage. Résout une fois l'image effectivement décodée.
 */
function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = src
  })
}

export interface AfficheCagnotte {
  /** Nom de la cagnotte (affiché en haut). */
  titre: string
  /** Référence numérique à 6 chiffres (affichée en bas + encodée dans le QR). */
  reference: string
}

/**
 * Génère et déclenche le téléchargement de l'affiche IMAGE (PNG) d'une cagnotte.
 * S'exécute côté navigateur (utilise Image / canvas / a[download]).
 */
export async function telechargerAfficheImage({ titre, reference }: AfficheCagnotte): Promise<void> {
  const url = urlRejoindre(reference)

  // QR sombre sur blanc, grande résolution (affiche imprimée en grand format).
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 900,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#14202E', light: '#FFFFFF' },
  })

  // On raisonne dans le repère A4 en millimètres (comme l'ancien PDF), puis on
  // multiplie par S pour obtenir des pixels canvas → mise en page identique.
  const W = 210 // largeur A4 (mm)
  const H = 297 // hauteur A4 (mm)
  const M = 14 // marge latérale (mm)
  const S = 1080 / W // facteur d'échelle mm → px (canvas de 1080 px de large)

  const mm = (v: number) => v * S // helper mm → px
  const pt = (p: number) => (p * 25.4) / 72 * S // helper points typo → px (1pt = 1/72")

  // Canvas hors-DOM au ratio A4 (1080 × 1527 px).
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(mm(W))
  canvas.height = Math.round(mm(H))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("Impossible d'obtenir le contexte 2D du canvas")

  // Baseline « alphabetic » : reproduit le positionnement du texte de jsPDF
  // (le y passé correspond à la ligne de base du texte).
  ctx.textBaseline = 'alphabetic'

  // Fond crème pleine page + ruban vert en haut.
  ctx.fillStyle = COL.surface
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = COL.primary
  ctx.fillRect(0, 0, canvas.width, mm(8))

  // Logo dans un CERCLE VERT (haut à gauche) — la couleur de marque ressort.
  const cd = 26 // diamètre du cercle (mm)
  const ccx = M + cd / 2
  const ccy = 20 + cd / 2
  ctx.fillStyle = COL.primary
  ctx.beginPath()
  ctx.arc(mm(ccx), mm(ccy), mm(cd / 2), 0, Math.PI * 2)
  ctx.fill()

  // Logo clair (foreground de l'icône) — pensé pour ressortir sur fond vert.
  // Chargement best-effort : si l'asset manque, on garde juste le cercle vert.
  try {
    const logo = await chargerImage('/logo-tonji-fg.png')
    const s = cd * 0.9 // le fg (déjà « paddé ») occupe 90 % du cercle
    ctx.drawImage(logo, mm(ccx - s / 2), mm(ccy - s / 2), mm(s), mm(s))
  } catch {
    /* pas de logo : on continue sans */
  }

  // Tagline — fait partie intégrante du logo (juste sous le cercle).
  ctx.fillStyle = COL.primary
  ctx.font = `${pt(8)}px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('Cotisez simplement.', mm(M), mm(ccy + cd / 2 + 5))

  // Sous-titre d'incitation.
  ctx.fillStyle = COL.accent
  ctx.font = `bold ${pt(11)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('SCANNEZ POUR PARTICIPER', mm(W / 2), mm(62))

  // Nom de la cagnotte (grand, centré, retour à la ligne si trop long).
  ctx.fillStyle = COL.ink
  ctx.font = `bold ${pt(26)}px ${FONT}`
  ctx.textAlign = 'center'
  const lignes = couperTexte(ctx, titre || 'Cagnotte', mm(W - 2 * M))
  const titreY = 76 // ligne de base de la 1re ligne (mm)
  const interligne = 10 // espacement vertical entre lignes (mm)
  lignes.forEach((ligne, i) => {
    ctx.fillText(ligne, mm(W / 2), mm(titreY + i * interligne))
  })
  const titreH = lignes.length * interligne

  // Grande carte blanche + QR AU MAXIMUM.
  const cardSize = 150
  const cardX = (W - cardSize) / 2
  const cardTop = titreY + titreH + 4
  cheminArrondi(ctx, mm(cardX), mm(cardTop), mm(cardSize), mm(cardSize), mm(10))
  ctx.fillStyle = COL.white
  ctx.fill()
  ctx.strokeStyle = COL.border
  ctx.lineWidth = mm(0.6)
  ctx.stroke()

  // QR au centre de la carte.
  const qrSize = 138
  const qrX = (W - qrSize) / 2
  const qrY = cardTop + (cardSize - qrSize) / 2
  const qr = await chargerImage(qrDataUrl)
  ctx.drawImage(qr, mm(qrX), mm(qrY), mm(qrSize), mm(qrSize))

  // Numéro de la cagnotte en bas (pastille verte).
  const pillW = 100
  const pillH = 22
  const pillX = (W - pillW) / 2
  const pillY = cardTop + cardSize + 14
  cheminArrondi(ctx, mm(pillX), mm(pillY), mm(pillW), mm(pillH), mm(11))
  ctx.fillStyle = COL.primary
  ctx.fill()
  ctx.fillStyle = COL.white
  ctx.textAlign = 'center'
  ctx.font = `bold ${pt(9)}px ${FONT}`
  ctx.fillText('NUMÉRO DE LA CAGNOTTE', mm(W / 2), mm(pillY + 8))
  ctx.font = `bold ${pt(20)}px ${FONT}`
  ctx.fillText(reference, mm(W / 2), mm(pillY + 17))

  // Export PNG + déclenchement du téléchargement via un <a download> synthétique.
  const dataUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `affiche-tonji-${reference}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Découpe un texte en lignes qui tiennent dans `largeurMax` px, en mesurant avec
 * la police courante du contexte (équivalent du splitTextToSize de jsPDF).
 */
function couperTexte(ctx: CanvasRenderingContext2D, texte: string, largeurMax: number): string[] {
  const mots = texte.split(/\s+/).filter(Boolean)
  const lignes: string[] = []
  let courante = ''
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot
    // Si la ligne d'essai déborde et qu'on a déjà du contenu, on passe à la ligne.
    if (ctx.measureText(essai).width > largeurMax && courante) {
      lignes.push(courante)
      courante = mot
    } else {
      courante = essai
    }
  }
  if (courante) lignes.push(courante)
  return lignes.length ? lignes : ['']
}

/**
 * Trace (sans remplir ni contourer) le chemin d'un rectangle à coins arrondis.
 * L'appelant décide ensuite du fill()/stroke(). Évite de dépendre de ctx.roundRect
 * (pas garanti dans tous les environnements de typage).
 */
function cheminArrondi(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2) // rayon borné (jamais > moitié du côté)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
