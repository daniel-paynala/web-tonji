import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { cotiser, verifierStatutCotisation } from '@/lib/cagnottesApi'
import { estCompteLight, useAuthStore } from '@/store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
)
const IconSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)
const IconCheck = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
)
const IconError = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
)
const IconClock = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.warning} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)
const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.warning} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
)

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'formulaire' | 'envoi' | 'attente' | 'succes' | 'echec'

export interface CotiserArgs {
  titre: string
  type: 'tontine' | 'cotisation'
  montantSuggere?: number   // fixe pour tontine
  montantAffiche?: number   // brut avec frais, pour affichage
  montantRecuperation?: number
  penaliteActive?: boolean
  penaliteCourante?: number
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function MobileCotiser() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const args: CotiserArgs = location.state ?? { titre: 'Cagnotte', type: 'cotisation' }

  const estTontine = args.type === 'tontine'
  const montantFixe = estTontine && args.montantSuggere != null
  const enRetard = !!(args.penaliteActive && args.penaliteCourante && args.penaliteCourante > 0)

  const [montant, setMontant] = useState(args.montantSuggere?.toString() ?? '')
  const [phase, setPhase] = useState<Phase>('formulaire')
  const [erreur, setErreur] = useState('')
  const [transId, setTransId] = useState('')
  const [secondes, setSecondes] = useState(180)
  const [cancelVisible, setCancelVisible] = useState(false)
  const [verificationEnCours, setVerificationEnCours] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tentativesRef = useRef(0)

  // compte light → ne peut pas cotiser si compte light ? Non — les comptes light peuvent cotiser.
  // Mais on vérifie quand même pour les cas edge.
  const light = estCompteLight(user)

  useEffect(() => {
    return () => {
      pollingRef.current && clearInterval(pollingRef.current)
      countdownRef.current && clearInterval(countdownRef.current)
      cancelTimerRef.current && clearTimeout(cancelTimerRef.current)
    }
  }, [])

  const demarrerPolling = (tid: string) => {
    tentativesRef.current = 0
    setCancelVisible(false)
    setSecondes(180)
    pollingRef.current = setInterval(() => verifierStatut(tid), 10_000)
    countdownRef.current = setInterval(() => setSecondes(s => Math.max(0, s - 1)), 1000)
    cancelTimerRef.current = setTimeout(() => setCancelVisible(true), 30_000)
  }

  const stopPolling = () => {
    pollingRef.current && clearInterval(pollingRef.current)
    countdownRef.current && clearInterval(countdownRef.current)
    cancelTimerRef.current && clearTimeout(cancelTimerRef.current)
  }

  const verifierStatut = async (tid: string) => {
    tentativesRef.current++
    if (tentativesRef.current >= 18) {
      stopPolling()
      setPhase('echec')
      setErreur('Paiement non confirmé après 3 minutes.\n\nSi votre compte Mobile Money a été débité, ne réessayez pas — le paiement peut arriver en retard. Vérifiez votre solde Airtel avant de retenter.')
      return
    }
    try {
      const statut = await verifierStatutCotisation(tid)
      if (statut === 'succes') { stopPolling(); setPhase('succes') }
      else if (statut === 'echec') { stopPolling(); setPhase('echec'); setErreur('Paiement refusé ou annulé.') }
    } catch { /* réseau — on réessaie au prochain tick */ }
  }

  const verifierManuellement = async () => {
    if (!transId || verificationEnCours) return
    setVerificationEnCours(true)
    try {
      const statut = await verifierStatutCotisation(transId)
      if (statut === 'succes') { stopPolling(); setPhase('succes') }
      else if (statut === 'echec') { stopPolling(); setPhase('echec'); setErreur('Paiement refusé ou annulé.') }
      else setErreur('Paiement toujours en cours côté Airtel — réessayez dans quelques instants.')
    } catch {
      setErreur('Impossible de vérifier pour l\'instant — réseau indisponible.')
    } finally {
      setVerificationEnCours(false)
    }
  }

