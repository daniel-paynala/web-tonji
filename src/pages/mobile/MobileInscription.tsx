/**
 * Écran d'inscription mobile — reproduction exacte du sign_up_screen.dart Flutter.
 *
 * RÈGLE 4-bis : 4 champs uniquement (nom, prénom, date de naissance, téléphone).
 * Pas de sexe, adresse, e-mail à ce stade.
 *
 * Flow :
 *  1. Formulaire → requestOtp(intent=signup)
 *     - Si numéro déjà inscrit → erreur "ce numéro est déjà inscrit"
 *     - Sinon → phase OTP
 *  2. Phase OTP → verifyOtpSignup → login + navigate('/dashboard')
 *
 * Peut recevoir { indicatif, numero } via location.state (depuis MobileConnexion
 * quand le numéro n'est pas inscrit) — numéro alors pré-rempli et verrouillé.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { T, grad } from '@/lib/tokens'
import { requestOtp, verifyOtpSignup } from '@/lib/authApi'
import { ApiError } from '@/lib/api'

// ── OTP digit input (identique à MobileConnexion) ────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputsRef.current[i]?.value && i > 0)
      inputsRef.current[i - 1]?.focus()
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
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
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

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, section, children }: { label?: string; section?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      {section && (
        <p style={{ fontSize: '11px', fontWeight: 700, color: T.textTert, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '10px', marginTop: '6px' }}>
          {section}
        </p>
      )}
      {label && <p style={{ fontSize: '13px', fontWeight: 600, color: T.textSec, marginBottom: '6px' }}>{label}</p>}
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  return (
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: '100%', height: '54px', borderRadius: '16px', padding: '0 16px',
        border: `1.2px solid ${T.border}`, background: disabled ? T.surfaceDeep : T.surface,
        fontSize: '16px', fontWeight: 600, color: disabled ? T.textSec : T.textStrong,
        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        opacity: disabled ? 0.75 : 1,
      }}
    />
  )
}

// ── Cupertino wheel picker ────────────────────────────────────────────────────
const ITEM_H = 46   // hauteur d'un item
const HALF   = 2    // items visibles de chaque côté du centre

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function WheelColumn({
  items, index, onChange, width,
}: {
  items: string[]
  index: number
  onChange: (i: number) => void
  width?: string
}) {
  const tyRef    = useRef(HALF * ITEM_H - index * ITEM_H)
  const [ty, setTy]           = useState(tyRef.current)
  const [snapping, setSnapping] = useState(false)
  const dragging = useRef(false)
  const pointerY = useRef(0)
  const isMounted = useRef(false)

  const clamp = (t: number) =>
    Math.min(HALF * ITEM_H, Math.max(HALF * ITEM_H - (items.length - 1) * ITEM_H, t))

  const snapTo = (raw: number) => {
    const i = Math.round((HALF * ITEM_H - raw) / ITEM_H)
    const clamped = Math.max(0, Math.min(items.length - 1, i))
    const target  = HALF * ITEM_H - clamped * ITEM_H
    tyRef.current = target
    setSnapping(true)
    setTy(target)
    onChange(clamped)
    setTimeout(() => setSnapping(false), 240)
  }

  // Sync quand l'index change depuis l'extérieur (ex : clamp du jour)
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    const target = HALF * ITEM_H - index * ITEM_H
    if (tyRef.current === target) return
    tyRef.current = target
    setSnapping(true)
    setTy(target)
    setTimeout(() => setSnapping(false), 240)
  }, [index])

  const onDown = (y: number) => { dragging.current = true; pointerY.current = y }
  const onMove = (y: number) => {
    if (!dragging.current) return
    const next = clamp(tyRef.current + y - pointerY.current)
    pointerY.current = y
    tyRef.current = next
    setTy(next)
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    snapTo(tyRef.current)
  }

  const visualCenter = (HALF * ITEM_H - ty) / ITEM_H

  return (
    <div
      style={{ width: width ?? 'auto', flex: width ? undefined : 1, height: (2 * HALF + 1) * ITEM_H, overflow: 'hidden', position: 'relative', userSelect: 'none', touchAction: 'none' }}
      onMouseDown={e => { e.preventDefault(); onDown(e.clientY) }}
      onMouseMove={e => { if (dragging.current) { e.preventDefault(); onMove(e.clientY) } }}
      onMouseUp={onUp}
      onMouseLeave={() => { if (dragging.current) onUp() }}
      onTouchStart={e => onDown(e.touches[0].clientY)}
      onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientY) }}
      onTouchEnd={onUp}
    >
      {/* Items */}
      <div style={{ transform: `translateY(${ty}px)`, transition: snapping ? 'transform 0.24s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none', willChange: 'transform' }}>
        {items.map((item, i) => {
          const dist    = Math.abs(i - visualCenter)
          const opacity = Math.max(0.15, 1 - dist * 0.38)
          const scale   = Math.max(0.72, 1 - dist * 0.08)
          return (
            <div
              key={i}
              onClick={() => snapTo(HALF * ITEM_H - i * ITEM_H)}
              style={{
                height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: dist < 0.6 ? 700 : 400,
                color: T.textStrong, opacity,
                transform: `scale(${scale})`,
                cursor: 'pointer',
              }}
            >
              {item}
            </div>
          )
        })}
      </div>

      {/* Gradient haut */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HALF * ITEM_H, background: `linear-gradient(to bottom, ${T.surfaceEl}F5 0%, transparent 100%)`, pointerEvents: 'none' }} />
      {/* Gradient bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: HALF * ITEM_H, background: `linear-gradient(to top, ${T.surfaceEl}F5 0%, transparent 100%)`, pointerEvents: 'none' }} />
      {/* Lignes de sélection */}
      <div style={{ position: 'absolute', top: HALF * ITEM_H, left: 6, right: 6, height: ITEM_H, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, pointerEvents: 'none', borderRadius: 0 }} />
    </div>
  )
}

