/**
 * Écran de déverrouillage de session — reproduction fidèle de :
 *   mobile/lib/features/lock/presentation/app_lock_gate_screen.dart
 *
 * Affiché quand l'app est lockée (lock_enabled=true ET session pas encore
 * unlocked). L'user peut :
 *   - taper son PIN à 4 chiffres → check via lockStore.verifyPin
 *   - faire un logout si PIN oublié (purge token + lock → retour connexion)
 *
 * ÉCART (documenté) : la biométrie native (FaceID/empreinte via local_auth)
 * n'existe pas sur le web. Côté Flutter, biometricEnabled est toujours false
 * sur le web (canUseBiometric() → false), donc le bloc « Utiliser FaceID /
 * empreinte » ne s'affiche jamais. Le PIN reste le seul mode de déverrouillage.
 *
 * Une fois unlocked → navigation vers /dashboard (équiv. context.go(home)).
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { lockStore, useLockSettings } from '@/lib/lockStore'
import { useAuthStore } from '@/store/authStore'
import { logout as apiLogout } from '@/lib/authApi'

// Longueur du PIN — fixe à 4 chiffres (équiv. _longueur Dart).
const LONGUEUR = 4

// ── Case PIN individuelle (équiv. _CasePin Dart) ─────────────────────────────
// TextField masqué (●) avec gestion du backspace, focus, et erreur.
function CasePin({
  value, focused, error, refEl, onChange, onKeyDown,
}: {
  value: string
  focused: boolean
  error: boolean
  refEl: (el: HTMLInputElement | null) => void
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const rempli = value.length > 0
  // Priorité couleur : erreur > focus > rempli > inactif (identique au Dart).
  const couleurBordure = error
    ? T.error
    : focused
      ? T.primary
      : rempli
        ? 'rgba(10,104,71,0.40)' // primary @ 40 %
        : T.border

  return (
    <input
      ref={refEl}
      type="password"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      style={{
        width: '58px', height: '68px', borderRadius: '16px', textAlign: 'center',
        fontSize: '30px', fontWeight: 800, color: T.textStrong,
        background: T.surfaceEl, outline: 'none', fontFamily: 'inherit',
        border: `${focused ? '2px' : '1.4px'} solid ${couleurBordure}`,
        caretColor: 'transparent', // showCursor: false côté Flutter
        transition: 'border-color 0.18s, border-width 0.18s',
        boxSizing: 'border-box',
      }}
    />
  )
}

export default function MobileLockGate() {
  const navigate = useNavigate()
  const settings = useLockSettings()        // pour cohérence (bio jamais affichée sur web)
  const logoutLocal = useAuthStore((s) => s.logout)

  // Un caractère par case (équiv. liste de contrôleurs Dart).
  const [code, setCode] = useState<string[]>(Array(LONGUEUR).fill(''))
  // Message d'erreur courant ; null = pas d'erreur.
  const [erreur, setErreur] = useState<string | null>(null)
  // true pendant la vérification — bloque les interactions.
  const [busy, setBusy] = useState(false)
  // Relance l'animation shake du message d'erreur.
  const [shakeKey, setShakeKey] = useState(0)
  // Modale « PIN oublié ? ».
  const [modalePinOublie, setModalePinOublie] = useState(false)

  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [focusIndex, setFocusIndex] = useState(0)

  // Focus sur la première case au montage (équiv. requestFocus post-frame).
  useEffect(() => {
    inputsRef.current[0]?.focus()
    setFocusIndex(0)
  }, [])

  // ── Vérifie le PIN saisi ; marque unlocked et redirige si correct ──────────
  async function verifierPin(pin: string) {
    if (busy) return
    if (pin.length !== LONGUEUR) {
      setErreur('PIN à 4 chiffres requis')
      setShakeKey((k) => k + 1)
      return
    }

    setBusy(true)
    const ok = await lockStore.verifyPin(pin) // comparaison de hachage locale

    if (!ok) {
      // Efface toutes les cases après un PIN incorrect.
      setCode(Array(LONGUEUR).fill(''))
      setErreur('PIN incorrect.')
      setShakeKey((k) => k + 1)
      setBusy(false)
      inputsRef.current[0]?.focus()
      setFocusIndex(0)
      return
    }

    lockStore.markUnlocked() // marque la session courante comme déverrouillée
    onUnlocked()
  }

  // Redirige vers l'écran principal après déverrouillage réussi.
  function onUnlocked() {
    navigate('/dashboard', { replace: true })
  }

  // ── Gère la saisie d'une case — avance le focus, auto-submit si complet ────
  function onChangeCase(index: number, valeur: string) {
    if (erreur) setErreur(null) // efface l'erreur dès qu'on retape

    // Cas paste multi-chiffres : distribue les chiffres dans les cases.
    if (valeur.length > 1) {
      const chiffres = valeur.replace(/\D/g, '')
      const next = Array(LONGUEUR).fill('').map((_, i) => chiffres[i] ?? '')
      setCode(next)
      const dest = Math.min(Math.max(chiffres.length - 1, 0), LONGUEUR - 1)
      inputsRef.current[dest]?.focus()
      setFocusIndex(dest)
      if (chiffres.length >= LONGUEUR) verifierPin(next.join(''))
      return
    }

    // Saisie normale : un seul chiffre (filtre non-numérique).
    const digit = valeur.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)

    if (digit && index < LONGUEUR - 1) {
      inputsRef.current[index + 1]?.focus() // avance à la case suivante
      setFocusIndex(index + 1)
    }
    if (next.join('').length === LONGUEUR) verifierPin(next.join('')) // auto-submit
  }

  // Backspace sur une case vide — recule le focus et efface la case précédente.
  function onKeyDownCase(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const next = [...code]
      next[index - 1] = ''
      setCode(next)
      inputsRef.current[index - 1]?.focus()
      setFocusIndex(index - 1)
    }
  }

  // ── Déconnexion (seul moyen de récupérer un PIN oublié) ────────────────────
  async function confirmerLogout() {
    setModalePinOublie(false)
    lockStore.disable()        // efface le PIN stocké
    try {
      await apiLogout()        // révoque le token Sanctum côté backend
    } catch {
      // On déconnecte quand même localement même si l'appel réseau échoue.
    }
    logoutLocal()              // purge le store auth (token + user)
    navigate('/connexion', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100svh', background: T.surface, display: 'flex', flexDirection: 'column',
      padding: '24px', boxSizing: 'border-box',
    }}>
      {/* Pas d'AppBar — mode « kiosque » : se déverrouiller ou se déconnecter. */}
      <div style={{ height: '24px' }} />

      {/* Icône cadenas dans un cercle (fadeIn + scale easeOutBack) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          width: '72px', height: '72px', borderRadius: '50%', alignSelf: 'center',
          background: 'rgba(10,104,71,0.10)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill={T.primary}>
          <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm3 8H9V6a3 3 0 016 0v3z" />
        </svg>
      </motion.div>

      <div style={{ height: '16px' }} />
      <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, textAlign: 'center', margin: 0 }}>
        Tonji verrouillé
      </p>
      <div style={{ height: '6px' }} />
      <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', margin: 0 }}>
        Tapez votre PIN à 4 chiffres pour continuer.
      </p>

      <div style={{ height: '40px' }} />

      {/* 4 cases PIN (spaceEvenly) */}
      <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
        {Array.from({ length: LONGUEUR }, (_, i) => (
          <CasePin
            key={i}
            value={code[i]}
            focused={focusIndex === i}
            error={erreur !== null}
            refEl={(el) => { inputsRef.current[i] = el }}
            onChange={(v) => onChangeCase(i, v)}
            onKeyDown={(e) => onKeyDownCase(i, e)}
          />
        ))}
      </div>

      {/* Message d'erreur (shake + fadeIn) */}
      <AnimatePresence>
        {erreur && (
          <motion.div
            key={shakeKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.2 }, x: { duration: 0.4 } }}
            style={{ marginTop: '16px', textAlign: 'center', color: T.error, fontSize: '14px', fontWeight: 600 }}
          >
            {erreur}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer pousse les actions en bas (équiv. const Spacer()) */}
      <div style={{ flex: 1 }} />

      {/* Bloc bio : jamais affiché sur le web (biometricEnabled toujours false). */}
      {settings.biometricEnabled && (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <button
            disabled={busy}
            style={{
              background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer',
              color: T.primary, fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px',
            }}
          >
            Utiliser FaceID / empreinte
          </button>
        </div>
      )}

      {/* « PIN oublié ? » */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setModalePinOublie(true)}
          disabled={busy}
          style={{
            background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer',
            color: T.primary, fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', padding: '10px',
          }}
        >
          PIN oublié ?
        </button>
      </div>
      <div style={{ height: '16px' }} />

      {/* ── Modale de confirmation « PIN oublié ? » ──────────────────────────── */}
      <AnimatePresence>
        {modalePinOublie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(20,32,46,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            }}
            onClick={() => setModalePinOublie(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '360px', background: T.surfaceEl, borderRadius: '20px',
                border: '1px solid rgba(212,218,213,0.6)', padding: '24px 20px 16px',
                boxShadow: '0 20px 48px rgba(20,32,46,0.25)',
              }}
            >
              <p style={{ fontSize: '18px', fontWeight: 700, color: T.textStrong, margin: 0 }}>
                PIN oublié ?
              </p>
              <p style={{ marginTop: '10px', fontSize: '14px', color: T.textSec, lineHeight: 1.5 }}>
                Vous serez déconnecté et devrez vous reconnecter via un code SMS pour redéfinir un nouveau PIN.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setModalePinOublie(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.primary, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', padding: '10px 12px',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmerLogout}
                  style={{
                    background: T.error, border: 'none', borderRadius: '12px', cursor: 'pointer',
                    color: '#FFFFFF', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', padding: '12px 18px',
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
