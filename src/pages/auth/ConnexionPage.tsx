import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useMobile } from '@/hooks/useMobile'
import MobileConnexion from '@/pages/mobile/MobileConnexion'
import { DEEPLINK } from '@/lib/deeplink'
import { requestOtp, verifyOtpLogin } from '@/lib/authApi'
import { ApiError } from '@/lib/api'
import { T } from '@/lib/tokens'

// ─────────────────────────────────────────────────────────────────────────────
// ConnexionPage (desktop) — MÊME process que MobileConnexion (le mobile web est
// la référence). numéro → requestOtp('login') → soit écran OTP (numéro inscrit),
// soit modale « Numéro non inscrit » (rectifier / créer un compte). Puis OTP →
// verifyOtpLogin → vrai compte. AUCUN mock. Sur mobile → écran mobile.
// ─────────────────────────────────────────────────────────────────────────────

const INDICATIF = '+241'
const COOLDOWN_INIT = 60

// ── Saisie OTP 6 cases ────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputsRef.current[i]?.value && i > 0) inputsRef.current[i - 1]?.focus()
  }
  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = digit
    onChange(arr.join(''))
    if (digit && i < 5) inputsRef.current[i + 1]?.focus()
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(text.padEnd(6, ''))
    inputsRef.current[Math.min(text.length, 5)]?.focus()
    e.preventDefault()
  }
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="text-center outline-none transition-all"
          style={{
            width: '48px', height: '58px', borderRadius: '14px',
            fontSize: '24px', fontWeight: 800, color: T.textStrong, caretColor: T.primary,
            border: `${value[i] ? '2px' : '1.2px'} solid ${value[i] ? T.primary : T.border}`,
            background: T.surfaceEl, fontFamily: 'inherit',
          }}
        />
      ))}
    </div>
  )
}

