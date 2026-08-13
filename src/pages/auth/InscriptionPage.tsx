import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useMobile } from '@/hooks/useMobile'
import MobileInscription from '@/pages/mobile/MobileInscription'
import { T } from '@/lib/tokens'
import { requestOtp, verifyOtpSignup } from '@/lib/authApi'
import { kycCheck } from '@/lib/kycApi'
import { ApiError } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// InscriptionPage (desktop) — MÊME process que MobileInscription (le mobile web
// est la référence). 3 phases : numéro Mobile Money → kycCheck → identité (+ CGU
// + certification 18 ans) → requestOtp → OTP → verifyOtpSignup → vrai compte.
// AUCUN mock : mêmes appels backend que le mobile. Sur mobile → écran mobile.
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'numero' | 'identite' | 'otp'
type KycStatut = 'idle' | 'chargement' | 'verifie' | 'bloque'

const STEPS = ['Numéro', 'Identité', 'Vérification']

// ── Indicateur d'étapes desktop ───────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
              style={{
                background: i < current ? T.success : i === current ? T.primary : T.border,
                color: i <= current ? '#fff' : T.textTert,
              }}
            >
              {i < current ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : i + 1}
            </div>
            <span className="text-2xs font-medium hidden sm:block" style={{ color: i === current ? T.textStrong : T.textTert }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-10 sm:w-16 h-px mx-1 mb-5 transition-colors duration-300" style={{ background: i < current ? T.success : T.border }} />
          )}
        </div>
      ))}
    </div>
  )
}

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

// ── Badge KYC ─────────────────────────────────────────────────────────────────
function BadgeKyc({ statut, message }: { statut: KycStatut; message: string | null }) {
  if (statut === 'idle' || statut === 'chargement') return null
  const verifie = statut === 'verifie'
  const bg = verifie ? T.successSoft : 'rgba(217,79,61,0.10)'
  const fg = verifie ? T.primary : T.error
  const texte = verifie
    ? (message ?? 'Compte Airtel Money vérifié — champs pré-remplis.')
    : (message ?? "Ce numéro n'est pas éligible à l'inscription.")
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: bg }}>
      {verifie ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-px"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-px"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
      )}
      <p className="text-[13px] leading-snug" style={{ color: fg }}>{texte}</p>
    </div>
  )
}

const champStyle = (disabled?: boolean): React.CSSProperties => ({
  width: '100%', height: '52px', borderRadius: '14px', padding: '0 16px',
  border: `1.2px solid ${T.border}`, background: disabled ? T.surfaceDeep : T.surfaceEl,
  fontSize: '15px', fontWeight: 600, color: disabled ? T.textSec : T.textStrong,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
})

