/**
 * Écran de saisie PIN à 4 chiffres avec étapes multiples — reproduction fidèle de :
 *   mobile/lib/features/lock/presentation/pin_setup_screen.dart
 *
 * 3 modes (équiv. PinSetupMode) pilotés par le param d'URL ?mode= :
 *   - initial : premier setup, 2 étapes (Choisir + Confirmer). À la fin :
 *               setupPin() puis retour aux réglages (qui propose la bio — étape D).
 *   - change  : changement de PIN, 3 étapes (PIN actuel + Nouveau + Confirmer).
 *   - disable : désactivation, 1 étape (PIN actuel → disable()).
 *
 * À la fermeture, on revient à /parametres/securite en signalant le succès via
 * location.state { pinSetupOk: true } (équiv. context.pop(true) côté Flutter).
 *
 * ÉCART : le GradientBackground Flutter (dégradé vert subtil) est rendu ici par
 * un fond surface uni — pas de composant gradient partagé exposé pour cet écran.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { lockStore } from '@/lib/lockStore'

// Longueur du PIN — fixe à 4 chiffres.
const LONGUEUR = 4

// Modes d'ouverture (équiv. enum PinSetupMode).
type PinSetupMode = 'initial' | 'change' | 'disable'

// Étapes internes de la machine d'état (équiv. enum _PinStep).
type PinStep = 'verifierActuel' | 'choisirNouveau' | 'confirmer'

// Regex de validation : exactement 4 chiffres.
const RE_PIN = /^\d{4}$/

// ── Case PIN individuelle (équiv. _CasePin Dart, avec halo en focus) ─────────
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
  // Priorité couleur : erreur > focus > rempli > inactif.
  const couleurBordure = error
    ? T.error
    : focused
      ? T.primary
      : rempli
        ? 'rgba(10,104,71,0.40)'
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
        caretColor: 'transparent',
        // Halo d'ombre uniquement sur la case en focus (équiv. boxShadow Dart).
        boxShadow: focused ? '0 4px 14px rgba(10,104,71,0.15)' : 'none',
        transition: 'border-color 0.18s, border-width 0.18s, box-shadow 0.18s',
        boxSizing: 'border-box',
      }}
    />
  )
}

export default function MobilePinSetup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Mode lu depuis l'URL ; défaut « initial » si absent/invalide.
  const modeParam = params.get('mode')
  const mode: PinSetupMode =
    modeParam === 'change' || modeParam === 'disable' ? modeParam : 'initial'

  // Étape de départ selon le mode (équiv. initState Dart).
  const [step, setStep] = useState<PinStep>(
    mode === 'initial' ? 'choisirNouveau' : 'verifierActuel',
  )

  // Cases PIN (un caractère par case).
  const [code, setCode] = useState<string[]>(Array(LONGUEUR).fill(''))
  // Nouveau PIN mémorisé entre « choisir » et « confirmer » (sans persister).
  const [nouveauPin, setNouveauPin] = useState<string | null>(null)
  // Message d'erreur courant ; null = pas d'erreur.
  const [erreur, setErreur] = useState<string | null>(null)
  // true pendant une opération async (setup/disable) — bloque les interactions.
  const [busy, setBusy] = useState(false)
  // Relance l'animation shake du message d'erreur.
  const [shakeKey, setShakeKey] = useState(0)

  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [focusIndex, setFocusIndex] = useState(0)

  // Focus sur la première case au montage (équiv. requestFocus post-frame).
  useEffect(() => {
    inputsRef.current[0]?.focus()
    setFocusIndex(0)
  }, [])

  // ── Titres contextuels (équiv. getters _titre / _sousTitre / _appBarTitle) ─

  // Titre de l'étape courante, affiché sous l'icône.
  const titre =
    step === 'verifierActuel'
      ? 'Votre PIN actuel'
      : step === 'choisirNouveau'
        ? mode === 'change' ? 'Nouveau PIN' : 'Choisissez un PIN'
        : 'Confirmez votre PIN'

  // Sous-titre adapté au mode et à l'étape.
  const sousTitre =
    step === 'verifierActuel'
      ? mode === 'disable'
        ? 'Tapez votre PIN pour désactiver le verrouillage.'
        : 'Tapez votre PIN actuel pour le modifier.'
      : step === 'choisirNouveau'
        ? "4 chiffres. Ce code sera demandé à chaque ouverture de l'app."
        : 'Retapez le PIN pour vérifier.'

  // Titre de la barre d'app — fixe pour toute la durée du mode.
  const appBarTitle =
    mode === 'initial'
      ? 'Définir un PIN'
      : mode === 'change'
        ? 'Modifier le PIN'
        : 'Désactiver le verrouillage'

  // ── Helpers d'étape ────────────────────────────────────────────────────────

  // Passe à l'étape suivante en vidant les cases et redonnant le focus.
  function allerEtape(next: PinStep) {
    setCode(Array(LONGUEUR).fill(''))
    setStep(next)
    setBusy(false)
    inputsRef.current[0]?.focus()
    setFocusIndex(0)
  }

  // Affiche une erreur et remet les cases à zéro.
  function setErreurEtRaz(message: string) {
    setCode(Array(LONGUEUR).fill(''))
    setErreur(message)
    setShakeKey((k) => k + 1)
    setBusy(false)
    inputsRef.current[0]?.focus()
    setFocusIndex(0)
  }

  // Ferme l'écran en signalant le résultat à l'appelant (équiv. context.pop).
  function fermer(succes: boolean) {
    navigate('/parametres/securite', { replace: true, state: { pinSetupOk: succes } })
  }

  // ── Machine d'état principale — traite le PIN selon l'étape et le mode ─────
  async function onPinComplet(pin: string) {
    if (busy) return
    if (!RE_PIN.test(pin)) {
      setErreur('PIN à 4 chiffres requis')
      setShakeKey((k) => k + 1)
      return
    }

    setBusy(true)

    switch (step) {
      case 'verifierActuel': {
        const ok = await lockStore.verifyPin(pin) // comparaison locale du hash
        if (!ok) {
          setErreurEtRaz('PIN incorrect.')
          return
        }
        if (mode === 'disable') {
          lockStore.disable() // efface le PIN et désactive le lock
          fermer(true)
          return
        }
        // mode change : passe à « choisir nouveau »
        allerEtape('choisirNouveau')
        return
      }

      case 'choisirNouveau': {
        setNouveauPin(pin) // mémorise sans persister — attend la confirmation
        allerEtape('confirmer')
        return
      }

      case 'confirmer': {
        if (pin !== nouveauPin) {
          setNouveauPin(null)
          // Repart de « choisir nouveau » pour éviter de retaper en boucle.
          setCode(Array(LONGUEUR).fill(''))
          setStep('choisirNouveau')
          setErreur('Les PIN ne correspondent pas. Réessayez.')
          setShakeKey((k) => k + 1)
          setBusy(false)
          inputsRef.current[0]?.focus()
          setFocusIndex(0)
          return
        }
        await lockStore.setupPin(pin) // persiste le hash du PIN
        // Retour aux réglages avec succès → enchaîne l'opt-in bio (étape D).
        fermer(true)
        return
      }
    }
  }

  // ── Saisie d'une case — avance le focus, auto-submit si complet ────────────
  function onChangeCase(index: number, valeur: string) {
    if (erreur) setErreur(null)

    // Paste multi-chiffres : distribue dans les cases.
    if (valeur.length > 1) {
      const chiffres = valeur.replace(/\D/g, '')
      const next = Array(LONGUEUR).fill('').map((_, i) => chiffres[i] ?? '')
      setCode(next)
      const dest = Math.min(Math.max(chiffres.length - 1, 0), LONGUEUR - 1)
      inputsRef.current[dest]?.focus()
      setFocusIndex(dest)
      if (chiffres.length >= LONGUEUR) onPinComplet(next.join(''))
      return
    }

    // Saisie normale : un seul chiffre.
    const digit = valeur.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)

    if (digit && index < LONGUEUR - 1) {
      inputsRef.current[index + 1]?.focus()
      setFocusIndex(index + 1)
    }
    if (next.join('').length === LONGUEUR) onPinComplet(next.join('')) // auto-submit
  }

  // Backspace sur case vide — recule d'une case et efface la précédente.
  function onKeyDownCase(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const next = [...code]
      next[index - 1] = ''
      setCode(next)
      inputsRef.current[index - 1]?.focus()
      setFocusIndex(index - 1)
    }
  }

  return (
    <div style={{
      minHeight: '100svh', background: T.surface, display: 'flex', flexDirection: 'column',
    }}>
      {/* AppBar : titre du mode + flèche retour (équiv. context.pop(false)) */}
      <header style={{
        height: '56px', minHeight: '56px', background: T.primary,
        display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <button
          onClick={() => fermer(false)}
          aria-label="Retour"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: T.surfaceEl,
            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontSize: '18px', fontWeight: 700, color: T.surfaceEl, letterSpacing: '-0.2px' }}>
          {appBarTitle}
        </span>
      </header>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '16px' }} />

        {/* Icône cadenas ouvert dans un cercle (fadeIn + scale easeOutBack) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: '64px', height: '64px', borderRadius: '50%', alignSelf: 'center',
            background: 'rgba(10,104,71,0.08)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        </motion.div>

        <div style={{ height: '20px' }} />
        <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, textAlign: 'center', margin: 0 }}>
          {titre}
        </p>
        <div style={{ height: '4px' }} />
        <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', margin: 0 }}>
          {sousTitre}
        </p>

        <div style={{ height: '36px' }} />

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

        {/* Spacer pousse le spinner en bas (équiv. const Spacer()) */}
        <div style={{ flex: 1 }} />

        {/* Spinner de chargement pendant l'opération async */}
        {busy && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '12px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
