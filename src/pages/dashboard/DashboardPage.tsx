import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useMobile } from '@/hooks/useMobile'
import MobileHome from '@/pages/mobile/MobileHome'

// ─── Icônes ───────────────────────────────────────────────────────────────────

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

const IconSpark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.25 6.75H22l-5.75 4.25L17 22 12 17.75 7 22l1.75-8.75L3 8.75h7.75L12 2z"/>
  </svg>
)

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>
)

const IconAlertCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

// ─── Données de démo ──────────────────────────────────────────────────────────

const cagnottesDemoData = [
  { id: '1', nom: 'Tontine Familiale Obame', type: 'tontine', montant: 125000, participants: 8,  total: 10, statut: 'En cours',  echeance: 'Dans 8 jours' },
  { id: '2', nom: 'Anniversaire Marie',      type: 'ouverte', montant: 48000,  participants: 6,  total: 6,  statut: 'Payée',     echeance: 'Terminé'   },
  { id: '3', nom: 'Cotisation BTP',          type: 'tontine', montant: 72000,  participants: 12, total: 15, statut: 'En cours',  echeance: 'Dans 4 jours' },
  { id: '4', nom: 'Fête de fin d\'année',    type: 'ouverte', montant: 35000,  participants: 20, total: 20, statut: 'En cours',  echeance: 'Dans 12 jours' },
  { id: '5', nom: 'Tontine Bureau',          type: 'tontine', montant: 90000,  participants: 5,  total: 8,  statut: 'En cours',  echeance: 'Dans 2 jours' },
]

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

// ─── Carte cagnotte ───────────────────────────────────────────────────────────

