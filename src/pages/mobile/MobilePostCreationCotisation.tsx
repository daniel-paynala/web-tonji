/**
 * Écran post-création cotisation — reproduction exacte de
 * post_creation_cagnotte_screen.dart Flutter.
 *
 * Gradient plein-écran surface→surfaceDeep→surfaceDeeper
 * Carte #code vert (primary), confettis, actions : Partager + Voir le détail
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { chargerCagnotte, type CagnotteDetail } from '@/lib/cagnottesApi'

// ── Confettis ──────────────────────────────────────────────────────────────────
const CONFETTIS = [
  { emoji: '🎉', left: '8%',  delay: '0ms',   size: 28 },
  { emoji: '✨', left: '38%', delay: '120ms',  size: 22 },
  { emoji: '🎊', left: '72%', delay: '220ms',  size: 26 },
  { emoji: '⭐', left: '22%', delay: '350ms',  size: 20 },
  { emoji: '✨', left: '58%', delay: '450ms',  size: 22 },
  { emoji: '🎉', left: '88%', delay: '550ms',  size: 24 },
  { emoji: '🎊', left: '48%', delay: '680ms',  size: 20 },
]

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
    stroke={T.surfaceEl} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
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
const IconDetail = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)

// ── Carte action ───────────────────────────────────────────────────────────────
function CarteAction({ icon, titre, sous, accent, onClick }: {
  icon: React.ReactNode; titre: string; sous: string
  accent: boolean; onClick: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const bg    = accent ? T.primary : T.surfaceEl
  const fg    = accent ? T.surfaceEl : T.textStrong
  const iconBg = accent
    ? 'rgba(251,247,240,0.20)'
    : 'rgba(201,123,74,0.10)'
  const iconFg = accent ? T.surfaceEl : T.accent

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onClick() }}
      onPointerLeave={() => setPressed(false)}
      style={{
        padding: '16px', borderRadius: '16px', cursor: 'pointer',
        background: bg,
        border: accent ? 'none' : `1px solid ${T.border}`,
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
        <p style={{ fontSize: 13, color: accent ? `rgba(251,247,240,0.70)` : T.textSec, lineHeight: 1.4 }}>{sous}</p>
      </div>
      <span style={{ color: accent ? `rgba(251,247,240,0.50)` : T.textTert }}>
        <IconArrow />
      </span>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function MobilePostCreationCotisation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cagnotte, setCagnotte] = useState<CagnotteDetail | null>(null)
  const [erreur, setErreur]     = useState('')
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    if (!id) return
    chargerCagnotte(id)
      .then(c => c ? setCagnotte(c) : setErreur('Cotisation introuvable.'))
      .catch(() => setErreur('Erreur lors du chargement.'))
  }, [id])

  const copier = async () => {
    const txt = cagnotte?.id ?? id ?? ''
    try { await navigator.clipboard.writeText(txt) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const partager = () => {
    const lien = `${window.location.origin}/rejoindre/${id}`
    if (navigator.share) {
      navigator.share({ title: 'Rejoindre la cotisation', url: lien }).catch(() => {})
    } else {
      navigator.clipboard.writeText(lien).catch(() => {})
    }
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  if (!cagnotte && !erreur) {
    return (
      <div style={{ minHeight: '100dvh', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Erreur ─────────────────────────────────────────────────────────────────
  if (erreur) {
    return (
      <div style={{ minHeight: '100dvh', background: T.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <p style={{ fontSize: 16, color: T.error, textAlign: 'center', marginBottom: 24 }}>{erreur}</p>
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
      `}</style>

      {/* ── Fond dégradé plein-écran (identique au Flutter Container hors Scaffold) */}
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${T.surface} 0%, ${T.surfaceDeep} 60%, #D9D2C0 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Cercles glow */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: '50%', background: `rgba(201,123,74,0.25)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -80, width: 280, height: 280, borderRadius: '50%', background: `rgba(15,76,92,0.20)`, filter: 'blur(70px)', pointerEvents: 'none' }} />

        {/* Confettis */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {CONFETTIS.map((c, i) => (
            <div key={i} style={{ position: 'absolute', top: -50, left: c.left, fontSize: c.size, animation: `confetti 2.6s ${c.delay} ease-in forwards` }}>
              {c.emoji}
            </div>
          ))}
        </div>

        {/* ── Contenu scrollable ─────────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px 48px', maxWidth: 480, margin: '0 auto' }}>

          {/* Pastille succès */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `rgba(15,76,92,0.12)`,
              border: `2px solid rgba(15,76,92,0.30)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scaleIn 0.6s cubic-bezier(.34,1.56,.64,1) forwards',
            }}>
              <IconCheck />
            </div>
          </div>

          {/* Titre */}
          <p style={{ fontSize: 28, fontWeight: 800, color: T.textStrong, textAlign: 'center', letterSpacing: '-0.5px', marginBottom: 6, animation: 'fadeSlide 0.5s 0.25s both' }}>
            Cotisation créée !
          </p>
          <p style={{ fontSize: 15, color: T.textSec, textAlign: 'center', lineHeight: 1.5, marginBottom: 28, animation: 'fadeSlide 0.5s 0.35s both' }}>
            «&nbsp;{cagnotte?.titre}&nbsp;» est prête à recevoir des cotisations.
          </p>

          {/* ── Carte #code (primary vert) ─────────────────────────────── */}
          <div style={{
            padding: 20, borderRadius: 20, marginBottom: 28,
            background: T.surfaceEl,
            border: `1px solid ${T.border}`,
            boxShadow: `0 4px 16px rgba(15,76,92,0.06)`,
            animation: 'fadeSlide 0.5s 0.45s both',
          }}>
            {/* Label */}
            <p style={{ fontSize: 11, fontWeight: 700, color: T.textTert, letterSpacing: '1.4px', textAlign: 'center', marginBottom: 12 }}>
              NUMÉRO DE COTISATION
            </p>

            {/* Numéro */}
            <p style={{
              fontSize: 40, fontWeight: 800, color: T.primary,
              textAlign: 'center', letterSpacing: '0px', lineHeight: 1.1,
              marginBottom: 6, fontFamily: 'monospace',
            }}>
              {cagnotte?.id ?? id}
            </p>

            {/* Sous-label */}
            <p style={{ fontSize: 13, color: T.textSec, textAlign: 'center', marginBottom: 16, lineHeight: 1.4 }}>
              Partagez ce code pour que vos membres puissent rejoindre la cotisation.
            </p>

            {/* Bouton copier */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={copier}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: copied ? T.primary : `rgba(15,76,92,0.10)`,
                  color: copied ? T.surfaceEl : T.primary,
                  fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? <IconCheckSmall /> : <IconCopy />}
                {copied ? 'Copié !' : 'Copier le code'}
              </button>
            </div>
          </div>

          {/* ── Section suite ──────────────────────────────────────────── */}
          <p style={{ fontSize: 11, fontWeight: 700, color: T.textTert, textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 12, paddingLeft: 4, animation: 'fadeSlide 0.4s 0.62s both' }}>
            Suite
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeSlide 0.5s 0.7s both' }}>
            <CarteAction
              icon={<IconLink />}
              titre="Partager le lien"
              sous="Chaque membre clique pour rejoindre et cotiser."
              accent={true}
              onClick={partager}
            />
            <CarteAction
              icon={<IconDetail />}
              titre="Voir le détail"
              sous="Accédez au suivi, à l'historique et aux participants."
              accent={false}
              onClick={() => navigate(`/cagnottes/${id}`)}
            />
          </div>

          {/* Bouton plus tard */}
          <div style={{ textAlign: 'center', marginTop: 32, animation: 'fadeSlide 0.4s 0.9s both' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: T.textSec, fontFamily: 'inherit', padding: '8px 16px' }}
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