// ── Composant principal ──────────────────────────────────────────────────────
export default function InscriptionPage() {
  const isMobile = useMobile()
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore(s => s.login)
  const nextUrl = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'

  // Pré-remplissage depuis ConnexionPage (numéro non inscrit).
  const prefill = location.state as { indicatif?: string; numero?: string } | null
  const indicatifFixe = prefill?.indicatif ?? '+241'
  const estPrefilled = Boolean(prefill?.numero)

  const [phase, setPhase] = useState<Phase>('numero')
  const [numero, setNumero] = useState(prefill?.numero ?? '')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [certifie18ans, setCertifie] = useState(false)
  const [showCgu, setShowCgu] = useState(false)
  const [otp, setOtp] = useState('')

  const [kycStatut, setKycStatut] = useState<KycStatut>('idle')
  const [kycMessage, setKycMessage] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)

  const stepIndex = phase === 'numero' ? 0 : phase === 'identite' ? 1 : 2

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  // ── Phase 0 : numéro + KYC ───────────────────────────────────────────────────
  const passerEtape0 = async () => {
    const n = numero.trim()
    if (!/^0\d{8}$/.test(n)) { setError('Format : 0 suivi de 8 chiffres'); return }
    setError('')
    setKycStatut('chargement')
    setKycMessage(null)
    try {
      const resultat = await kycCheck(n)
      if (resultat.user_exists) {
        setKycStatut('bloque')
        setKycMessage(resultat.message)
        setError(resultat.message ?? "Ce numéro est déjà inscrit. Connectez-vous.")
        return
      }
      if (resultat.bloque) {
        setKycStatut('bloque')
        setKycMessage(resultat.message)
        setError(resultat.message ?? "Ce numéro n'est pas éligible.")
        return
      }
      const nomKyc = (resultat.nom ?? '').trim()
      const prenomKyc = (resultat.prenom ?? '').trim()
      if (nomKyc) setNom(nomKyc)
      if (prenomKyc) setPrenom(prenomKyc)
      setKycStatut('verifie')
      setKycMessage(resultat.message)
      setPhase('identite')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erreur réseau, réessayez.'
      setKycStatut('bloque')
      setKycMessage(msg)
      setError('Impossible de vérifier votre numéro. Vérifiez votre connexion et réessayez.')
    }
  }

  // Numéro pré-rempli → lancer le KYC au montage.
  useEffect(() => {
    if (estPrefilled) passerEtape0()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Phase 1 : envoi OTP ──────────────────────────────────────────────────────
  const envoyerOtp = async () => {
    if (!nom.trim()) { setError('Nom requis'); return }
    if (!prenom.trim()) { setError('Prénom requis'); return }
    if (!certifie18ans) { setError('Vous devez certifier avoir 18 ans ou plus.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await requestOtp(indicatifFixe, numero.trim(), 'signup')
      if (res.user_exists) { setError("Ce numéro est déjà inscrit. Connectez-vous."); return }
      setPhase('otp')
      setCountdown(60)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erreur réseau, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ── Phase OTP : vérification ─────────────────────────────────────────────────
  const verifierOtp = async () => {
    if (otp.length !== 6) { setError('Code à 6 chiffres requis'); return }
    setError('')
    setLoading(true)
    try {
      const session = await verifyOtpSignup(indicatifFixe, numero.trim(), otp, nom.trim(), prenom.trim())
      login(
        {
          id: session.user.id,
          nom: session.user.nom,
          prenom: session.user.prenom,
          telephone: session.user.numero,
          typeClient: session.user.type_client as 'particulier' | 'entreprise' | 'marchand',
          dateNaissance: session.user.date_naissance ?? undefined,
          email: session.user.email,
          adresse: session.user.adresse,
        },
        session.token,
      )
      navigate(nextUrl, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Code incorrect. Vérifiez le code reçu et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const renvoyerCode = async () => {
    if (countdown > 0) return
    setOtp('')
    try {
      await requestOtp(indicatifFixe, numero.trim(), 'signup')
      setError('')
      setCountdown(60)
    } catch {
      setError("Impossible d'envoyer le code. Réessayez.")
    }
  }

  const reculer = () => {
    if (phase === 'otp') { setPhase('identite'); setOtp(''); setError(''); return }
    if (phase === 'identite') { setPhase('numero'); setError(''); return }
    navigate(-1)
  }

  const enChargement = kycStatut === 'chargement'

  if (isMobile) return <MobileInscription />

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo — wordmark officiel Tonji */}
        <div className="flex justify-center mb-8">
          <img src="/logo-tonji-wordmark-trim.png" alt="Tonji" className="h-9 w-auto" />
        </div>

        <div className="rounded-[28px] border shadow-2xl p-8" style={{ background: T.surfaceEl, borderColor: `${T.border}99` }}>
          <StepIndicator current={stepIndex} />

          <AnimatePresence mode="wait">

            {/* ── Phase 0 : Numéro Mobile Money ── */}
            {phase === 'numero' && (
              <motion.div key="numero" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="font-display font-bold text-2xl tracking-tight mb-2" style={{ color: T.textStrong }}>Votre numéro Mobile Money</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: T.textSec }}>
                  Entrez le numéro associé à votre compte Airtel Money.
                </p>

                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>Numéro de téléphone</label>
                <div className="mt-1.5 flex gap-2" style={{ opacity: estPrefilled ? 0.7 : 1 }}>
                  <div className="flex items-center rounded-[14px] px-3 shrink-0 text-sm font-bold" style={{ height: '52px', background: T.surfaceEl, border: `1.2px solid ${T.border}`, color: T.textStrong }}>
                    🇬🇦 +241
                  </div>
                  <input
                    type="tel" inputMode="numeric"
                    value={numero}
                    disabled={estPrefilled}
                    onChange={e => setNumero(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onKeyDown={e => { if (e.key === 'Enter' && !enChargement) passerEtape0() }}
                    placeholder="0x xx xx xx xx"
                    style={champStyle(estPrefilled)}
                  />
                </div>
                {estPrefilled && (
                  <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: T.textTert }}>
                    Numéro saisi à l'étape précédente — retournez en arrière pour le modifier.
                  </p>
                )}

                {error && (
                  <div className="mt-5 px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(217,79,61,0.10)', border: '1px solid rgba(217,79,61,0.30)' }}>
                    <p className="text-[13px] font-semibold" style={{ color: T.error }}>{error}</p>
                  </div>
                )}

                <Button variant="primary" size="lg" className="w-full mt-6" loading={enChargement} onClick={passerEtape0}>
                  {enChargement ? 'Vérification…' : 'Continuer'}
                </Button>

                <p className="text-center text-sm mt-6" style={{ color: T.textTert }}>
                  Déjà un compte ?{' '}
                  <Link to="/connexion" className="font-semibold" style={{ color: T.primary }}>Se connecter</Link>
                </p>
              </motion.div>
            )}

            {/* ── Phase 1 : Identité ── */}
            {phase === 'identite' && (
              <motion.div key="identite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="font-display font-bold text-2xl tracking-tight mb-2" style={{ color: T.textStrong }}>Votre identité</h2>
                <p className="text-sm leading-relaxed mb-5" style={{ color: T.textSec }}>
                  {kycStatut === 'verifie' ? 'Informations récupérées depuis Airtel Money — vérifiez et validez.' : 'Saisissez votre nom et prénom.'}
                </p>

                <BadgeKyc statut={kycStatut} message={kycMessage} />

                <div className="mt-5 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>Nom</label>
                    <input value={nom} onChange={e => setNom(e.target.value)} placeholder="nom" className="mt-1.5" style={champStyle()} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>Prénom</label>
                    <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="prénom" className="mt-1.5" style={champStyle()} />
                  </div>
                </div>

                <label htmlFor="certifie18" className="flex items-start gap-2.5 mt-5 cursor-pointer">
                  <input type="checkbox" id="certifie18" checked={certifie18ans} onChange={e => setCertifie(e.target.checked)} className="mt-1 shrink-0 cursor-pointer" style={{ accentColor: T.primary, width: '18px', height: '18px' }} />
                  <span className="text-sm leading-relaxed" style={{ color: T.textSec }}>
                    Je certifie avoir 18 ans ou plus et accepter les{' '}
                    <button type="button" onClick={e => { e.preventDefault(); setShowCgu(true) }} className="underline" style={{ color: T.primary, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
                      conditions d'utilisation
                    </button>{' '}de Tonji.
                  </span>
                </label>

                {error && (
                  <div className="mt-5 px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(217,79,61,0.10)', border: '1px solid rgba(217,79,61,0.30)' }}>
                    <p className="text-[13px] font-semibold" style={{ color: T.error }}>{error}</p>
                  </div>
                )}

                <Button variant="primary" size="lg" className="w-full mt-6" loading={loading} onClick={envoyerOtp}>
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  )}
                  {loading ? 'Envoi…' : 'Recevoir le code par SMS'}
                </Button>
                <p className="text-[13px] text-center mt-3 leading-relaxed" style={{ color: T.textTert }}>
                  Un code à 6 chiffres vous sera envoyé pour vérifier votre numéro.
                </p>

                <button onClick={reculer} className="w-full text-sm mt-3" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Modifier le numéro
                </button>
              </motion.div>
            )}

            {/* ── Phase OTP ── */}
            {phase === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(10,104,71,0.08)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                </div>
                <h2 className="font-display font-bold text-2xl tracking-tight text-center mb-1" style={{ color: T.textStrong }}>Entrez le code reçu</h2>
                <p className="text-sm text-center mb-7 leading-relaxed" style={{ color: T.textSec }}>
                  Code à 6 chiffres envoyé au <strong style={{ color: T.textStrong }}>{indicatifFixe} {numero}</strong>.
                </p>

                <OtpInput value={otp} onChange={v => { setOtp(v); if (error) setError('') }} />

                <AnimatePresence>
                  {error && (
                    <motion.div key={error} initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                      className="mt-4 px-3.5 py-3 rounded-xl text-center" style={{ background: 'rgba(217,79,61,0.12)', border: '1px solid rgba(217,79,61,0.45)' }}>
                      <p className="text-sm font-semibold" style={{ color: T.error }}>{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button variant="primary" size="lg" className="w-full mt-6" loading={loading} onClick={verifierOtp}>
                  {loading ? 'Vérification…' : 'Vérifier'}
                </Button>

                <button onClick={renvoyerCode} disabled={loading || countdown > 0}
                  className="w-full text-sm mt-3 font-semibold" style={{ color: (loading || countdown > 0) ? T.textTert : T.primary, background: 'none', border: 'none', cursor: (loading || countdown > 0) ? 'default' : 'pointer', fontFamily: 'inherit', padding: '8px' }}>
                  {countdown > 0 ? `Renvoyer dans ${countdown} s` : 'Renvoyer le code'}
                </button>
                <button onClick={reculer} className="w-full text-sm mt-1" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Retour
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modale CGU (desktop centré) ── */}
      <AnimatePresence>
        {showCgu && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(20,32,46,0.50)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCgu(false)}>
            <motion.div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-3xl p-7 max-h-[85vh] overflow-y-auto" style={{ background: T.surfaceEl }}
              initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.2 }}>
              <p className="font-display font-bold text-xl mb-4" style={{ color: T.textStrong }}>Conditions d'utilisation</p>
              {[
                ['Reversement automatique', 'Le montant collecté est automatiquement reversé sur le numéro de retrait enregistré à la création.'],
                ['Numéro de retrait immuable', 'Ce numéro ne pourra plus être changé après création de la cagnotte — ceci protège les membres contre la fraude.'],
                ['Frais', 'Les frais sont à la charge du cotisant et appliqués au moment du paiement. Tonji perçoit une commission de 2 %.'],
                ['Litiges', "Tonji facilite la collecte mais n'arbitre pas les conflits entre membres, sauf cas manifestement clair (ex : usurpation d'identité)."],
                ['Périmètre v1', 'Les cagnottes publiques et les associations comme bénéficiaires ne sont pas disponibles dans cette version (loi gabonaise n°35/62).'],
              ].map(([titre, texte]) => (
                <div key={titre} className="mb-4">
                  <p className="text-sm font-bold mb-1" style={{ color: T.textStrong }}>{titre}</p>
                  <p className="text-sm leading-relaxed" style={{ color: T.textSec }}>{texte}</p>
                </div>
              ))}
              <Button variant="primary" size="lg" className="w-full mt-2" onClick={() => setShowCgu(false)}>Fermer</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
