import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useMobile } from '@/hooks/useMobile'
import MobileHome from '@/pages/mobile/MobileHome'
import { T, fmt } from '@/lib/tokens'
import { listerMesCagnottes, rejoindre, badgeStatutValidation, type Cagnotte } from '@/lib/cagnottesApi'
import { ApiError } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage (desktop) — MÊME données que MobileHome : les VRAIES cagnottes
// de l'utilisateur via listerMesCagnottes(). Total réellement collecté, actives
// vs terminées, action « Rejoindre » (rejoindre()). Aucune donnée fabriquée.
// ─────────────────────────────────────────────────────────────────────────────

// Définitivement fermée : clôturée OU (tontine à rotation terminée).
function estFermee(c: Cagnotte): boolean {
  return c.statut === 'cloturee' || (c.type === 'tontine' && c.rotationTerminee)
}

// Progression 0..1 : cotisation → collecté/cible ; tontine → inscrits/participants.
function progression(c: Cagnotte): number | null {
  if (c.type === 'tontine' && c.nombreParticipants > 0) {
    return Math.min(1, ((c.nombreInscrits ?? 0) + 1) / c.nombreParticipants)
  }
  if (c.montantCible && c.montantCible > 0) {
    return Math.min(1, c.montantCollecte / c.montantCible)
  }
  return null
}

// ─── Icônes ───────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
)
const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
)
const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
)
const IconLink = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
)

// ─── Carte cagnotte (données réelles) ────────────────────────────────────────
function CagnotteCard({ c, onClick, index }: { c: Cagnotte; onClick: () => void; index: number }) {
  const isTontine = c.type === 'tontine'
  const prog = progression(c)
  const pct = prog != null ? Math.round(prog * 100) : null
  const fermee = estFermee(c)
  const participantsLabel = isTontine && c.nombreParticipants > 0
    ? `${(c.nombreInscrits ?? 0) + 1}/${c.nombreParticipants} membres`
    : `${c.nombreParticipants} participant${c.nombreParticipants > 1 ? 's' : ''}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
      onClick={onClick}
      className="group relative rounded-[28px] p-6 cursor-pointer border transition-all duration-200 overflow-hidden hover:-translate-y-1 hover:shadow-xl"
      style={{ background: T.surfaceEl, borderColor: `${T.border}B3` }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: isTontine ? T.primary : T.accent }} />

      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-sm leading-snug truncate" style={{ color: T.textStrong }}>{c.titre}</h3>
          <div className="flex items-center gap-1.5 mt-2" style={{ color: T.textTert }}>
            <IconUsers /><span className="text-xs">{participantsLabel}</span>
          </div>
          {c.statutValidation === 'en_attente' && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${T.warning}1F`, color: T.warning }}>
              {badgeStatutValidation(c.statutValidation)}
            </span>
          )}
        </div>
        <Badge variant={isTontine ? 'primary' : 'accent'} dot>{isTontine ? 'Tontine' : 'Ouverte'}</Badge>
      </div>

      <p className="font-display font-bold text-3xl tracking-tight mb-4" style={{ color: T.textStrong }}>{fmt(c.montantCollecte)}</p>

      {pct != null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-medium uppercase tracking-[0.32em]" style={{ color: T.textTert }}>{isTontine ? 'Membres' : 'Objectif'}</span>
            <span className="text-sm font-bold" style={{ color: T.textStrong }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: T.border }}>
            <motion.div className="h-full rounded-full" style={{ background: isTontine ? T.primary : T.accent }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: index * 0.06 + 0.2 }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-5 pt-5 border-t" style={{ borderColor: `${T.border}80` }}>
        <div className="flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: T.textSec }}>
          <span>Voir le détail</span><IconArrowRight />
        </div>
        <span className="text-2xs" style={{ color: T.textTert }}>{fermee ? '✓ Terminée' : 'Active'}</span>
      </div>
    </motion.div>
  )
}

