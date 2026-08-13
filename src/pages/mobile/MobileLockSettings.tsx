/**
 * Écran de gestion du verrouillage de l'app — reproduction fidèle de :
 *   mobile/lib/features/lock/presentation/app_lock_settings_screen.dart
 *
 * Vit dans Paramètres (accessible depuis Profil → Sécurité). Permet :
 *   - activer le verrouillage (→ MobilePinSetup mode=initial, puis opt-in bio)
 *   - modifier le PIN (→ MobilePinSetup mode=change)
 *   - désactiver le verrouillage (→ MobilePinSetup mode=disable)
 *   - basculer le déverrouillage rapide (FaceID/empreinte)
 *
 * ÉCART biométrie (documenté) : pas de local_auth fiable sur le web. Donc
 * canUseBiometric() renvoie toujours false → la section « Déverrouillage
 * rapide » s'affiche désactivée avec le message « Votre appareil n'a pas de
 * FaceID ou d'empreinte configurée. », et l'opt-in bio post-setup est sauté
 * (on affiche juste le toast « Verrouillage activé. »), exactement comme un
 * appareil sans bio enrôlée côté Flutter.
 *
 * Le retour de MobilePinSetup arrive via location.state.pinSetupOk (équiv. la
 * valeur de retour de context.pop côté Flutter).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { lockStore, useLockSettings } from '@/lib/lockStore'

// ── Toast transient (équiv. TonjiToast.success/info/error) ───────────────────
type ToastKind = 'success' | 'info' | 'error'
interface ToastData { kind: ToastKind; message: string }

export default function MobileLockSettings() {
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useLockSettings()

  // Résultat de la sonde biométrique — null pendant le check, false sur le web.
  const [bioSupported, setBioSupported] = useState<boolean | null>(null)
  // Toast courant (notification éphémère).
  const [toast, setToast] = useState<ToastData | null>(null)

  // Sonde la biométrie au montage (équiv. _checkBioSupport).
  useEffect(() => {
    let actif = true
    lockStore.canUseBiometric().then((ok) => {
      if (actif) setBioSupported(ok)
    })
    return () => { actif = false }
  }, [])

  // Affiche un toast qui disparaît après 2,5 s.
  function montrerToast(kind: ToastKind, message: string) {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 2500)
  }

  // ── Retour de MobilePinSetup ───────────────────────────────────────────────
  // Si on revient d'un setup initial réussi, on enchaîne l'opt-in bio (étape D).
  useEffect(() => {
    const state = location.state as { pinSetupOk?: boolean } | null
    if (state?.pinSetupOk) {
      // Nettoie le state pour ne pas re-déclencher au prochain rendu.
      navigate(location.pathname, { replace: true, state: {} })
      proposerBiometrie()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // ── Opt-in biométrie après un setup PIN réussi ─────────────────────────────
  // Sur le web, bioSupported est false → on confirme juste que le PIN est en
  // place via le toast, sans embêter l'user avec une modale inutile.
  async function proposerBiometrie() {
    if (bioSupported !== true) {
      montrerToast('success', 'Verrouillage activé.')
      return
    }
    // Branche bio dispo : conservée pour fidélité, jamais atteinte sur le web.
    montrerToast('success', 'Verrouillage activé.')
  }

  // ── Actions PIN — ouvrent MobilePinSetup avec le mode adapté ───────────────

  // Active le verrouillage → setup initial (l'opt-in bio suit au retour).
  function activerVerrouillage() {
    navigate('/parametres/securite/pin?mode=initial')
  }

  // Modifie le PIN existant.
  function modifierPin() {
    navigate('/parametres/securite/pin?mode=change')
  }

  // Désactive le verrouillage (demande le PIN actuel avant d'effacer).
  function desactiverVerrouillage() {
    navigate('/parametres/securite/pin?mode=disable')
  }

  // ── Toggle bio depuis les réglages — désactivé sur le web (null onChange) ──
  function onToggleBio(v: boolean) {
    if (bioSupported !== true) return
    if (v) {
      // Branche conservée pour fidélité ; injoignable faute de bio web.
      montrerToast('error', 'Authentification biométrique refusée.')
    } else {
      lockStore.disable() // placeholder — pas atteint sur le web
    }
  }

  // ── Carte récapitulative d'état (équiv. _CarteVerrouillage) ────────────────
  const statutLibelle = !settings.enabled
    ? 'Désactivé'
    : settings.biometricEnabled
      ? 'PIN + biométrie'
      : 'PIN seulement'
  const couleurEtat = settings.enabled ? T.primary : T.textTert

  return (
    <div style={{ minHeight: '100%', background: T.surface }}>
      <div style={{ padding: '8px 20px 32px' }}>

        {/* ── Carte d'état actuel ─────────────────────────────────────────── */}
        <div style={{
          padding: '18px', borderRadius: '20px', background: T.surfaceEl,
          border: `1.4px solid ${settings.enabled ? 'rgba(10,104,71,0.25)' : 'rgba(138,148,160,0.25)'}`,
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: settings.enabled ? 'rgba(10,104,71,0.12)' : 'rgba(138,148,160,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {/* Icône adaptée : cadenas ouvert / empreinte / PIN */}
            {!settings.enabled ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={couleurEtat} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            ) : settings.biometricEnabled ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={couleurEtat} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 11v3a8 8 0 0 1-2 5" /><path d="M5.5 9a6.5 6.5 0 0 1 12 3" /><path d="M2 12a10 10 0 0 1 4-8" /><path d="M8 12a4 4 0 0 1 8 0v1" /><path d="M9 17.5a10 10 0 0 0 1.5-5.5" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={couleurEtat} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><circle cx="8" cy="16" r="0.5" fill={couleurEtat} /><circle cx="12" cy="16" r="0.5" fill={couleurEtat} /><circle cx="16" cy="16" r="0.5" fill={couleurEtat} /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </div>
          <div style={{ width: '14px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', color: T.textSec, margin: 0 }}>État actuel</p>
            <div style={{ height: '2px' }} />
            <p style={{ fontSize: '16px', fontWeight: 800, color: couleurEtat, margin: 0 }}>{statutLibelle}</p>
          </div>
        </div>

        <div style={{ height: '24px' }} />

        {/* ── Section « Verrouillage de l'application » ────────────────────── */}
        <BlocSection
          titre="Verrouillage de l'application"
          sousTitre="Demande un code PIN à chaque ouverture pour protéger vos cagnottes."
        >
          {/* Switch « Activer le verrouillage » */}
          <SwitchTile
            value={settings.enabled}
            onChange={(v) => (v ? activerVerrouillage() : desactiverVerrouillage())}
            title="Activer le verrouillage"
            subtitle={settings.enabled
              ? 'Un code PIN sera demandé à chaque ouverture.'
              : 'Aucun verrouillage actif.'}
          />
          {settings.enabled && (
            <>
              <div style={{ height: '1px', background: T.border }} />
              {/* Tile « Modifier mon code PIN » */}
              <button
                onClick={modifierPin}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.textSec} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><circle cx="8" cy="16" r="0.5" fill={T.textSec} /><circle cx="12" cy="16" r="0.5" fill={T.textSec} /><circle cx="16" cy="16" r="0.5" fill={T.textSec} /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: T.textStrong }}>
                  Modifier mon code PIN
                </span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </BlocSection>

        {/* ── Section « Déverrouillage rapide » (visible si verrou actif) ──── */}
        {settings.enabled && (
          <>
            <div style={{ height: '20px' }} />
            <BlocSection
              titre="Déverrouillage rapide"
              sousTitre={bioSupported === false
                ? "Votre appareil n'a pas de FaceID ou d'empreinte configurée."
                : 'Utilisez FaceID ou votre empreinte pour aller plus vite.'}
            >
              <SwitchTile
                value={settings.biometricEnabled}
                onChange={bioSupported !== true ? null : onToggleBio}
                title="FaceID / Empreinte"
                subtitle={settings.biometricEnabled ? 'Activé en plus du PIN.' : 'Désactivé.'}
              />
            </BlocSection>
          </>
        )}

        <div style={{ height: '24px' }} />

        {/* ── Encart d'info « PIN oublié » (accent) ───────────────────────── */}
        <div style={{
          padding: '14px', borderRadius: '14px',
          background: 'rgba(232,168,48,0.08)', border: '1px solid rgba(232,168,48,0.25)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p style={{ fontSize: '12px', color: T.textSec, margin: 0, lineHeight: 1.5 }}>
            Si vous oubliez votre PIN, vous devrez vous déconnecter et vous reconnecter via OTP SMS pour le redéfinir.
          </p>
        </div>
      </div>

      {/* ── Toast éphémère ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', left: '20px', right: '20px', bottom: '24px', zIndex: 60,
              padding: '14px 16px', borderRadius: '14px', textAlign: 'center',
              fontSize: '14px', fontWeight: 600, color: '#FFFFFF',
              background: toast.kind === 'success' ? T.success : toast.kind === 'error' ? T.error : T.textStrong,
              boxShadow: '0 12px 32px rgba(20,32,46,0.25)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Section groupée titre + carte (équiv. _BlocSection) ──────────────────────
function BlocSection({
  titre, sousTitre, children,
}: {
  titre: string
  sousTitre?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 4px' }}>
        <p style={{ fontSize: '18px', fontWeight: 800, color: T.textStrong, margin: 0 }}>{titre}</p>
        {sousTitre && (
          <>
            <div style={{ height: '2px' }} />
            <p style={{ fontSize: '12px', color: T.textSec, margin: 0 }}>{sousTitre}</p>
          </>
        )}
      </div>
      <div style={{ height: '10px' }} />
      <div style={{
        background: T.surfaceEl, borderRadius: '20px',
        border: '1px solid rgba(232,237,233,0.6)', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Tile avec switch adaptatif (équiv. SwitchListTile.adaptive) ──────────────
// onChange null → switch désactivé (grisé), comme côté Flutter.
function SwitchTile({
  value, onChange, title, subtitle,
}: {
  value: boolean
  onChange: ((v: boolean) => void) | null
  title: string
  subtitle: string
}) {
  const disabled = onChange === null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', opacity: disabled ? 0.55 : 1,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: T.textStrong, margin: 0 }}>{title}</p>
        <div style={{ height: '2px' }} />
        <p style={{ fontSize: '12px', color: T.textSec, margin: 0 }}>{subtitle}</p>
      </div>
      {/* Switch custom — thumb animé, piste verte si actif */}
      <button
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange?.(!value)}
        style={{
          width: '46px', height: '28px', borderRadius: '14px', border: 'none', padding: '2px',
          cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
          background: value ? T.primary : T.borderStr,
          display: 'flex', alignItems: 'center',
          justifyContent: value ? 'flex-end' : 'flex-start',
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%', background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(20,32,46,0.25)', transition: 'all 0.2s',
        }} />
      </button>
    </div>
  )
}