export default function ConnexionPage() {
  const isMobile = useMobile()
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const nextUrl = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'

  const [phase, setPhase] = useState<'welcome' | 'otp'>('welcome')
  const [numero, setNumero] = useState('')
  const [otp, setOtp] = useState('')
  const [erreurChamp, setErreurChamp] = useState<string | null>(null)
  const [erreurOtp, setErreurOtp] = useState<string | null>(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [verifEnCours, setVerifEnCours] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [modaleNonInscrit, setModaleNonInscrit] = useState<{ phoneE164: string } | null>(null)

  useEffect(() => {
    if (phase !== 'otp' || cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [phase, cooldown])

  // ── Étape numéro → requestOtp('login') ───────────────────────────────────────
  const valider = async () => {
    if (!/^0\d{8}$/.test(numero.trim())) {
      setErreurOtp(null); setModaleNonInscrit(null)
      setErreurChamp('Format : 0 suivi de 8 chiffres')
      return
    }
    setErreurChamp(null)
    setEnvoiEnCours(true)
    try {
      const res = await requestOtp(INDICATIF, numero.trim(), 'login')
      setEnvoiEnCours(false)
      if (!res.user_exists) {
        // Numéro inconnu → modale rectifier / créer (pas de SMS gaspillé).
        setModaleNonInscrit({ phoneE164: res.phone })
        return
      }
      setOtp(''); setErreurOtp(null)
      setPhase('otp'); setCooldown(COOLDOWN_INIT)
    } catch (e) {
      setEnvoiEnCours(false)
      setErreurChamp(e instanceof ApiError ? e.message : 'Erreur réseau, réessayez.')
    }
  }

  const creerDepuisModale = () => {
    setModaleNonInscrit(null)
    navigate('/inscription', { state: { indicatif: INDICATIF, numero: numero.trim() } })
  }

  // ── Vérification OTP → verifyOtpLogin ────────────────────────────────────────
  const verifier = async () => {
    if (otp.length !== 6) { setErreurOtp('Code à 6 chiffres requis'); return }
    setErreurOtp(null)
    setVerifEnCours(true)
    try {
      const session = await verifyOtpLogin(INDICATIF, numero.trim(), otp)
      login(
        {
          id: session.user.id,
          nom: session.user.nom,
          prenom: session.user.prenom,
          telephone: session.user.numero,
          typeClient: session.user.type_client as 'particulier' | 'entreprise' | 'marchand',
          dateNaissance: session.user.date_naissance,
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
      setOtp('')
      setErreurOtp(e instanceof ApiError ? e.message : 'Code incorrect. Vérifiez le code reçu et réessayez.')
    }
  }

  const renvoyerCode = async () => {
    if (cooldown > 0 || verifEnCours) return
    try {
      await requestOtp(INDICATIF, numero.trim(), 'login')
      setCooldown(COOLDOWN_INIT)
    } catch {
      setErreurOtp("Impossible d'envoyer le code. Réessayez.")
    }
  }

  const retourWelcome = () => { setPhase('welcome'); setOtp(''); setErreurOtp(null) }

  if (isMobile) return <MobileConnexion />

  return (
    <div className="min-h-screen bg-mesh flex">

      {/* ── Panneau gauche — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <img src="/logo-tonji-wordmark-trim.png" alt="Tonji" className="h-9 w-auto" />
        </div>

        <div className="relative z-10">
          <h1 className="font-display font-bold text-white text-4xl leading-tight mb-6">
            Gérez vos tontines<br />
            <span className="text-gradient">en toute confiance.</span>
          </h1>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">
            Plateforme de tontines et cagnottes. Simple, transparente et accessible à tous les groupes.
          </p>
        </div>

        {/* Téléchargement de l'app — Android & iOS */}
        <div className="relative z-10 mt-6">
          <ul className="grid grid-cols-2 gap-3">
            <li>
              <a href={DEEPLINK.playStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Télécharger Tonji sur Google Play"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors">
                <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-white shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 3.8L16.4 12 4 20.2V3.8z" fill="#14202E" />
                    <path d="M4 3.8l7.1 8.2L4 20.2" fill="#0A6847" />
                    <path d="M4 3.8l7.1 8.2 5.3-3.4" fill="#C48A1A" />
                    <path d="M4 20.2l7.1-8.2 5.3 3.4" fill="#E8A830" />
                  </svg>
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] text-white/60">Disponible sur</span>
                  <span className="text-sm text-white font-semibold">Google Play</span>
                </div>
              </a>
            </li>
            <li>
              <a href={DEEPLINK.appStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Télécharger Tonji sur l'App Store"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors">
                <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-white shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#14202E" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] text-white/60">Télécharger sur</span>
                  <span className="text-sm text-white font-semibold">App Store</span>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full max-w-md">

          <div className="mb-10 lg:hidden">
            <img src="/logo-tonji-wordmark-trim.png" alt="Tonji" className="h-8 w-auto" />
          </div>

          <div className="rounded-[28px] border shadow-2xl p-8" style={{ background: T.surfaceEl, borderColor: `${T.border}99` }}>

            <AnimatePresence mode="wait">
              {/* ── Étape numéro ── */}
              {phase === 'welcome' && (
                <motion.div key="welcome" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <h2 className="font-display font-bold text-2xl tracking-tight mb-1" style={{ color: T.textStrong }}>Connexion</h2>
                  <p className="text-sm leading-relaxed mb-7" style={{ color: T.textTert }}>
                    Entrez votre numéro Mobile Money — un code vous sera envoyé par SMS.
                  </p>

                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>Numéro de téléphone</label>
                  <div className="mt-1.5 flex gap-2">
                    <div className="flex items-center rounded-[14px] px-3 shrink-0 text-sm font-bold" style={{ height: '52px', background: T.surfaceEl, border: `1.2px solid ${T.border}`, color: T.textStrong }}>
                      🇬🇦 +241
                    </div>
                    <input
                      type="tel" inputMode="numeric" autoComplete="tel"
                      value={numero}
                      onChange={e => { setNumero(e.target.value.replace(/\D/g, '').slice(0, 9)); setErreurChamp(null) }}
                      onKeyDown={e => { if (e.key === 'Enter' && !envoiEnCours) valider() }}
                      placeholder="0x xx xx xx xx"
                      style={{ width: '100%', height: '52px', borderRadius: '14px', padding: '0 16px', border: `1.2px solid ${erreurChamp ? T.error : T.border}`, background: T.surfaceEl, fontSize: '15px', fontWeight: 600, color: T.textStrong, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  {erreurChamp && (
                    <div className="mt-4 px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(217,79,61,0.10)', border: '1px solid rgba(217,79,61,0.30)' }}>
                      <p className="text-[13px] font-semibold" style={{ color: T.error }}>{erreurChamp}</p>
                    </div>
                  )}

                  <Button variant="primary" size="lg" className="w-full mt-6" loading={envoiEnCours} onClick={valider}>
                    {envoiEnCours ? 'Envoi…' : 'Recevoir le code par SMS'}
                  </Button>

                  <p className="text-center text-sm mt-6" style={{ color: T.textTert }}>
                    Pas encore de compte ?{' '}
                    <Link to="/inscription" className="font-semibold" style={{ color: T.primary }}>Créer un compte</Link>
                  </p>
                </motion.div>
              )}

              {/* ── Étape OTP ── */}
              {phase === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(10,104,71,0.08)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  </div>
                  <h2 className="font-display font-bold text-2xl tracking-tight text-center mb-1" style={{ color: T.textStrong }}>Entrez le code reçu</h2>
                  <p className="text-sm text-center mb-7 leading-relaxed" style={{ color: T.textSec }}>
                    Code à 6 chiffres envoyé au <strong style={{ color: T.textStrong }}>{INDICATIF} {numero}</strong>.
                  </p>

                  <OtpInput value={otp} onChange={v => { setOtp(v); if (erreurOtp) setErreurOtp(null) }} />

                  <AnimatePresence>
                    {erreurOtp && (
                      <motion.div key={erreurOtp} initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                        className="mt-4 px-3.5 py-3 rounded-xl text-center" style={{ background: 'rgba(217,79,61,0.12)', border: '1px solid rgba(217,79,61,0.45)' }}>
                        <p className="text-sm font-semibold" style={{ color: T.error }}>{erreurOtp}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button variant="primary" size="lg" className="w-full mt-6" loading={verifEnCours} onClick={verifier}>
                    {verifEnCours ? 'Vérification…' : 'Vérifier'}
                  </Button>

                  <button onClick={renvoyerCode} disabled={cooldown > 0 || verifEnCours}
                    className="w-full text-sm mt-3 font-semibold" style={{ color: (cooldown > 0 || verifEnCours) ? T.textTert : T.primary, background: 'none', border: 'none', cursor: (cooldown > 0 || verifEnCours) ? 'default' : 'pointer', fontFamily: 'inherit', padding: '8px' }}>
                    {cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le code'}
                  </button>
                  <button onClick={retourWelcome} className="w-full text-sm mt-1" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    ← Modifier le numéro
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ── Modale « Numéro non inscrit » ── */}
      <AnimatePresence>
        {modaleNonInscrit && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(20,32,46,0.50)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModaleNonInscrit(null)}>
            <motion.div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-7 text-center" style={{ background: T.surfaceEl }}
              initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(232,168,48,0.14)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              </div>
              <p className="font-display font-bold text-xl mb-2" style={{ color: T.textStrong }}>Numéro non inscrit</p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: T.textSec }}>
                <strong style={{ color: T.textStrong }}>{modaleNonInscrit.phoneE164}</strong> n'a pas encore de compte Tonji. Voulez-vous en créer un ?
              </p>
              <Button variant="primary" size="lg" className="w-full" onClick={creerDepuisModale}>Créer un compte</Button>
              <button onClick={() => setModaleNonInscrit(null)} className="w-full text-sm mt-3" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>
                Rectifier le numéro
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