function SkeletonCarte() {
  return (
    <div className="rounded-[28px] p-6 border animate-pulse" style={{ background: T.surfaceEl, borderColor: `${T.border}B3` }}>
      <div className="h-4 w-2/3 rounded mb-3" style={{ background: T.border }} />
      <div className="h-3 w-1/3 rounded mb-6" style={{ background: T.border }} />
      <div className="h-8 w-1/2 rounded mb-5" style={{ background: T.border }} />
      <div className="h-2 w-full rounded" style={{ background: T.border }} />
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const isMobile = useMobile()
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const [cagnottes, setCagnottes] = useState<Cagnotte[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [toutAfficher, setToutAfficher] = useState(false)
  const [showRejoindre, setShowRejoindre] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true); setErreur(null)
    try {
      setCagnottes(await listerMesCagnottes())
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger vos cagnottes.')
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])

  const actives = cagnottes.filter(c => !estFermee(c))
  const terminees = cagnottes.filter(estFermee)
  const totalGlobal = cagnottes.reduce((s, c) => s + c.montantCollecte, 0)
  const totalParticipants = cagnottes.reduce((s, c) => s + c.nombreParticipants, 0)
  const visibles = toutAfficher ? actives : actives.slice(0, 3)

  const now = new Date()
  const heure = now.getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isMobile) return <MobileHome />

  return (
    <div className="space-y-8">

      {/* ── En-tête ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="rounded-[32px] border p-6 shadow-2xl" style={{ background: T.surfaceEl, borderColor: `${T.border}B3` }}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: T.textTert }}>
              {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="font-display font-bold text-4xl tracking-tight mt-3 leading-tight" style={{ color: T.textStrong }}>
              {salut}{user?.prenom ? <>, <span style={{ color: T.accent }}>{user.prenom}</span></> : ''}
            </h1>
            <p className="mt-3 max-w-xl leading-7 text-sm" style={{ color: T.textSec }}>
              Suivez l'avancement de vos cagnottes et gérez vos collectes en toute sérénité.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" size="lg" onClick={() => setShowRejoindre(true)}>Rejoindre</Button>
            <Button variant="accent" size="lg" onClick={() => navigate('/cagnottes/nouvelle')} className="whitespace-nowrap">
              <IconPlus /> Nouvelle cagnotte
            </Button>
          </div>
        </div>

        {/* Métriques RÉELLES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Total collecté', value: chargement ? '—' : fmt(totalGlobal) },
            { label: 'Cagnottes actives', value: chargement ? '—' : String(actives.length) },
            { label: 'Participants', value: chargement ? '—' : String(totalParticipants) },
          ].map(m => (
            <div key={m.label} className="rounded-[24px] border p-4 shadow-sm" style={{ background: T.surface, borderColor: `${T.border}B3` }}>
              <p className="text-2xs uppercase tracking-[0.32em]" style={{ color: T.textTert }}>{m.label}</p>
              <p className="font-display font-bold text-2xl mt-3" style={{ color: T.textStrong }}>{m.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Erreur */}
      {erreur && (
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: T.errorSoft, border: `1px solid ${T.error}4D` }}>
          <p className="text-sm font-medium" style={{ color: T.error }}>{erreur}</p>
          <button onClick={charger} className="text-sm font-semibold" style={{ color: T.error, background: 'none', border: 'none', cursor: 'pointer' }}>Réessayer</button>
        </div>
      )}

      {/* ── Cagnottes actives ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base" style={{ color: T.textStrong }}>Mes cagnottes actives</h2>
          {actives.length > 3 && (
            <button onClick={() => setToutAfficher(!toutAfficher)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: T.primary, background: 'none', border: 'none', cursor: 'pointer' }}>
              {toutAfficher ? 'Voir moins' : `Voir tout (${actives.length})`}<IconChevron open={toutAfficher} />
            </button>
          )}
        </div>

        {chargement ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map(i => <SkeletonCarte key={i} />)}</div>
        ) : actives.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center" style={{ background: T.surfaceEl, borderColor: `${T.border}B3` }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: T.surfaceDeep, border: `1px solid ${T.border}`, color: T.textSec }}><IconPlus /></div>
            <p className="text-sm mb-4" style={{ color: T.textSec }}>Vous n'avez pas encore de cagnotte active.</p>
            <Button variant="accent" onClick={() => navigate('/cagnottes/nouvelle')}>Créer ma première cagnotte</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibles.map((c, i) => <CagnotteCard key={c.id} c={c} index={i} onClick={() => navigate(`/cagnottes/${c.id}`)} />)}
          </div>
        )}
      </section>

      {/* ── Cagnottes terminées ── */}
      {!chargement && terminees.length > 0 && (
        <section>
          <h2 className="font-semibold text-base mb-4" style={{ color: T.textStrong }}>Terminées</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ opacity: 0.75 }}>
            {terminees.map((c, i) => <CagnotteCard key={c.id} c={c} index={i} onClick={() => navigate(`/cagnottes/${c.id}`)} />)}
          </div>
        </section>
      )}

      {/* ── Modale Rejoindre ── */}
      <AnimatePresence>
        {showRejoindre && <RejoindreModal onClose={() => setShowRejoindre(false)} onJoined={() => { setShowRejoindre(false); charger() }} navigate={navigate} />}
      </AnimatePresence>
    </div>
  )
}

// ─── Modale « Rejoindre une cagnotte » (rejoindre par code) ───────────────────
function RejoindreModal({ onClose, onJoined, navigate }: { onClose: () => void; onJoined: () => void; navigate: (to: string) => void }) {
  const [code, setCode] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const valider = async () => {
    const ref = code.trim()
    if (!ref) { setErreur('Entrez le code de la cagnotte.'); return }
    setEnCours(true); setErreur(null)
    try {
      await rejoindre(ref)
      onJoined()
      navigate(`/cagnottes/${ref}`)
    } catch (e) {
      setEnCours(false)
      setErreur(e instanceof ApiError ? e.message : 'Cagnotte introuvable ou code invalide.')
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(20,32,46,0.50)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-7" style={{ background: T.surfaceEl }}
        initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.2 }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(10,104,71,0.08)', color: T.primary }}><IconLink /></div>
        <p className="font-display font-bold text-xl text-center mb-1" style={{ color: T.textStrong }}>Rejoindre une cagnotte</p>
        <p className="text-sm text-center mb-5 leading-relaxed" style={{ color: T.textSec }}>Entrez le code à 6 chiffres partagé par l'organisateur.</p>
        <input
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErreur(null) }}
          onKeyDown={e => { if (e.key === 'Enter' && !enCours) valider() }}
          placeholder="ex : 482193"
          className="w-full text-center outline-none font-display font-bold tracking-widest"
          style={{ height: '56px', borderRadius: '14px', border: `1.5px solid ${erreur ? T.error : T.border}`, background: T.surfaceEl, fontSize: '22px', color: T.textStrong, fontFamily: 'inherit' }}
        />
        {erreur && <p className="text-[13px] font-semibold mt-2" style={{ color: T.error }}>{erreur}</p>}
        <Button variant="primary" size="lg" className="w-full mt-5" loading={enCours} onClick={valider}>Rejoindre</Button>
        <button onClick={onClose} className="w-full text-sm mt-3" style={{ color: T.textSec, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>Annuler</button>
      </motion.div>
    </motion.div>
  )
}
