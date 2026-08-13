/**
 * Popup de téléchargement de l'application Tonji.
 *
 * Affiché une seule fois par session (clé sessionStorage `tonji-popup-done`).
 * - Mobile  : bottom sheet avec slide-up, handle de glissement
 * - Desktop : modal centré avec backdrop
 *
 * L'appelant gère l'état de visibilité ; ce composant ne se rend que
 * quand il est monté. Appeler onDismiss pour le fermer + persister le choix.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { DEEPLINK } from '@/lib/deeplink'

// ── Clé sessionStorage ────────────────────────────────────────────────────────

export const POPUP_SESSION_KEY = 'tonji-popup-done'

/** Retourne true si la popup doit être affichée cette session. */
export function shouldShowAppPopup(): boolean {
  return !sessionStorage.getItem(POPUP_SESSION_KEY)
}

/** Marque la popup comme vue pour la session en cours. */
export function markAppPopupDone(): void {
  sessionStorage.setItem(POPUP_SESSION_KEY, '1')
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface Props {
  /** Appelé quand l'utilisateur ferme la popup (bouton X ou lien "continuer"). */
  onDismiss: () => void
}

export default function AppDownloadPopup({ onDismiss }: Props) {
  const [isMobileLayout, setIsMobileLayout] = useState(false)

  /* Détecter la largeur d'écran côté client uniquement. */
  useEffect(() => {
    setIsMobileLayout(window.innerWidth < 640)
  }, [])

  const handleDismiss = () => {
    markAppPopupDone()
    onDismiss()
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,32,46,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9990,
        }}
      />

      {/* Card */}
      <motion.div
        key="card"
        initial={isMobileLayout ? { y: '100%', opacity: 0 } : { scale: 0.92, opacity: 0 }}
        animate={isMobileLayout ? { y: 0, opacity: 1 }       : { scale: 1,    opacity: 1 }}
        exit={isMobileLayout    ? { y: '100%', opacity: 0 }  : { scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          position: 'fixed',
          zIndex: 9991,
          ...(isMobileLayout ? {
            /* Bottom sheet sur mobile */
            bottom: 0, left: 0, right: 0,
            borderRadius: '24px 24px 0 0',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          } : {
            /* Modal centré sur desktop */
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 420,
            borderRadius: '24px',
          }),
          background: T.surfaceEl,
          boxShadow: '0 -4px 40px rgba(20,32,46,0.18)',
          overflow: 'hidden',
        }}
      >

        {/* Handle bar (mobile only) */}
        {isMobileLayout && (
          <div style={{
            width: 40, height: 4, borderRadius: 4,
            background: 'rgba(20,32,46,0.12)',
            margin: '14px auto 0',
          }} />
        )}

        {/* Bouton fermer */}
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(20,32,46,0.06)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.textSec,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Corps */}
        <div style={{ padding: '28px 28px 20px' }}>

          {/* Logo Tonji */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: T.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 16px rgba(10,104,71,0.30)`,
            }}>
              {/* Lettre T stylisée */}
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="4" y="6" width="20" height="3.5" rx="1.75" fill="white"/>
                <rect x="11.25" y="9.5" width="5.5" height="13" rx="2.75" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.textStrong, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Tonji</div>
              <div style={{ fontSize: 12, color: T.textSec, marginTop: 3 }}>Tontines &amp; cagnottes</div>
            </div>
          </div>

          {/* Titre */}
          <div style={{ fontSize: 18, fontWeight: 700, color: T.textStrong, marginBottom: 10, lineHeight: 1.3 }}>
            L'application Tonji est disponible
          </div>

          {/* Description */}
          <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.65, marginBottom: 26 }}>
            Gérez vos tontines et cagnottes, recevez des notifications en temps réel et accédez à votre compte même hors connexion.
          </div>

          {/* Séparateur */}
          <div style={{ height: 1, background: T.border, marginBottom: 20 }} />

          {/* Boutons stores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StoreBadge
              label="App Store"
              sublabel="Télécharger sur l'"
              href={DEEPLINK.appStoreUrl}
              icon={<AppleIcon />}
              bg="#000000"
            />
            <StoreBadge
              label="Google Play"
              sublabel="Disponible sur"
              href={DEEPLINK.playStoreUrl}
              icon={<PlayIcon />}
              bg="#14202E"
            />
          </div>

          {/* Lien "continuer sur le web" */}
          <button
            onClick={handleDismiss}
            style={{
              marginTop: 20,
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: T.textSec,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 0',
            }}
          >
            Continuer sur le web
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Badge store ───────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string
  sublabel: string
  href: string
  icon: React.ReactNode
  bg: string
}

function StoreBadge({ label, sublabel, href, icon, bg }: BadgeProps) {
  /* Si l'URL n'est pas encore configurée, bouton désactivé avec "Bientôt". */
  const isReady = href && href !== '#'

  if (!isReady) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px', borderRadius: 14,
        background: 'rgba(20,32,46,0.04)',
        border: `1px solid ${T.border}`,
        opacity: 0.6,
      }}>
        <div style={{ color: T.textSec, flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 10, color: T.textTert, letterSpacing: '0.3px' }}>{sublabel}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.textStrong }}>{label}</div>
        </div>
        <div style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 700,
          color: T.accent, background: `rgba(232,168,48,0.12)`,
          padding: '4px 10px', borderRadius: 20,
        }}>
          Bientôt
        </div>
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px', borderRadius: 14,
        background: bg, color: '#fff',
        textDecoration: 'none',
        boxShadow: `0 2px 12px rgba(0,0,0,0.20)`,
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.3px' }}>{sublabel}</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ marginLeft: 'auto', opacity: 0.5 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
    </a>
  )
}

// ── Icônes SVG ────────────────────────────────────────────────────────────────

function AppleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function PlayIcon() {
  /* Icône Google Play stylisée — triangle de lecture coloré */
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M5 3.8L18.4 12 5 20.2V3.8z" fill="#4CAF50"/>
      <path d="M5 3.8l7.7 8.2L5 20.2" fill="#1E88E5"/>
      <path d="M5 3.8l7.7 8.2 5.7-3.4" fill="#E53935"/>
      <path d="M5 20.2l7.7-8.2 5.7 3.4" fill="#FFB300"/>
    </svg>
  )
}
