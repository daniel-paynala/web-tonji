/**
 * Page publique d'invitation — /rejoindre/:ref
 *
 * Flux :
 *  1. Charge les infos de la cagnotte (GET /api/public/cagnottes/:ref)
 *  2. Saisie du numéro → requestOtp → détecte si compte existant
 *  3a. Compte existant  → OTP → verifyOtpLogin → rejoindre(ref) → succès
 *  3b. Nouveau compte   → OTP + nom/prénom/DDN → verifyOtpSignup → rejoindre(ref) → succès
 *
 * Le token dans l'URL = la référence numérique de la cagnotte (ex: 183921).
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { requestOtp, verifyOtpLogin, verifyOtpSignup } from '@/lib/authApi'
import { chargerInfoCagnottePublique, rejoindre } from '@/lib/cagnottesApi'
import type { InfoCagnottePublique } from '@/lib/cagnottesApi'
import { useAuthStore } from '@/store/authStore'
import { useDeepLink } from '@/hooks/useDeepLink'
import DeepLinkModal from '@/components/DeepLinkModal'
import { deepLinkRejoindre, waRejoindre } from '@/lib/deeplink'

// ── Palette Tonji — brand board 2026-06-12 (miroir de @/lib/tokens) ─────────
const P = {
  primary:     '#0A6847',
  accent:      '#E8A830',
  surface:     '#F6F7F4',
  surfaceEl:   '#FFFFFF',
  surfaceDeep: '#ECEDE9',
  textStrong:  '#14202E',
  textSec:     '#4A5568',
  textTert:    '#8A94A0',
  border:      '#E8EDE9',
  success:     '#1A7A50',
  error:       '#D94F3D',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Etape =
  | 'chargement'
  | 'erreur_cagnotte'
  | 'telephone'
  | 'otp'
  | 'infos_nouveau'
  | 'en_cours'
  | 'succes'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTimer(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function normaliserNumero(local: string): string {
  const clean = local.replace(/\D/g, '')
  if (clean.startsWith('241')) return `+${clean}`
  if (clean.length === 9) return `+241${clean}`
  return `+241${clean}`
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconCheck = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconSync = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
)
const IconCelebration = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
)
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18C0 .44.57-.17 1.3-.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L5.09 7a16 16 0 006.29 6.29l.56-1.26a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/>
  </svg>
)

// ── Champ générique ───────────────────────────────────────────────────────────

function Champ({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 700, color: P.textSec }}>{label}</label>
      {children}
      {hint && !error && <p style={{ fontSize: '12px', color: P.textTert }}>{hint}</p>}
      {error && <p style={{ fontSize: '12px', color: P.error }}>{error}</p>}
    </div>
  )
}

const inputStyle = (err?: string): React.CSSProperties => ({
  width: '100%', height: '48px', borderRadius: '12px', padding: '0 14px',
  border: `1.5px solid ${err ? P.error : P.border}`, background: P.surfaceEl,
  fontSize: '15px', color: P.textStrong, outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
})

// ── Bouton principal ──────────────────────────────────────────────────────────

function Btn({ children, onClick, disabled, loading }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', height: '52px', borderRadius: '14px', border: 'none',
        background: (disabled || loading) ? P.surfaceDeep : P.primary,
        color: (disabled || loading) ? P.textTert : P.surface,
        fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
        cursor: (disabled || loading) ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'background 0.15s',
      }}
    >
      {loading
        ? <span style={{ width: 20, height: 20, border: `2px solid ${P.surface}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        : children}
    </button>
  )
}

// ── Carte cagnotte ────────────────────────────────────────────────────────────

function CarteCagnotte({ info, ref: refNum }: { info: InfoCagnottePublique | null; ref: string }) {
  const isTontine = info?.type === 'tontine'
  return (
    <div style={{
      borderRadius: '18px', padding: '16px 18px', marginBottom: '24px',
      background: isTontine ? `rgba(15,76,92,0.08)` : `rgba(201,123,74,0.10)`,
      border: `1px solid ${isTontine ? 'rgba(15,76,92,0.25)' : 'rgba(201,123,74,0.30)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ color: isTontine ? P.primary : P.accent }}>
          {isTontine ? <IconSync /> : <IconCelebration />}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: isTontine ? P.primary : P.accent, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {isTontine ? 'Tontine périodique' : 'Cotisation ouverte'}
        </span>
      </div>
      <p style={{ fontSize: '18px', fontWeight: 800, color: P.textStrong, marginBottom: '4px', lineHeight: 1.2 }}>
        {info?.titre ?? '—'}
      </p>
      <p style={{ fontSize: '12px', color: P.textSec }}>
        Référence {refNum}
        {info?.nombreParticipants ? ` · ${info.nombreParticipants} participant${info.nombreParticipants > 1 ? 's' : ''}` : ''}
      </p>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function InvitationPage() {
  const { token: ref = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { login: storeLogin, isAuthenticated } = useAuthStore()

  // Deep link — tente d'ouvrir l'app, affiche le modal si absente
  const { showModal, dismissModal } = useDeepLink({
    appUrl: deepLinkRejoindre(ref),
    autoTry: !!ref,
  })

  const [info, setInfo]           = useState<InfoCagnottePublique | null>(null)
  const [etape, setEtape]         = useState<Etape>('chargement')
  const [erreur, setErreur]       = useState<string | null>(null)

  // Téléphone
  const [numero, setNumero]       = useState('')
  const [errNum, setErrNum]       = useState('')
  const [userExists, setUserExists] = useState(false)

  // OTP
  const [otp, setOtp]             = useState('')
  const [errOtp, setErrOtp]       = useState('')
  const [timer, setTimer]         = useState(0)
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Infos nouveau compte
  const [nom, setNom]             = useState('')
  const [prenom, setPrenom]       = useState('')
  const [ddn, setDdn]             = useState('')
  const [errInfos, setErrInfos]   = useState<{ nom?: string; prenom?: string; ddn?: string }>({})

  const [enCours, setEnCours]     = useState(false)

  // ── Chargement cagnotte ────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref) { setEtape('erreur_cagnotte'); return }
    chargerInfoCagnottePublique(ref).then(data => {
      if (data) setInfo(data)
      // Pas d'erreur même si null — on continue avec juste le numéro de ref
      setEtape(isAuthenticated ? 'en_cours' : 'telephone')
    })
  }, [ref, isAuthenticated])

  // Si l'utilisateur est déjà connecté, rejoindre directement
  useEffect(() => {
    if (etape !== 'en_cours' || !isAuthenticated) return
    setEnCours(true)
    rejoindre(ref)
      .then(() => setEtape('succes'))
      .catch(e => {
        const msg = e instanceof Error ? e.message : 'Erreur lors de la connexion'
        // 409 = déjà membre → on considère ça comme un succès
        if (msg.includes('409') || msg.toLowerCase().includes('déjà')) {
          setEtape('succes')
        } else {
          setErreur(msg)
          setEtape('telephone')
        }
      })
      .finally(() => setEnCours(false))
  }, [etape, isAuthenticated, ref])

  // ── Timer OTP ──────────────────────────────────────────────────────────────
  const lancerTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer(300)
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0 } return t - 1 })
    }, 1000)
  }

  // ── Étape 1 : envoi OTP ────────────────────────────────────────────────────
  const handleEnvoyerOtp = async () => {
    const num = numero.trim()
    if (!num) { setErrNum('Numéro obligatoire'); return }
    if (num.replace(/\D/g, '').length < 9) { setErrNum('Numéro invalide'); return }
    setErrNum('')
    setEnCours(true)
    try {
      const e164 = normaliserNumero(num)
      const local = e164.replace('+241', '')
      // On envoie 'signup' — le backend répond user_exists:true si compte déjà présent
      const res = await requestOtp('+241', local, 'signup')
      // requestOtp signature: (indicatif, numero, intent)
      // On envoie d'abord avec 'login' — si user_exists:false, on passe en signup
      setUserExists(res.user_exists)
      lancerTimer()
      setOtp('')
      setEtape('otp')
    } catch (e: unknown) {
      setErrNum(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setEnCours(false)
    }
  }

  // ── Renvoi OTP ─────────────────────────────────────────────────────────────
  const handleRenvoyerOtp = async () => {
    const e164 = normaliserNumero(numero.trim())
    const local = e164.replace('+241', '')
    setErrOtp('')
    setOtp('')
    try {
      const res = await requestOtp('+241', local, userExists ? 'login' : 'signup')
      setUserExists(res.user_exists)
      lancerTimer()
    } catch {/* silencieux */}
  }

  // ── Étape 2 : vérification OTP ────────────────────────────────────────────
  const handleVerifierOtp = async () => {
    if (otp.length !== 6) { setErrOtp('Code à 6 chiffres'); return }
    setErrOtp('')

    if (!userExists) {
      // Nouveau compte → on demande les infos avant de vérifier
      setEtape('infos_nouveau')
      return
    }

    setEnCours(true)
    try {
      const e164 = normaliserNumero(numero.trim())
      const local = e164.replace('+241', '')
      const session = await verifyOtpLogin('+241', local, otp)
      storeLogin(
        { id: session.user.id, nom: session.user.nom, prenom: session.user.prenom, telephone: session.user.numero, typeClient: session.user.type_client as 'particulier', dateNaissance: session.user.date_naissance },
        session.token,
      )
      // Rejoindre après auth
      await rejoindre(ref)
      setEtape('succes')
    } catch (e: unknown) {
      setErrOtp(e instanceof Error ? e.message : 'Code invalide')
    } finally {
      setEnCours(false)
    }
  }

  // ── Étape 3 : création compte + rejoindre ─────────────────────────────────
  const handleCreerEtRejoindre = async () => {
    const errs: typeof errInfos = {}
    if (!prenom.trim()) errs.prenom = 'Obligatoire'
    if (!nom.trim())    errs.nom    = 'Obligatoire'
    if (!ddn)           errs.ddn    = 'Date de naissance obligatoire'
    setErrInfos(errs)
    if (Object.keys(errs).length > 0) return

    setEnCours(true)
    try {
      const e164 = normaliserNumero(numero.trim())
      const local = e164.replace('+241', '')
      const session = await verifyOtpSignup('+241', local, otp, nom.trim(), prenom.trim(), ddn)
      storeLogin(
        { id: session.user.id, nom: session.user.nom, prenom: session.user.prenom, telephone: session.user.numero, typeClient: session.user.type_client as 'particulier', dateNaissance: session.user.date_naissance },
        session.token,
      )
      await rejoindre(ref)
      setEtape('succes')
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'Erreur lors de la création du compte')
    } finally {
      setEnCours(false)
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', background: P.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 48px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Deep link modal — affiché si l'app n'est pas détectée */}
      {showModal && (
        <DeepLinkModal
          title={info ? `Rejoindre « ${info.titre} »` : 'Rejoindre la cagnotte'}
          waUrl={waRejoindre(ref)}
          onStay={dismissModal}
        />
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', alignSelf: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.surface, fontSize: 18, fontWeight: 900 }}>
          T
        </div>
        <span style={{ fontSize: '20px', fontWeight: 900, color: P.primary, letterSpacing: '-0.5px' }}>Tonji</span>
      </div>

      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* ── Chargement ──────────────────────────────────────────────────── */}
        {etape === 'chargement' && (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <span style={{ width: 28, height: 28, border: `2.5px solid ${P.primary}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* ── Cagnotte introuvable ─────────────────────────────────────────── */}
        {etape === 'erreur_cagnotte' && (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <p style={{ fontSize: '20px', fontWeight: 800, color: P.textStrong, marginBottom: '8px' }}>Lien invalide</p>
            <p style={{ fontSize: '14px', color: P.textSec }}>Ce lien d'invitation ne correspond à aucune cagnotte active.</p>
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Téléphone ─────────────────────────────────────────────────── */}
          {(etape === 'telephone') && (
            <motion.div key="tel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
              <CarteCagnotte info={info} ref={ref} />

              <p style={{ fontSize: '22px', fontWeight: 800, color: P.textStrong, marginBottom: '6px' }}>
                Rejoindre cette cagnotte
              </p>
              <p style={{ fontSize: '14px', color: P.textSec, marginBottom: '24px', lineHeight: 1.5 }}>
                Entrez votre numéro Mobile Money. Vous recevrez un code de vérification par SMS.
              </p>

              {erreur && (
                <div style={{ padding: '12px 14px', borderRadius: '12px', background: `rgba(160,68,52,0.08)`, border: `1px solid rgba(160,68,52,0.25)`, marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: P.error }}>{erreur}</p>
                </div>
              )}

              <Champ label="Numéro de téléphone" hint="Airtel, Libertis ou Moov Money — ex : 077 123 456" error={errNum}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ ...inputStyle(), width: '72px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: P.textSec, fontSize: '14px', cursor: 'default' }}>
                    +241
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="077 123 456"
                    value={numero}
                    onChange={e => { setNumero(e.target.value); setErrNum('') }}
                    onKeyDown={e => e.key === 'Enter' && handleEnvoyerOtp()}
                    autoFocus
                    style={{ ...inputStyle(errNum), flex: 1 }}
                  />
                </div>
              </Champ>

              <div style={{ height: '16px' }} />
              <Btn onClick={handleEnvoyerOtp} loading={enCours} disabled={numero.trim().length < 8}>
                <IconPhone /> Recevoir le code SMS
              </Btn>
            </motion.div>
          )}

          {/* ── OTP ───────────────────────────────────────────────────────── */}
          {etape === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
              <CarteCagnotte info={info} ref={ref} />

              <p style={{ fontSize: '22px', fontWeight: 800, color: P.textStrong, marginBottom: '6px' }}>
                Vérification
              </p>
              <p style={{ fontSize: '14px', color: P.textSec, marginBottom: '24px', lineHeight: 1.5 }}>
                Code envoyé au <strong>+241 {numero.trim()}</strong>
                {userExists ? ' — nous avons reconnu votre compte.' : '.'}
              </p>

              <Champ label="Code à 6 chiffres" error={errOtp}>
                <input
                  type="number"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.slice(0, 6)); setErrOtp('') }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifierOtp()}
                  style={{
                    ...inputStyle(errOtp),
                    fontSize: '28px', fontWeight: 800, letterSpacing: '10px',
                    textAlign: 'center', height: '64px',
                  }}
                />
              </Champ>

              {/* Timer + renvoi */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', color: timer === 0 ? P.error : P.textTert }}>
                  {timer > 0 ? fmtTimer(timer) : 'Expiré'}
                </span>
                <button
                  onClick={handleRenvoyerOtp}
                  disabled={timer > 0}
                  style={{ fontSize: '13px', fontWeight: 600, color: timer > 0 ? P.textTert : P.primary, background: 'none', border: 'none', cursor: timer > 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  Renvoyer le code
                </button>
              </div>

              <Btn onClick={handleVerifierOtp} loading={enCours} disabled={otp.length < 6}>
                Vérifier
              </Btn>
              <button onClick={() => setEtape('telephone')} style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: P.textSec, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Changer de numéro
              </button>
            </motion.div>
          )}

          {/* ── Infos nouveau compte ──────────────────────────────────────── */}
          {etape === 'infos_nouveau' && (
            <motion.div key="infos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
              <CarteCagnotte info={info} ref={ref} />

              <p style={{ fontSize: '22px', fontWeight: 800, color: P.textStrong, marginBottom: '6px' }}>
                Créer votre compte
              </p>
              <p style={{ fontSize: '14px', color: P.textSec, marginBottom: '24px', lineHeight: 1.5 }}>
                C'est votre première fois sur Tonji. Complétez ces informations pour continuer.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Champ label="Prénom" error={errInfos.prenom}>
                    <input autoFocus placeholder="Jean-Pierre" value={prenom} onChange={e => { setPrenom(e.target.value); setErrInfos(p => ({ ...p, prenom: undefined })) }} style={inputStyle(errInfos.prenom)} />
                  </Champ>
                  <Champ label="Nom" error={errInfos.nom}>
                    <input placeholder="Obame" value={nom} onChange={e => { setNom(e.target.value); setErrInfos(p => ({ ...p, nom: undefined })) }} style={inputStyle(errInfos.nom)} />
                  </Champ>
                </div>
                <Champ label="Date de naissance" error={errInfos.ddn}>
                  <input type="date" value={ddn} onChange={e => { setDdn(e.target.value); setErrInfos(p => ({ ...p, ddn: undefined })) }} style={inputStyle(errInfos.ddn)} />
                </Champ>
              </div>

              {erreur && (
                <div style={{ padding: '12px 14px', borderRadius: '12px', background: `rgba(160,68,52,0.08)`, border: `1px solid rgba(160,68,52,0.25)`, marginTop: '14px' }}>
                  <p style={{ fontSize: '13px', color: P.error }}>{erreur}</p>
                </div>
              )}

              <div style={{ height: '20px' }} />
              <Btn onClick={handleCreerEtRejoindre} loading={enCours}>
                Créer mon compte et rejoindre
              </Btn>
            </motion.div>
          )}

          {/* ── En cours (utilisateur déjà connecté) ─────────────────────── */}
          {etape === 'en_cours' && (
            <motion.div key="enc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', paddingTop: '60px' }}>
              <span style={{ width: 28, height: 28, border: `2.5px solid ${P.primary}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: '14px', color: P.textSec, marginTop: '16px' }}>Connexion à la cagnotte…</p>
            </motion.div>
          )}

          {/* ── Succès ────────────────────────────────────────────────────── */}
          {etape === 'succes' && (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '20px', margin: '0 auto 20px',
                  background: `rgba(107,142,78,0.12)`, border: `1.5px solid rgba(107,142,78,0.30)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.success,
                }}>
                  <IconCheck />
                </div>
                <p style={{ fontSize: '22px', fontWeight: 800, color: P.textStrong, marginBottom: '8px' }}>
                  Vous êtes membre !
                </p>
                {info && (
                  <p style={{ fontSize: '14px', color: P.textSec, marginBottom: '20px', lineHeight: 1.5 }}>
                    Vous avez rejoint <strong style={{ color: P.textStrong }}>{info.titre}</strong>.
                  </p>
                )}
              </div>

              <CarteCagnotte info={info} ref={ref} />

              <Btn onClick={() => navigate(`/cagnottes/${ref}`)}>
                Voir la cagnotte
              </Btn>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
