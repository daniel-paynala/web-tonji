/**
 * Écran d'inscription mobile — reproduction fidèle de sign_up_screen.dart +
 * otp_verify_screen.dart (Flutter Tonji).
 *
 * Flow en 3 phases (les deux premières = les 2 étapes du PageView Flutter) :
 *
 *  Étape 0 — Numéro Mobile Money
 *    L'utilisateur saisit son numéro Airtel Money, appuie « Continuer ».
 *    → kycCheck() (1 seul appel). Résultats possibles :
 *        - user_exists  → toast info "déjà inscrit", reste étape 0 (bloqué)
 *        - bloque       → toast erreur (message serveur), reste étape 0
 *        - succès       → pré-remplit nom/prénom, passe étape 1
 *    Jamais de pass-through si bloqué (même service indisponible).
 *    Si numéro pré-rempli via location.state → verrouillé + KYC lancé auto.
 *
 *  Étape 1 — Identité & validation
 *    Nom + prénom (pré-remplis si KYC Airtel OK, éditables dans tous les cas).
 *    Badge KYC (vert vérifié / rouge bloqué). Checkbox certification majorité
 *    + lien CGU. Bouton « Recevoir le code par SMS » → requestOtp(signup) → OTP.
 *
 *  Phase OTP — Vérification (otp_verify_screen.dart)
 *    6 cases, cooldown 60 s, bouton « Vérifier », bandeau d'erreur animé.
 *    verifyOtpSignup → login + navigate(next).
 *
 * RÈGLE 4-bis : champs minimaux nom + prénom (date de naissance gérée par
 * placeholder côté verifyOtpSignup ; l'âge est certifié par la case à cocher).
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { T, grad } from '@/lib/tokens'
import { requestOtp, verifyOtpSignup } from '@/lib/authApi'
import { kycCheck } from '@/lib/kycApi'
import { ApiError } from '@/lib/api'

// ── Statut KYC (miroir de l'enum _KycStatut Dart) ─────────────────────────────
type KycStatut = 'idle' | 'chargement' | 'verifie' | 'bloque'

// ── OTP digit input (identique à MobileConnexion) ─────────────────────────────
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
            width: '48px', height: '60px', borderRadius: '14px', textAlign: 'center',
            fontSize: '26px', fontWeight: 800, color: T.textStrong, caretColor: T.primary,
            border: `${value[i] ? '2px' : '1.2px'} solid ${value[i] ? T.primary : T.border}`,
            background: T.surfaceEl,
            outline: 'none', fontFamily: 'inherit',
            boxShadow: value[i] ? `0 4px 14px rgba(10,104,71,0.15)` : 'none',
            transition: 'all 0.15s',
          }}
        />
      ))}
    </div>
  )
}

// ── Champ texte simple (nom / prénom) ─────────────────────────────────────────
function TextInput({ value, onChange, placeholder, disabled, suffix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; suffix?: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{
          width: '100%', height: '54px', borderRadius: '16px', padding: suffix ? '0 44px 0 16px' : '0 16px',
          border: `1.2px solid ${T.border}`, background: disabled ? T.surfaceDeep : T.surface,
          fontSize: '16px', fontWeight: 600, color: disabled ? T.textSec : T.textStrong,
          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          opacity: disabled ? 0.75 : 1,
        }}
      />
      {suffix && (
        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
          {suffix}
        </div>
      )}
    </div>
  )
}

// ── Spinner inline ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4" opacity="1"/><path d="M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity="0.4"/>
    </svg>
  )
}

// ── En-tête d'étape (titre coloré + sous-titre) — miroir _TitreEtape ──────────
function TitreEtape({ titre, sous }: { titre: string; sous: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
    >
      <p style={{ fontSize: '22px', fontWeight: 800, color: T.primary, marginBottom: '4px' }}>{titre}</p>
      <p style={{ fontSize: '14px', color: T.textTert, lineHeight: 1.5 }}>{sous}</p>
    </motion.div>
  )
}

// ── Badge KYC (étape 1) — miroir _BadgeKyc ────────────────────────────────────
function BadgeKyc({ statut, message }: { statut: KycStatut; message: string | null }) {
  // Invisible tant qu'aucune vérification aboutie (idle / chargement).
  if (statut === 'idle' || statut === 'chargement') return null

  // Couleurs miroir du switch Dart (vérifie = vert, bloque = rouge).
  const verifie = statut === 'verifie'
  const bg  = verifie ? T.successSoft : 'rgba(160,68,52,0.10)'
  const fg  = verifie ? '#0A6847' : '#A04434'
  const texte = verifie
    ? (message ?? 'Compte Airtel Money vérifié — champs pré-remplis.')
    : (message ?? "Ce numéro n'est pas éligible à l'inscription.")

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08, duration: 0.4 }}
      style={{
        padding: '10px 12px', borderRadius: '10px', background: bg,
        display: 'flex', alignItems: 'flex-start', gap: '8px',
      }}
    >
      {/* Icône : verified (vert) / block (rouge) */}
      {verifie ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
          <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      )}
      <p style={{ fontSize: '13px', color: fg, lineHeight: 1.45 }}>{texte}</p>
    </motion.div>
  )
}

