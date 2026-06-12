import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'
import { useMobile } from '@/hooks/useMobile'
import MobileInscription from '@/pages/mobile/MobileInscription'

// Gestion de l'indicatif + numéro séparés
const step1Schema = z.object({
  nom:           z.string().min(1, 'Le nom est obligatoire').max(100),
  prenom:        z.string().min(1, 'Le prénom est obligatoire').max(100),
  dateNaissance: z.string().min(1, 'La date de naissance est obligatoire'),
  indicatif:     z.string().min(1, 'L\'indicatif est obligatoire'),
  numero:        z.string()
    .min(1, 'Le numéro est obligatoire')
    .regex(/^0[0-9]{8}$/, 'Le numéro doit commencer par 0 et contenir 9 chiffres'),
})

const otpSchema = z.object({
  otp: z.string().length(6, 'Le code doit contenir 6 chiffres').regex(/^[0-9]+$/, 'Chiffres uniquement'),
})

type Step1Data = z.infer<typeof step1Schema>
type OtpData   = z.infer<typeof otpSchema>

// ─── Indicateur de progression ───────────────────────────────────────────────

const STEPS = ['Informations', 'Vérification', 'Succès']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8" role="progressbar" aria-valuenow={current + 1} aria-valuemax={STEPS.length}>
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
              i < current  ? 'bg-success text-white shadow-sm'
              : i === current ? 'bg-gradient-accent text-white shadow-glow'
              : 'bg-border text-text-tertiary',
            ].join(' ')}>
              {i < current ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-2xs font-medium hidden sm:block ${i === current ? 'text-text-strong' : 'text-text-tertiary'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 sm:w-16 h-px mx-1 mb-5 transition-colors duration-300 ${i < current ? 'bg-success' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function InscriptionPage() {
  const isMobile = useMobile()
  const navigate  = useNavigate()
  const login     = useAuthStore((s) => s.login)

  const [step, setStep]           = useState(0)
  const [userData, setUserData]   = useState<Step1Data & { telephone: string } | null>(null)
  const [otpError, setOtpError]   = useState('')
  const [attempts, setAttempts]   = useState(0)
  const [timer, setTimer]         = useState(300)

  const form1   = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      indicatif: '+241',
    },
  })
  const formOtp = useForm<OtpData>({ resolver: zodResolver(otpSchema) })

  const onStep1Submit = (data: Step1Data) => {
    const telephone = `${data.indicatif}${data.numero}`
    setUserData({ ...data, telephone })
    setStep(1)
    startTimer()
  }

  const startTimer = () => {
    setTimer(300)
    const interval = setInterval(() => {
      setTimer((t) => { if (t <= 1) { clearInterval(interval); return 0 } return t - 1 })
    }, 1000)
  }

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const onOtpSubmit = (data: OtpData) => {
    if (data.otp !== '123456') {
      const n = attempts + 1
      setAttempts(n)
      if (n >= 3) {
        setOtpError('3 tentatives épuisées. Renvoyez un nouveau code.')
        formOtp.reset()
      } else {
        setOtpError(`Code invalide. ${3 - n} tentative(s) restante(s).`)
      }
      return
    }
    setOtpError('')
    login(
      { id: crypto.randomUUID(), nom: userData!.nom, prenom: userData!.prenom, telephone: userData!.telephone, typeClient: 'particulier' },
      'demo-token-' + Date.now()
    )
    setStep(2)
  }

  const resendOtp = () => {
    setAttempts(0)
    setOtpError('')
    formOtp.reset()
    startTimer()
  }

  if (isMobile) return <MobileInscription />

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

        <div className="bg-surface-elevated/95 backdrop-blur-sm rounded-[28px] border border-border/60 shadow-2xl p-8">
          <StepIndicator current={step} />

          <AnimatePresence mode="wait">

            {/* ── Étape 0 : Informations ── */}
            {step === 0 && (
              <motion.div key="step0"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="font-display font-bold text-text-strong text-2xl tracking-tight mb-2">Créer un compte</h2>
                <p className="text-text-secondary text-sm max-w-xl leading-relaxed mb-6">
                  Commencez votre expérience Paynala en créant un compte sécurisé pour gérer vos tontines et collectes.
                </p>

                <form onSubmit={form1.handleSubmit(onStep1Submit)} className="flex flex-col gap-4" noValidate>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nom" required placeholder="Obame"
                      error={form1.formState.errors.nom?.message} {...form1.register('nom')} />
                    <Input label="Prénom" required placeholder="Jean-Pierre"
                      error={form1.formState.errors.prenom?.message} {...form1.register('prenom')} />
                  </div>
                  <Input label="Date de naissance" type="date" required
                    error={form1.formState.errors.dateNaissance?.message} {...form1.register('dateNaissance')} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Numéro de téléphone <span className="text-accent">*</span>
                    </label>
                    <div className="grid grid-cols-[120px_1fr] gap-3">
                      <label className="relative block">
                        <span className="sr-only">Indicatif</span>
                        <select
                          aria-invalid={!!form1.formState.errors.indicatif}
                          className={['w-full appearance-none rounded-xl px-4 py-3 text-sm text-text-strong bg-surface',
                            'border transition-all duration-150 placeholder:text-text-tertiary',
                            'focus:outline-none focus:ring-2 focus:ring-offset-0',
                            form1.formState.errors.indicatif
                              ? 'border-error/50 bg-red-50/30 focus:ring-error/20 focus:border-error/60'
                              : 'border-border hover:border-border-strong focus:border-primary/50 focus:ring-primary/15',
                          ].join(' ')}
                          {...form1.register('indicatif')}
                        >
                          <option value="+241">Gabon +241</option>
                          <option value="+33">France +33</option>
                          <option value="+225">Côte d'Ivoire +225</option>
                          <option value="+237">Cameroun +237</option>
                          <option value="+229">Bénin +229</option>
                        </select>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2"/>
                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                          </svg>
                        </span>
                        <input
                          type="tel"
                          autoComplete="tel"
                          placeholder="077 45 67 77"
                          aria-invalid={!!form1.formState.errors.numero}
                          className={['w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-text-strong bg-surface',
                            'border transition-all duration-150 placeholder:text-text-tertiary',
                            'focus:outline-none focus:ring-2 focus:ring-offset-0',
                            form1.formState.errors.numero
                              ? 'border-error/50 bg-red-50/30 focus:ring-error/20 focus:border-error/60'
                              : 'border-border hover:border-border-strong focus:border-primary/50 focus:ring-primary/15',
                          ].join(' ')}
                          {...form1.register('numero')}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed">
                      Airtel (+241 07x) · Libertis (+241 06x)
                    </p>
                    {(form1.formState.errors.indicatif || form1.formState.errors.numero) && (
                      <p role="alert" className="flex items-center gap-1.5 text-xs text-error font-medium">
                        <span className="w-1 h-1 rounded-full bg-error inline-block" />
                        {form1.formState.errors.indicatif?.message || form1.formState.errors.numero?.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" variant="accent" size="lg" className="w-full mt-2">
                    Continuer
                  </Button>
                </form>

                <p className="text-center text-sm text-text-tertiary mt-6">
                  Déjà un compte ?{' '}
                  <Link to="/connexion" className="text-primary font-semibold hover:text-primary-dark transition-colors">
                    Se connecter
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ── Étape 1 : OTP ── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="font-display font-bold text-text-strong text-2xl tracking-tight mb-1">Vérification</h2>
                <p className="text-text-secondary text-sm mb-1">
                  Code envoyé au <span className="font-semibold text-text-strong">{userData?.telephone}</span>
                </p>
                <p className="text-xs text-text-tertiary mb-6">
                  Code de démo : <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-text-secondary">123456</code>
                </p>

                <form onSubmit={formOtp.handleSubmit(onOtpSubmit)} className="flex flex-col gap-4" noValidate>
                  <Input label="Code OTP" required placeholder="123456" maxLength={6}
                    inputMode="numeric" autoComplete="one-time-code"
                    error={formOtp.formState.errors.otp?.message || otpError}
                    {...formOtp.register('otp')} />

                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-mono text-xs font-medium ${timer === 0 ? 'text-error' : 'text-text-tertiary'}`}>
                      {timer > 0 ? formatTimer(timer) : 'Code expiré'}
                    </span>
                    <button type="button" onClick={resendOtp}
                      disabled={timer > 0 && attempts < 3}
                      className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Renvoyer le code
                    </button>
                  </div>

                  <Button type="submit" variant="accent" size="lg" className="w-full"
                    disabled={attempts >= 3 && timer > 0}>
                    Vérifier
                  </Button>
                </form>
              </motion.div>
            )}


            {/* ── Étape 2 : Succès ── */}
            {step === 2 && (
              <motion.div key="step3"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-5">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 className="font-display font-bold text-text-strong text-xl tracking-tight mb-1">
                  Compte créé avec succès
                </h2>
                <p className="text-text-tertiary text-sm mb-8">
                  Bienvenue, <span className="font-semibold text-text-strong">{userData?.prenom}</span>
                </p>
                <Button variant="accent" size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
                  Accéder au tableau de bord
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
