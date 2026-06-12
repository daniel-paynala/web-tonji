/**
 * Feuille de bas de page d'authentification légère.
 *
 * Flux :
 *   numero → otp → (si nouveau compte) nom_prenom → onSuccess()
 *
 * Compte existant : verifyOtpLogin → login → onSuccess()
 * Nouveau compte  : verifyOtpSignup sans DDN → login → onSuccess() (compte light)
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { requestOtp, verifyOtpLogin, verifyOtpSignup } from '@/lib/authApi'
import { useAuthStore } from '@/store/authStore'
import type { ApiError } from '@/lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliserGabon(raw: string): string {
  const clean = raw.replace(/\D/g, '')
  if (clean.startsWith('241') && clean.length === 12) return `+${clean}`
  if (clean.startsWith('00241')) return `+241${clean.slice(5)}`
  if (clean.startsWith('0') && clean.length === 9) return `+241${clean.slice(1)}`
  if (clean.length === 8) return `+241${clean}`
  return `+241${clean}`
}

function isErrMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
  return 'Erreur inattendue, réessayez.'
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

// ── OTP boxes ─────────────────────────────────────────────────────────────────

function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null))

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = digit
    const next = arr.join('').slice(0, 6)
    onChange(next)
    if (digit && i < 5) refs[i + 1].current?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text) {
      onChange(text)
      refs[Math.min(text.length, 5)].current?.focus()
    }
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: '44px', height: '52px', borderRadius: '12px', textAlign: 'center',
            fontSize: '20px', fontWeight: 800, color: T.textStrong,
            border: `2px solid ${value[i] ? T.primary : T.border}`,
            background: T.surfaceEl, outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
        />
      ))}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Etape = 'numero' | 'otp' | 'nom_prenom' | 'en_cours'

export interface AuthBottomSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  actionLabel: string   // ex : "Rejoindre la tontine" | "Cotiser"
  actionIcon?: React.ReactNode
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function AuthBottomSheet({ open, onClose, onSuccess, actionLabel, actionIcon }: AuthBottomSheetProps) {
  const login = useAuthStore(s => s.login)

  const [etape, setEtape]           = useState<Etape>('numero')
  const [numero, setNumero]         = useState('')
  const [otp, setOtp]               = useState('')
  const [nom, setNom]               = useState('')
  const [prenom, setPrenom]         = useState('')
  const [userExists, setUserExists] = useState(false)
  const [erreur, setErreur]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [timer, setTimer]           = useState(0)
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Indicatif Gabon
  const indicatif = '+241'

  // Reset at open
  useEffect(() => {
    if (open) {
      setEtape('numero'); setNumero(''); setOtp(''); setNom(''); setPrenom('')
      setUserExists(false); setErreur(''); setLoading(false); setTimer(0)
    }
  }, [open])

  // Countdown renvoi
  useEffect(() => {
    if (timer <= 0) return
    timerRef.current = setInterval(() => setTimer(t => {
      if (t <= 1) { clearInterval(timerRef.current!); return 0 }
      return t - 1
    }), 1000)
    return () => clearInterval(timerRef.current!)
  }, [timer])

  const envoyerOtp = async () => {
    const tel = numero.replace(/\D/g, '')
    if (tel.length < 8) { setErreur('Entrez un numéro valide.'); return }
    setErreur(''); setLoading(true)
    try {
      const res = await requestOtp(indicatif, tel, 'login')
      setUserExists(res.user_exists)
      setEtape('otp')
      setTimer(60)
    } catch (e) {
      setErreur(isErrMsg(e))
    } finally {
      setLoading(false)
    }
  }

  const renvoyerOtp = async () => {
    if (timer > 0) return
    const tel = numero.replace(/\D/g, '')
    setErreur(''); setLoading(true)
    try {
      await requestOtp(indicatif, tel, 'login')
      setTimer(60)
    } catch (e) {
      setErreur(isErrMsg(e))
    } finally {
      setLoading(false)
    }
  }

  const validerOtp = async () => {
    if (otp.length < 6) { setErreur('Entrez les 6 chiffres du code.'); return }
    setErreur('')

    if (userExists) {
      // Compte existant → login direct
      setLoading(true)
      try {
        const session = await verifyOtpLogin(indicatif, numero.replace(/\D/g, ''), otp)
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
        setEtape('en_cours')
        onSuccess()
      } catch (e) {
        setErreur(isErrMsg(e))
      } finally {
        setLoading(false)
      }
    } else {
      // Nouveau → demander nom + prénom
      setEtape('nom_prenom')
    }
  }

  const creerCompteLight = async () => {
    if (!nom.trim() || !prenom.trim()) { setErreur('Nom et prénom requis.'); return }
    setErreur(''); setLoading(true)
    try {
      const session = await verifyOtpSignup(
        indicatif,
        numero.replace(/\D/g, ''),
        otp,
        nom.trim(),
        prenom.trim(),
        '',   // pas de DDN → compte light
      )
      login(
        {
          id: session.user.id,
          nom: session.user.nom,
          prenom: session.user.prenom,
          telephone: session.user.numero,
          typeClient: session.user.type_client as 'particulier' | 'entreprise' | 'marchand',
          dateNaissance: session.user.date_naissance,  // undefined = compte light
        },
        session.token,
      )
      setEtape('en_cours')
      onSuccess()
    } catch (e) {
      setErreur(isErrMsg(e))
    } finally {
      setLoading(false)
    }
  }

  const Btn = ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', height: '52px', borderRadius: '14px', border: 'none',
        background: (disabled || loading) ? T.surfaceDeep : T.primary,
        color: (disabled || loading) ? T.textTert : T.surface,
        fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'background 0.15s',
      }}
    >
      {loading
        ? <span style={{ width: 20, height: 20, border: `2.5px solid rgba(244,236,224,0.4)`, borderTopColor: T.surface, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        : children}
    </button>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

          {/* Fond semi-transparent */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,30,0.55)', zIndex: 300 }}
          />

          {/* Feuille */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: T.surface, borderRadius: '24px 24px 0 0',
              padding: '0 24px 40px', zIndex: 301,
              maxHeight: '92vh', overflowY: 'auto',
            }}
          >
            {/* Poignée */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '12px auto 0' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {etape !== 'numero' && etape !== 'en_cours' && (
                  <button
                    onClick={() => { setEtape(etape === 'nom_prenom' ? 'otp' : 'numero'); setErreur('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSec, display: 'flex', padding: '4px' }}
                  >
                    <IconBack />
                  </button>
                )}
                <div>
                  <p style={{ fontSize: '17px', fontWeight: 800, color: T.textStrong, lineHeight: 1.1 }}>{actionLabel}</p>
                  <p style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>
                    {etape === 'numero' && 'Entrez votre numéro Mobile Money'}
                    {etape === 'otp' && `Code envoyé au ${indicatif} ${numero}`}
                    {etape === 'nom_prenom' && 'Créer un compte Tonji'}
                    {etape === 'en_cours' && 'Connexion en cours…'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSec, display: 'flex', padding: '4px' }}
              >
                <IconClose />
              </button>
            </div>

            <AnimatePresence mode="wait">

              {/* ── Étape 1 : numéro ── */}
              {etape === 'numero' && (
                <motion.div key="numero" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ height: '52px', borderRadius: '12px', border: `1.5px solid ${T.border}`, background: T.surfaceEl, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: '15px', fontWeight: 700, color: T.textStrong, flexShrink: 0, minWidth: '70px', justifyContent: 'center' }}>
                      🇬🇦 +241
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="07 XX XX XX XX"
                      value={numero}
                      onChange={e => { setNumero(e.target.value.replace(/\D/g, '')); setErreur('') }}
                      onKeyDown={e => e.key === 'Enter' && envoyerOtp()}
                      autoFocus
                      style={{
                        flex: 1, height: '52px', borderRadius: '12px',
                        border: `1.5px solid ${erreur ? T.error : T.border}`,
                        background: T.surfaceEl, padding: '0 14px',
                        fontSize: '16px', color: T.textStrong, outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {erreur && <p style={{ fontSize: '13px', color: T.error, marginBottom: '12px' }}>{erreur}</p>}

                  <Btn onClick={envoyerOtp} disabled={numero.replace(/\D/g, '').length < 8}>
                    {actionIcon} Continuer
                  </Btn>

                  <p style={{ fontSize: '12px', color: T.textTert, textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
                    Vous recevrez un code par SMS. Si vous n'avez pas encore de compte, vous pourrez en créer un.
                  </p>
                </motion.div>
              )}

              {/* ── Étape 2 : OTP ── */}
              {etape === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div style={{ marginBottom: '24px' }}>
                    <OtpBoxes value={otp} onChange={v => { setOtp(v); setErreur('') }} />
                  </div>

                  {erreur && <p style={{ fontSize: '13px', color: T.error, textAlign: 'center', marginBottom: '12px' }}>{erreur}</p>}

                  <Btn onClick={validerOtp} disabled={otp.length < 6}>
                    Valider le code
                  </Btn>

                  <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: T.textSec }}>
                    {timer > 0
                      ? `Renvoyer dans ${timer}s`
                      : <span onClick={renvoyerOtp} style={{ color: T.primary, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Renvoyer le code</span>
                    }
                  </p>

                  {!userExists && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '12px', background: `rgba(15,76,92,0.07)`, border: `1px solid rgba(15,76,92,0.20)` }}>
                      <p style={{ fontSize: '12px', color: T.primary, fontWeight: 600, lineHeight: 1.5 }}>
                        Numéro non inscrit — après validation du code, vous pourrez créer un compte en 10 secondes.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Étape 3 : nom + prénom (nouveau compte) ── */}
              {etape === 'nom_prenom' && (
                <motion.div key="nom_prenom" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '12px', background: `rgba(201,123,74,0.08)`, border: `1px solid rgba(201,123,74,0.30)` }}>
                    <p style={{ fontSize: '12px', color: T.accent, fontWeight: 600, lineHeight: 1.5 }}>
                      Votre date de naissance n'est pas requise maintenant. Vous pourrez la compléter plus tard pour créer vos propres cagnottes.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: T.textSec, display: 'block', marginBottom: '6px' }}>Prénom</label>
                      <input
                        type="text"
                        placeholder="Jean"
                        value={prenom}
                        onChange={e => { setPrenom(e.target.value); setErreur('') }}
                        autoFocus
                        style={{
                          width: '100%', height: '50px', borderRadius: '12px', padding: '0 14px',
                          border: `1.5px solid ${T.border}`, background: T.surfaceEl,
                          fontSize: '15px', color: T.textStrong, outline: 'none', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: T.textSec, display: 'block', marginBottom: '6px' }}>Nom</label>
                      <input
                        type="text"
                        placeholder="OBAME"
                        value={nom}
                        onChange={e => { setNom(e.target.value); setErreur('') }}
                        onKeyDown={e => e.key === 'Enter' && creerCompteLight()}
                        style={{
                          width: '100%', height: '50px', borderRadius: '12px', padding: '0 14px',
                          border: `1.5px solid ${T.border}`, background: T.surfaceEl,
                          fontSize: '15px', color: T.textStrong, outline: 'none', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {erreur && <p style={{ fontSize: '13px', color: T.error, marginBottom: '12px' }}>{erreur}</p>}

                  <Btn onClick={creerCompteLight} disabled={!nom.trim() || !prenom.trim()}>
                    Créer mon compte
                  </Btn>

                  <p style={{ fontSize: '11px', color: T.textTert, textAlign: 'center', marginTop: '10px' }}>
                    En continuant, vous acceptez les conditions d'utilisation de Tonji.
                  </p>
                </motion.div>
              )}

              {/* ── En cours ── */}
              {etape === 'en_cours' && (
                <motion.div key="en_cours" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 40, height: 40, border: `3px solid rgba(15,76,92,0.2)`, borderTopColor: T.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                  <p style={{ fontSize: '15px', fontWeight: 600, color: T.textSec }}>{actionLabel}…</p>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
