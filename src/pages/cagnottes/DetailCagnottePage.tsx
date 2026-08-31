import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useMobile } from '@/hooks/useMobile'
import MobileDetailCagnotte from '@/pages/mobile/MobileDetailCagnotte'
import { T, fmt } from '@/lib/tokens'
import { chargerCagnotte, type CagnotteDetail, type Participant } from '@/lib/cagnottesApi'
import { supprimerCagnotte, fermerCagnotte } from '@/lib/cagnotteActionsApi'
import { urlRejoindre } from '@/lib/deeplink'
import { ApiError } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// DetailCagnottePage (desktop) — données RÉELLES via chargerCagnotte(id) (qui
// renvoie participants + historique + sorties). Actions réelles : cotiser,
// reverser (gérant), ajouter des membres (gérant), lien d'invitation. Aucun mock.
// ─────────────────────────────────────────────────────────────────────────────

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const IconUserPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
)
const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
)
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
)

const statutInfo = (s: Participant['statutPaiement']) =>
  s === 'paye' ? { c: T.success, l: 'Payé' } : s === 'en_retard' ? { c: T.error, l: 'En retard' } : { c: T.warning, l: 'En attente' }

export default function DetailCagnottePage() {
  const isMobile = useMobile()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [c, setC] = useState<CagnotteDetail | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [afficheBusy, setAfficheBusy] = useState(false)
  const [tab, setTab] = useState<'participants' | 'historique'>('participants')
  const [supprimerModal, setSupprimerModal] = useState(false)
  const [fermerModal, setFermerModal] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!id) return
    setChargement(true); setErreur(null)
    try {
      const d = await chargerCagnotte(id)
      if (!d) { setErreur('Cagnotte introuvable.'); return }
      setC(d)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger la cagnotte.')
    } finally {
      setChargement(false)
    }
  }, [id])

  useEffect(() => { charger() }, [charger])

  if (isMobile) return <MobileDetailCagnotte />

  if (chargement) {
    return <div className="flex justify-center py-24"><div className="w-8 h-8 rounded-full animate-spin" style={{ border: `3px solid ${T.primary}`, borderTopColor: 'transparent' }} /></div>
  }
  if (erreur || !c) {
    return (
      <div className="max-w-md mx-auto">
        <Card elevated className="text-center py-10">
          <p className="text-base mb-4" style={{ color: T.textStrong }}>{erreur ?? 'Cagnotte introuvable.'}</p>
          <Button variant="primary" onClick={() => navigate('/dashboard')}>Retour au tableau de bord</Button>
        </Card>
      </div>
    )
  }

  const isTontine = c.type === 'tontine'
  const isGerant = c.role === 'gerant'
  const typeArg: 'tontine' | 'cotisation' = isTontine ? 'tontine' : 'cotisation'
  const prog = isTontine && c.nombreParticipants > 0
    ? ((c.nombreInscrits ?? 0) + 1) / c.nombreParticipants
    : (c.montantCible && c.montantCible > 0 ? c.montantCollecte / c.montantCible : null)
  const pct = prog != null ? Math.min(100, Math.round(prog * 100)) : null
  const solde = c.montantCollecte - c.sorties.reduce((s, r) => s + (r.montant ?? 0), 0)

  const payes = c.participants.filter(p => p.statutPaiement === 'paye')
  const attente = c.participants.filter(p => p.statutPaiement !== 'paye')

  const copierLien = async () => {
    try { await navigator.clipboard.writeText(urlRejoindre(c.id)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }

  // Génère l'affiche IMAGE (PNG, QR de participation) et la télécharge. c.id = référence 6 chiffres.
  // Import dynamique : le module de rendu n'est chargé qu'au moment du clic.
  const telechargerAffiche = async () => {
    setAfficheBusy(true)
    try {
      const { telechargerAfficheImage } = await import('@/lib/afficheCagnotte')
      await telechargerAfficheImage({ titre: c.titre, reference: c.id })
    } catch { /* ignore */ }
    finally { setAfficheBusy(false) }
  }

  // ── Conditions gérant (miroir MobileDetailCagnotte) ──────────────────────────
  // Fermer = clôturer si historique. Supprimer = effacer si vierge. Exclusifs.
  const estCloturee = c.statut === 'cloturee'
  const aDesTransactions = c.historique.length > 0 || c.sorties.length > 0
  const peutSupprimer = isGerant && !aDesTransactions && !estCloturee
  const peutFermer = isGerant && !isTontine && !estCloturee && aDesTransactions

  // Supprimer une cagnotte vierge (aucune transaction) → DELETE puis retour.
  const confirmerSuppression = async () => {
    setActionBusy(true); setActionErr(null)
    try {
      await supprimerCagnotte(c.id)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setActionBusy(false)
      setActionErr(e instanceof ApiError ? e.message : 'Erreur inattendue lors de la suppression.')
    }
  }

  // Fermer (cotisation avec historique) : si solde > 0 → reversement intégral
  // d'abord, sinon clôture directe.
  const lancerFermeture = () => {
    setFermerModal(false)
    if (c.montantCollecte > 0) {
      navigate(`/cagnottes/${c.id}/reverser`, { state: { titre: c.titre, montantDisponible: c.montantCollecte, participants: c.participants, fermerApresReversement: true } })
      return
    }
    confirmerFermeture()
  }
  const confirmerFermeture = async () => {
    setActionBusy(true); setActionErr(null)
    try {
      await fermerCagnotte(c.id)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setActionBusy(false)
      setActionErr(e instanceof ApiError ? e.message : 'Erreur inattendue lors de la fermeture.')
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: T.textTert, background: 'none', border: 'none', cursor: 'pointer' }}>
        <IconArrowLeft /> Retour au tableau de bord
      </button>

      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: T.textStrong }}>{c.titre}</h1>
            {c.statut === 'cloturee' ? <Badge variant="primary">Terminée</Badge> : <Badge variant="success" dot>Active</Badge>}
          </div>
          <p className="text-sm" style={{ color: T.textTert }}>
            {isTontine ? 'Tontine périodique' : 'Cagnotte ouverte'}
            {' · '}<span style={{ color: T.textSec }}>Code :</span>{' '}
            <span className="font-mono font-bold" style={{ color: T.primary }}>{c.id}</span>
          </p>
        </div>
        <Badge variant={isTontine ? 'primary' : 'accent'}>{isTontine ? 'Tontine' : 'Ouverte'}</Badge>
      </div>

      {/* Carte montant */}
      <Card elevated className="border-l-[3px]" style={{ borderLeftColor: T.accent }}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: T.textTert }}>Total collecté</p>
            <p className="font-display font-bold text-3xl tracking-tight" style={{ color: T.textStrong }}>{fmt(c.montantCollecte)}</p>
            {solde !== c.montantCollecte && <p className="text-xs mt-1" style={{ color: T.textTert }}>Solde disponible : {fmt(solde)}</p>}
          </div>
          {pct != null && (
            <div className="min-w-[180px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: T.textTert }}>{isTontine ? `${(c.nombreInscrits ?? 0) + 1}/${c.nombreParticipants} membres` : 'Objectif'}</span>
                <span className="text-xs font-bold" style={{ color: T.textStrong }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: T.border }}>
                <motion.div className="h-full rounded-full" style={{ background: T.accent }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {c.statut !== 'cloturee' && (
          <Button variant="primary" size="sm" onClick={() => navigate(`/cagnottes/${c.id}/cotiser`, { state: { titre: c.titre, type: typeArg } })}>
            <IconSend /> Cotiser
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={copierLien}>
          {copied ? <IconCheck /> : <IconCopy />} {copied ? 'Lien copié' : "Copier le lien d'invitation"}
        </Button>
        <Button variant="outline" size="sm" onClick={telechargerAffiche} loading={afficheBusy}>
          <IconDownload /> Affiche QR (Image)
        </Button>
        {isGerant && (
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/cagnottes/${c.id}/participants`, { state: { titre: c.titre, nombreMax: c.nombreParticipants, nombreInscrits: c.nombreInscrits, type: typeArg } })}>
              <IconUserPlus /> Ajouter des membres
            </Button>
            {solde > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate(`/cagnottes/${c.id}/reverser`, { state: { titre: c.titre, montantDisponible: solde, participants: c.participants } })}>
                Reverser
              </Button>
            )}
          </>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b" style={{ borderColor: T.border }}>
        <div className="flex gap-0">
          {([['participants', `Participants (${c.participants.length})`], ['historique', `Historique (${c.historique.length})`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all -mb-px"
              style={{ borderBottom: `2px solid ${tab === k ? T.accent : 'transparent'}`, color: tab === k ? T.textStrong : T.textTert, background: 'none', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'participants' && (
          <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
            {c.participants.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: T.textTert }}>Aucun participant pour l'instant.</p>
            ) : (
              <>
                {[['A payé', payes], ['En attente', attente]].map(([grp, list]) => (list as Participant[]).length > 0 && (
                  <div key={grp as string}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.textTert }}>{grp as string} ({(list as Participant[]).length})</p>
                    <div className="flex flex-col gap-2">
                      {(list as Participant[]).map(p => {
                        const st = statutInfo(p.statutPaiement)
                        return (
                          <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ background: T.surfaceEl, borderColor: `${T.border}B3` }}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${st.c}1A`, color: st.c }}>{p.initiales}</div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: T.textStrong }}>{p.nomComplet}{p.estMoi && ' (vous)'}</p>
                                <p className="text-2xs" style={{ color: T.textTert }}>{p.numeroMasque}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold" style={{ color: st.c }}>{st.l}</span>
                              {p.montantPaye > 0 && <p className="text-2xs" style={{ color: T.textTert }}>{fmt(p.montantPaye)}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}

        {tab === 'historique' && (
          <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {c.historique.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: T.textTert }}>Aucun paiement enregistré.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {c.historique.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ background: T.surfaceEl, borderColor: `${T.border}B3` }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: T.textStrong }}>{p.participantNom || '—'}</p>
                      <p className="text-2xs" style={{ color: T.textTert }}>{p.date}</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: T.success }}>+{fmt(p.montant)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zone gérant : fermer / supprimer (conditions du modèle mobile) ── */}
      {(peutFermer || peutSupprimer) && (
        <div className="pt-4 mt-2 border-t" style={{ borderColor: T.border }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.textTert }}>Gestion de la cagnotte</p>
          {actionErr && <p className="text-[13px] font-semibold mb-3" style={{ color: T.error }}>{actionErr}</p>}
          <div className="flex flex-wrap gap-3">
            {peutFermer && (
              <Button variant="outline" size="sm" onClick={() => setFermerModal(true)}>Clôturer la cagnotte</Button>
            )}
            {peutSupprimer && (
              <button onClick={() => setSupprimerModal(true)} className="inline-flex items-center gap-2 px-4 rounded-lg text-sm font-semibold transition-colors"
                style={{ height: '34px', color: T.error, background: T.errorSoft, border: `1px solid ${T.error}40`, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                Supprimer
              </button>
            )}
          </div>
          {peutSupprimer && (
            <p className="text-xs mt-2" style={{ color: T.textTert }}>Suppression possible tant qu'aucune contribution n'a été reçue.</p>
          )}
        </div>
      )}

      <p className="text-xs" style={{ color: T.textTert }}>* Des frais s'appliquent au moment du retrait.</p>

      {/* ── Modales de confirmation ── */}
      <AnimatePresence>
        {(supprimerModal || fermerModal) && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(20,32,46,0.50)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!actionBusy) { setSupprimerModal(false); setFermerModal(false) } }}>
            <motion.div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-7 text-center" style={{ background: T.surfaceEl }}
              initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.2 }}>
              <p className="font-display font-bold text-xl mb-2" style={{ color: T.textStrong }}>
                {supprimerModal ? 'Supprimer cette cagnotte ?' : 'Clôturer cette cagnotte ?'}
              </p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: T.textSec }}>
                {supprimerModal
                  ? 'Cette action est irréversible. La cagnotte sera définitivement supprimée.'
                  : 'La cagnotte sera clôturée. Le solde éventuel devra d\'abord être reversé.'}
              </p>
              {supprimerModal ? (
                <button onClick={confirmerSuppression} disabled={actionBusy}
                  className="w-full rounded-xl text-sm font-bold" style={{ height: '48px', background: T.error, color: '#fff', border: 'none', cursor: actionBusy ? 'default' : 'pointer', opacity: actionBusy ? 0.7 : 1 }}>
                  {actionBusy ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
              ) : (
                <Button variant="primary" size="lg" className="w-full" loading={actionBusy} onClick={lancerFermeture}>Clôturer</Button>
              )}
              <button onClick={() => { setSupprimerModal(false); setFermerModal(false) }} disabled={actionBusy}
                className="w-full text-sm mt-3" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
