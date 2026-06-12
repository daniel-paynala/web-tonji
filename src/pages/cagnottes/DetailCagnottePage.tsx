import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useMobile } from '@/hooks/useMobile'
import MobileDetailCagnotte from '@/pages/mobile/MobileDetailCagnotte'

// ─── Icônes ───────────────────────────────────────────────────────────────────

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
)

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconUserPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
)

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// ─── Données de démo ──────────────────────────────────────────────────────────

const DEMO_CAGNOTTES: Record<string, {
  id: string; nom: string; type: 'tontine' | 'ouverte'
  montant: number; periodicite?: string; montantCycle?: number
  numeroRetrait: string; idUssd: string
  participantsPayes: { nom: string; date: string; montant: number }[]
  participantsEnAttente: { nom: string }[]
}> = {
  '1': {
    id: '1', nom: 'Tontine Familiale Obame', type: 'tontine',
    montant: 125000, periodicite: 'Mensuelle', montantCycle: 10000,
    numeroRetrait: '+24177456777', idUssd: '4821',
    participantsPayes: [
      { nom: 'Aminata Sow',    date: '13/05/2026', montant: 10000 },
      { nom: 'Fatou Diallo',   date: '12/05/2026', montant: 10000 },
      { nom: 'Ibrahima Bah',   date: '11/05/2026', montant: 10000 },
      { nom: 'Kadiatou Barry', date: '10/05/2026', montant: 10000 },
      { nom: 'Mamadou Diallo', date: '09/05/2026', montant: 10000 },
      { nom: 'Oumou Camara',   date: '08/05/2026', montant: 10000 },
      { nom: 'Sekou Kouyaté',  date: '07/05/2026', montant: 10000 },
      { nom: 'Aissatou Balde', date: '06/05/2026', montant: 10000 },
    ],
    participantsEnAttente: [{ nom: 'Kofi Mensah' }, { nom: 'Awa Baldé' }],
  },
  '2': {
    id: '2', nom: 'Anniversaire Marie', type: 'ouverte',
    montant: 48000, numeroRetrait: '+24166345611', idUssd: '3317',
    participantsPayes: [
      { nom: 'Jean Dupont',   date: '12/05/2026', montant: 10000 },
      { nom: 'Alice Martin',  date: '11/05/2026', montant: 8000  },
      { nom: 'Paul Koffi',    date: '10/05/2026', montant: 15000 },
      { nom: 'Sara Traoré',   date: '09/05/2026', montant: 5000  },
      { nom: 'Luc Ouédraogo', date: '08/05/2026', montant: 10000 },
    ],
    participantsEnAttente: [{ nom: 'Nadia Coulibaly' }],
  },
}

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

// ─── Formulaire ajout participant ─────────────────────────────────────────────

