/**
 * Écran post-création tontine — reproduction fidèle de
 * post_creation_tontine_screen.dart (qui délègue à post_creation_screen.dart
 * paramétré avec TypeCagnotte.tontinePeriodique).
 *
 * Process Flutter reproduit :
 *  - Fond dégradé plein-écran surface → surfaceDeep → surfaceDeeper.
 *  - Deux cercles glow (accent en haut-droite, primary en bas-gauche) + confettis.
 *  - Pastille succès VERTE (primary) avec coche — identique cotisation/tontine côté Flutter.
 *  - Titre « Tontine créée ! » + sous-titre « … est prête à accueillir ses membres. ».
 *  - Carte « NUMÉRO DE TONTINE » en OR (accent) avec bouton « Copier le numéro ».
 *  - Section « COMMENT VOULEZ-VOUS CONTINUER ? ».
 *  - Action 1 (filled VERT primary) : Partager le lien d'invitation → ouvre la
 *    feuille de choix de canal (App/Web + WhatsApp), miroir de
 *    TonjiPartage.afficherChoixInvitation.
 *  - Action 2 (outlined) : Enregistrer les membres → page participants.
 *  - Bouton « Plus tard » → accueil.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { chargerCagnotte, type CagnotteDetail } from '@/lib/cagnottesApi'
import { urlRejoindre, waRejoindre } from '@/lib/deeplink'

// ── Confettis ──────────────────────────────────────────────────────────────────
// Mêmes emojis, positions horizontales, délais et tailles que _Confettis (Flutter).
const CONFETTIS = [
  { emoji: '🎉', left: '8%',  delay: '0ms',   size: 28 },
  { emoji: '✨', left: '38%', delay: '120ms',  size: 22 },
  { emoji: '🎊', left: '72%', delay: '220ms',  size: 26 },
  { emoji: '⭐', left: '22%', delay: '350ms',  size: 20 },
  { emoji: '✨', left: '58%', delay: '450ms',  size: 22 },
  { emoji: '🎉', left: '88%', delay: '550ms',  size: 24 },
  { emoji: '🎊', left: '48%', delay: '680ms',  size: 20 },
]

// ── Icônes (équivalents SVG inline des Material Icons Flutter) ───────────────────
const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
)
const IconCheckSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconLink = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)
const IconGroupAdd = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/>
    <line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
)
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
// Icône WhatsApp (équivalent Icons.chat_rounded du sheet Flutter).
const IconChat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
)
const IconChevron = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ── Carte action ───────────────────────────────────────────────────────────────
// filled = style accentué (fond plein) ; sinon style secondaire (bordure).
// Côté tontine Flutter : action 1 = accentColor primary (vert) ; action 2 = null (bordure).
function CarteAction({ icon, titre, sous, filled, onClick }: {
  icon: React.ReactNode; titre: string; sous: string
  filled: boolean; onClick: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const bg     = filled ? T.primary : T.surfaceEl
  const fg     = filled ? T.surfaceEl : T.textStrong
  // Flutter : estAccent ? surfaceElevated@0.2 : primary@0.08 (fond icône).
  const iconBg = filled ? 'rgba(255,255,255,0.20)' : 'rgba(10,104,71,0.08)'
  // Flutter : estAccent ? surfaceElevated : primary (couleur icône) — vert en secondaire.
  const iconFg = filled ? T.surfaceEl : T.primary

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onClick() }}
      onPointerLeave={() => setPressed(false)}
      style={{
        padding: '16px', borderRadius: '16px', cursor: 'pointer',
        background: bg,
        border: filled ? 'none' : `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: '14px',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.12s',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconFg,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: fg, marginBottom: 1 }}>{titre}</p>
        <p style={{ fontSize: 13, color: filled ? 'rgba(255,255,255,0.70)' : T.textSec, lineHeight: 1.4 }}>{sous}</p>
      </div>
      <span style={{ color: filled ? 'rgba(255,255,255,0.50)' : T.textTert }}>
        <IconArrow />
      </span>
    </div>
  )
}

// ── Tuile de canal d'invitation (miroir de _OptionTuile, sheet Flutter) ─────────
function OptionTuile({ icon, iconColor, titre, sous, onClick }: {
  icon: React.ReactNode; iconColor: string; titre: string; sous: string; onClick: () => void
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onClick() }}
      onPointerLeave={() => setPressed(false)}
      style={{
        padding: 16, borderRadius: 16, cursor: 'pointer',
        background: T.surface, // Material color: surface (fond de la tuile)
        display: 'flex', alignItems: 'center', gap: 14,
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.12s',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${iconColor}1F`, // ~12% d'opacité (alpha hex 1F)
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: T.textStrong }}>{titre}</p>
        <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.35, marginTop: 2 }}>{sous}</p>
      </div>
      <span style={{ color: T.textTert }}><IconChevron /></span>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function MobilePostCreationTontine() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cagnotte, setCagnotte] = useState<CagnotteDetail | null>(null)
  const [erreur, setErreur]     = useState('')
  const [copied, setCopied]     = useState(false)
  // Pilote l'affichage du bottom-sheet de choix de canal d'invitation.
  const [sheetOuvert, setSheetOuvert] = useState(false)

  // ── Chargement de la cagnotte (équivalent cagnotteParIdProvider) ───────────
  useEffect(() => {
    if (!id) return
    chargerCagnotte(id)
      .then(c => c ? setCagnotte(c) : setErreur('Cagnotte introuvable'))
      .catch(e => setErreur(`${e}`))
  }, [id])

  // ── Copie de la référence (feedback « Copié ! » pendant 2 s) ───────────────
  const copierCode = async () => {
    const txt = cagnotte?.id ?? id ?? ''
    try { await navigator.clipboard.writeText(txt) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Partage App/Web (miroir de TonjiPartage.partagerLienApp) ───────────────
  const partagerLienApp = () => {
    if (!cagnotte) return
    const ref = cagnotte.id
    const lien = urlRejoindre(ref)
    const texte =
      `Je t'invite à rejoindre la tontine « ${cagnotte.titre} » (réf. ${ref}) sur Tonji.\n\n` +
      `📱 ${lien}`
    setSheetOuvert(false)
    if (navigator.share) {
      navigator.share({ title: `Invitation Tonji — ${cagnotte.titre}`, text: texte }).catch(() => {})
    } else {
      navigator.clipboard.writeText(texte).catch(() => {})
    }
  }

  // ── Partage WhatsApp (miroir de TonjiPartage.partagerLienWhatsApp) ─────────
  const partagerLienWhatsApp = () => {
    if (!cagnotte) return
    const waLien = waRejoindre(cagnotte.id)
    setSheetOuvert(false)
    if (!waLien) return // numéro bot non configuré : on n'ouvre rien (comme Flutter)
    const texte =
      `Je t'invite à rejoindre la tontine « ${cagnotte.titre} » sur Tonji.\n\n` +
      `💬 ${waLien}`
    if (navigator.share) {
      navigator.share({ title: `Invitation Tonji — ${cagnotte.titre}`, text: texte }).catch(() => {})
    } else {
      window.open(waLien, '_blank')
    }
  }

  // ── Chargement ──────────────────────────────────────────────────────────────
  if (!cagnotte && !erreur) {
    return (
      <div style={{ minHeight: '100dvh', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Erreur (miroir de _Erreur) ────────────────────────────────────────────
  if (erreur) {
    return (
      <div style={{ minHeight: '100dvh', background: T.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round" style={{ marginBottom: 12 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style={{ fontSize: 16, color: T.textStrong, textAlign: 'center', marginBottom: 16 }}>{erreur}</p>
        <button onClick={() => navigate('/dashboard')}
          style={{ padding: '14px 28px', borderRadius: 14, background: T.primary, color: T.surfaceEl, border: 'none', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin      { to { transform: rotate(360deg) } }
        @keyframes confetti  { 0%{opacity:0;transform:translateY(0) rotate(-15deg)} 10%{opacity:1} 80%{opacity:.6} 100%{opacity:0;transform:translateY(60vh) rotate(30deg)} }
        @keyframes scaleIn   { 0%{transform:scale(.4);opacity:0} 80%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sheetUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes drawCheck { to { stroke-dashoffset: 0 } }
        @keyframes popIn     { 0%{opacity:0;transform:scale(.5)} 60%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Fond dégradé plein-écran (Container hors Scaffold côté Flutter) */}
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${T.surface} 0%, ${T.surfaceDeep} 60%, ${T.surfaceDeeper} 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Cercles glow — accent en haut-droite, primary en bas-gauche */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(232,168,48,0.25)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(10,104,71,0.20)', filter: 'blur(70px)', pointerEvents: 'none' }} />

        {/* Confettis */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {CONFETTIS.map((c, i) => (
            <div key={i} style={{ position: 'absolute', top: -50, left: c.left, fontSize: c.size, animation: `confetti 2.6s ${c.delay} ease-in forwards` }}>
              {c.emoji}
            </div>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px 48px', maxWidth: 480, margin: '0 auto' }}>

          {/* Pastille succès — VERTE (primary), identique au Flutter pour tontine ET cotisation */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(10,104,71,0.12)',
              border: '2px solid rgba(10,104,71,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scaleIn 0.6s cubic-bezier(.34,1.56,.64,1) forwards',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke={T.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"
                  style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'drawCheck 0.5s 0.35s ease-out forwards' }} />
              </svg>
            </div>
          </div>

          {/* Titre unique + sous-titre porteur de l'info (miroir Flutter) */}
          <p style={{ fontSize: 32, fontWeight: 800, color: T.primary, textAlign: 'center', letterSpacing: '-0.5px', marginBottom: 6, animation: 'fadeSlide 0.5s 0.18s both' }}>
            Bravo !
          </p>
          <p style={{ fontSize: 15, color: T.textSec, textAlign: 'center', lineHeight: 1.5, marginBottom: 20, animation: 'fadeSlide 0.5s 0.35s both' }}>
            «&nbsp;{cagnotte?.titre}&nbsp;» est créée et prête à accueillir ses membres.
          </p>

          {/* Carte NUMÉRO DE TONTINE — carte entière cliquable, chiffres en cascade, OR (accent) */}
          {(() => {
            const code = String(cagnotte?.id ?? id ?? '')
            return (
              <div
                onClick={copierCode}
                style={{
                  padding: '18px 20px 16px', borderRadius: 20, marginBottom: 20, cursor: 'pointer',
                  background: T.surfaceEl,
                  border: `${copied ? 1.6 : 1}px solid ${copied ? T.accent : T.border}`,
                  boxShadow: `0 4px 16px rgba(232,168,48,${copied ? 0.22 : 0.10})`,
                  animation: 'fadeSlide 0.5s 0.45s both', transition: 'all 0.22s',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: T.textTert, letterSpacing: '1.4px', textAlign: 'center', marginBottom: 10 }}>
                  NUMÉRO DE TONTINE
                </p>

                {/* Chiffres animés un par un */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  {code.split('').map((ch, i) => (
                    <span key={i} style={{
                      fontSize: 40, fontWeight: 800, color: T.accent, lineHeight: 1.1,
                      fontFamily: 'monospace',
                      animation: `popIn 0.3s ${0.62 + i * 0.09}s both`,
                    }}>{ch}</span>
                  ))}
                </div>

                {/* Ligne d'aide qui devient la confirmation de copie */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: copied ? T.accent : T.textTert }}>
                  {copied ? <IconCheckSmall /> : <IconCopy />}
                  <span style={{ fontSize: 13, fontWeight: copied ? 700 : 500 }}>
                    {copied ? 'Copié !' : 'Appuyez pour copier'}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* Le libellé de section a été retiré : les deux cartes sont explicites. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Action 1 — Partager le lien d'invitation (filled VERT primary) */}
            <div style={{ animation: 'fadeSlide 0.5s 0.7s both' }}>
              <CarteAction
                icon={<IconLink />}
                titre="Partager le lien d'invitation"
                sous="Chacun s'inscrit lui-même."
                filled={true}
                onClick={() => setSheetOuvert(true)}
              />
            </div>
            {/* Action 2 — Enregistrer les membres (outlined) */}
            <div style={{ animation: 'fadeSlide 0.5s 0.8s both' }}>
              <CarteAction
                icon={<IconGroupAdd />}
                titre="Enregistrer les membres"
                sous="Un à un ou par lot."
                filled={false}
                onClick={() => navigate(`/cagnottes/${cagnotte?.id ?? id}/participants`, {
                  state: {
                    titre: cagnotte?.titre,
                    type: 'tontine_periodique',
                    max: cagnotte?.nombreParticipants,
                    inscrits: cagnotte?.nombreInscrits,
                  }
                })}
              />
            </div>
          </div>

          {/* Bouton « Plus tard » → accueil — resserré pour rester visible sans défiler */}
          <div style={{ textAlign: 'center', marginTop: 12, animation: 'fadeSlide 0.4s 0.9s both' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: T.primary, fontFamily: 'inherit', padding: '12px 16px', minHeight: 48, width: '100%' }}
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom-sheet « Inviter via… » (miroir de _InviterSheet Flutter) ──── */}
      {sheetOuvert && (
        <div
          onClick={() => setSheetOuvert(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(20,32,46,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'overlayIn 0.2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: T.surfaceEl,
              borderRadius: '24px 24px 0 0',
              padding: '12px 20px 32px',
              animation: 'sheetUp 0.25s cubic-bezier(.2,.8,.2,1)',
            }}
          >
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 20px' }} />

            <p style={{ fontWeight: 700, fontSize: 17, color: T.textStrong, textAlign: 'center', marginBottom: 20 }}>
              Inviter via…
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Canal App/Web */}
              <OptionTuile
                icon={<IconLink />}
                iconColor={T.primary}
                titre="Application / Web"
                sous="Lien valable sur iOS, Android et navigateur"
                onClick={partagerLienApp}
              />
              {/* Canal WhatsApp (vert WhatsApp #25D366) */}
              <OptionTuile
                icon={<IconChat />}
                iconColor="#25D366"
                titre="WhatsApp"
                sous="Ouvre WhatsApp avec le bot Tonji pré-rempli"
                onClick={partagerLienWhatsApp}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