// ── Bouton qui ouvre le picker ────────────────────────────────────────────────
function DateButton({ value, onClick }: { value: Date | null; onClick: () => void }) {
  const fmt = (d: Date) =>
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  return (
    <button
      type="button" onClick={onClick}
      style={{
        width: '100%', height: '54px', borderRadius: '16px', padding: '0 16px',
        border: `1.2px solid ${T.border}`, background: T.surface,
        fontSize: '16px', fontWeight: value ? 600 : 400, color: value ? T.textStrong : T.textTert,
        outline: 'none', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box',
      }}
    >
      {value ? fmt(value) : 'JJ / MM / AAAA'}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </button>
  )
}

// ── Bottom sheet Cupertino ────────────────────────────────────────────────────
function DatePicker({ value, onConfirm, onClose }: { value: Date | null; onConfirm: (d: Date) => void; onClose: () => void }) {
  const now     = new Date()
  const init    = value ?? new Date(now.getFullYear() - 25, 0, 1)
  const MIN_Y   = now.getFullYear() - 100
  const MAX_Y   = now.getFullYear() - 16

  const [jour,  setJour]  = useState(init.getDate())        // 1-based
  const [mois,  setMois]  = useState(init.getMonth())       // 0-based
  const [annee, setAnnee] = useState(init.getFullYear())

  const maxJ = daysInMonth(mois, annee)

  // Clamp le jour si le mois/année réduit le nombre de jours
  useEffect(() => {
    if (jour > maxJ) setJour(maxJ)
  }, [mois, annee, maxJ, jour])

  const ANNEES = Array.from({ length: MAX_Y - MIN_Y + 1 }, (_, i) => MIN_Y + i)
  const JOURS  = Array.from({ length: maxJ }, (_, i) => (i + 1).toString().padStart(2, '0'))

  const handleConfirm = () => {
    onConfirm(new Date(annee, mois, Math.min(jour, maxJ)))
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,30,0.50)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ background: T.surfaceEl, borderRadius: '28px 28px 0 0', padding: '16px 20px 40px', width: '100%' }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: T.border, margin: '0 auto 16px' }} />

        {/* Titre */}
        <p style={{ fontSize: '16px', fontWeight: 800, color: T.textStrong, textAlign: 'center', marginBottom: '12px' }}>
          Date de naissance
        </p>

        {/* Colonnes */}
        <div style={{ display: 'flex', gap: 0, overflow: 'hidden' }}>
          <WheelColumn
            items={JOURS}
            index={Math.min(jour, maxJ) - 1}
            onChange={i => setJour(i + 1)}
            width="68px"
          />
          <WheelColumn
            items={MOIS_FR}
            index={mois}
            onChange={i => setMois(i)}
          />
          <WheelColumn
            items={ANNEES.map(String)}
            index={annee - MIN_Y}
            onChange={i => setAnnee(MIN_Y + i)}
            width="80px"
          />
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, height: '52px', borderRadius: '16px', border: `1.5px solid ${T.border}`, background: T.surface, color: T.textStrong, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleConfirm} style={{ flex: 1, height: '52px', borderRadius: '16px', border: 'none', background: T.primary, color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            Confirmer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4" opacity="1"/><path d="M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity="0.4"/>
    </svg>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MobileInscription() {
  const navigate = useNavigate()
  const location = useLocation()
  const login    = useAuthStore(s => s.login)
  const nextUrl  = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'

  // Pré-remplissage depuis MobileConnexion (numéro non inscrit)
  const prefill = location.state as { indicatif?: string; numero?: string } | null
  const indicatifFixe = prefill?.indicatif ?? '+241'
  const numeroFixe    = prefill?.numero ?? ''
  const estPrefilled  = Boolean(prefill?.numero)

  const [phase, setPhase]           = useState<'form' | 'otp'>('form')
  const [nom, setNom]               = useState('')
  const [prenom, setPrenom]         = useState('')
  const [certifie18ans, setCertifie] = useState(false)
  const [showCgu, setShowCgu]       = useState(false)
  const [numero, setNumero]         = useState(numeroFixe)
  const [otp, setOtp]               = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [countdown, setCountdown]   = useState(0)

  // Countdown renvoi OTP
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const handleSendOtp = async () => {
    if (!nom.trim()) { setError('Le nom est requis.'); return }
    if (!prenom.trim()) { setError('Le prénom est requis.'); return }
    if (!certifie18ans) { setError('Vous devez certifier avoir 18 ans ou plus.'); return }
    if (!numero || numero.length < 6) { setError('Entrez un numéro valide.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await requestOtp(indicatifFixe, numero, 'signup')
      if (res.user_exists) {
        setError('Ce numéro est déjà inscrit. Retournez à la connexion.')
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
      const session = await verifyOtpSignup(
        indicatifFixe, numero, otp,
        nom.trim(), prenom.trim(),
      )
      login(
        {
          id: session.user.id,
          nom: session.user.nom,
          prenom: session.user.prenom,
          telephone: session.user.numero,
          typeClient: session.user.type_client as 'particulier' | 'entreprise' | 'marchand',
          dateNaissance: session.user.date_naissance ?? undefined,
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

  const canSubmit = nom.trim() && prenom.trim() && certifie18ans && numero.length >= 6

  return (
    <div style={{ minHeight: '100svh', background: T.surface, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Cercles déco */}
      <div style={{ position: 'absolute', width: '220px', height: '220px', borderRadius: '50%', background: `rgba(15,76,92,0.15)`, filter: 'blur(55px)', top: '-60px', left: '-80px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: `rgba(201,123,74,0.18)`, filter: 'blur(50px)', bottom: '200px', right: '-60px', pointerEvents: 'none' }} />

      {/* ── AppBar ────────────────────────────────────────────────────────── */}
      <div style={{ height: '56px', background: grad.primary, display: 'flex', alignItems: 'center', padding: '0 4px', flexShrink: 0 }}>
        <button
          onClick={() => phase === 'otp' ? setPhase('form') : navigate(-1)}
          style={{ background: 'none', border: 'none', color: T.surface, cursor: 'pointer', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <p style={{ fontSize: '17px', fontWeight: 700, color: T.surface, flex: 1, textAlign: 'center', marginRight: '44px' }}>
          Créer un compte
        </p>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 40px' }}>
        <AnimatePresence mode="wait">

          {/* ── Phase formulaire ────────────────────────────────────────── */}
          {phase === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Header */}
              <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                style={{ fontSize: '24px', fontWeight: 800, color: T.textStrong, marginBottom: '4px' }}>
                Bienvenue sur Tonji
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
                style={{ fontSize: '14px', color: T.textSec, marginBottom: '28px' }}>
                Quelques informations pour démarrer.
              </motion.p>

              {/* Identité */}
              {[
                { section: 'Identité', label: 'Nom', value: nom, onChange: setNom, delay: 0.10 },
                { label: 'Prénom', value: prenom, onChange: setPrenom, delay: 0.16 },
              ].map((f, i) => (
                <motion.div key={f.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: f.delay }}>
                  <Field section={i === 0 ? f.section : undefined} label={f.label}>
                    <TextInput value={f.value} onChange={f.onChange} placeholder={f.label} />
                  </Field>
                </motion.div>
              ))}

              {/* Certification majorité */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '8px 0 4px' }}>
                  <input
                    type="checkbox"
                    id="certifie18"
                    checked={certifie18ans}
                    onChange={e => setCertifie(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: T.primary, width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <label htmlFor="certifie18" style={{ fontSize: '14px', color: T.textSec, lineHeight: 1.6, cursor: 'pointer' }}>
                    Je certifie avoir 18 ans ou plus et accepter les{' '}
                    <button
                      type="button"
                      onClick={() => setShowCgu(true)}
                      style={{ background: 'none', border: 'none', padding: 0, color: T.primary, fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                    >
                      conditions d'utilisation
                    </button>
                    {' '}de Tonji.
                  </label>
                </div>
              </motion.div>

              {/* Contact */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
                <Field section="Contact" label="Numéro Mobile Money">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      height: '54px', padding: '0 12px', borderRadius: '16px', display: 'flex', alignItems: 'center',
                      background: T.surface, border: `1.2px solid ${T.border}`, fontSize: '14px', fontWeight: 700, color: T.textStrong, whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      🇬🇦 +241
                    </div>
                    <TextInput
                      value={numero}
                      onChange={estPrefilled ? () => {} : setNumero}
                      placeholder="077 00 00 00"
                      disabled={estPrefilled}
                    />
                  </div>
                  {estPrefilled && (
                    <p style={{ fontSize: '11px', color: T.textTert, marginTop: '6px', lineHeight: 1.5 }}>
                      Numéro saisi à l'étape précédente — retournez en arrière pour le modifier.
                    </p>
                  )}
                </Field>
              </motion.div>

              {/* Erreur */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '10px 14px', borderRadius: '12px', background: `rgba(160,68,52,0.10)`, border: `1px solid rgba(160,68,52,0.30)`, marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: T.error, fontWeight: 600 }}>{error}</p>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
                <button
                  onClick={handleSendOtp}
                  disabled={!canSubmit || loading}
                  style={{
                    width: '100%', height: '56px', borderRadius: '18px', border: 'none', cursor: canSubmit ? 'pointer' : 'default',
                    background: canSubmit ? T.primary : T.surfaceDeep,
                    color: canSubmit ? T.surface : T.textTert,
                    fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? <Spinner /> : <>📱 Recevoir le code par SMS</>}
                </button>
                <p style={{ fontSize: '12px', color: T.textTert, textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
                  Un code à 6 chiffres vous sera envoyé pour vérifier votre numéro.
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ── Phase OTP ───────────────────────────────────────────────── */}
          {phase === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Icône */}
              <div style={{
                width: '72px', height: '72px', borderRadius: '22px', background: `rgba(15,76,92,0.08)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 24px',
              }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>

              <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, textAlign: 'center', marginBottom: '8px' }}>Vérifiez votre numéro</p>
              <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', marginBottom: '32px', lineHeight: 1.5 }}>
                Code envoyé au <strong>{indicatifFixe} {numero}</strong>
              </p>

              <OtpInput value={otp} onChange={setOtp} />

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ margin: '16px 0 0', padding: '10px 14px', borderRadius: '12px', background: `rgba(160,68,52,0.10)`, border: `1px solid rgba(160,68,52,0.30)`, textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: T.error, fontWeight: 600 }}>{error}</p>
                </motion.div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || otp.length < 6}
                style={{
                  width: '100%', height: '56px', borderRadius: '18px', border: 'none',
                  background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer', marginTop: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: (loading || otp.length < 6) ? 0.6 : 1, transition: 'opacity 0.15s',
                }}
              >
                {loading ? <Spinner /> : 'Créer mon compte'}
              </button>

              <button
                onClick={() => { if (countdown === 0) { setOtp(''); handleSendOtp() } }}
                disabled={countdown > 0}
                style={{
                  width: '100%', marginTop: '14px', background: 'none', border: 'none',
                  cursor: countdown > 0 ? 'default' : 'pointer',
                  fontSize: '13px', color: countdown > 0 ? T.textTert : T.primary,
                  fontWeight: 600, fontFamily: 'inherit', padding: '8px',
                }}
              >
                {countdown > 0 ? `Renvoyer dans ${countdown}s` : 'Renvoyer le code'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modal CGU ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCgu && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,30,0.50)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowCgu(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: T.surfaceEl, borderRadius: '28px 28px 0 0', padding: '16px 20px 40px', width: '100%', maxHeight: '80svh', overflowY: 'auto', boxSizing: 'border-box' }}
            >
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: T.border, margin: '0 auto 20px' }} />
              <p style={{ fontSize: '18px', fontWeight: 800, color: T.textStrong, marginBottom: '16px' }}>Conditions d'utilisation</p>
              {[
                ['Reversement automatique', 'Le montant collecté est automatiquement reversé sur le numéro de retrait enregistré à la création.'],
                ['Numéro de retrait immuable', 'Le numéro de retrait ne peut plus être modifié après création — ceci protège les participants contre la fraude.'],
                ['Frais', 'Les frais sont à la charge du cotisant et appliqués au moment du paiement. Tonji perçoit une commission de 2 %.'],
                ['Litiges', "Tonji facilite la collecte mais n'arbitre pas les conflits entre membres, sauf cas manifestement clair."],
                ['Périmètre v1', 'Les cagnottes publiques et les associations comme bénéficiaires ne sont pas disponibles (loi gabonaise n°35/62).'],
              ].map(([titre, texte]) => (
                <div key={titre} style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, marginBottom: '4px' }}>{titre}</p>
                  <p style={{ fontSize: '14px', color: T.textSec, lineHeight: 1.55 }}>{texte}</p>
                </div>
              ))}
              <button
                onClick={() => setShowCgu(false)}
                style={{ width: '100%', height: '52px', borderRadius: '16px', border: 'none', background: T.primary, color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginTop: '8px' }}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
