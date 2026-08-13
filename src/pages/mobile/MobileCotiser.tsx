import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import {
  cotiser,
  verifierStatutCotisation,
  chargerCagnotte,
  type CagnotteDetail,
} from '@/lib/cagnottesApi'
import { useAuthStore } from '@/store/authStore'

// ─────────────────────────────────────────────────────────────────────────────
// MobileCotiser — miroir fidèle de cotiser_screen.dart (Flutter).
// Écran de paiement Mobile Money (Airtel) pour cotiser à une cagnotte/tontine.
// Gère 4 phases : formulaire → envoi → attente confirmation Airtel → succès/échec.
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Formatage montant identique à _formatMontant() Dart : séparateur espace + « FCFA ».
function fmtMontant(montant: number): string {
  const s = montant.toString()
  let b = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) b += ' '
    b += s[i]
  }
  return `${b} FCFA`
}

/// Convertit un nombre de secondes en « M:SS » (miroir _formatCountdown Dart).
function formatCountdown(secondes: number): string {
  const m = Math.floor(secondes / 60)
  const sec = secondes % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Icônes (équivalents Material Icons utilisés dans le .dart) ──────────────────

// Icons.arrow_back_ios_new_rounded
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
)
// Icons.check_circle_rounded
const IconCheck = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" /></svg>
)
// Icons.cancel_rounded
const IconCancel = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
)
// Icons.savings_outlined
const IconSavings = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2 -3.5-1.5-11-.3-11 5 0 1.8 1 3.3 2 4.5V18a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 8 8 0 0 0 5 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.4c.4-.3.8-.6 1.1-1H18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-.6c-.1-.4-.4-.8-.7-1.2V5z" /><circle cx="9" cy="10" r="1" fill={color} stroke="none" /></svg>
)
// Icons.payments_outlined
const IconPayments = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="18" height="12" rx="2" /><circle cx="11" cy="13" r="2.5" /><path d="M6 3h14a2 2 0 0 1 2 2v9" /></svg>
)
// Icons.lock_outline_rounded
const IconLock = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
// Icons.info_outline_rounded
const IconInfo = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
// Icons.error_outline_rounded
const IconErrorOutline = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
)
// Icons.warning_amber_rounded
const IconWarning = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
)
// Icons.search_rounded
const IconSearch = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
// Icons.refresh_rounded
const IconRefresh = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
)
// Icons.lock_outline_rounded (gros — écran bloqué)
const IconLockBig = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'formulaire' | 'envoi' | 'attente' | 'succes' | 'echec'

/// Arguments reçus via location.state (miroir de CotiserArgs Dart).
export interface CotiserArgs {
  titre: string
  type: 'tontine' | 'cotisation'
  montantSuggere?: number   // contribution nette → pré-remplit ET verrouille pour tontine
  montantAffiche?: number   // montant brut affiché (frais inclus). Si absent, on affiche montantSuggere
  montantRecuperation?: number // montant que le bénéficiaire reçoit à son tour
  penaliteActive?: boolean
  penaliteCourante?: number
}

// ── Sous-composants ─────────────────────────────────────────────────────────────

/// Ligne d'information read-only : icône + libellé + valeur (miroir _InfoRow).
function InfoRow({ icon, label, valeur }: { icon: React.ReactNode; label: string; valeur: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '12px', color: T.textTert }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: T.textStrong }}>{valeur}</span>
      </div>
    </div>
  )
}

/// Note sous le champ montant — frais à la charge du cotisant (miroir _FraisNote).
function FraisNote() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
      <span style={{ flexShrink: 0, paddingTop: '1px' }}><IconInfo color={T.textTert} /></span>
      <span style={{ fontSize: '12px', color: T.textTert }}>
        Des frais seront appliqués au moment de la transaction.*
      </span>
    </div>
  )
}

/// Bandeau d'erreur rouge avec icône (miroir _BandeErreur).
function BandeErreur({ message }: { message: string }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: '10px',
      background: 'rgba(217,79,61,0.08)',
      border: '1px solid rgba(217,79,61,0.3)',
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      <span style={{ flexShrink: 0 }}><IconErrorOutline color={T.error} /></span>
      <span style={{ fontSize: '12px', color: T.error, whiteSpace: 'pre-line' }}>{message}</span>
    </div>
  )
}

