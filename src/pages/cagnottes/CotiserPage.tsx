import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T, fmt } from '@/lib/tokens'
import { useMobile } from '@/hooks/useMobile'
import MobileCotiser, { type CotiserArgs } from '@/pages/mobile/MobileCotiser'
import {
  cotiser,
  verifierStatutCotisation,
  chargerCagnotte,
  type CagnotteDetail,
} from '@/lib/cagnottesApi'
import { useAuthStore } from '@/store/authStore'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// ─────────────────────────────────────────────────────────────────────────────
// CotiserPage (desktop) — pendant desktop de MobileCotiser.
// MÊME flux et MÊME logique (4 phases formulaire → envoi → attente → succès/échec
// + garde « cagnotte bloquée »), habillés pour le desktop : panneau centré, cartes,
// composants Button/Card. Sur mobile, on délègue au vrai écran mobile.
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────

/** « M:SS » pour le décompte d'attente Airtel. */
function formatCountdown(secondes: number): string {
  const m = Math.floor(secondes / 60)
  const sec = secondes % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Icônes ───────────────────────────────────────────────────────────────────

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
)
const IconCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" /></svg>
)
const IconCancel = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
)
const IconPhone = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
)
const IconSavings = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2 -3.5-1.5-11-.3-11 5 0 1.8 1 3.3 2 4.5V18a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 8 8 0 0 0 5 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.4c.4-.3.8-.6 1.1-1H18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-.6c-.1-.4-.4-.8-.7-1.2V5z" /><circle cx="9" cy="10" r="1" fill={color} stroke="none" /></svg>
)
const IconLock = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
const IconInfo = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const IconError = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
)
const IconWarning = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
)
const IconSearch = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
const IconRefresh = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
)
const IconLockBig = () => (
  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)

// ── Types ─────────────────────────────────────────────────────────────────

type Phase = 'formulaire' | 'envoi' | 'attente' | 'succes' | 'echec'

// ── Sous-composants (habillage desktop) ─────────────────────────────────────

/** Ligne d'info read-only : icône + libellé + valeur. */
function InfoRow({ icon, label, valeur }: { icon: React.ReactNode; label: string; valeur: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex shrink-0">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs" style={{ color: T.textTert }}>{label}</span>
        <span className="text-sm font-semibold" style={{ color: T.textStrong }}>{valeur}</span>
      </div>
    </div>
  )
}

/** Bandeau d'erreur rouge. */
function BandeErreur({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3.5 py-2.5"
      style={{ background: T.errorSoft, border: `1px solid ${T.error}4D` }}
    >
      <span className="flex shrink-0"><IconError color={T.error} /></span>
      <span className="text-xs whitespace-pre-line" style={{ color: T.error }}>{message}</span>
    </div>
  )
}

/** Snackbar éphémère bas-centre. */
function Snack({ message }: { message: string }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-sm px-4 py-3 rounded-lg text-[13px] leading-snug shadow-lg"
      style={{ background: T.textStrong, color: T.surfaceEl }}
    >
      {message}
    </div>
  )
}

// Coquilles de mise en page — définies AU NIVEAU MODULE (pas dans le composant).
// Sinon elles seraient recréées à chaque render, ce qui démonte/remonte le
// sous-arbre et fait PERDRE LE FOCUS à l'input montant à chaque frappe.
function Shell({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
        style={{ color: T.textTert, background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.color = T.textStrong)}
        onMouseLeave={e => (e.currentTarget.style.color = T.textTert)}
      >
        <IconArrowLeft /> Retour
      </button>
      {children}
    </div>
  )
}