  const annuler = () => {
    stopPolling()
    setPhase('formulaire')
    setCancelVisible(false)
    setErreur('')
  }

  const soumettre = async () => {
    const m = parseInt(montant.replace(/\s/g, ''))
    if (!m || m < 100) { setErreur('Montant minimum : 100 FCFA'); return }
    if (m > 500_000) { setErreur('Plafond : 500 000 FCFA par transaction'); return }
    setErreur('')
    setPhase('envoi')
    try {
      const result = await cotiser(id!, m)
      if (result.statut === 'succes') {
        setPhase('succes')
      } else {
        setTransId(result.transId)
        setPhase('attente')
        demarrerPolling(result.transId)
      }
    } catch (e: unknown) {
      setPhase('formulaire')
      setErreur(e instanceof Error ? e.message : 'Erreur inattendue. Réessaie.')
    }
  }

  // ── Écran succès ──────────────────────────────────────────────────────────
  if (phase === 'succes') {
    return (
      <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `rgba(107,142,78,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <IconCheck />
        </div>
        <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, textAlign: 'center', marginBottom: '8px' }}>Cotisation envoyée !</p>
        <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.5, marginBottom: '32px' }}>
          Votre paiement a bien été reçu pour «&nbsp;{args.titre}&nbsp;».
        </p>
        <button
          onClick={() => navigate(`/cagnottes/${id}`, { replace: true })}
          style={{ width: '100%', maxWidth: '320px', height: '52px', borderRadius: '14px', border: 'none', background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          Retour à la cagnotte
        </button>
      </div>
    )
  }

  // ── Écran attente ─────────────────────────────────────────────────────────
  if (phase === 'attente') {
    const mm = Math.floor(secondes / 60).toString().padStart(2, '0')
    const ss = (secondes % 60).toString().padStart(2, '0')
    return (
      <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `rgba(212,155,63,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <IconClock />
        </div>
        <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong, textAlign: 'center', marginBottom: '8px' }}>Validation en cours…</p>
        <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.5, marginBottom: '8px' }}>
          Acceptez la notification push Airtel Money sur votre téléphone.
        </p>
        <p style={{ fontSize: '28px', fontWeight: 800, color: T.warning, fontVariantNumeric: 'tabular-nums', marginBottom: '24px' }}>{mm}:{ss}</p>
        {erreur && <p style={{ fontSize: '13px', color: T.error, textAlign: 'center', marginBottom: '12px' }}>{erreur}</p>}
        <button
          onClick={verifierManuellement}
          disabled={verificationEnCours}
          style={{ marginBottom: '12px', padding: '12px 24px', borderRadius: '12px', border: `1.5px solid ${T.border}`, background: T.surfaceEl, color: T.primary, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          {verificationEnCours ? 'Vérification…' : 'J\'ai payé — vérifier maintenant'}
        </button>
        {cancelVisible && (
          <button
            onClick={annuler}
            style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'none', color: T.textSec, fontSize: '14px', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Annuler
          </button>
        )}
      </div>
    )
  }

  // ── Écran échec ───────────────────────────────────────────────────────────
  if (phase === 'echec') {
    return (
      <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `rgba(160,68,52,0.10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <IconError />
        </div>
        <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong, textAlign: 'center', marginBottom: '8px' }}>Paiement échoué</p>
        {erreur && <p style={{ fontSize: '13px', color: T.error, textAlign: 'center', lineHeight: 1.6, marginBottom: '24px', whiteSpace: 'pre-line' }}>{erreur}</p>}
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px' }}>
          {transId && (
            <button
              onClick={verifierManuellement}
              disabled={verificationEnCours}
              style={{ flex: 1, height: '48px', borderRadius: '12px', border: `1.5px solid ${T.primary}`, background: 'none', color: T.primary, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              {verificationEnCours ? '…' : 'Vérifier'}
            </button>
          )}
          <button
            onClick={() => navigate(`/cagnottes/${id}`, { replace: true })}
            style={{ flex: 1, height: '48px', borderRadius: '12px', border: 'none', background: T.primary, color: T.surface, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  const enEnvoi = phase === 'envoi'
  const m = parseInt(montant.replace(/\s/g, '')) || 0

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: T.surface, minHeight: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: T.textStrong, display: 'flex' }}>
            <IconBack />
          </button>
          <div>
            <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, lineHeight: 1 }}>Cotiser</p>
            <p style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>{args.titre}</p>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Badge compte light */}
          {light && (
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: `rgba(212,155,63,0.08)`, border: `1px solid rgba(212,155,63,0.35)`, marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, paddingTop: '1px' }}><IconWarning /></span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: T.warning, marginBottom: '2px' }}>Compte invité</p>
                <p style={{ fontSize: '12px', color: T.textSec }}>
                  Vous êtes connecté en tant qu'invité. Vous pouvez cotiser, mais pour créer des cagnottes,{' '}
                  <span onClick={() => navigate('/inscription')} style={{ color: T.primary, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>complétez votre profil</span>.
                </p>
              </div>
            </div>
          )}

          {/* Pénalité en retard */}
          {enRetard && (
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: `rgba(212,155,63,0.08)`, border: `1px solid rgba(212,155,63,0.35)`, marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <IconWarning />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: T.warning }}>Pénalité de retard incluse</p>
                <p style={{ fontSize: '12px', color: T.textSec }}>
                  {fmt(args.penaliteCourante!)} de pénalité seront ajoutés à votre cotisation.
                </p>
              </div>
            </div>
          )}

          {/* Récap tontine */}
          {estTontine && args.montantRecuperation && (
            <div style={{ padding: '14px 16px', borderRadius: '14px', background: `rgba(15,76,92,0.06)`, border: `1px solid rgba(15,76,92,0.15)`, marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: T.textSec }}>Le gagnant de ce cycle reçoit</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: T.primary }}>{fmt(args.montantRecuperation)}</span>
              </div>
              {args.montantAffiche && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: T.textSec }}>Vous payez (frais inclus)</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: T.accent }}>{fmt(args.montantAffiche)}</span>
                </div>
              )}
            </div>
          )}

          {/* Champ montant */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: T.textSec, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Montant à cotiser
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: T.surfaceEl, borderRadius: '16px',
              border: `1.5px solid ${erreur ? T.error : T.border}`,
              padding: '16px 18px',
            }}>
              <input
                type="tel"
                inputMode="numeric"
                value={montant}
                onChange={e => { if (!montantFixe) setMontant(e.target.value.replace(/\D/g, '')); setErreur('') }}
                readOnly={montantFixe}
                placeholder="ex : 10 000"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: '24px', fontWeight: 800, color: T.textStrong, fontFamily: 'inherit',
                  opacity: montantFixe ? 0.7 : 1,
                }}
              />
              <span style={{ fontSize: '16px', fontWeight: 700, color: T.textSec, flexShrink: 0 }}>FCFA</span>
            </div>
            {montantFixe && <p style={{ fontSize: '12px', color: T.textTert, marginTop: '6px', paddingLeft: '4px' }}>Montant fixe pour cette tontine.</p>}
            {erreur && <p style={{ fontSize: '12px', color: T.error, marginTop: '6px', paddingLeft: '4px' }}>{erreur}</p>}
          </div>

          {/* Frais */}
          <p style={{ fontSize: '12px', color: T.textTert, textAlign: 'center', marginBottom: '20px' }}>
            * Les frais seront appliqués au moment du paiement.
          </p>

          {/* Bouton */}
          <button
            onClick={soumettre}
            disabled={enEnvoi}
            style={{
              width: '100%', height: '54px', borderRadius: '16px', border: 'none',
              background: enEnvoi ? T.surfaceDeep : T.primary,
              color: enEnvoi ? T.textTert : T.surface,
              fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
              cursor: enEnvoi ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            {enEnvoi ? (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2.4px solid rgba(255,255,255,0.4)`, borderTopColor: T.surface, animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <><IconSend />{m > 0 ? `Payer ${fmt(m)}` : 'Confirmer le paiement'}</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
