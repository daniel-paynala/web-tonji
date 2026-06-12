import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { useMobile } from '@/hooks/useMobile'
import MobileCreateCagnotte from '@/pages/mobile/MobileCreateCagnotte'

// ─── Schémas ─────────────────────────────────────────────────────────────────

const step1Schema = z.discriminatedUnion('type', [
  z.object({
    type:           z.literal('tontine'),
    nom:            z.string().min(1, 'Obligatoire').max(100),
    nbParticipants: z.coerce.number().min(2, 'Min 2').max(200, 'Max 200'),
    periodicite:    z.enum(['1sem', '2sem', '1mois'], { required_error: 'Obligatoire' }),
    montantCycle:   z.coerce.number().min(100, 'Min 100 FCFA').max(2500000, 'Max 2 500 000 FCFA'),
  }),
  z.object({
    type:       z.literal('ouverte'),
    nom:        z.string().min(1, 'Obligatoire').max(100),
    dateDebut:  z.string().min(1, 'Obligatoire'),
    dateFin:    z.string().optional(),
    montantMin: z.coerce.number().min(100, 'Min 100 FCFA').max(999999999, 'Max dépassé'),
  }),
])

const step2Schema = z.object({
  autreNumero:   z.boolean(),
  numeroRetrait: z.string()
    .min(1, 'Le numéro est obligatoire')
    .regex(/^\+?241[0-9]{8}$/, 'Format invalide (ex: +24177456777)'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

// ─── Icônes ───────────────────────────────────────────────────────────────────

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)

const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
)

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

// ─── Panneau CGU ─────────────────────────────────────────────────────────────

function PanneauCGU({ error, checked, onChange }: {
  error?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-warning/20">
        <p className="text-sm font-semibold text-text-strong mb-2">Règles essentielles</p>
        <ul className="text-sm text-text-secondary space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-warning mt-2 flex-shrink-0" />
            Les fonds collectés sont reversés automatiquement sur le numéro de retrait.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-warning mt-2 flex-shrink-0" />
            Le numéro de retrait <strong>ne peut plus être modifié</strong> après création.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-warning mt-2 flex-shrink-0" />
            Les frais sont à la charge du cotisant, pas du bénéficiaire.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-warning mt-2 flex-shrink-0" />
            Paynala n'arbitre pas les conflits entre membres.
          </li>
        </ul>
      </div>

      <div className="px-4 py-3">
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors mb-3">
          {expanded ? '− Masquer les conditions complètes' : '+ Voir les conditions complètes'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div key="cgu-detail"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="text-xs text-text-secondary bg-surface rounded-lg p-3 mb-3 border border-border leading-relaxed">
                <p className="font-semibold text-text-strong mb-1">Conditions générales d'utilisation — Tonji</p>
                <p>En créant une cagnotte sur la plateforme Tonji, vous acceptez que les fonds collectés soient
                automatiquement reversés sur le numéro de retrait désigné à la création. Ce numéro est définitif
                et ne peut être modifié une fois la cagnotte activée. Les frais de service (2 % de commission
                Paynala + frais opérateur) sont prélevés sur chaque cotisation versée par les participants.
                Paynala agit en tant qu'intermédiaire technique et ne prend pas position dans les litiges entre
                membres d'une cagnotte, sauf en cas de fraude manifeste signalée et documentée. L'utilisation
                de la plateforme à des fins frauduleuses entraîne la suspension immédiate du compte.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 accent-primary w-4 h-4" aria-required="true" />
          <span className="text-sm text-text-strong">J'ai lu et j'accepte les conditions d'utilisation</span>
        </label>
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-error font-medium mt-2">
            <span className="w-1 h-1 rounded-full bg-error inline-block" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function NouvelleCagnottePage() {
  const isMobile = useMobile()
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)

  const [step, setStep]               = useState(0)
  const [_step1Data, setStep1Data]    = useState<Step1Data | null>(null)
  const [typeCagnotte, setType]       = useState<'tontine' | 'ouverte'>('tontine')
  const [autreNumero, setAutreNumero] = useState(false)
  const [cguChecked, setCguChecked]   = useState(false)
  const [cguError, setCguError]       = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [idCagnotte] = useState(() => String(Math.floor(1000 + Math.random() * 89999)))

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { type: 'tontine', nom: '', nbParticipants: 10, periodicite: '1sem', montantCycle: 10000 } as Step1Data,
  })

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { autreNumero: false, numeroRetrait: user?.telephone || '' },
  })

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data)
    form2.setValue('numeroRetrait', user?.telephone || '')
    setStep(1)
  }

  const onStep2Submit = async (_data: Step2Data) => {
    if (!cguChecked) {
      setCguError('Vous devez accepter les conditions d\'utilisation pour continuer.')
      return
    }
    setCguError('')
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 1000))
    navigate(`/cagnottes/${idCagnotte}`)
  }

  const today = new Date().toISOString().split('T')[0]

  // Stepper
  const steps = ['Informations', 'Retrait & Confirmation']

  if (isMobile) return <MobileCreateCagnotte />

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* En-tête */}
      <div>
        <button onClick={() => step === 0 ? navigate('/dashboard') : setStep(0)}
          className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-strong transition-colors font-medium mb-4">
          <IconArrowLeft />
          {step === 0 ? 'Retour au tableau de bord' : 'Retour'}
        </button>
        <h1 className="font-display font-bold text-text-strong text-2xl tracking-tight">Créer une cagnotte</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={[
              'flex items-center gap-2.5 text-sm font-medium',
              i === step ? 'text-text-strong' : i < step ? 'text-success' : 'text-text-tertiary',
            ].join(' ')}>
              <span className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < step  ? 'bg-success text-white'
                : i === step ? 'bg-gradient-accent text-white shadow-glow'
                : 'bg-border text-text-tertiary',
              ].join(' ')}>
                {i < step ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i === 0 && (
              <div className={`h-px w-8 sm:w-16 transition-colors ${step > 0 ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Étape 1 : Informations ── */}
        {step === 0 && (
          <motion.div key="step0"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card elevated>
              <form onSubmit={form1.handleSubmit(onStep1Submit)} className="flex flex-col gap-5" noValidate>
                <Input label="Nom de la cagnotte" required
                  placeholder="Ex: Tontine Familiale Obame" maxLength={100}
                  error={(form1.formState.errors as Record<string, { message?: string }>).nom?.message}
                  {...form1.register('nom')} />

                {/* Sélecteur de type */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Type de cagnotte <span className="text-accent">*</span>
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {(['tontine', 'ouverte'] as const).map((t) => (
                      <label key={t} className={[
                        'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150',
                        typeCagnotte === t
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-border-strong',
                      ].join(' ')}>
                        <input type="radio" value={t} checked={typeCagnotte === t}
                          onChange={() => { setType(t); form1.setValue('type', t) }}
                          className="accent-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-text-strong">
                            {t === 'tontine' ? 'Tontine périodique' : 'Cagnotte ouverte'}
                          </p>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {t === 'tontine' ? 'Montant fixe, rotation' : 'Montant libre, événement'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Champs tontine */}
                {typeCagnotte === 'tontine' && (
                  <motion.div key="tontine-fields"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4 p-4 bg-surface rounded-xl border border-border"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Participants" type="number" required min={2} max={50}
                        hint="Entre 2 et 50"
                        error={(form1.formState.errors as Record<string, { message?: string }>).nbParticipants?.message}
                        {...form1.register('nbParticipants')} />
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="periodicite" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Périodicité <span className="text-accent">*</span>
                        </label>
                        <select id="periodicite"
                          className="w-full px-4 py-3 rounded-xl text-sm text-text-strong bg-surface-elevated border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                          {...form1.register('periodicite' as never)}>
                          <option value="1sem">1 semaine</option>
                          <option value="2sem">2 semaines</option>
                          <option value="1mois">1 mois</option>
                        </select>
                      </div>
                    </div>
                    <Input label="Montant par cycle" type="number" required min={100} max={999999}
                      hint="Entre 100 et 999 999 FCFA"
                      error={(form1.formState.errors as Record<string, { message?: string }>).montantCycle?.message}
                      {...form1.register('montantCycle' as never)} />
                  </motion.div>
                )}

                {/* Champs cagnotte ouverte */}
                {typeCagnotte === 'ouverte' && (
                  <motion.div key="ouverte-fields"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4 p-4 bg-surface rounded-xl border border-border"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Date de début" type="date" required defaultValue={today}
                        error={(form1.formState.errors as Record<string, { message?: string }>).dateDebut?.message}
                        {...form1.register('dateDebut' as never)} />
                      <Input label="Date de fin" type="date" hint="Optionnelle"
                        error={(form1.formState.errors as Record<string, { message?: string }>).dateFin?.message}
                        {...form1.register('dateFin' as never)} />
                    </div>
                    <Input label="Montant minimum" type="number" min={100} defaultValue={100}
                      hint="En FCFA (défaut : 100 FCFA)"
                      error={(form1.formState.errors as Record<string, { message?: string }>).montantMin?.message}
                      {...form1.register('montantMin' as never)} />
                  </motion.div>
                )}

                <Button type="submit" variant="accent" size="lg" className="w-full">
                  Suivant
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* ── Étape 2 : Retrait & Confirmation ── */}
        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card elevated>
              <form onSubmit={form2.handleSubmit(onStep2Submit)} className="flex flex-col gap-5" noValidate>

                {/* Numéro de retrait */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Numéro de retrait <span className="text-accent">*</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-text-tertiary font-medium">
                      <IconLock />
                      Verrouillé après création
                    </span>
                  </div>

                  {!autreNumero ? (
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface border border-border">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                          <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                      </div>
                      <span className="font-semibold text-text-strong text-sm">{user?.telephone}</span>
                      <span className="ml-auto text-xs text-text-tertiary">Votre numéro</span>
                    </div>
                  ) : (
                    <Input type="tel" placeholder="+241 77 45 67 77"
                      error={form2.formState.errors.numeroRetrait?.message}
                      {...form2.register('numeroRetrait')} />
                  )}

                  <label className="flex items-center gap-2.5 text-sm text-text-secondary cursor-pointer">
                    <input type="checkbox" checked={autreNumero}
                      onChange={(e) => {
                        setAutreNumero(e.target.checked)
                        if (!e.target.checked) form2.setValue('numeroRetrait', user?.telephone || '')
                      }}
                      className="accent-primary w-4 h-4" />
                    Utiliser un autre numéro de retrait
                  </label>
                </div>

                {/* Avertissement */}
                <div className="flex items-start gap-3 rounded-xl bg-warning/8 border border-warning/25 px-4 py-3.5">
                  <span className="text-warning flex-shrink-0 mt-0.5"><IconShield /></span>
                  <p className="text-sm text-text-secondary leading-snug">
                    <strong className="text-text-strong">Attention :</strong> Le numéro de retrait ne pourra
                    plus être modifié après la création de la cagnotte.
                  </p>
                </div>

                {/* ID USSD */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Identifiant USSD (généré automatiquement)
                  </span>
                  <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-surface border border-border">
                    <span className="font-display font-bold text-2xl text-primary tracking-widest">{idCagnotte}</span>
                    <div className="ml-auto flex items-center gap-1.5 text-xs text-text-tertiary">
                      <IconLock />
                      Code pour paiements USSD
                    </div>
                  </div>
                </div>

                {/* CGU */}
                <PanneauCGU
                  checked={cguChecked}
                  onChange={(v) => { setCguChecked(v); if (v) setCguError('') }}
                  error={cguError}
                />

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep(0)}>
                    Retour
                  </Button>
                  <Button type="submit" variant="accent" size="lg" className="flex-1" loading={isSubmitting}>
                    Créer la cagnotte
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
