import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// ─── Icônes ───────────────────────────────────────────────────────────────────

const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

// ─── Simulateur de frais ──────────────────────────────────────────────────────

function SimulateurFrais() {
  const [montant, setMontant] = useState('')
  const [type, setType]       = useState<'tontine' | 'ouverte'>('tontine')

  const val = parseFloat(montant) || 0
  const commissionPaynala  = Math.round(val * 0.02)
  const fraisOperateurPaie = Math.round(val * 0.03)
  const totalDebite        = val + commissionPaynala + fraisOperateurPaie
  const fraisRetrait       = Math.min(Math.round(val * 0.03), 5000)
  const netBeneficiaire    = val - fraisRetrait

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-tertiary">
        Estimez les frais appliqués à une cotisation selon le modèle économique Paynala.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Montant de la cotisation
          </label>
          <div className="relative">
            <input type="number" min={100} max={999999} placeholder="10 000"
              value={montant} onChange={(e) => setMontant(e.target.value)}
              className="w-full px-4 py-3 pr-16 rounded-xl text-sm border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-strong placeholder:text-text-tertiary" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary font-medium">FCFA</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Type de cagnotte
          </label>
          <select value={type} onChange={(e) => setType(e.target.value as 'tontine' | 'ouverte')}
            className="w-full px-4 py-3 rounded-xl text-sm border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-strong">
            <option value="tontine">Tontine périodique</option>
            <option value="ouverte">Cagnotte ouverte</option>
          </select>
        </div>
      </div>

      {val >= 100 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-border overflow-hidden"
        >
          <div className="bg-surface px-4 py-3.5 border-b border-border">
            <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Ce que paie le cotisant</p>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { label: 'Cotisation nominale',          value: fmt(val),                  neutral: true },
                { label: 'Commission Paynala (2 %)',     value: `+ ${fmt(commissionPaynala)}` },
                { label: 'Frais opérateur paiement (3 %)', value: `+ ${fmt(fraisOperateurPaie)}` },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-text-tertiary">{row.label}</span>
                  <span className="font-medium text-text-strong">{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span className="text-text-strong">Total débité</span>
                <span className="text-primary">{fmt(totalDebite)}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-elevated px-4 py-3.5">
            <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Ce que reçoit le bénéficiaire</p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Montant collecté</span>
                <span className="font-medium text-text-strong">{fmt(val)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Frais retrait (3 %, cap 5 000 FCFA)</span>
                <span className="font-medium text-text-strong">− {fmt(fraisRetrait)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span className="text-text-strong">Versé au bénéficiaire</span>
                <span className="text-success">{fmt(netBeneficiaire)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {val > 0 && val < 100 && (
        <p className="text-xs text-error font-medium">Le montant minimum est de 100 FCFA.</p>
      )}
    </div>
  )
}

// ─── Section Notifications ────────────────────────────────────────────────────

function SectionNotifications() {
  const [prefs, setPrefs] = useState({
    rappelPaiement:     true,
    nouveauParticipant: true,
    paiementRecu:       true,
    newsletter:         false,
  })

  const toggle = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: 'rappelPaiement',     label: 'Rappels de paiement',  desc: 'SMS avant la date limite de cotisation'       },
    { key: 'nouveauParticipant', label: 'Nouveau participant',   desc: 'Quand quelqu\'un rejoint votre cagnotte'      },
    { key: 'paiementRecu',       label: 'Paiement reçu',        desc: 'Confirmation à chaque cotisation encaissée'   },
    { key: 'newsletter',         label: 'Actualités Paynala',   desc: 'Nouvelles fonctionnalités et offres'          },
  ]

  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
          <div>
            <p className="text-sm font-medium text-text-strong">{item.label}</p>
            <p className="text-xs text-text-tertiary mt-0.5">{item.desc}</p>
          </div>
          <button role="switch" aria-checked={prefs[item.key]} onClick={() => toggle(item.key)}
            className={`relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 flex-shrink-0 ${
              prefs[item.key] ? 'bg-primary' : 'bg-border'
            }`}>
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              prefs[item.key] ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Section Sécurité ─────────────────────────────────────────────────────────

function SectionSecurite() {
  const logout = useAuthStore((s) => s.logout)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="flex flex-col divide-y divide-border">
      <div className="flex items-center justify-between py-3.5 first:pt-0">
        <div>
          <p className="text-sm font-medium text-text-strong">Mot de passe</p>
          <p className="text-xs text-text-tertiary mt-0.5">Dernière modification : inconnue</p>
        </div>
        <button className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors">
          Modifier
        </button>
      </div>

      <div className="flex items-center justify-between py-3.5">
        <div>
          <p className="text-sm font-medium text-text-strong">Vérification en deux étapes</p>
          <p className="text-xs text-text-tertiary mt-0.5">OTP par SMS activé par défaut</p>
        </div>
        <span className="text-2xs font-semibold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
          Actif
        </span>
      </div>

      <div className="flex items-center justify-between py-3.5 last:pb-0">
        <div>
          <p className="text-sm font-medium text-text-strong">Déconnexion de tous les appareils</p>
          <p className="text-xs text-text-tertiary mt-0.5">Invalide toutes les sessions actives</p>
        </div>
        <button onClick={() => setShowConfirm(true)}
          className="text-xs text-error font-semibold hover:opacity-80 transition-opacity">
          Déconnecter
        </button>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div key="confirm"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="rounded-xl bg-error/8 border border-error/20 p-4 flex flex-col gap-3 mt-2"
          >
            <p className="text-sm text-text-strong font-medium">
              Confirmer la déconnexion de tous les appareils ?
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>Annuler</Button>
              <Button variant="danger" size="sm" onClick={logout}>Confirmer</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Section CGU ──────────────────────────────────────────────────────────────

function SectionCGU() {
  const [expanded, setExpanded] = useState(false)

  const sections = [
    { titre: '1. Objet', contenu: 'Les présentes CGU régissent l\'accès et l\'utilisation de la plateforme Tonji, développée par Paynala, permettant la création et la gestion de cagnottes et de tontines entre particuliers.' },
    { titre: '2. Numéro de retrait', contenu: 'Le numéro de retrait désigné à la création d\'une cagnotte est définitif et ne peut être modifié une fois la cagnotte activée. Cette règle vise à protéger les participants contre toute fraude.' },
    { titre: '3. Frais et commissions', contenu: 'Paynala prélève une commission de 2 % sur chaque cotisation versée, à la charge du cotisant. S\'y ajoutent les frais opérateur : 3 % au paiement et 3 % au retrait (plafonné à 5 000 FCFA).' },
    { titre: '4. Responsabilité', contenu: 'Paynala agit en tant qu\'intermédiaire technique et ne prend pas position dans les litiges entre membres d\'une cagnotte, sauf en cas de fraude manifeste signalée et documentée.' },
    { titre: '5. Utilisation frauduleuse', contenu: 'L\'utilisation de la plateforme à des fins frauduleuses entraîne la suspension immédiate du compte et peut faire l\'objet de poursuites judiciaires.' },
    { titre: '6. Données personnelles', contenu: 'Les données collectées sont utilisées exclusivement pour le fonctionnement de la plateforme et la vérification KYC. Elles ne sont pas revendues à des tiers.' },
    { titre: '7. Modification des CGU', contenu: 'Paynala se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront notifiés par SMS ou notification in-app.' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">Dernière mise à jour : 7 mai 2026</p>
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors">
          {expanded ? '− Réduire' : '+ Tout afficher'}
        </button>
      </div>

      {/* Résumé */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-semibold text-text-strong mb-2">Règles essentielles</p>
        <ul className="text-sm text-text-secondary space-y-1.5">
          {[
            'Les fonds collectés sont reversés automatiquement sur le numéro de retrait.',
            'Le numéro de retrait ne peut plus être modifié après création.',
            'Les frais (2 % Paynala + frais opérateur) sont à la charge du cotisant.',
            'Paynala n\'arbitre pas les conflits entre membres.',
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-warning mt-2 flex-shrink-0" />
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Détail complet */}
      <AnimatePresence>
        {expanded && (
          <motion.div key="cgu-full"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-1">
              {sections.map((s) => (
                <div key={s.titre} className="rounded-xl bg-surface border border-border p-4">
                  <p className="text-sm font-semibold text-text-strong mb-1">{s.titre}</p>
                  <p className="text-sm text-text-tertiary leading-relaxed">{s.contenu}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

type SectionKey = 'simulateur' | 'notifications' | 'securite' | 'cgu'

const SECTIONS: { key: SectionKey; label: string; desc: string; Icon: () => JSX.Element }[] = [
  {
    key: 'simulateur', label: 'Simulateur de frais', desc: 'Calculez les frais avant de créer',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/>
      </svg>
    ),
  },
  {
    key: 'notifications', label: 'Notifications', desc: 'Gérez vos alertes SMS',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
  {
    key: 'securite', label: 'Sécurité', desc: 'Mot de passe et sessions',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  },
  {
    key: 'cgu', label: 'Conditions d\'utilisation', desc: 'Règles et engagements',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
]

export default function ParametresPage() {
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const navigate = useNavigate()

  const toggle = (key: SectionKey) =>
    setActiveSection((prev) => (prev === key ? null : key))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-primary font-semibold hover:opacity-90 mb-1">
            <IconBack />
            Retour
          </button>
          <h1 className="font-display font-bold text-text-strong text-2xl tracking-tight">Paramètres</h1>
          <p className="text-text-tertiary text-sm mt-1">Gérez vos préférences et consultez les conditions d'utilisation.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {SECTIONS.map(({ key, label, desc, Icon }) => (
          <Card key={key} className="overflow-hidden p-0">
            <button onClick={() => toggle(key)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-deep transition-colors"
              aria-expanded={activeSection === key}
            >
              <div className={[
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                activeSection === key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-surface-deep text-text-tertiary border border-border',
              ].join(' ')}>
                <Icon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-strong">{label}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{desc}</p>
              </div>
              <span className={`text-text-tertiary flex-shrink-0 transition-colors ${activeSection === key ? 'text-primary' : ''}`}>
                <IconChevron open={activeSection === key} />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {activeSection === key && (
                <motion.div key={key + '-content'}
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1 border-t border-border">
                    {key === 'simulateur'    && <SimulateurFrais />}
                    {key === 'notifications' && <SectionNotifications />}
                    {key === 'securite'      && <SectionSecurite />}
                    {key === 'cgu'           && <SectionCGU />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-text-tertiary">
        Tonji v0.1.0 · Paynala © 2026
      </p>
    </div>
  )
}
