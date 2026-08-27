/**
 * Page d'atterrissage du lien d'invitation — `/rejoindre/:ref` (cible du QR).
 *
 * Canaux : APP MOBILE + WHATSAPP **uniquement** (pas de cotisation web).
 *  - App installée → le universal link `app.tonji.ga/rejoindre/<ref>` ouvre l'app
 *    directement (cette page ne se charge même pas).
 *  - Navigateur (app absente) → **redirection directe vers le bot WhatsApp** avec le
 *    message « TONJI <ref> » pré-rempli → la cotisation se fait dans le bot, sans
 *    compte ni OTP (le bot crée un compte light tout seul si besoin).
 */

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { waRejoindre } from '@/lib/deeplink'

const P = { primary: '#0A6847', surface: '#F6F7F4', textSec: '#4A5568' }

export default function InvitationPage() {
  const { token: ref = '' } = useParams<{ token: string }>()

  useEffect(() => {
    if (!ref) return
    const wa = waRejoindre(ref) // https://wa.me/<bot>?text=TONJI <ref>
    if (wa) window.location.replace(wa)
  }, [ref])

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: P.surface,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          border: `2.5px solid ${P.primary}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: 14, color: P.textSec, textAlign: 'center' }}>
        Ouverture de WhatsApp…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