/// Carte montant figé pour tontine sans pénalité (miroir _CarteMontantFixe).
function CarteMontantFixe({ montantAffiche }: { montantAffiche: number }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '14px',
      background: 'rgba(236,237,233,0.5)',
      border: '1px solid rgba(232,237,233,0.5)',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <IconPayments color={T.textSec} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '12px', color: T.textTert }}>Montant débité</span>
        <span style={{ fontSize: '17px', fontWeight: 800, color: T.textStrong }}>{fmtMontant(montantAffiche)}</span>
      </div>
      <IconLock size={16} color={T.textTert} />
    </div>
  )
}

/// Banner ambre — cotisant en retard sur ce tour (miroir _BannerRetard).
function BannerRetard({ penaliteCourante }: { penaliteCourante: number }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: '12px',
      background: 'rgba(196,138,26,0.10)',
      border: '1px solid rgba(196,138,26,0.45)',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <span style={{ flexShrink: 0 }}><IconWarning color={T.warning} /></span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: T.warning }}>
        Vous êtes en retard sur ce tour. Une pénalité de {fmtMontant(penaliteCourante)} a été ajoutée.
      </span>
    </div>
  )
}

/// Ligne label / valeur colorée de la décomposition (miroir _LigneDecomp).
function LigneDecomp({ label, valeur, couleur }: { label: string; valeur: string; couleur?: string }) {
  const c = couleur ?? T.textSec
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '13px', color: c, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '13px', color: c, fontWeight: 600 }}>{valeur}</span>
    </div>
  )
}

