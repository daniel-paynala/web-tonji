/**
 * Écran post-création cotisation — reproduction fidèle de
 * post_creation_cagnotte_screen.dart → post_creation_screen.dart (estTontine = false).
 *
 * Fond dégradé plein-écran surface→surfaceDeep→surfaceDeeper, deux cercles glow
 * (accent en haut, primary en bas), confettis emoji tombants.
 * Icône succès vert (primary), titre « Cagnotte créée ! », carte code en OR (accent),
 * section « SUITE », action 1 (Partager le lien, fond accent/or) ouvrant le choix
 * d'invitation, action 2 (Voir le détail, bordure), puis bouton texte « Plus tard ».
 *
 * Le partage déclenche le bottom sheet « Inviter via… » (TonjiPartage.afficherChoixInvitation)
 * avec deux canaux : Application / Web et WhatsApp.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { chargerCagnotte, type CagnotteDetail } from '@/lib/cagnottesApi'
import { urlRejoindre, waRejoindre } from '@/lib/deeplink'

// ── Confettis ──────────────────────────────────────────────────────────────────
// Définition statique : emoji, position horizontale, délai, taille (cf. _Confettis Flutter).
const CONFETTIS = [
  { emoji: '🎉', left: '8%',  delay: '0ms',   size: 28 },
  { emoji: '✨', left: '38%', delay: '120ms', size: 22 },
  { emoji: '🎊', left: '72%', delay: '220ms', size: 26 },
  { emoji: '⭐', left: '22%', delay: '350ms', size: 20 },
  { emoji: '✨', left: '58%', delay: '450ms', size: 22 },
  { emoji: '🎉', left: '88%', delay: '550ms', size: 24 },
  { emoji: '🎊', left: '48%', delay: '680ms', size: 20 },
]

// ── Icônes (équivalents SVG des Material Icons utilisées par Flutter) ────────────

/** check_rounded — gros check dont le trait se dessine (dashoffset animé). */
const IconCheck = ({ color }: { color: string }) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"
      style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'drawCheck 0.5s 0.35s ease-out forwards' }} />
  </svg>
)
/** copy_rounded — bouton « Copier le code ». */
const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
)
/** check_rounded — petit check après copie (« Copié ! »). */
const IconCheckSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
/** link_rounded — action « Partager le lien ». */
const IconLink = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)
/** receipt_long_rounded — action « Voir le détail ». */
const IconDetail = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
/** arrow_forward_ios_rounded — chevron de fin de carte. */
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
/** chevron_right_rounded — chevron des tuiles du bottom sheet. */
const IconChevron = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
/** chat_rounded — canal WhatsApp dans le bottom sheet. */
const IconChat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
)
/** link_rounded (taille tuile) — canal Application / Web dans le bottom sheet. */
const IconLinkTuile = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)

// ── Carte action ───────────────────────────────────────────────────────────────
/**
 * Carte cliquable d'action (cf. _CarteAction Flutter).
 * accent != null → style accentué (fond coloré) ; null → style secondaire (bordure).
 * Ici l'accent de la cotisation est l'OR (T.accent).
 */
function CarteAction({ icon, titre, sous, accentColor, onClick }: {
  icon: React.ReactNode; titre: string; sous: string
  accentColor: string | null; onClick: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const estAccent = accentColor != null
  const bg     = estAccent ? accentColor! : T.surfaceEl
  const fg     = estAccent ? T.surfaceEl : T.textStrong
  // Style accentué : icône claire sur fond translucide ; secondaire : icône primary teintée.
  const iconBg = estAccent ? 'rgba(255,255,255,0.20)' : 'rgba(10,104,71,0.08)'
  const iconFg = estAccent ? T.surfaceEl : T.primary

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onClick() }}
      onPointerLeave={() => setPressed(false)}
      style={{
        padding: '16px', borderRadius: '16px', cursor: 'pointer',
        background: bg,
        border: estAccent ? 'none' : `1px solid ${T.border}`,
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
        <p style={{ fontSize: 13, color: estAccent ? 'rgba(255,255,255,0.70)' : `${T.textStrong}B3`, lineHeight: 1.4 }}>{sous}</p>
      </div>
      <span style={{ color: estAccent ? 'rgba(255,255,255,0.50)' : `${T.textStrong}80`, display: 'flex' }}>
        <IconArrow />
      </span>
    </div>
  )
}