function Panneau({ children }: { children: React.ReactNode }) {
  return <Card elevated className="flex flex-col items-center text-center py-10 px-8">{children}</Card>
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function CotiserPage() {
  const isMobile = useMobile()

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const args: CotiserArgs = location.state ?? { titre: 'Cagnotte', type: 'cotisation' }

  const estTontine = args.type === 'tontine'
  const montantFixe = estTontine && args.montantSuggere != null
  const enRetard = !!(args.penaliteActive && args.penaliteCourante && args.penaliteCourante > 0)
  const numero = user?.telephone ?? '—'

  // ── État (miroir de MobileCotiser) ─────────────────────────────────────────
  const [montant, setMontant] = useState(args.montantSuggere != null ? args.montantSuggere.toString() : '')
  // Commentaire libre et facultatif (140 caracteres max, borne cote backend) :
  // particularite du don, ou cotisation faite pour quelqu'un d'autre.
  const [commentaire, setCommentaire] = useState('')
  const [phase, setPhase] = useState<Phase>('formulaire')
  const [erreurMessage, setErreurMessage] = useState<string | null>(null)
  const [transId, setTransId] = useState<string | null>(null)
  const [secondesRestantes, setSecondesRestantes] = useState(180)
  const [cancelVisible, setCancelVisible] = useState(false)
  const [verificationManuelleEnCours, setVerificationManuelleEnCours] = useState(false)
  const [cagnotte, setCagnotte] = useState<CagnotteDetail | null>(null)
  const [snack, setSnack] = useState<string | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tentativesRef = useRef(0)

  // ── Cycle de vie ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    chargerCagnotte(id).then(setCagnotte).catch(() => { /* silencieux */ })
  }, [id])

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
  }, [])

  useEffect(() => {
    if (!snack) return
    const t = setTimeout(() => setSnack(null), 4000)
    return () => clearTimeout(t)
  }, [snack])

  // ── Polling (miroir _demarrerPolling / _verifierStatut) ─────────────────────
  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
  }

  const verifierStatut = async (tid: string) => {
    tentativesRef.current++
    if (tentativesRef.current >= 18) {
      stopPolling()
      setPhase('echec')
      setErreurMessage(
        'Paiement non confirmé après 3 minutes.\n\n' +
        'Si votre compte Mobile Money a été débité, ne réessayez pas — ' +
        'le paiement peut arriver en retard. Vérifiez votre solde Airtel ' +
        'avant de retenter.',
      )
      return
    }
    try {
      const statut = await verifierStatutCotisation(tid)
      if (statut === 'succes') { stopPolling(); setPhase('succes') }
      else if (statut === 'echec') { stopPolling(); setPhase('echec'); setErreurMessage('Paiement refusé ou annulé.') }
    } catch { /* réseau — on réessaie au prochain tick */ }
  }

  const demarrerPolling = (tid: string) => {
    tentativesRef.current = 0
    setCancelVisible(false)
    setSecondesRestantes(180)
    pollingRef.current = setInterval(() => verifierStatut(tid), 10_000)
    countdownRef.current = setInterval(() => setSecondesRestantes(s => (s > 0 ? s - 1 : s)), 1000)
    cancelTimerRef.current = setTimeout(() => setCancelVisible(true), 30_000)
  }

  const annuler = () => {
    stopPolling()
    setPhase('formulaire')
    setCancelVisible(false)
    setErreurMessage(null)
  }

  const verifierManuellement = async () => {
    if (!transId || verificationManuelleEnCours) return
    setVerificationManuelleEnCours(true)
    try {
      const statut = await verifierStatutCotisation(transId)
      if (statut === 'succes') { stopPolling(); setPhase('succes'); setVerificationManuelleEnCours(false); return }
      if (statut === 'echec') { stopPolling(); setPhase('echec'); setErreurMessage('Paiement refusé ou annulé.'); setVerificationManuelleEnCours(false); return }
      setVerificationManuelleEnCours(false)
      setSnack('Paiement toujours en cours côté Airtel — réessayez dans quelques instants.')
    } catch {
      setVerificationManuelleEnCours(false)
      setSnack("Impossible de vérifier pour l'instant — réseau indisponible.")
    }
  }

  const soumettre = async () => {
    const m = parseInt(montant.trim(), 10) || 0
    if (!montantFixe) {
      if (!m || m < 100) { setErreurMessage('Montant minimum : 100 FCFA'); return }
      if (m > 500_000) { setErreurMessage('Montant maximum : 500 000 FCFA'); return }
    }
    setErreurMessage(null)
    setPhase('envoi')
    try {
      const result = await cotiser(id!, m, commentaire)
      if (result.statut === 'succes') {
        setPhase('succes')
      } else {
        setTransId(result.transId)
        setPhase('attente')
        demarrerPolling(result.transId)
      }
    } catch (e: unknown) {
      setPhase('formulaire')
      setErreurMessage(e instanceof Error ? e.message : 'Erreur inattendue.')
    }
  }

  // ── Garde « cagnotte bloquée » (miroir MobileCotiser) ────────────────────────
  const estTermine = cagnotte?.statut === 'cloturee'
  const objectifAtteint = cagnotte != null && cagnotte.type === 'cotisation' &&
    cagnotte.montantCible != null && cagnotte.montantCible > 0 &&
    cagnotte.montantCollecte >= cagnotte.montantCible
  const dateLimiteDepassee = cagnotte?.dateFin != null && new Date(cagnotte.dateFin).getTime() < Date.now()
  const tontineDemarree = cagnotte != null && estTontine && cagnotte.statut === 'en_cours'
  const bloquee = cagnotte != null && (
    !!estTermine || objectifAtteint || dateLimiteDepassee || (estTontine && !tontineDemarree)
  )

  // Sur mobile → écran mobile natif. Placé APRÈS les hooks (règles des hooks React).
  if (isMobile) return <MobileCotiser />

  const onBack = () => navigate(-1)

  // ── Écran bloqué ─────────────────────────────────────────────────────────────
  if (bloquee && cagnotte) {
    let message: string
    if (estTermine) message = 'Cette collecte est définitivement fermée.'
    else if (objectifAtteint) message = "L'objectif de cette cagnotte a été atteint — les contributions sont fermées."
    else if (dateLimiteDepassee) message = 'La date limite de cette cagnotte est dépassée.'
    else message = "Cette tontine n'a pas encore démarré — les cotisations ouvriront au démarrage."
    return (
      <Shell onBack={onBack}>
        <Panneau>
          <IconLockBig />
          <p className="mt-4 text-lg font-bold" style={{ color: T.textStrong }}>Paiement indisponible</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: T.textSec }}>{message}</p>
          <Button variant="outline" size="lg" className="mt-6" onClick={() => navigate(-1)}>Retour</Button>
        </Panneau>
      </Shell>
    )
  }

  // ── Écran attente (décompte + polling) ───────────────────────────────────────
  if (phase === 'attente') {
    const isLow = secondesRestantes <= 60
    const timerColor = isLow ? T.warning : T.primary
    const progress = secondesRestantes / 180
    const r = 36
    const circ = 2 * Math.PI * r
    return (
      <Shell onBack={onBack}>
        <Panneau>
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" className="absolute" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r={r} fill="none" stroke={timerColor} strokeWidth="4" opacity={0.15} />
              <circle cx="40" cy="40" r={r} fill="none" stroke={timerColor} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <span className="text-lg font-bold tabular-nums" style={{ color: timerColor }}>{formatCountdown(secondesRestantes)}</span>
          </div>
          <p className="mt-6 text-xl font-bold" style={{ color: T.textStrong }}>En attente de confirmation</p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: T.textSec }}>
            Vérifiez votre téléphone et approuvez le paiement Airtel Money. Cette page se mettra à jour automatiquement.
          </p>
          <p className="mt-2 text-xs" style={{ color: T.textTert }}>Ne quittez pas cette page.</p>
          <Button variant="outline" size="lg" className="mt-6" loading={verificationManuelleEnCours} onClick={verifierManuellement}>
            {!verificationManuelleEnCours && <IconSearch color={T.primary} />}
            {verificationManuelleEnCours ? 'Vérification…' : 'Vérifier manuellement'}
          </Button>
          {cancelVisible && (
            <button onClick={annuler} className="mt-3 text-sm" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer' }}>
              Annuler et réessayer plus tard
            </button>
          )}
        </Panneau>
        {snack && <Snack message={snack} />}
      </Shell>
    )
  }

  // ── Écran succès ─────────────────────────────────────────────────────────────
  if (phase === 'succes') {
    return (
      <Shell onBack={onBack}>
        <Panneau>
          <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: T.successSoft }}>
            <IconCheck />
          </div>
          <p className="mt-6 text-xl font-bold" style={{ color: T.textStrong }}>Paiement confirmé !</p>
          <p className="mt-2 text-sm" style={{ color: T.textSec }}>Votre paiement a bien été enregistré.</p>
          <Button variant="primary" size="lg" className="mt-8 w-full" onClick={() => navigate(`/cagnottes/${id}`, { replace: true })}>
            Retour à la cagnotte
          </Button>
        </Panneau>
      </Shell>
    )
  }

  // ── Écran échec ──────────────────────────────────────────────────────────────
  if (phase === 'echec') {
    return (
      <Shell onBack={onBack}>
        <Panneau>
          <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: T.errorSoft }}>
            <IconCancel />
          </div>
          <p className="mt-6 text-xl font-bold" style={{ color: T.textStrong }}>Paiement échoué</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line" style={{ color: T.textSec }}>
            {erreurMessage ?? "Le paiement n'a pas abouti."}
          </p>
          {transId && (
            <Button variant="outline" size="lg" className="mt-6 w-full" loading={verificationManuelleEnCours} onClick={verifierManuellement}>
              {!verificationManuelleEnCours && <IconSearch color={T.primary} />}
              {verificationManuelleEnCours ? 'Vérification…' : 'Vérifier si déjà payé'}
            </Button>
          )}
          <Button variant="primary" size="lg" className="mt-3 w-full" onClick={() => { setPhase('formulaire'); setErreurMessage(null); setTransId(null) }}>
            <IconRefresh color={T.surfaceEl} /> Réessayer
          </Button>
          <button onClick={() => navigate(-1)} className="mt-3 text-sm" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer' }}>
            Annuler
          </button>
        </Panneau>
        {snack && <Snack message={snack} />}
      </Shell>
    )
  }

  // ── Écran formulaire (+ phase envoi) ─────────────────────────────────────────
  const enEnvoi = phase === 'envoi'
  const total = enRetard
    ? (args.montantAffiche ?? args.montantSuggere!) + args.penaliteCourante!
    : (args.montantAffiche ?? args.montantSuggere ?? 0)
  return (
    <Shell onBack={onBack}>
      <AnimatePresence mode="wait">
        <motion.div
          key="formulaire"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
        >
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: T.textStrong }}>Cotiser</h1>
          <p className="mt-1 text-sm" style={{ color: T.textSec }}>
            Le paiement sera débité sur votre compte Mobile Money.
          </p>

          <Card elevated className="mt-6 flex flex-col gap-5">
            <InfoRow icon={<IconPhone color={T.textSec} />} label="Numéro Mobile Money" valeur={numero} />

            {args.montantRecuperation != null && args.montantRecuperation > 0 && (
              <InfoRow icon={<IconSavings color={T.textSec} />} label="Vous recevrez à votre tour" valeur={fmt(args.montantRecuperation)} />
            )}

            {enRetard && (
              <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: T.warningSoft, border: `1px solid ${T.warning}73` }}>
                <span className="flex shrink-0"><IconWarning color={T.warning} /></span>
                <span className="text-[13px] font-semibold" style={{ color: T.warning }}>
                  Vous êtes en retard sur ce tour. Une pénalité de {fmt(args.penaliteCourante!)} a été ajoutée.
                </span>
              </div>
            )}

            <div className="h-px" style={{ background: T.border }} />

            {montantFixe ? (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: T.surfaceDeep, border: `1px solid ${T.border}` }}>
                <div className="flex-1 flex flex-col">
                  <span className="text-xs" style={{ color: T.textTert }}>Montant débité</span>
                  <span className="text-[17px] font-extrabold" style={{ color: T.textStrong }}>{fmt(total)}</span>
                </div>
                <IconLock size={16} color={T.textTert} />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>Montant</label>
                <div
                  className="mt-1.5 flex items-center gap-2 rounded-lg px-4 py-3"
                  style={{ background: T.surfaceEl, border: `1.5px solid ${erreurMessage ? T.error : T.border}` }}
                >
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={montant}
                    onChange={e => { setMontant(e.target.value.replace(/\D/g, '')); setErreurMessage(null) }}
                    placeholder="montant (fcfa)"
                    className="flex-1 bg-transparent border-none outline-none text-base font-semibold"
                    style={{ color: T.textStrong, fontFamily: 'inherit' }}
                  />
                  <span className="text-sm font-semibold shrink-0" style={{ color: T.textSec }}>FCFA</span>
                </div>
              </div>
            )}

            {/* Commentaire facultatif — jamais rendu public : seuls le gerant
                de la cagnotte et l'auteur du paiement le voient. */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>
                Commentaire (facultatif)
              </label>
              <textarea
                value={commentaire}
                maxLength={140}
                rows={2}
                onChange={e => setCommentaire(e.target.value)}
                placeholder="ex : je cotise pour ma mère"
                className="mt-1.5 w-full resize-none rounded-lg px-4 py-3 text-base outline-none"
                style={{ background: T.surfaceEl, border: `1.5px solid ${T.border}`, color: T.textStrong, fontFamily: 'inherit' }}
              />
            </div>

            <div className="flex items-start gap-1.5">
              <span className="shrink-0 pt-0.5"><IconInfo color={T.textTert} /></span>
              <span className="text-xs" style={{ color: T.textTert }}>
                Des frais seront appliqués au moment du paiement.*
              </span>
            </div>

            {erreurMessage && <BandeErreur message={erreurMessage} />}

            <Button variant="primary" size="lg" className="w-full" loading={enEnvoi} onClick={soumettre}>
              {!enEnvoi && <IconSend />}
              {enEnvoi ? 'Envoi…' : 'Confirmer le paiement'}
            </Button>
          </Card>
        </motion.div>
      </AnimatePresence>
    </Shell>
  )
}
