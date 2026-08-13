/**
 * Écran de connexion mobile — reproduction fidèle de :
 *   - welcome_screen.dart   (slider promesses + champ numéro + Valider / Créer un compte + modale « numéro non inscrit »)
 *   - welcome_slider.dart   (slider 4 promesses, auto-avance 3,8 s, dots pill)
 *   - otp_verify_screen.dart (vérification OTP : 6 cases, cooldown 60 s, auto-advance, autofill)
 *
 * Les 4 chemins du flow auth (cf. Flutter) :
 *   A. Valider + numéro inscrit       → écran OTP (login) → /dashboard
 *   B. Valider + numéro NON inscrit   → modale « Numéro non inscrit »
 *        B1. Rectifier                → ferme la modale, le champ garde sa valeur
 *        B2. Créer un compte          → /inscription avec numéro pré-rempli + verrouillé
 *   C. Bouton « Créer un compte »     → /inscription (sans prefill)
 *
 * Fond vert primaire (PaynalaColors.primary) + halos, comme la splash, pour
 * une continuité visuelle directe. La carte basse crème porte la saisie.
 * Le slider se masque dès que le champ téléphone est focus (libère la place).
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { T } from '@/lib/tokens'
import { requestOtp, verifyOtpLogin } from '@/lib/authApi'
import { ApiError } from '@/lib/api'

// ── Constantes process (alignées Flutter) ──────────────────────────────────────
const INDICATIF = '+241'              // indicatif Gabon fixe pour l'écran Welcome
const LONGUEUR_CODE = 6               // longueur fixe du code OTP
const COOLDOWN_INIT = 60             // secondes avant renvoi (otp_verify_screen)
const SLIDER_INTERVAL = 3800        // ms entre deux avances auto (welcome_slider)

// ── Données des slides (textes EXACTS de welcome_slider.dart) ───────────────────
// onGreen = true : icône blanche (ou dorée si isAccent), texte blanc.
interface SlideData {
  titre: string
  sous: string
  isAccent: boolean
  // Icône Material reproduite en SVG inline (équivalent visuel).
  icon: (color: string) => React.ReactNode
}

// SVG inline équivalents aux IconData Material utilisées côté Flutter.
const icFamily = (c: string) => (
  // family_restroom_rounded
  <svg width="36" height="36" viewBox="0 0 24 24" fill={c}><path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-6H2.5l1.96-5.87C4.74 5.29 5.51 4.74 6.4 4.81c.05.01.93.19.93.19s.89.16.93.19c.89-.07 1.66.48 1.94 1.32L12.16 12H10.5v6h-2v4h-2v-4H4zm5.5-12c0-.83-.67-1.5-1.5-1.5S6.5 5.17 6.5 6 7.17 7.5 8 7.5 9.5 6.83 9.5 6zM20 18v-4h-1v-2c0-1.1-.9-2-2-2s-2 .9-2 2v2h-1v4h2v4h2v-4h2z"/></svg>
)
const icCelebration = (c: string) => (
  // celebration_rounded
  <svg width="36" height="36" viewBox="0 0 24 24" fill={c}><path d="M2 22l3.5-10.5L12.5 18.5 2 22zm6.6-7.6L7 11l8-8 3.5 3.5-8 8zM14 6l1.5-3.5L19 1l-1.5 3.5L14 6zm5 5l3.5-1.5L21 5l-3.5 1.5L19 11zm-7-7l1-2.5L15.5 0l-1 2.5L12 4zm10 6l-2.5 1L18 8l2.5-1L22 10z"/></svg>
)
const icShield = (c: string) => (
  // shield_rounded
  <svg width="36" height="36" viewBox="0 0 24 24" fill={c}><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"/></svg>
)
const icDiversity = (c: string) => (
  // diversity_3_rounded (cercle de personnes)
  <svg width="36" height="36" viewBox="0 0 24 24" fill={c}><path d="M12 2a3 3 0 100 6 3 3 0 000-6zM4 9a3 3 0 100 6 3 3 0 000-6zm16 0a3 3 0 100 6 3 3 0 000-6zM7 18a3 3 0 116 0 3 3 0 01-6 0zm5-7a4 4 0 00-3.2 1.6A4.99 4.99 0 0110 16h4a4.99 4.99 0 011.2-3.4A4 4 0 0012 11z"/></svg>
)

const SLIDES: SlideData[] = [
  { titre: 'Cotisez pour la famille',        sous: 'Une tontine en quelques minutes.',          isAccent: false, icon: icFamily },
  { titre: 'Mariage, anniversaire, soutien', sous: 'Une cagnotte pour chaque occasion.',         isAccent: true,  icon: icCelebration },
  { titre: 'Sécurisé et simple',             sous: "Mobile Money et code SMS — rien d'autre.",    isAccent: false, icon: icShield },
  { titre: 'Votre cercle, votre tontine',    sous: 'Partagez le lien, gérez les membres.',        isAccent: true,  icon: icDiversity },
]

// ── Slider de promesses (welcome_slider.dart, onGreen=true) ─────────────────────
function WelcomeSlider() {
  const [index, setIndex] = useState(0)

  // Auto-avance circulaire toutes les 3,8 s (Timer.periodic côté Flutter).
  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), SLIDER_INTERVAL)
    return () => clearInterval(t)
  }, [])

  const s = SLIDES[index]
  // Couleurs « onGreen » : icône blanche ou dorée (accent), cercle translucide.
  const iconColor = s.isAccent ? T.accent : '#FFFFFF'
  const circleBg = s.isAccent ? 'rgba(232,168,48,0.20)' : 'rgba(255,255,255,0.15)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}  // easeOutCubic
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}
          >
            {/* Cercle radial 76px + icône 36px */}
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: `radial-gradient(circle, ${circleBg} 0%, transparent 75%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {s.icon(iconColor)}
            </div>
            <p style={{ marginTop: '14px', fontSize: '17px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.2px', textAlign: 'center' }}>
              {s.titre}
            </p>
            <p style={{ marginTop: '4px', fontSize: '14px', color: 'rgba(255,255,255,0.72)', textAlign: 'center' }}>
              {s.sous}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots pill : actif = barre large blanche, inactif = point translucide */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px', gap: '8px' }}>
        {SLIDES.map((_, i) => {
          const actif = i === index
          return (
            <div key={i} style={{
              width: actif ? '22px' : '7px', height: '7px', borderRadius: '4px',
              background: actif ? '#FFFFFF' : 'rgba(255,255,255,0.30)',
              transition: 'all 0.25s ease',
            }} />
          )
        })}
      </div>
    </div>
  )
}

// ── Saisie OTP : 6 cases avec auto-advance, backspace, paste/autofill ───────────
function OtpInput({
  value, onChange, error,
}: { value: string; onChange: (v: string) => void; error: boolean }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputsRef.current[i]?.value && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = digit
    onChange(arr.join(''))
    if (digit && i < LONGUEUR_CODE - 1) inputsRef.current[i + 1]?.focus()
  }

  // Colle / autofill OS : remplit toutes les cases d'un coup.
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LONGUEUR_CODE)
    onChange(text.padEnd(LONGUEUR_CODE, ''))
    inputsRef.current[Math.min(text.length, LONGUEUR_CODE - 1)]?.focus()
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length: LONGUEUR_CODE }, (_, i) => {
        const rempli = Boolean(value[i])
        // Bordure : erreur (rouge) > rempli (primaire) > neutre.
        const borderColor = error ? T.error : rempli ? T.primary : T.border
        return (
          <input
            key={i}
            ref={el => { inputsRef.current[i] = el }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={value[i] || ''}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKey(i, e)}
            onPaste={handlePaste}
            style={{
              width: '48px', height: '60px', borderRadius: '14px', textAlign: 'center',
              fontSize: '26px', fontWeight: 800, color: T.textStrong, caretColor: T.primary,
              border: `${error || rempli ? '1.6px' : '1.2px'} solid ${borderColor}`,
              background: T.surfaceEl, outline: 'none', fontFamily: 'inherit',
              boxShadow: rempli && !error ? '0 0 0 3px rgba(10,104,71,0.10)' : 'none',
              transition: 'all 0.15s',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Spinner inline (bouton chargement) ──────────────────────────────────────────
function Spinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}

// ── Écran principal ─────────────────────────────────────────────────────────────
export default function MobileConnexion() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  // Conserve le paramètre ?next= pour rediriger après connexion (équiv. context.go).
  const nextUrl  = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'

  // Phase courante : saisie numéro (welcome) ou vérification OTP.
  const [phase, setPhase]     = useState<'welcome' | 'otp'>('welcome')

  // État champ numéro.
  const [numero, setNumero]   = useState('')
  const [champFocus, setChampFocus] = useState(false)  // masque le slider quand actif
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  // Erreur de validation / réseau affichée sous le champ numéro.
  const [erreurChamp, setErreurChamp] = useState<string | null>(null)

  // Modale « Numéro non inscrit ».
  const [modaleNonInscrit, setModaleNonInscrit] = useState<{ phoneE164: string } | null>(null)

  // État OTP.
  const [otp, setOtp]                 = useState('')
  const [erreurOtp, setErreurOtp]     = useState<string | null>(null)
  const [cooldown, setCooldown]       = useState(COOLDOWN_INIT)
  const [verifEnCours, setVerifEnCours] = useState(false)
  const [shakeKey, setShakeKey]       = useState(0)  // relance l'animation shake du bandeau

  // Décrément du cooldown chaque seconde (otp_verify_screen).
  useEffect(() => {
    if (phase !== 'otp' || cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [phase, cooldown])

  // ── Chemin Valider : envoie l'OTP et oriente selon existence du compte ─────────
  async function valider() {
    // Validateur ChampTelephoneGabon : 0 suivi de 8 chiffres.
    if (!/^0\d{8}$/.test(numero.trim())) {
      setErreurOtp(null)
      setModaleNonInscrit(null)
      setErreurChamp('Format : 0 suivi de 8 chiffres')
      return
    }
    setErreurChamp(null)
    setEnvoiEnCours(true)
    try {
      const res = await requestOtp(INDICATIF, numero.trim(), 'login')
      setEnvoiEnCours(false)

      if (!res.user_exists) {
        // Numéro inconnu côté backend → modale rectifier / créer (pas de SMS gaspillé).
        setModaleNonInscrit({ phoneE164: res.phone })
        return
      }

      // Numéro inscrit → écran OTP (login).
      setOtp('')
      setErreurOtp(null)
      setPhase('otp')
      setCooldown(COOLDOWN_INIT)
    } catch (e) {
      setEnvoiEnCours(false)
      // TonjiToast.error → message d'erreur backend affiché sous le champ.
      setErreurChamp(e instanceof ApiError ? e.message : 'Erreur réseau, réessayez.')
    }
  }

  // ── Modale B2 : « Créer un compte » → /inscription avec numéro verrouillé ──────
  function creerDepuisModale() {
    setModaleNonInscrit(null)
    navigate('/inscription', { state: { indicatif: INDICATIF, numero: numero.trim() } })
  }

  // ── Chemin C : bouton « Créer un compte » (sans prefill) ──────────────────────
  function allerVersInscription() {
    navigate('/inscription')
  }

  // ── Vérification OTP : compare longueur, appelle verify-otp (login) ────────────
  async function verifier(code: string) {
    if (code.length !== LONGUEUR_CODE) {
      setErreurOtp('Code à 6 chiffres requis')
      setShakeKey(k => k + 1)
      return
    }
    setErreurOtp(null)
    setVerifEnCours(true)
    try {
      const session = await verifyOtpLogin(INDICATIF, numero.trim(), code)
      login(
        {
          id: session.user.id,
          nom: session.user.nom,
          prenom: session.user.prenom,
          telephone: session.user.numero,
          typeClient: session.user.type_client as 'particulier' | 'entreprise' | 'marchand',
          dateNaissance: session.user.date_naissance,
          // Infos complémentaires propagées au store (sinon « Non renseigné » sur le profil).
          email: session.user.email,
          adresse: session.user.adresse,
          sexe: session.user.sexe,
          kycValide: session.user.kyc_valide,
        },
        session.token,
      )
      navigate(nextUrl, { replace: true })
    } catch (e) {
      setVerifEnCours(false)
      // Message backend (422 champ 'otp') ou fallback identique au Flutter.
      const msg = e instanceof ApiError
        ? e.message
        : 'Code incorrect. Veuillez vérifier le code reçu et réessayer.'
      // Vide les cases + redonne le focus + affiche le bandeau (avec shake).
      setOtp('')
      setErreurOtp(msg)
      setShakeKey(k => k + 1)
    }
  }

  // ── Renvoi du code : repart sur un cooldown de 60 s ───────────────────────────
  async function renvoyerCode() {
    if (cooldown > 0 || verifEnCours) return
    try {
      await requestOtp(INDICATIF, numero.trim(), 'login')
      setCooldown(COOLDOWN_INIT)
    } catch {
      setErreurOtp("Impossible d'envoyer le code. Réessayez.")
      setShakeKey(k => k + 1)
    }
  }

  // Retour depuis l'OTP vers le welcome (équiv. flèche AppBar).
  function retourWelcome() {
    setPhase('welcome')
    setOtp('')
    setErreurOtp(null)
  }

  // Le slider se masque dès que le champ téléphone est focus.
  const masquerSlider = champFocus

  return (
    <div style={{
      minHeight: '100svh', background: T.primary, display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* ── Halos décoratifs (GlowCircle, mêmes que la splash) ───────────────── */}
      <div style={{
        position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
        background: `rgba(232,168,48,0.25)`, filter: 'blur(70px)',
        top: '-80px', right: '-60px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '340px', height: '340px', borderRadius: '50%',
        background: `rgba(26,144,96,0.20)`, filter: 'blur(80px)',
        bottom: '-100px', left: '-80px', pointerEvents: 'none',
      }} />

      <AnimatePresence mode="wait">
        {phase === 'welcome' ? (
          // ════════════════ WELCOME ════════════════════════════════════════════
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 24px 24px' }}
          >
            {/* ── Top : brand + tagline + slider ──────────────────────────────── */}
            <div>
              <motion.img
                src="/logo-tonji-wordmark.png"
                alt="Tonji"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
                style={{ height: 120, width: 'auto', display: 'block', margin: 0 }}
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                style={{ marginTop: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.70)', letterSpacing: '0.4px' }}
              >
                Cotisez simplement.
              </motion.p>

              {/* Slider — masqué quand le champ téléphone est focus */}
              <AnimatePresence>
                {!masquerSlider && (
                  <motion.div
                    key="slider"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.32, ease: [0.33, 1, 0.68, 1] }}
                    style={{ overflow: 'hidden', paddingTop: '32px' }}
                  >
                    <WelcomeSlider />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Bottom : carte de connexion ────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
              style={{
                marginTop: '32px',
                background: T.surfaceEl, borderRadius: '28px',
                border: `1px solid rgba(212,218,213,0.6)`,
                boxShadow: '0 12px 32px rgba(10,104,71,0.08)',
                padding: '28px 24px 24px',
              }}
            >
              <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, margin: 0 }}>Bon retour</p>
              <p style={{ marginTop: '4px', fontSize: '14px', color: T.textSec }}>
                Entrez votre numéro pour vous connecter.
              </p>

              {/* Champ « Numéro Mobile Money » (ChampTelephoneGabon) */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {/* Pastille pays 🇬🇦 +241 (non éditable) */}
                <div style={{
                  height: '56px', padding: '0 12px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '6px',
                  background: T.surfaceEl, border: `1.2px solid ${T.border}`, whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontSize: '22px' }}>🇬🇦</span>
                  <span style={{ fontWeight: 700, color: T.textStrong, fontSize: '15px' }}>+241</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="0x xx xx xx xx"
                    value={numero}
                    onFocus={() => setChampFocus(true)}
                    onBlur={() => setChampFocus(false)}
                    onChange={e => setNumero(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onKeyDown={e => { if (e.key === 'Enter' && !envoiEnCours) valider() }}
                    style={{
                      width: '100%', height: '56px', borderRadius: '16px', padding: '0 16px', boxSizing: 'border-box',
                      border: `1.2px solid ${erreurChamp ? T.error : T.border}`, background: T.surfaceEl,
                      fontSize: '16px', fontWeight: 600, color: T.textStrong, outline: 'none', fontFamily: 'inherit',
                      letterSpacing: '0.5px',
                    }}
                  />
                  {erreurChamp && (
                    <p style={{ marginTop: '6px', fontSize: '12px', color: T.error, fontWeight: 600 }}>{erreurChamp}</p>
                  )}
                </div>
              </div>

              {/* Bouton principal « Valider » */}
              <button
                onClick={valider}
                disabled={envoiEnCours}
                style={{
                  width: '100%', height: '56px', marginTop: '20px', borderRadius: '16px', border: 'none',
                  cursor: envoiEnCours ? 'default' : 'pointer',
                  background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: envoiEnCours ? 0.7 : 1,
                }}
              >
                {envoiEnCours ? <Spinner /> : 'Valider'}
              </button>

              {/* Séparateur OU */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '24px 0 20px' }}>
                <div style={{ flex: 1, height: '1px', background: T.border }} />
                <span style={{ fontSize: '12px', color: T.textTert, fontWeight: 600, letterSpacing: '1.5px' }}>OU</span>
                <div style={{ flex: 1, height: '1px', background: T.border }} />
              </div>

              {/* Bouton secondaire « Créer un compte » (person_add) */}
              <button
                onClick={allerVersInscription}
                disabled={envoiEnCours}
                style={{
                  width: '100%', height: '52px', borderRadius: '16px',
                  cursor: envoiEnCours ? 'default' : 'pointer',
                  background: 'transparent', border: `1.5px solid ${T.primary}`, color: T.primary,
                  fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: envoiEnCours ? 0.6 : 1,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Créer un compte
              </button>
            </motion.div>
          </motion.div>

        ) : (
          // ════════════════ OTP (otp_verify_screen) ════════════════════════════
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', background: T.surface }}
          >
            {/* AppBar « Vérification » + flèche retour — fond crème (miroir otp_verify_screen) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px 12px 0' }}>
              <button
                onClick={retourWelcome}
                style={{ background: 'transparent', border: 'none', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textStrong} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <p style={{ fontSize: '18px', fontWeight: 700, color: T.textStrong, margin: 0 }}>Vérification</p>
            </div>

            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
              {/* Icône SMS dans un cercle vert clair */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}  // easeOutBack
                style={{
                  width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(10,104,71,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px',
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, marginTop: '20px', marginBottom: 0 }}
              >
                Entrez le code reçu
              </motion.p>

              {/* « Code à 6 chiffres envoyé au +241 numéro. » */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                style={{ marginTop: '4px', fontSize: '14px', color: T.textSec }}
              >
                Code à 6 chiffres envoyé au{' '}
                <strong style={{ color: T.textStrong, fontWeight: 700 }}>{INDICATIF} {numero}</strong>.
              </motion.p>

              <div style={{ height: '36px' }} />

              {/* 6 cases OTP */}
              <OtpInput value={otp} onChange={v => { if (erreurOtp) setErreurOtp(null); setOtp(v) }} error={erreurOtp !== null} />

              {/* Bandeau d'erreur (shake + fadeIn) */}
              <AnimatePresence>
                {erreurOtp && (
                  <motion.div
                    key={shakeKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ opacity: { duration: 0.2 }, x: { duration: 0.4 } }}
                    style={{
                      width: '100%', marginTop: '12px', padding: '12px 14px', borderRadius: '12px', boxSizing: 'border-box',
                      background: 'rgba(217,79,61,0.12)', border: '1px solid rgba(217,79,61,0.45)',
                      fontSize: '14px', color: T.error, fontWeight: 600, textAlign: 'center',
                    }}
                  >
                    {erreurOtp}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ height: '28px' }} />

              {/* Bouton « Vérifier » */}
              <button
                onClick={() => verifier(otp)}
                disabled={verifEnCours}
                style={{
                  width: '100%', height: '56px', borderRadius: '16px', border: 'none',
                  cursor: verifEnCours ? 'default' : 'pointer',
                  background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: verifEnCours ? 0.7 : 1,
                }}
              >
                {verifEnCours ? <Spinner /> : 'Vérifier'}
              </button>

              {/* « Renvoyer dans Xs » / « Renvoyer le code » */}
              <button
                onClick={renvoyerCode}
                disabled={verifEnCours || cooldown > 0}
                style={{
                  width: '100%', marginTop: '8px', height: '44px', background: 'none', border: 'none',
                  cursor: (verifEnCours || cooldown > 0) ? 'default' : 'pointer',
                  fontSize: '14px', color: cooldown > 0 ? T.textTert : T.primary,
                  fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                {cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le code'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modale « Numéro non inscrit » ──────────────────────────────────────── */}
      <AnimatePresence>
        {modaleNonInscrit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(20,32,46,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            }}
            onClick={() => setModaleNonInscrit(null)}  // tap hors carte = Rectifier (ferme)
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '360px', background: T.surfaceEl, borderRadius: '22px',
                border: `1px solid rgba(212,218,213,0.6)`, padding: '24px 20px 16px',
                boxShadow: '0 20px 48px rgba(20,32,46,0.25)',
              }}
            >
              {/* Icône phone_disabled dans un cercle accent translucide */}
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(232,168,48,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </div>

              <p style={{ marginTop: '16px', fontSize: '18px', fontWeight: 700, color: T.textStrong, textAlign: 'center' }}>
                Numéro non inscrit
              </p>

              <p style={{ marginTop: '8px', fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.5 }}>
                Le numéro{' '}
                <strong style={{ fontWeight: 700, color: T.textStrong }}>{modaleNonInscrit.phoneE164}</strong>
                {" n'a pas encore de compte Tonji. Souhaitez-vous le rectifier ou créer un compte ?"}
              </p>

              {/* Actions : Rectifier (ferme) — Créer un compte (→ inscription verrouillée) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '20px', padding: '0 0 0' }}>
                <button
                  onClick={() => setModaleNonInscrit(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.primary, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', padding: '10px 12px',
                  }}
                >
                  Rectifier
                </button>
                <button
                  onClick={creerDepuisModale}
                  style={{
                    background: T.primary, border: 'none', borderRadius: '14px', cursor: 'pointer',
                    color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', padding: '12px 18px',
                  }}
                >
                  Créer un compte
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