function AjoutParticipantForm({ onAdd, onClose }: {
  onAdd: (p: { nom: string }) => void
  onClose: () => void
}) {
  const [nom, setNom]     = useState('')
  const [prenom, setPrenom] = useState('')
  const [tel, setTel]     = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom || !prenom || !tel) { setError('Tous les champs sont obligatoires.'); return }
    if (!/^\+?241[0-9]{8}$/.test(tel)) { setError('Format invalide (ex: +24177456777).'); return }
    onAdd({ nom: `${prenom} ${nom}` })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5 bg-surface rounded-xl border border-border">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-text-strong">Ajouter un participant</p>
        <button type="button" onClick={onClose} className="text-text-tertiary hover:text-text-strong transition-colors">
          <IconX />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-error font-medium flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-error inline-block" />
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Nom *" value={nom} onChange={e => setNom(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm border border-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-strong placeholder:text-text-tertiary" />
        <input placeholder="Prénom *" value={prenom} onChange={e => setPrenom(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm border border-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-strong placeholder:text-text-tertiary" />
      </div>
      <input placeholder="Téléphone * (+24177...)" value={tel} onChange={e => setTel(e.target.value)}
        className="px-3 py-2.5 rounded-lg text-sm border border-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-strong placeholder:text-text-tertiary" />
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm">Ajouter</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
      </div>
    </form>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function DetailCagnottePage() {
  const isMobile = useMobile()
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const cagnotte = DEMO_CAGNOTTES[id || '1'] || DEMO_CAGNOTTES['1']

  const [payesLocal] = useState(cagnotte.participantsPayes)
  const [attenteLocal, setAttenteLocal] = useState(cagnotte.participantsEnAttente)
  const [showAjout,    setShowAjout]    = useState(false)
  const [copiedLink,   setCopiedLink]   = useState(false)
  const [activeTab,    setActiveTab]    = useState<'payés' | 'attente' | 'historique'>('payés')

  const lienInvitation = `${window.location.origin}/rejoindre/${id}-abc123`

  const copyLink = async () => {
    await navigator.clipboard.writeText(lienInvitation)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const totalParticipants = payesLocal.length + attenteLocal.length
  const pct = Math.round((payesLocal.length / totalParticipants) * 100)

  const tabs = [
    { key: 'payés',      label: `Ont payé`,    count: payesLocal.length   },
    { key: 'attente',    label: `En attente`,  count: attenteLocal.length },
    { key: 'historique', label: `Historique`,  count: null                },
  ] as const

  if (isMobile) return <MobileDetailCagnotte />

  return (
    <div className="space-y-6">

      {/* Retour */}
      <button onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-strong transition-colors font-medium">
        <IconArrowLeft />
        Retour au tableau de bord
      </button>

      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display font-bold text-text-strong text-2xl tracking-tight">{cagnotte.nom}</h1>
            <Badge variant="success" dot>Active</Badge>
          </div>
          <p className="text-text-tertiary text-sm">
            {cagnotte.type === 'tontine' ? 'Tontine périodique' : 'Cagnotte ouverte'}
            {cagnotte.periodicite && ` · ${cagnotte.periodicite}`}
            {' · '}
            <span className="text-text-secondary">ID USSD :</span>{' '}
            <span className="font-mono font-bold text-primary">{cagnotte.idUssd}</span>
          </p>
        </div>
        <Badge variant={cagnotte.type === 'tontine' ? 'primary' : 'accent'}>
          {cagnotte.type === 'tontine' ? 'Tontine' : 'Ouverte'}
        </Badge>
      </div>

      {/* Carte montant */}
      <Card elevated className="border-l-[3px] border-l-accent">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Total collecté</p>
            <p className="font-display font-bold text-3xl text-text-strong tracking-tight">
              {formatFCFA(cagnotte.montant)}
            </p>
            <p className="text-xs text-text-tertiary mt-1">Frais applicables au retrait*</p>
          </div>
          <div className="min-w-[180px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary">{payesLocal.length}/{totalParticipants} participants</span>
              <span className="text-xs font-bold text-text-strong">{pct}%</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={copyLink}
          className="flex items-center gap-2">
          {copiedLink ? <IconCheck /> : <IconCopy />}
          {copiedLink ? 'Lien copié' : 'Copier le lien d\'invitation'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowAjout(!showAjout)}
          className="flex items-center gap-2">
          <IconUserPlus />
          Ajouter manuellement
        </Button>
      </div>

      {/* Formulaire ajout */}
      <AnimatePresence>
        {showAjout && (
          <motion.div key="ajout-form"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AjoutParticipantForm
              onAdd={(p) => setAttenteLocal(prev => [...prev, p])}
              onClose={() => setShowAjout(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onglets */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-150 border-b-2 -mb-px',
                activeTab === tab.key
                  ? 'border-accent text-text-strong'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary',
              ].join(' ')}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={[
                  'text-2xs font-bold px-1.5 py-0.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-accent/15 text-accent'
                    : 'bg-border text-text-tertiary',
                ].join(' ')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu onglets */}
      <AnimatePresence mode="wait">

        {activeTab === 'payés' && (
          <motion.div key="payes"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {payesLocal.length === 0 ? (
              <p className="text-text-tertiary text-sm py-8 text-center">Aucun paiement reçu pour ce cycle.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {payesLocal.map((p, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-elevated border border-border/70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success text-xs font-bold flex-shrink-0">
                        {p.nom.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-text-strong">{p.nom}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success">{formatFCFA(p.montant)}</p>
                      <p className="text-2xs text-text-tertiary">{p.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'attente' && (
          <motion.div key="attente"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {attenteLocal.length === 0 ? (
              <p className="text-text-tertiary text-sm py-8 text-center">Tous les participants ont payé.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {attenteLocal.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-elevated border border-border/70">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning text-xs font-bold flex-shrink-0">
                        {p.nom.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-text-strong">{p.nom}</span>
                    </div>
                    <Badge variant="warning">En attente</Badge>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'historique' && (
          <motion.div key="historique"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex flex-col gap-2">
              {[...payesLocal].reverse().map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-elevated border border-border/70">
                  <div>
                    <p className="text-sm font-medium text-text-strong">{p.nom}</p>
                    <p className="text-2xs text-text-tertiary">{p.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-success">+{formatFCFA(p.montant)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <p className="text-xs text-text-tertiary">* Des frais s'appliquent au moment du retrait.</p>
    </div>
  )
}