// ── Bottom sheet d'invitation (cf. TonjiPartage / _InviterSheet) ────────────────
/** Tuile d'un canal d'invitation dans le bottom sheet. */
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
        background: T.surface, borderRadius: 16, padding: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        transform: pressed ? 'scale(0.98)' : 'scale(1)', transition: 'transform 0.12s',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${iconColor}1F`, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: T.textStrong, marginBottom: 2 }}>{titre}</p>
        <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.35 }}>{sous}</p>
      </div>
      <span style={{ color: T.textTert, display: 'flex' }}><IconChevron /></span>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function MobilePostCreationCotisation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cagnotte, setCagnotte] = useState<CagnotteDetail | null>(null)
  const [erreur, setErreur]     = useState('')
  const [copie, setCopie]       = useState(false)
  const [sheetOuvert, setSheetOuvert] = useState(false)

  // Chargement de la cagnotte fraîchement créée (cagnotteParIdProvider côté Flutter).
  useEffect(() => {
    if (!id) return
    chargerCagnotte(id)
      .then(c => c ? setCagnotte(c) : setErreur('Cagnotte introuvable'))
      .catch(e => setErreur(`${e}`))
  }, [id])

  // Copie de la référence dans le presse-papiers + feedback « Copié ! » 2 s (cf. _CarteCodeState).
  const copier = async () => {
    const txt = cagnotte?.id ?? id ?? ''
    try { await navigator.clipboard.writeText(txt) } catch { /* ignore */ }
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  // ── Partage : canal Application / Web (cf. TonjiPartage.partagerLienApp) ───────
  const partagerLienApp = () => {
    setSheetOuvert(false)
    const ref = cagnotte?.id ?? id ?? ''
    const titre = cagnotte?.titre ?? ''
    const texte =
      `Je t'invite à rejoindre la cagnotte « ${titre} » (réf. ${ref}) sur Tonji.\n\n` +
      `📱 ${urlRejoindre(ref)}`
    if (navigator.share) {
      navigator.share({ title: `Invitation Tonji — ${titre}`, text: texte }).catch(() => {})
    } else {
      navigator.clipboard.writeText(texte).catch(() => {})
    }
  }

  // ── Partage : canal WhatsApp (cf. TonjiPartage.partagerLienWhatsApp) ──────────
  const partagerLienWhatsApp = () => {
    setSheetOuvert(false)
    const ref = cagnotte?.id ?? id ?? ''
    const titre = cagnotte?.titre ?? ''
    const waLien = waRejoindre(ref)
    const texte =
      `Je t'invite à rejoindre la cagnotte « ${titre} » sur Tonji.\n\n` +
      `💬 ${waLien}`
    if (navigator.share) {
      navigator.share({ title: `Invitation Tonji — ${titre}`, text: texte }).catch(() => {})
    } else {
      navigator.clipboard.writeText(texte).catch(() => {})
    }
  }

  // ── Chargement ────────────────────────────────────────────────────────────────
  if (!cagnotte && !erreur) {
    return (
      <div style={{ minHeight: '100dvh', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Erreur (cf. _Erreur Flutter — error_outline + « Retour à l'accueil ») ──────
  if (erreur) {
    return (
      <div style={{ minHeight: '100dvh', background: T.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
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
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        /* Trait du check qui se dessine (dashoffset 24→0) */
        @keyframes drawCheck { to { stroke-dashoffset: 0 } }
        /* Chiffre du code qui pousse un à un */
        @keyframes popIn     { 0%{opacity:0;transform:scale(.5)} 60%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* ── Fond dégradé plein-écran (Container hors Scaffold Flutter) ── */}
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${T.surface} 0%, ${T.surfaceDeep} 60%, ${T.surfaceDeeper} 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Cercles glow — accent en haut-droite, primary en bas-gauche */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(232,168,48,0.25)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(10,104,71,0.20)', filter: 'blur(70px)', pointerEvents: 'none' }} />

        {/* Confettis tombants */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {CONFETTIS.map((c, i) => (
            <div key={i} style={{ position: 'absolute', top: -50, left: c.left, fontSize: c.size, animation: `confetti 2.6s ${c.delay} ease-in forwards` }}>
              {c.emoji}
            </div>
          ))}
        </div>

        {/* ── Contenu scrollable ───────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px 48px', maxWidth: 480, margin: '0 auto' }}>

          {/* Pastille succès — vert primary (check_rounded) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(10,104,71,0.12)',
              border: '2px solid rgba(10,104,71,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scaleIn 0.6s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              <IconCheck color={T.primary} />
            </div>
          </div>

          {/* Titre unique + sous-titre porteur de l'info (miroir Flutter) */}
          <p style={{ fontSize: 32, fontWeight: 800, color: T.primary, textAlign: 'center', letterSpacing: '-0.5px', marginBottom: 6, animation: 'fadeSlide 0.5s 0.18s both' }}>
            Bravo !
          </p>
          <p style={{ fontSize: 15, color: T.textSec, textAlign: 'center', lineHeight: 1.5, marginBottom: 20, animation: 'fadeSlide 0.5s 0.35s both' }}>
            «&nbsp;{cagnotte?.titre}&nbsp;» est créée et prête à recevoir les cotisations.
          </p>

          {/* ── Carte code — toute la carte est cliquable pour copier.
               Vert (primary) pour la cotisation ; les chiffres poussent un à un. ── */}
          {(() => {
            const code = String(cagnotte?.id ?? id ?? '')
            return (
              <div
                onClick={copier}
                style={{
                  padding: '18px 20px 16px', borderRadius: 20, marginBottom: 20, cursor: 'pointer',
                  background: T.surfaceEl,
                  border: `${copie ? 1.6 : 1}px solid ${copie ? T.primary : T.border}`,
                  boxShadow: `0 4px 16px rgba(10,104,71,${copie ? 0.22 : 0.10})`,
                  animation: 'fadeSlide 0.5s 0.45s both', transition: 'all 0.22s',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: T.textTert, letterSpacing: '1.4px', textAlign: 'center', marginBottom: 10 }}>
                  CODE DE LA CAGNOTTE
                </p>

                {/* Chiffres animés un par un */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  {code.split('').map((ch, i) => (
                    <span key={i} style={{
                      fontSize: 40, fontWeight: 800, color: T.primary, lineHeight: 1.1,
                      fontFamily: 'monospace',
                      animation: `popIn 0.3s ${0.62 + i * 0.09}s both`,
                    }}>{ch}</span>
                  ))}
                </div>

                {/* Ligne d'aide qui devient la confirmation de copie */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: copie ? T.primary : T.textTert }}>
                  {copie ? <IconCheckSmall /> : <IconCopy />}
                  <span style={{ fontSize: 13, fontWeight: copie ? 700 : 500 }}>
                    {copie ? 'Copié !' : 'Appuyez pour copier'}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* Le libellé « SUITE » a été retiré : les deux cartes sont explicites. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Action 1 — Partager le lien (fond OR/accent) */}
            <div style={{ animation: 'fadeSlide 0.5s 0.7s both' }}>
              <CarteAction
                icon={<IconLink />}
                titre="Partager le lien"
                sous="Pour rejoindre et cotiser."
                accentColor={T.accent}
                onClick={() => setSheetOuvert(true)}
              />
            </div>
            {/* Action 2 — Voir le détail (bordure, icône primary) */}
            <div style={{ animation: 'fadeSlide 0.5s 0.8s both' }}>
              <CarteAction
                icon={<IconDetail />}
                titre="Voir le détail"
                sous="Suivi, historique et membres."
                accentColor={null}
                onClick={() => navigate(`/cagnottes/${id}`)}
              />
            </div>
          </div>

          {/* Bouton texte « Plus tard » — resserré pour rester visible sans défiler */}
          <div style={{ textAlign: 'center', marginTop: 12, animation: 'fadeSlide 0.4s 0.9s both' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: T.primary, fontFamily: 'inherit', padding: '12px 16px', minHeight: 48 }}
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom sheet « Inviter via… » (TonjiPartage.afficherChoixInvitation) ── */}
      {sheetOuvert && (
        <div
          onClick={() => setSheetOuvert(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(20,32,46,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease both' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, background: T.surfaceEl,
              borderRadius: '24px 24px 0 0', padding: '12px 20px 32px',
              animation: 'sheetUp 0.28s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 20px' }} />
            <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, color: T.textStrong, marginBottom: 20 }}>
              Inviter à cotiser via…
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionTuile
                icon={<IconLinkTuile />}
                iconColor={T.primary}
                titre="Application / Web"
                sous="Lien valable sur iOS, Android et navigateur"
                onClick={partagerLienApp}
              />
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