/// Carte montant décomposé base + pénalité = total (miroir _CarteMontantAvecPenalite).
function CarteMontantAvecPenalite({ base, penalite }: { base: number; penalite: number }) {
  const total = base + penalite
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '14px',
      background: 'rgba(196,138,26,0.06)',
      border: '1px solid rgba(196,138,26,0.30)',
      display: 'flex', flexDirection: 'column',
    }}>
      <LigneDecomp label="Base cotisation" valeur={fmtMontant(base)} />
      <div style={{ height: '6px' }} />
      <LigneDecomp label="Pénalité de retard" valeur={fmtMontant(penalite)} couleur={T.warning} />
      <div style={{ height: '10px' }} />
      <div style={{ height: '1px', background: T.border }} />
      <div style={{ height: '10px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong }}>Total débité</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: T.textStrong }}>{fmtMontant(total)}</span>
          <IconLock size={14} color={T.textTert} />
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function MobileCotiser() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  // Arguments passés via location.state (miroir GoRouter.extra Dart).
  const args: CotiserArgs = location.state ?? { titre: 'Cagnotte', type: 'cotisation' }

  const estTontine = args.type === 'tontine'
  // Montant imposé par la tontine → champ remplacé par une carte figée.
  const montantFixe = estTontine && args.montantSuggere != null
  // En retard : pénalité active ET non nulle (getter enRetard Dart).
  const enRetard = !!(args.penaliteActive && args.penaliteCourante && args.penaliteCourante > 0)

  // Numéro Mobile Money du payeur (informatif).
  const numero = user?.telephone ?? '—'

  // ── État ────────────────────────────────────────────────────────────────────
  const [montant, setMontant] = useState(
    args.montantSuggere != null ? args.montantSuggere.toString() : '',
  )
  const [phase, setPhase] = useState<Phase>('formulaire')
  const [erreurMessage, setErreurMessage] = useState<string | null>(null)
  const [transId, setTransId] = useState<string | null>(null)
  const [secondesRestantes, setSecondesRestantes] = useState(180)
  const [cancelVisible, setCancelVisible] = useState(false)
  const [verificationManuelleEnCours, setVerificationManuelleEnCours] = useState(false)

  // Garde réactive : cagnotte rechargée pour détecter une clôture (miroir cagnotteParIdProvider).
  const [cagnotte, setCagnotte] = useState<CagnotteDetail | null>(null)

  // Timers (refs pour survivre aux re-renders).
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tentativesRef = useRef(0)
  // Snackbar éphémère (équivalent ScaffoldMessenger).
  const [snack, setSnack] = useState<string | null>(null)

  // ── Cycle de vie ──────────────────────────────────────────────────────────────

  // Charge la cagnotte une fois pour la garde « bloquée » (miroir ref.watch).
  useEffect(() => {
    if (!id) return
    chargerCagnotte(id).then(setCagnotte).catch(() => { /* silencieux */ })
  }, [id])

  // Nettoyage des timers à la destruction (miroir dispose()).
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
    }
  }, [])

  // Auto-masquage du snackbar après 4 s.
  useEffect(() => {
    if (!snack) return
    const t = setTimeout(() => setSnack(null), 4000)
    return () => clearTimeout(t)
  }, [snack])

  // ── Logique polling (miroir _demarrerPolling / _verifierStatut) ────────────────

  /// Arrête tous les timers de polling.
  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
  }

  /// Interroge le backend toutes les 10 s — fait progresser la phase. (miroir _verifierStatut)
  const verifierStatut = async (tid: string) => {
    tentativesRef.current++
    // Timeout après 18 tentatives (3 min) → échec pédagogique.
    if (tentativesRef.current >= 18) {
      stopPolling()
      setPhase('echec')
      setErreurMessage(
        'Transaction non confirmée après 3 minutes.\n\n' +
        'Si votre compte Airtel Money a été débité, ne réessayez pas — ' +
        'la transaction peut arriver en retard. Vérifiez votre solde Airtel ' +
        'avant de retenter.',
      )
      return
    }
    try {
      const statut = await verifierStatutCotisation(tid)
      if (statut === 'succes') {
        stopPolling()
        setPhase('succes')
      } else if (statut === 'echec') {
        stopPolling()
        setPhase('echec')
        setErreurMessage('Transaction refusée ou annulée.')
      }
      // Sinon encore `initie` → on attend le prochain tick.
    } catch {
      // Erreur réseau temporaire — on réessaie au prochain tick.
    }
  }

  /// Démarre polling (10 s) + décompte (1 s) + bouton annuler après 30 s. (miroir _demarrerPolling)
  const demarrerPolling = (tid: string) => {
    tentativesRef.current = 0
    setCancelVisible(false)
    setSecondesRestantes(180)
    pollingRef.current = setInterval(() => verifierStatut(tid), 10_000)
    countdownRef.current = setInterval(() => {
      setSecondesRestantes(s => (s > 0 ? s - 1 : s))
    }, 1000)
    cancelTimerRef.current = setTimeout(() => {
      setCancelVisible(true)
    }, 30_000)
  }

  /// Annule le polling et retourne au formulaire. (miroir _annuler)
  const annuler = () => {
    stopPolling()
    setPhase('formulaire')
    setCancelVisible(false)
    setErreurMessage(null)
  }

  /// Vérification manuelle déclenchée par l'utilisateur (attente OU échec). (miroir _verifierManuellement)
  const verifierManuellement = async () => {
    if (!transId || verificationManuelleEnCours) return
    setVerificationManuelleEnCours(true)
    try {
      const statut = await verifierStatutCotisation(transId)
      if (statut === 'succes') {
        stopPolling()
        setPhase('succes')
        setVerificationManuelleEnCours(false)
        return
      } else if (statut === 'echec') {
        stopPolling()
        setPhase('echec')
        setErreurMessage('Transaction refusée ou annulée.')
        setVerificationManuelleEnCours(false)
        return
      }
      // Statut toujours en cours → on informe l'utilisateur.
      setVerificationManuelleEnCours(false)
      setSnack('Transaction toujours en cours côté Airtel — réessayez dans quelques instants.')
    } catch {
      setVerificationManuelleEnCours(false)
      setSnack("Impossible de vérifier pour l'instant — réseau indisponible.")
    }
  }

  /// Soumet le paiement au backend et transite vers attente si Airtel initie. (miroir _soumettre)
  const soumettre = async () => {
    // Validation montant (miroir validator du TextFormField).
    const m = parseInt(montant.trim(), 10) || 0
    if (!montantFixe) {
      if (!m || m < 100) { setErreurMessage('Montant minimum : 100 FCFA'); return }
      if (m > 500_000) { setErreurMessage('Montant maximum : 500 000 FCFA'); return }
    }
    setErreurMessage(null)
    setPhase('envoi')
    try {
      const result = await cotiser(id!, m)
      if (result.statut === 'succes') {
        setPhase('succes')
      } else {
        // Airtel a initié — l'utilisateur doit confirmer sur son téléphone.
        setTransId(result.transId)
        setPhase('attente')
        demarrerPolling(result.transId)
      }
    } catch (e: unknown) {
      setPhase('formulaire')
      setErreurMessage(e instanceof Error ? e.message : 'Erreur inattendue.')
    }
  }

  // ── Garde « cagnotte bloquée » (miroir build() + _buildCagnotteBloquee) ─────────
  // On reconstitue les drapeaux à partir du détail chargé.
  const estTermine = cagnotte?.statut === 'cloturee'
  const objectifAtteint = cagnotte != null && cagnotte.type === 'cotisation' &&
    cagnotte.montantCible != null && cagnotte.montantCible > 0 &&
    cagnotte.montantCollecte >= cagnotte.montantCible
  const dateLimiteDepassee = cagnotte?.dateFin != null &&
    new Date(cagnotte.dateFin).getTime() < Date.now()
  const tontineDemarree = cagnotte != null && estTontine && cagnotte.statut === 'en_cours'
  const bloquee = cagnotte != null && (
    !!estTermine ||
    objectifAtteint ||
    dateLimiteDepassee ||
    (estTontine && !tontineDemarree)
  )

  // ── Rendu écran bloqué ────────────────────────────────────────────────────────
  if (bloquee && cagnotte) {
    let message: string
    if (estTermine) {
      message = 'Cette collecte est définitivement fermée.'
    } else if (objectifAtteint) {
      message = "L'objectif de cette cagnotte a été atteint — les contributions sont fermées."
    } else if (dateLimiteDepassee) {
      message = 'La date limite de cette cagnotte est dépassée.'
    } else {
      message = "Cette tontine n'a pas encore démarré — les cotisations ouvriront au démarrage."
    }
    return (
      <div style={{ background: T.surface, minHeight: '100%' }}>
        <Header titre={args.titre} bloquerRetour={false} onBack={() => navigate(-1)} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '0 20px' }}>
          <IconLockBig />
          <div style={{ height: '16px' }} />
          <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, textAlign: 'center' }}>Transaction indisponible</p>
          <div style={{ height: '8px' }} />
          <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.5 }}>{message}</p>
          <div style={{ height: '24px' }} />
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '12px', border: `1.5px solid ${T.border}`, background: T.surfaceEl, color: T.primary, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex' }}><IconBack /></span>
            Retour
          </button>
        </div>
      </div>
    )
  }

  // ── Rendu écran attente (miroir _buildAttente) ─────────────────────────────────
  if (phase === 'attente') {
    const isLow = secondesRestantes <= 60
    // Passage en orange quand il reste moins de 60 s.
    const timerColor = isLow ? T.warning : T.primary
    const progress = secondesRestantes / 180
    // Cercle de progression SVG (équivalent CircularProgressIndicator value).
    const r = 36
    const circ = 2 * Math.PI * r
    return (
      <div style={{ background: T.surface, minHeight: '100%' }}>
        <Header titre={args.titre} bloquerRetour onBack={() => {}} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '78vh', padding: '0 28px' }}>
          {/* Cercle de décompte */}
          <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r={r} fill="none" stroke={timerColor} strokeWidth="4" opacity={0.15} />
              <circle cx="40" cy="40" r={r} fill="none" stroke={timerColor} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)} />
            </svg>
            <span style={{ fontSize: '18px', fontWeight: 700, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
              {formatCountdown(secondesRestantes)}
            </span>
          </div>
          <div style={{ height: '28px' }} />
          <p style={{ fontSize: '20px', fontWeight: 700, color: T.textStrong, textAlign: 'center' }}>En attente de confirmation</p>
          <div style={{ height: '12px' }} />
          <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.5 }}>
            Vérifiez votre téléphone et approuvez la transaction Airtel Money. Cette page se mettra à jour automatiquement.
          </p>
          <div style={{ height: '8px' }} />
          <p style={{ fontSize: '12px', color: T.textTert, textAlign: 'center' }}>Ne quittez pas cet écran.</p>
          <div style={{ height: '28px' }} />
          <button
            onClick={verifierManuellement}
            disabled={verificationManuelleEnCours}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '12px', border: `1.5px solid ${T.border}`, background: T.surfaceEl, color: T.primary, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: verificationManuelleEnCours ? 'default' : 'pointer' }}
          >
            {verificationManuelleEnCours
              ? <Spinner16 color={T.primary} />
              : <span style={{ display: 'flex' }}><IconSearch color={T.primary} /></span>}
            {verificationManuelleEnCours ? 'Vérification…' : 'Vérifier manuellement'}
          </button>
          {cancelVisible && (
            <>
              <div style={{ height: '12px' }} />
              <button
                onClick={annuler}
                style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'none', color: T.textSec, fontSize: '14px', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Annuler et réessayer plus tard
              </button>
            </>
          )}
        </div>
        {snack && <Snack message={snack} />}
      </div>
    )
  }

  // ── Rendu écran succès (miroir _buildSucces) ───────────────────────────────────
  if (phase === 'succes') {
    return (
      <div style={{ background: T.surface, minHeight: '100%' }}>
        <Header titre={args.titre} bloquerRetour={false} onBack={() => navigate(`/cagnottes/${id}`, { replace: true })} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '78vh', padding: '0 28px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(26,122,80,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCheck />
          </div>
          <div style={{ height: '24px' }} />
          <p style={{ fontSize: '20px', fontWeight: 700, color: T.textStrong, textAlign: 'center' }}>Transaction confirmée !</p>
          <div style={{ height: '10px' }} />
          <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.5 }}>Votre transaction a bien été enregistrée.</p>
          <div style={{ height: '32px' }} />
          <button
            onClick={() => navigate(`/cagnottes/${id}`, { replace: true })}
            style={{ width: '100%', maxWidth: '320px', height: '52px', borderRadius: '14px', border: 'none', background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Retour à la cagnotte
          </button>
        </div>
      </div>
    )
  }

  // ── Rendu écran échec (miroir _buildEchec) ─────────────────────────────────────
  if (phase === 'echec') {
    return (
      <div style={{ background: T.surface, minHeight: '100%' }}>
        <Header titre={args.titre} bloquerRetour={false} onBack={() => navigate(-1)} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '78vh', padding: '0 28px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(217,79,61,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCancel />
          </div>
          <div style={{ height: '24px' }} />
          <p style={{ fontSize: '20px', fontWeight: 700, color: T.textStrong, textAlign: 'center' }}>Transaction échouée</p>
          <div style={{ height: '10px' }} />
          <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {erreurMessage ?? "La transaction n'a pas abouti."}
          </p>
          <div style={{ height: '32px' }} />
          {/* Vérification manuelle — cas timeout mais paiement passé (TIP). */}
          {transId && (
            <>
              <button
                onClick={verifierManuellement}
                disabled={verificationManuelleEnCours}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px', height: '48px', justifyContent: 'center', borderRadius: '12px', border: `1.5px solid ${T.primary}`, background: 'none', color: T.primary, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: verificationManuelleEnCours ? 'default' : 'pointer' }}
              >
                {verificationManuelleEnCours
                  ? <Spinner16 color={T.primary} />
                  : <span style={{ display: 'flex' }}><IconSearch color={T.primary} /></span>}
                {verificationManuelleEnCours ? 'Vérification…' : 'Vérifier si déjà payé'}
              </button>
              <div style={{ height: '12px' }} />
            </>
          )}
          <button
            onClick={() => { setPhase('formulaire'); setErreurMessage(null); setTransId(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px', height: '52px', justifyContent: 'center', borderRadius: '14px', border: 'none', background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex' }}><IconRefresh color={T.surface} /></span>
            Réessayer
          </button>
          <div style={{ height: '12px' }} />
          <button
            onClick={() => navigate(-1)}
            style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'none', color: T.textSec, fontSize: '14px', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Annuler
          </button>
        </div>
        {snack && <Snack message={snack} />}
      </div>
    )
  }

  // ── Rendu formulaire (miroir _buildFormulaire) ─────────────────────────────────
  const enEnvoi = phase === 'envoi'
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: T.surface, minHeight: '100%' }}>
        <Header titre="" bloquerRetour={false} onBack={() => navigate(-1)} />
        <div style={{ padding: '4px 20px 32px' }}>
          {/* Titre = nom de la cagnotte (comme sur les écrans de création) */}
          <p style={{ fontSize: '24px', fontWeight: 800, color: T.textStrong, margin: 0 }}>{args.titre}</p>
          <div style={{ height: '6px' }} />
          <p style={{ fontSize: '14px', color: T.textTert, margin: 0, lineHeight: 1.4 }}>
            Cotisez maintenant, le montant sera débité sur votre compte Airtel Money.
          </p>
          <div style={{ height: '28px' }} />

          {/* Numéro payeur (informatif) — logo Airtel devant le numéro */}
          <InfoRow
            icon={<img src="/airtel-money.webp" alt="Airtel Money" width={36} height={36} style={{ borderRadius: '8px', objectFit: 'cover', display: 'block' }} />}
            label="Numéro Airtel Money"
            valeur={numero}
          />

          {/* Montant de récupération (tontine) */}
          {args.montantRecuperation != null && args.montantRecuperation > 0 && (
            <>
              <div style={{ height: '12px' }} />
              <InfoRow
                icon={<IconSavings color={T.textSec} />}
                label="Vous recevrez à votre tour"
                valeur={fmtMontant(args.montantRecuperation)}
              />
            </>
          )}

          {/* Banner retard */}
          {enRetard && (
            <>
              <div style={{ height: '16px' }} />
              <BannerRetard penaliteCourante={args.penaliteCourante!} />
            </>
          )}

          <div style={{ height: '20px' }} />

          {/* Montant : carte figée (tontine) ou champ libre */}
          {montantFixe ? (
            enRetard
              ? <CarteMontantAvecPenalite
                  base={args.montantAffiche ?? args.montantSuggere!}
                  penalite={args.penaliteCourante!}
                />
              : <CarteMontantFixe
                  montantAffiche={args.montantAffiche ?? args.montantSuggere!}
                />
          ) : (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: T.surfaceEl, borderRadius: '14px',
                border: `1.5px solid ${erreurMessage ? T.error : T.border}`,
                padding: '14px 16px',
              }}>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={montant}
                  onChange={e => { setMontant(e.target.value.replace(/\D/g, '')); setErreurMessage(null) }}
                  placeholder="ex : 5 000"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '16px', fontWeight: 600, color: T.textStrong, fontFamily: 'inherit' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: T.textSec, flexShrink: 0 }}>FCFA</span>
              </div>
            </div>
          )}

          <div style={{ height: '12px' }} />
          <FraisNote />

          {/* Bandeau erreur API */}
          {erreurMessage && (
            <>
              <div style={{ height: '16px' }} />
              <BandeErreur message={erreurMessage} />
            </>
          )}

          <div style={{ height: '28px' }} />
          {/* Bouton confirmation */}
          <button
            onClick={soumettre}
            disabled={enEnvoi}
            style={{
              width: '100%', height: '54px', borderRadius: '14px', border: 'none',
              background: T.primary, color: T.surface,
              fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
              cursor: enEnvoi ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: enEnvoi ? 0.9 : 1,
            }}
          >
            {enEnvoi ? (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2.4px solid rgba(246,247,244,0.4)', borderTopColor: T.surface, animation: 'spin 0.8s linear infinite' }} />
            ) : (
              'Confirmer la transaction'
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Header AppBar (miroir AppBar Dart) ─────────────────────────────────────────
/// Barre de titre. `bloquerRetour` désactive le bouton retour pendant l'attente Airtel.
function Header({ titre, bloquerRetour, onBack }: { titre: string; bloquerRetour: boolean; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
      <button
        onClick={bloquerRetour ? undefined : onBack}
        disabled={bloquerRetour}
        style={{ background: 'none', border: 'none', cursor: bloquerRetour ? 'default' : 'pointer', padding: '4px', color: bloquerRetour ? T.textTert : T.textStrong, display: 'flex' }}
      >
        <IconBack />
      </button>
      <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, margin: 0 }}>{titre}</p>
    </div>
  )
}

// ── Spinner 16px (équivalent petit CircularProgressIndicator) ──────────────────
function Spinner16({ color }: { color: string }) {
  return (
    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${color}33`, borderTopColor: color, animation: 'spin 0.8s linear infinite' }} />
  )
}

// ── Snackbar (équivalent ScaffoldMessenger.showSnackBar) ───────────────────────
function Snack({ message }: { message: string }) {
  return (
    <div style={{ position: 'fixed', left: '16px', right: '16px', bottom: '20px', maxWidth: '360px', margin: '0 auto', background: T.textStrong, color: T.surface, padding: '12px 16px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.4, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 50 }}>
      {message}
    </div>
  )
}
