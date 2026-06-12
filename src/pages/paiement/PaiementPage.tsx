import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMobile } from '@/hooks/useMobile'
import { useAuthStore } from '@/store/authStore'
import { chargerInfoCagnottePublique, chargerCagnotte, cotiser, verifierStatutCotisation } from '@/lib/cagnottesApi'
import type { InfoCagnottePublique, CagnotteDetail } from '@/lib/cagnottesApi'
import MobileCotiser from '@/pages/mobile/MobileCotiser'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

type Phase = 'chargement' | 'non_trouve' | 'auth_requise' | 'formulaire' | 'envoi' | 'attente' | 'succes' | 'echec'

// ── Icônes ────────────────────────────────────────────────────────────────────

const IconCheck = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconX = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)

// ── Composant principal ───────────────────────────────────────────────────────

export default function PaiementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useMobile()
  const user = useAuthStore(s => s.user)

  const [phase, setPhase]           = useState<Phase>('chargement')
  const [infoPub, setInfoPub]       = useState<InfoCagnottePublique | null>(null)
  const [cagnotte, setCagnotte]     = useState<CagnotteDetail | null>(null)
  const [montant, setMontant]       = useState('')
  const [erreurMsg, setErreurMsg]   = useState('')
  const [transId, setTransId]       = useState('')
  const [secondes, setSecondes]     = useState(180)
  const [cancelVisible, setCancelVisible] = useState(false)
  const [verEnCours, setVerEnCours] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tentRef    = useRef(0)

  // Charger les infos publiques, puis les infos complètes si connecté
  useEffect(() => {
    if (!id) { setPhase('non_trouve'); return }
    chargerInfoCagnottePublique(id).then(info => {
      if (!info) { setPhase('non_trouve'); return }
      setInfoPub(info)
      if (!user) { setPhase('auth_requise'); return }
      chargerCagnotte(id).then(detail => {
        if (detail) {
          setCagnotte(detail)
          if (detail.montantParCycle) setMontant(detail.montantParCycle.toString())
        }
        setPhase('formulaire')
      }).catch(() => setPhase('formulaire'))
    })
  }, [id, user])

  useEffect(() => {
    return () => {
      pollingRef.current && clearInterval(pollingRef.current)
      countRef.current && clearInterval(countRef.current)
      cancelRef.current && clearTimeout(cancelRef.current)
    }
  }, [])

  // Mobile : délégation complète à MobileCotiser (lit useParams → même :id)
  if (isMobile) return <MobileCotiser />

  // ── Helpers polling ──────────────────────────────────────────────────────────

  const stopPolling = () => {
    pollingRef.current && clearInterval(pollingRef.current)
    countRef.current && clearInterval(countRef.current)
    cancelRef.current && clearTimeout(cancelRef.current)
  }

  const demarrerPolling = (tid: string) => {
    tentRef.current = 0
    setCancelVisible(false)
    setSecondes(180)
    pollingRef.current = setInterval(() => verifierStatut(tid), 10_000)
    countRef.current = setInterval(() => setSecondes(s => Math.max(0, s - 1)), 1000)
    cancelRef.current = setTimeout(() => setCancelVisible(true), 30_000)
  }

  const verifierStatut = async (tid: string) => {
    tentRef.current++
    if (tentRef.current >= 18) {
      stopPolling()
      setPhase('echec')
      setErreurMsg('Paiement non confirmé après 3 minutes. Si votre compte Mobile Money a été débité, ne réessayez pas — vérifiez votre solde Airtel.')
      return
    }
    try {
      const statut = await verifierStatutCotisation(tid)
      if (statut === 'succes') { stopPolling(); setPhase('succes') }
      else if (statut === 'echec') { stopPolling(); setPhase('echec'); setErreurMsg('Paiement refusé ou annulé.') }
    } catch { /* réseau — réessai au prochain tick */ }
  }

  const verifierManuellement = async () => {
    if (!transId || verEnCours) return
    setVerEnCours(true)
    try {
      const statut = await verifierStatutCotisation(transId)
      if (statut === 'succes') { stopPolling(); setPhase('succes') }
      else if (statut === 'echec') { stopPolling(); setPhase('echec'); setErreurMsg('Paiement refusé ou annulé.') }
      else setErreurMsg('Paiement toujours en cours — réessayez dans quelques instants.')
    } catch {
      setErreurMsg('Vérification impossible — vérifiez votre connexion.')
    } finally {
      setVerEnCours(false)
    }
  }

  const soumettre = async () => {
    const m = parseInt(montant.replace(/\s/g, ''))
    if (!m || m < 100) { setErreurMsg('Montant minimum : 100 FCFA'); return }
    if (m > 500_000) { setErreurMsg('Plafond : 500 000 FCFA par transaction'); return }
    setErreurMsg('')
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
      setErreurMsg(e instanceof Error ? e.message : 'Erreur inattendue. Réessayez.')
      setPhase('formulaire')
    }
  }

  // ── Titre et type à afficher ─────────────────────────────────────────────────
  const titre   = cagnotte?.titre   ?? infoPub?.titre   ?? '—'
  const isTontine = (cagnotte?.type ?? infoPub?.type) === 'tontine'
  const montantFixe = isTontine && (cagnotte?.montantParCycle ?? 0) > 0

  // ── Rendu desktop ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <span className="text-white font-display font-bold text-base">T</span>
          </div>
          <span className="font-display font-bold text-white text-xl tracking-tight">Tonji</span>
        </div>

        <div className="bg-surface-elevated/95 backdrop-blur-sm rounded-2xl border border-border/60 shadow-xl p-8">
          <AnimatePresence mode="wait">

            {/* ── Chargement ── */}
            {(phase === 'chargement') && (
              <motion.div key="chargement"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-secondary text-sm">Chargement…</p>
              </motion.div>
            )}

            {/* ── Introuvable ── */}
            {phase === 'non_trouve' && (
              <motion.div key="non_trouve"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="text-4xl mb-4">🔍</div>
                <h2 className="font-display font-bold text-text-strong text-xl mb-2">Cagnotte introuvable</h2>
                <p className="text-text-secondary text-sm mb-6">Ce lien est invalide ou la cagnotte a été clôturée.</p>
                <Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">
                  Accéder à Tonji
                </Link>
              </motion.div>
            )}

            {/* ── Auth requise ── */}
            {phase === 'auth_requise' && infoPub && (
              <motion.div key="auth_requise"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <div className="rounded-xl bg-surface border border-border px-5 py-4 mb-6">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                    {isTontine ? 'Tontine' : 'Cotisation'}
                  </p>
                  <p className="font-display font-bold text-text-strong text-lg tracking-tight">{infoPub.titre}</p>
                  {infoPub.createur && (
                    <p className="text-xs text-text-tertiary mt-1">par {infoPub.createur}</p>
                  )}
                </div>

                <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                  Pour cotiser, connectez-vous à votre compte Tonji ou créez-en un gratuitement.
                </p>

                <div className="flex flex-col gap-3">
                  <Link
                    to={`/connexion?next=/paiement/${id}`}
                    className="w-full h-12 rounded-xl bg-primary text-surface font-semibold text-sm flex items-center justify-center hover:bg-primary/90 transition-colors"
                  >
                    Se connecter
                  </Link>
                  <Link
                    to={`/inscription?next=/paiement/${id}`}
                    className="w-full h-12 rounded-xl border border-border text-text-strong font-semibold text-sm flex items-center justify-center hover:bg-surface transition-colors"
                  >
                    Créer un compte
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ── Formulaire ── */}
            {phase === 'formulaire' && (
              <motion.div key="formulaire"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <button onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-strong transition-colors font-medium mb-6">
                  <IconArrowLeft /> Retour
                </button>

                <h2 className="font-display font-bold text-text-strong text-xl tracking-tight mb-1">Cotiser à</h2>
                <p className="text-primary font-semibold text-base mb-6">{titre}</p>

                {/* Montant */}
                <div className="rounded-xl bg-surface border border-border px-5 py-4 mb-4">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Montant</p>
                  {montantFixe ? (
                    <>
                      <p className="font-display font-bold text-3xl text-text-strong tracking-tight">
                        {fmt(cagnotte!.montantParCycle!)}
                        <span className="text-sm font-normal text-text-tertiary ml-1">*</span>
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">Montant fixe — {isTontine ? 'tontine périodique' : 'cotisation'}</p>
                    </>
                  ) : (
                    <div>
                      <input
                        type="number"
                        min="100"
                        max="500000"
                        value={montant}
                        onChange={e => { setMontant(e.target.value); setErreurMsg('') }}
                        placeholder="ex : 5 000"
                        className="w-full font-display font-bold text-3xl text-text-strong tracking-tight bg-transparent outline-none placeholder:text-text-tertiary/50"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                      <p className="text-xs text-text-tertiary mt-1">FCFA · min 100, max 500 000 *</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-text-tertiary mb-6">* Des frais seront appliqués au moment du paiement</p>

                {erreurMsg && (
                  <div className="rounded-lg bg-error/8 border border-error/20 px-4 py-3 text-sm text-error font-medium mb-4">
                    {erreurMsg}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex-1 h-12 rounded-xl border border-border bg-transparent text-text-strong text-sm font-semibold hover:bg-surface transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={soumettre}
                    disabled={montantFixe ? false : !montant}
                    className="flex-1 h-12 rounded-xl bg-accent text-text-strong text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    Confirmer
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Envoi ── */}
            {phase === 'envoi' && (
              <motion.div key="envoi"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-5" />
                <h2 className="font-display font-bold text-text-strong text-lg tracking-tight mb-2">Initialisation…</h2>
                <p className="text-text-tertiary text-sm">Ne fermez pas cette fenêtre.</p>
              </motion.div>
            )}

            {/* ── Attente validation Airtel ── */}
            {phase === 'attente' && (
              <motion.div key="attente"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto mb-5">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-warning">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h2 className="font-display font-bold text-text-strong text-xl tracking-tight mb-2">Validation en cours…</h2>
                <p className="text-text-secondary text-sm mb-4 leading-relaxed">
                  Acceptez la notification push <strong>Airtel Money</strong> sur votre téléphone.
                </p>
                <p className="font-display font-bold text-4xl text-warning mb-6" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {String(Math.floor(secondes / 60)).padStart(2, '0')}:{String(secondes % 60).padStart(2, '0')}
                </p>

                {erreurMsg && (
                  <p className="text-sm text-error mb-4">{erreurMsg}</p>
                )}

                <button
                  onClick={verifierManuellement}
                  disabled={verEnCours}
                  className="mb-3 px-6 py-3 rounded-xl border border-border bg-surface-elevated text-text-strong text-sm font-semibold hover:bg-surface transition-colors disabled:opacity-60"
                >
                  {verEnCours ? 'Vérification…' : "J'ai payé — vérifier maintenant"}
                </button>

                {cancelVisible && (
                  <button
                    onClick={() => { stopPolling(); setPhase('formulaire'); setErreurMsg(''); setCancelVisible(false) }}
                    className="block mx-auto px-4 py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </motion.div>
            )}

            {/* ── Succès ── */}
            {phase === 'succes' && (
              <motion.div key="succes"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-5 text-success">
                  <IconCheck />
                </div>
                <h2 className="font-display font-bold text-text-strong text-xl tracking-tight mb-1">Paiement réussi</h2>
                <p className="text-text-tertiary text-sm mb-6">Votre cotisation pour «&nbsp;{titre}&nbsp;» a bien été enregistrée.</p>

                <div className="rounded-xl bg-surface border border-border px-4 py-4 text-left mb-6 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-tertiary">Cagnotte</span>
                    <span className="font-semibold text-text-strong">{titre}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-tertiary">Montant</span>
                    <span className="font-bold text-text-strong">{fmt(parseInt(montant) || 0)}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/cagnottes/${id}`)}
                  className="w-full h-12 rounded-xl bg-primary text-surface font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Retour à la cagnotte
                </button>
              </motion.div>
            )}

            {/* ── Échec ── */}
            {phase === 'echec' && (
              <motion.div key="echec"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-5 text-error">
                  <IconX />
                </div>
                <h2 className="font-display font-bold text-text-strong text-xl tracking-tight mb-1">Paiement échoué</h2>
                {erreurMsg && (
                  <div className="rounded-xl bg-error/8 border border-error/20 px-4 py-3.5 text-sm text-left mb-6">
                    <p className="font-semibold text-error mb-1">Erreur</p>
                    <p className="text-text-secondary">{erreurMsg}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {transId && (
                    <button
                      onClick={verifierManuellement}
                      disabled={verEnCours}
                      className="flex-1 h-12 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors disabled:opacity-60"
                    >
                      {verEnCours ? '…' : 'Vérifier'}
                    </button>
                  )}
                  <button
                    onClick={() => { setPhase('formulaire'); setErreurMsg(''); setTransId('') }}
                    className="flex-1 h-12 rounded-xl bg-primary text-surface text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
