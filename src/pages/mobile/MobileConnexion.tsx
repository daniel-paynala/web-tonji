/**
 * Écran de connexion mobile — reproduction exacte du welcome_screen.dart Flutter.
 *
 * Structure :
 *  - Fond surface (#F4ECE0) + cercles lumineux décoratifs
 *  - Brand "Tonji" + tagline en haut
 *  - Slider de 3 promesses (auto-avance)
 *  - Card basse : saisie numéro → envoi OTP → vérification 6 cases
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { T } from '@/lib/tokens'
import { requestOtp, verifyOtpLogin } from '@/lib/authApi'
import { ApiError } from '@/lib/api'

// ── Slides welcome ────────────────────────────────────────────────────────────
const SLIDES = [
  { icon: '🤝', title: 'Tontines solidaires', desc: 'Organisez vos tours de contribution entre proches en toute confiance.' },
  { icon: '💰', title: 'Collectes simplifiées', desc: 'Créez une cagnotte en quelques secondes et partagez le lien.' },
  { icon: '📱', title: 'Paiement Mobile Money', desc: 'Airtel Money intégré. Versez et recevez sans quitter l\'app.' },
]

// ── OTP digit input ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
    const next = arr.join('')
    onChange(next)
    if (digit && i < 5) inputsRef.current[i + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(text.padEnd(6, ''))
    inputsRef.current[Math.min(text.length, 5)]?.focus()
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: '44px', height: '56px', borderRadius: '12px', textAlign: 'center',
            fontSize: '22px', fontWeight: 800, color: T.primary, caretColor: T.primary,
            border: `${value[i] ? '2px' : '1.2px'} solid ${value[i] ? T.primary : T.border}`,
            background: value[i] ? 'rgba(15,76,92,0.06)' : T.surfaceEl,
            outline: 'none', fontFamily: 'inherit',
            boxShadow: value[i] ? `0 0 0 3px rgba(15,76,92,0.10)` : 'none',
            transition: 'all 0.15s',
          }}
        />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MobileConnexion() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  const nextUrl  = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'

  // Slider
  const [slide, setSlide] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 3500)
    return () => clearInterval(t)
  }, [])

  // Form state
  const [phase, setPhase]       = useState<'numero' | 'otp'>('numero')
  const [indicatif]             = useState('+241')
  const [numero, setNumero]     = useState('')
  const [otp, setOtp]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError]       = useState('')

  // Countdown OTP
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const handleSendOtp = async () => {
    if (!numero || numero.length < 6) { setError('Entrez un numéro valide.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await requestOtp(indicatif, numero, 'login')
      if (!res.user_exists) {
        // Numéro non inscrit — rediriger vers l'inscription avec le numéro pré-rempli
        navigate('/inscription', { state: { indicatif, numero } })
        return
      }
      setPhase('otp')
      setCountdown(60)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erreur réseau, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (otp.length < 6) { setError('Entrez les 6 chiffres du code.'); return }
    setError('')
    setLoading(true)
    try {
      const session = await verifyOtpLogin(indicatif, numero, otp)
      login(
        {
          id: session.user.id,
          nom: session.user.nom,
          prenom: session.user.prenom,
          telephone: session.user.numero,
          typeClient: session.user.type_client as 'particulier' | 'entreprise' | 'marchand',
          dateNaissance: session.user.date_naissance,
        },
        session.token,
      )
      navigate(nextUrl, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Code incorrect ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100svh', background: T.surface, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* ── Cercles décoratifs ───────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', width: '260px', height: '260px', borderRadius: '50%',
        background: `rgba(201,123,74,0.22)`, filter: 'blur(60px)',
        top: '-80px', right: '-120px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '320px', height: '320px', borderRadius: '50%',
        background: `rgba(15,76,92,0.18)`, filter: 'blur(70px)',
        bottom: '-140px', left: '-140px', pointerEvents: 'none',
      }} />

      {/* ── Brand (haut gauche fixe) ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ padding: '52px 24px 0' }}
      >
        <p style={{ fontSize: '40px', fontWeight: 800, color: T.textStrong, letterSpacing: '-1px', lineHeight: 1 }}>
          Tonji
        </p>
        <p style={{ fontSize: '14px', color: T.textSec, marginTop: '4px' }}>
          Tontines &amp; cotisations.
        </p>
      </motion.div>

      {/* ── Slider (centré dans l'espace restant) ────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px' }}>

        {/* Icône */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`icon-${slide}`}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.3 }}
            style={{ fontSize: '56px', lineHeight: 1, marginBottom: '24px', textAlign: 'center' }}
          >
            {SLIDES[slide].icon}
          </motion.div>
        </AnimatePresence>

        {/* Texte */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${slide}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            style={{ textAlign: 'center' }}
          >
            <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, marginBottom: '12px', letterSpacing: '-0.3px' }}>
              {SLIDES[slide].title}
            </p>
            <p style={{ fontSize: '15px', color: T.textSec, lineHeight: 1.6, maxWidth: '280px', margin: '0 auto' }}>
              {SLIDES[slide].desc}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div style={{ display: 'flex', gap: '7px', marginTop: '32px', justifyContent: 'center' }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              height: '4px', borderRadius: '2px',
              background: i === slide ? T.primary : T.border,
              width: i === slide ? '24px' : '7px',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      {/* ── Card basse ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: T.surfaceEl, borderRadius: '28px 28px 0 0',
          border: `1px solid rgba(216,207,192,0.6)`, borderBottom: 'none',
          boxShadow: '0 -8px 32px rgba(26,31,30,0.08)',
          padding: '28px 24px 40px',
        }}
      >
        <AnimatePresence mode="wait">
          {phase === 'numero' ? (
            <motion.div key="numero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, marginBottom: '4px' }}>Bon retour 👋</p>
              <p style={{ fontSize: '13px', color: T.textSec, marginBottom: '24px' }}>
                Entrez votre numéro Mobile Money pour continuer.
              </p>

              {/* Champ numéro */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                  height: '54px', padding: '0 12px', borderRadius: '16px', display: 'flex', alignItems: 'center',
                  background: T.surface, border: `1.2px solid ${T.border}`, fontSize: '14px', fontWeight: 600, color: T.textStrong,
                  whiteSpace: 'nowrap',
                }}>
                  🇬🇦 +241
                </div>
                <input
                  type="tel"
                  placeholder="077 00 00 00"
                  value={numero}
                  onChange={e => setNumero(e.target.value.replace(/\D/g, ''))}
                  style={{
                    flex: 1, height: '54px', borderRadius: '16px', padding: '0 16px',
                    border: `1.2px solid ${error ? T.error : T.border}`, background: T.surface,
                    fontSize: '16px', fontWeight: 600, color: T.textStrong, outline: 'none', fontFamily: 'inherit',
                    letterSpacing: '0.5px',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: '12px', color: T.error, marginBottom: '12px', fontWeight: 600 }}>{error}</p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={loading}
                style={{
                  width: '100%', height: '56px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                  background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? <Spinner /> : <>Recevoir le code par SMS</>}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: T.border }} />
                <span style={{ fontSize: '12px', color: T.textTert, fontWeight: 600, letterSpacing: '1.5px' }}>OU</span>
                <div style={{ flex: 1, height: '1px', background: T.border }} />
              </div>

              <Link to="/inscription" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', height: '52px', borderRadius: '16px', cursor: 'pointer',
                  background: 'transparent', border: `1.5px solid ${T.primary}`, color: T.primary,
                  fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  ✦ Créer un compte
                </button>
              </Link>
            </motion.div>

          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button
                  onClick={() => { setPhase('numero'); setOtp(''); setError('') }}
                  style={{ background: T.surfaceDeep, border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textStrong} strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div>
                  <p style={{ fontSize: '19px', fontWeight: 800, color: T.textStrong }}>Entrez le code reçu</p>
                  <p style={{ fontSize: '12px', color: T.textSec }}>Envoyé au {indicatif}{numero}</p>
                </div>
              </div>

              {/* Icon */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px', background: `rgba(15,76,92,0.08)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>

              {/* 6 cases */}
              <OtpInput value={otp} onChange={setOtp} />

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    margin: '16px 0 0', padding: '10px 14px', borderRadius: '12px',
                    background: `rgba(160,68,52,0.10)`, border: `1px solid rgba(160,68,52,0.30)`,
                    fontSize: '13px', color: T.error, fontWeight: 600, textAlign: 'center',
                  }}
                >
                  {error}
                </motion.div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || otp.length < 6}
                style={{
                  width: '100%', height: '56px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                  background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '24px', opacity: (loading || otp.length < 6) ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? <Spinner /> : 'Vérifier'}
              </button>

              <button
                onClick={() => { if (countdown === 0) { setOtp(''); handleSendOtp() } }}
                disabled={countdown > 0}
                style={{
                  width: '100%', marginTop: '14px', background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer',
                  fontSize: '13px', color: countdown > 0 ? T.textTert : T.primary, fontWeight: 600, fontFamily: 'inherit', padding: '8px',
                }}
              >
                {countdown > 0 ? `Renvoyer dans ${countdown}s` : 'Renvoyer le code'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity="0.4"/>
      <path d="M12 2v4" opacity="1"/>
    </svg>
  )
}