// ── Petite coche verte (suffixe champ pré-rempli KYC) ─────────────────────────
function CheckVert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
    </svg>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MobileInscription() {
  const navigate = useNavigate()
  const location = useLocation()
  const login    = useAuthStore(s => s.login)
  const nextUrl  = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'

  // Pré-remplissage depuis MobileConnexion (numéro non inscrit).
  const prefill       = location.state as { indicatif?: string; numero?: string } | null
  const indicatifFixe = prefill?.indicatif ?? '+241'
  const estPrefilled  = Boolean(prefill?.numero)

  // Phase courante : étape 0 (numéro) / étape 1 (identité) / otp.
  const [phase, setPhase]   = useState<'numero' | 'identite' | 'otp'>('numero')
  const [numero, setNumero] = useState(prefill?.numero ?? '')
  const [nom, setNom]               = useState('')
  const [prenom, setPrenom]         = useState('')
  const [certifie18ans, setCertifie] = useState(false)
  const [showCgu, setShowCgu]       = useState(false)
  const [otp, setOtp]               = useState('')

  // États KYC (miroir _kycStatut / _kycMessage Dart).
  const [kycStatut, setKycStatut]   = useState<KycStatut>('idle')
  const [kycMessage, setKycMessage] = useState<string | null>(null)

  const [loading, setLoading]   = useState(false)   // envoi OTP / vérif OTP
  const [error, setError]       = useState('')      // bandeau OTP
  const [countdown, setCountdown] = useState(0)

  // Compteur de progression pour la barre (étape 0 → 1/2, étape 1 → 2/2).
  const progress = phase === 'numero' ? 0.5 : 1

  // Countdown renvoi OTP.
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  // ── Étape 0 : validation numéro + KYC ──────────────────────────────────────

  /**
   * Bouton « Continuer » étape 0 — miroir de _passerEtape0().
   * Valide le format (0 + 8 chiffres), lance kycCheck, décide du blocage.
   */
  const passerEtape0 = async () => {
    const n = numero.trim()
    // Validation locale du format (miroir validateurParDefaut du champ Gabon).
    if (!/^0\d{8}$/.test(n)) {
      setError('Format : 0 suivi de 8 chiffres')
      return
    }
    setError('')
    setKycStatut('chargement')
    setKycMessage(null)

    try {
      const resultat = await kycCheck(n)

      // Compte Tonji déjà existant → rediriger vers la connexion (bloqué).
      if (resultat.user_exists) {
        setKycStatut('bloque')
        setKycMessage(resultat.message)
        setError(resultat.message ?? "Ce numéro est déjà inscrit. Retournez à l'accueil pour vous connecter.")
        return
      }

      // Opérateur bloqué / service indisponible / pas de compte Airtel → bloqué.
      if (resultat.bloque) {
        setKycStatut('bloque')
        setKycMessage(resultat.message)
        setError(resultat.message ?? "Ce numéro n'est pas éligible.")
        return
      }

      // KYC Airtel réussi → pré-remplir nom et prénom (toujours éditables).
      const nomKyc    = (resultat.nom ?? '').trim()
      const prenomKyc = (resultat.prenom ?? '').trim()
      if (nomKyc)    setNom(nomKyc)
      if (prenomKyc) setPrenom(prenomKyc)

      setKycStatut('verifie')
      setKycMessage(resultat.message)
      setPhase('identite')
    } catch (e) {
      // Erreur réseau / serveur → on bloque (pas de pass-through).
      const msg = e instanceof ApiError ? e.message : 'Erreur réseau, réessayez.'
      setKycStatut('bloque')
      setKycMessage(msg)
      setError('Impossible de vérifier votre numéro. Vérifiez votre connexion et réessayez.')
    }
  }

  // Si numéro pré-rempli (modale "non inscrit") → lancer le KYC au montage.
  // Équivalent du addPostFrameCallback(_passerEtape0) Dart.
  useEffect(() => {
    if (estPrefilled) {
      passerEtape0()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Étape 1 : envoi OTP ─────────────────────────────────────────────────────

  /** Bouton « Recevoir le code par SMS » — miroir de _envoyerOtp(). */
  const envoyerOtp = async () => {
    if (!nom.trim())    { setError('Nom requis'); return }
    if (!prenom.trim()) { setError('Prénom requis'); return }
    if (!certifie18ans) { setError('Vous devez certifier avoir 18 ans ou plus.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await requestOtp(indicatifFixe, numero.trim(), 'signup')
      if (res.user_exists) {
        setError("Ce numéro est déjà inscrit. Retournez à l'accueil pour vous connecter.")
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

  // ── Phase OTP : vérification ────────────────────────────────────────────────

  /** Bouton « Vérifier » — miroir de _verifier(code). */
  const verifierOtp = async () => {
    if (otp.length !== 6) { setError('Code à 6 chiffres requis'); return }
    setError('')
    setLoading(true)
    try {
      const session = await verifyOtpSignup(
        indicatifFixe, numero.trim(), otp,
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
          // Infos complémentaires : propagées au store pour l'écran profil.
          email: session.user.email,
          adresse: session.user.adresse,
        },
        session.token,
      )
      navigate(nextUrl, { replace: true })
    } catch (e) {
      // 422 OTP → message générique (miroir du fallback Dart).
      setError(e instanceof ApiError ? e.message : 'Code incorrect. Veuillez vérifier le code reçu et réessayer.')
    } finally {
      setLoading(false)
    }
  }

  /** Renvoi du code (cooldown) — miroir de _renvoyerCode(). */
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

  // ── Bouton retour (miroir _reculer + PopScope) ─────────────────────────────
  const reculer = () => {
    if (phase === 'otp')      { setPhase('identite'); setOtp(''); setError(''); return }
    if (phase === 'identite') { setPhase('numero'); setError(''); return }
    navigate(-1)
  }

  const enChargement = kycStatut === 'chargement'

  return (
    <div style={{ minHeight: '100svh', background: T.surface, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Pas de cercles décoratifs : le sign-up Flutter (GradientBackground) n'en a aucun. */}

      {/* ── AppBar + barre de progression (miroir _BarreProgression) ───────── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ height: '56px', background: grad.primary, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
          <button
            onClick={reculer}
            style={{ background: 'none', border: 'none', color: T.surface, cursor: 'pointer', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <p style={{ fontSize: '17px', fontWeight: 700, color: T.surface, flex: 1, textAlign: 'center', marginRight: '44px' }}>
            {phase === 'otp' ? 'Vérification' : 'Créer un compte'}
          </p>
        </div>
        {/* Barre de progression — masquée en phase OTP (écran séparé en Flutter). */}
        {phase !== 'otp' && (
          <div style={{ height: '3px', background: T.border, position: 'relative' }}>
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: T.primary }}
            />
          </div>
        )}
      </div>

      {/* ── Contenu scrollable ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px 48px' }}>
        <AnimatePresence mode="wait">

          {/* ── Étape 0 — Numéro Mobile Money ────────────────────────────── */}
          {phase === 'numero' && (
            <motion.div key="numero" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <TitreEtape
                titre="Votre numéro mobile money"
                sous="Entrez le numéro associé à votre compte Airtel Money."
              />

              <div style={{ height: '40px' }} />

              {/* Champ téléphone (verrouillé si pré-rempli) */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5 }}>
                <div style={{ display: 'flex', gap: '8px', opacity: estPrefilled ? 0.7 : 1 }}>
                  <div style={{
                    height: '54px', padding: '0 12px', borderRadius: '16px', display: 'flex', alignItems: 'center',
                    background: T.surface, border: `1.2px solid ${T.border}`, fontSize: '14px', fontWeight: 700, color: T.textStrong, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    🇬🇦 +241
                  </div>
                  <TextInput
                    value={numero}
                    onChange={estPrefilled ? () => {} : v => setNumero(v.replace(/\D/g, '').slice(0, 9))}
                    placeholder="0x xx xx xx xx"
                    disabled={estPrefilled}
                  />
                </div>
                {estPrefilled && (
                  <p style={{ fontSize: '11px', color: T.textTert, marginTop: '6px', lineHeight: 1.5 }}>
                    Numéro saisi à l'étape précédente — retournez en arrière pour le modifier.
                  </p>
                )}
              </motion.div>

              {/* Bandeau d'erreur KYC (toast Flutter → bandeau inline ici) */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '10px 14px', borderRadius: '12px', background: `rgba(160,68,52,0.10)`, border: `1px solid rgba(160,68,52,0.30)`, marginTop: '20px' }}>
                  <p style={{ fontSize: '13px', color: T.error, fontWeight: 600 }}>{error}</p>
                </motion.div>
              )}

              <div style={{ height: '48px' }} />

              {/* Bouton « Continuer » / « Vérification… » */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.5 }}>
                <button
                  onClick={enChargement ? undefined : passerEtape0}
                  disabled={enChargement}
                  style={{
                    width: '100%', height: '52px', borderRadius: '16px', border: 'none', cursor: enChargement ? 'default' : 'pointer',
                    background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    opacity: enChargement ? 0.8 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {enChargement ? (
                    <><Spinner /> Vérification…</>
                  ) : (
                    <>Continuer
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </>
                  )}
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Étape 1 — Identité ───────────────────────────────────────── */}
          {phase === 'identite' && (
            <motion.div key="identite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <TitreEtape
                titre="Votre identité"
                sous={kycStatut === 'verifie'
                  ? 'Informations récupérées depuis Airtel Money — vérifiez et validez.'
                  : 'Saisissez votre nom et prénom.'}
              />

              <div style={{ height: '16px' }} />

              {/* Badge KYC */}
              <BadgeKyc statut={kycStatut} message={kycMessage} />

              <div style={{ height: '24px' }} />

              {/* Nom */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.5 }} style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: T.textSec, marginBottom: '6px' }}>Nom</p>
                <TextInput
                  value={nom} onChange={setNom} placeholder="nom"
                  suffix={kycStatut === 'verifie' ? <CheckVert /> : undefined}
                />
              </motion.div>

              {/* Prénom */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.5 }} style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: T.textSec, marginBottom: '6px' }}>Prénom</p>
                <TextInput
                  value={prenom} onChange={setPrenom} placeholder="prénom"
                  suffix={kycStatut === 'verifie' ? <CheckVert /> : undefined}
                />
              </motion.div>

              {/* Certification majorité + lien CGU */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <input
                    type="checkbox" id="certifie18" checked={certifie18ans}
                    onChange={e => setCertifie(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: T.primary, width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <label htmlFor="certifie18" style={{ fontSize: '14px', color: T.textSec, lineHeight: 1.6, cursor: 'pointer' }}>
                    Je certifie avoir 18 ans ou plus et accepter les{' '}
                    <button
                      type="button" onClick={() => setShowCgu(true)}
                      style={{ background: 'none', border: 'none', padding: 0, color: T.primary, fontSize: '14px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                    >
                      conditions d'utilisation
                    </button>
                    {' '}de Tonji.
                  </label>
                </div>
              </motion.div>

              {/* Bandeau d'erreur (toast Flutter → inline) */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '10px 14px', borderRadius: '12px', background: `rgba(160,68,52,0.10)`, border: `1px solid rgba(160,68,52,0.30)`, marginTop: '20px' }}>
                  <p style={{ fontSize: '13px', color: T.error, fontWeight: 600 }}>{error}</p>
                </motion.div>
              )}

              <div style={{ height: '28px' }} />

              {/* Bouton « Recevoir le code par SMS » */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40, duration: 0.5 }}>
                <button
                  onClick={loading ? undefined : envoyerOtp}
                  disabled={loading}
                  style={{
                    width: '100%', height: '52px', borderRadius: '16px', border: 'none', cursor: loading ? 'default' : 'pointer',
                    background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    opacity: loading ? 0.8 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? (
                    <><Spinner /> Envoi…</>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      Recevoir le code par SMS
                    </>
                  )}
                </button>
                <p style={{ fontSize: '13px', color: T.textTert, textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
                  Un code à 6 chiffres vous sera envoyé pour vérifier votre numéro.
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ── Phase OTP ────────────────────────────────────────────────── */}
          {phase === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Icône SMS (cercle teinté) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  width: '64px', height: '64px', borderRadius: '50%', background: `rgba(10,104,71,0.08)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 20px',
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
                style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, textAlign: 'center', marginBottom: '4px' }}>
                Entrez le code reçu
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
                style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', marginBottom: '36px', lineHeight: 1.5 }}>
                Code à 6 chiffres envoyé au <strong style={{ color: T.textStrong, fontWeight: 700 }}>{indicatifFixe} {numero}</strong>.
              </motion.p>

              <OtpInput value={otp} onChange={v => { setOtp(v); if (error) setError('') }} />

              {/* Bandeau d'erreur OTP (avec shake) */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key={error}
                    initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      margin: '12px 0 0', padding: '12px 14px', borderRadius: '12px',
                      background: `rgba(217,79,61,0.12)`, border: `1px solid rgba(217,79,61,0.45)`, textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: '14px', color: T.error, fontWeight: 600 }}>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ height: '28px' }} />

              {/* Bouton « Vérifier » */}
              <button
                onClick={verifierOtp}
                disabled={loading}
                style={{
                  width: '100%', height: '52px', borderRadius: '16px', border: 'none',
                  background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700,
                  fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {loading ? <Spinner /> : 'Vérifier'}
              </button>

              {/* Renvoyer le code (cooldown) */}
              <button
                onClick={renvoyerCode}
                disabled={loading || countdown > 0}
                style={{
                  width: '100%', marginTop: '8px', background: 'none', border: 'none',
                  cursor: (loading || countdown > 0) ? 'default' : 'pointer',
                  fontSize: '14px', color: (loading || countdown > 0) ? T.textTert : T.primary,
                  fontWeight: 600, fontFamily: 'inherit', padding: '10px',
                }}
              >
                {countdown > 0 ? `Renvoyer dans ${countdown} s` : 'Renvoyer le code'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom sheet CGU (miroir _CguSheet) ───────────────────────────── */}
      <AnimatePresence>
        {showCgu && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,32,46,0.50)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowCgu(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: T.surfaceEl, borderRadius: '20px 20px 0 0', padding: '12px 20px 32px', width: '100%', maxHeight: '95svh', overflowY: 'auto', boxSizing: 'border-box' }}
            >
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: T.border, margin: '0 auto 20px' }} />
              <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong, marginBottom: '16px' }}>Conditions d'utilisation</p>
              {[
                ['Reversement automatique', 'Le montant collecté est automatiquement reversé sur le numéro de retrait enregistré à la création.'],
                ['Numéro de retrait immuable', 'Ce numéro ne pourra plus être changé après création de la cagnotte — ceci protège les membres contre la fraude.'],
                ['Frais', 'Les frais sont à la charge du cotisant et appliqués au moment du paiement. Tonji perçoit une commission de 2 %.'],
                ['Litiges', "Tonji facilite la collecte mais n'arbitre pas les conflits entre membres, sauf cas manifestement clair (ex : usurpation d'identité)."],
                ['Périmètre v1', 'Les cagnottes publiques et les associations comme bénéficiaires ne sont pas disponibles dans cette version (loi gabonaise n°35/62).'],
              ].map(([titre, texte]) => (
                <div key={titre} style={{ marginBottom: '16px' }}>
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