function CagnotteCard({ c, onClick, index }: {
  c: typeof cagnottesDemoData[0]
  onClick: () => void
  index: number
}) {
  const pct = Math.round((c.participants / c.total) * 100)
  const isLate = c.statut === 'En cours' && parseInt(c.echeance) <= 3
  const statusColor = c.statut === 'Payée' ? 'bg-success/10 text-success' : isLate ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
      onClick={onClick}
      className="group relative bg-surface-elevated border border-border/70 rounded-[28px] p-6 cursor-pointer
                 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1
                 transition-all duration-200 overflow-hidden"
    >
      {/* Accent bar top */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-all duration-200
        ${c.type === 'tontine' ? 'bg-gradient-primary' : 'bg-gradient-accent'}
        opacity-100`}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-text-strong text-sm leading-snug truncate flex-1">{c.nom}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-semibold ${statusColor}`}>
              {c.statut === 'Payée' ? <IconCheckCircle /> : <IconAlertCircle />}
              {c.statut}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-text-tertiary">
            <IconUsers />
            <span className="text-xs">{c.participants}/{c.total} participants</span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-2xs text-text-secondary">
            <IconClock />
            <span>{c.echeance}</span>
          </div>
        </div>
        <Badge variant={c.type === 'tontine' ? 'primary' : 'accent'} dot>
          {c.type === 'tontine' ? 'Tontine' : 'Ouverte'}
        </Badge>
      </div>

      {/* Montant */}
      <p className="font-display font-bold text-3xl text-text-strong tracking-tight mb-5">
        {formatFCFA(c.montant)}
      </p>

      {/* Barre de progression */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs text-text-tertiary font-medium uppercase tracking-[0.32em]">Progression</span>
          <span className="text-sm font-bold text-text-strong">{pct}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${c.type === 'tontine' ? 'bg-gradient-primary' : 'bg-gradient-accent'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: index * 0.06 + 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Lien voir */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary group-hover:text-primary transition-colors duration-150">
          <span>Voir le détail</span>
          <IconArrowRight />
        </div>
        <span className="text-2xs text-text-tertiary">{c.statut === 'Payée' ? '✓ Complété' : `${pct}% complété`}</span>
      </div>
    </motion.div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const isMobile = useMobile()
  const user     = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)

  const displayed = showAll ? cagnottesDemoData : cagnottesDemoData.slice(0, 3)
  const totalCollecte = cagnottesDemoData.reduce((s, c) => s + c.montant, 0)
  const totalActives  = cagnottesDemoData.length

  const now = new Date()
  const heure = now.getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (isMobile) return <MobileHome />

  return (
    <div className="space-y-8">

      {/* ── En-tête ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-6 lg:grid-cols-[1.7fr_1fr]"
      >
        <div className="space-y-6">
          <div className="rounded-[32px] border border-border/70 bg-surface-elevated p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-accent">
                  <span className="inline-flex h-2 w-2 rounded-full bg-accent" /> Tonji
                </div>
                <p className="text-text-tertiary text-xs font-semibold uppercase tracking-[0.35em]">
                  {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="font-display font-bold text-text-strong text-5xl tracking-tight mt-4 leading-tight">
                  {salut}, <span className="text-accent">{user?.prenom}</span>
                </h1>
                <p className="text-text-secondary mt-4 max-w-xl leading-7 text-sm">
                  Suivez l'avancement de vos tontines, relancez les retardataires et gérez vos collectes en toute sérénité.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="accent" size="lg" onClick={() => navigate('/cagnottes/nouvelle')} className="whitespace-nowrap">
                  <IconPlus />
                  Nouvelle cagnotte
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="rounded-[28px] bg-white/90 border border-border/70 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xs uppercase tracking-[0.35em] text-text-tertiary">Cette semaine</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-accent/10 text-accent"><IconSpark /></span>
                </div>
                <p className="font-display font-bold text-text-strong text-2xl mt-4">+12%</p>
                <p className="text-2xs text-text-tertiary mt-1">de croissance sur les contributions</p>
              </div>
              <div className="rounded-[28px] bg-white/90 border border-border/70 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xs uppercase tracking-[0.35em] text-text-tertiary">En cours</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary"><IconUsers /></span>
                </div>
                <p className="font-display font-bold text-text-strong text-2xl mt-4">{totalActives}</p>
                <p className="text-2xs text-text-tertiary mt-1">cagnottes actives suivies</p>
              </div>
              <div className="rounded-[28px] bg-white/90 border border-border/70 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xs uppercase tracking-[0.35em] text-text-tertiary">Collecté</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary"><IconClock /></span>
                </div>
                <p className="font-display font-bold text-text-strong text-2xl mt-4">{formatFCFA(totalCollecte)}</p>
                <p className="text-2xs text-text-tertiary mt-1">valeur totale</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-border/70 bg-gradient-to-br from-accent/10 via-surface/90 to-primary/10 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-[0.32em] text-text-tertiary">À suivre</p>
              <h2 className="font-display font-bold text-text-strong text-xl mt-3">Actions rapides</h2>
            </div>
            <span className="inline-flex rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-text-strong">Mobile friendly</span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-white/90 border border-border p-4">
              <p className="text-xs font-semibold text-accent uppercase tracking-[0.32em]">Relance</p>
              <p className="mt-2 text-sm text-text-strong">2 participants n’ont pas encore payé leur dernière cotisation.</p>
            </div>
            <div className="rounded-3xl bg-white/90 border border-border p-4">
              <p className="text-xs font-semibold text-accent uppercase tracking-[0.32em]">Prochaine échéance</p>
              <p className="mt-2 text-sm text-text-strong">Tontine Bureau · Dans 2 jours</p>
            </div>
            <div className="rounded-3xl bg-white/90 border border-border p-4">
              <p className="text-xs font-semibold text-accent uppercase tracking-[0.32em]">Conseil</p>
              <p className="mt-2 text-sm text-text-strong">Partage ton lien de paiement pour accélérer les versements.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Métriques ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total collecté',   value: formatFCFA(totalCollecte), sub: 'Toutes cagnottes' },
          { label: 'Cagnottes actives',value: String(totalActives),       sub: 'En cours' },
          { label: 'Participants',     value: '51',                       sub: 'Au total' },
          { label: 'Taux de paiement', value: '82%',                      sub: 'Ce cycle' },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="relative bg-surface-elevated border border-border/70 rounded-[28px] px-5 py-5 shadow-sm overflow-hidden"
          >
            <span className="absolute top-0 left-0 h-1.5 w-20 rounded-br-2xl bg-gradient-accent" />
            <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">{m.label}</p>
            <p className="font-display font-bold text-text-strong text-xl tracking-tight">{m.value}</p>
            <p className="text-2xs text-text-tertiary mt-0.5">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Liste cagnottes ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-strong text-base">Mes cagnottes actives</h2>
          {cagnottesDemoData.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              {showAll ? 'Voir moins' : `Voir tout (${cagnottesDemoData.length})`}
              <IconChevron open={showAll} />
            </button>
          )}
        </div>

        {cagnottesDemoData.length === 0 ? (
          <div className="bg-surface-elevated border border-border/70 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-deep border border-border mx-auto mb-4 flex items-center justify-center">
              <IconPlus />
            </div>
            <p className="text-text-secondary text-sm mb-4">Vous n'avez pas encore de cagnotte.</p>
            <Button variant="accent" onClick={() => navigate('/cagnottes/nouvelle')}>
              Créer ma première cagnotte
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((c, i) => (
              <CagnotteCard
                key={c.id}
                c={c}
                index={i}
                onClick={() => navigate(`/cagnottes/${c.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
