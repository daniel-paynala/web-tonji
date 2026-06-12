import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useMobile } from '@/hooks/useMobile'
import MobileConnexion from '@/pages/mobile/MobileConnexion'

// Gestion de l'indicatif + numéro séparés

const schema = z.object({
  indicatif: z.string().min(1, 'L\'indicatif est obligatoire'),
  numero: z.string()
    .min(1, 'Le numéro est obligatoire')
    .regex(/^0[0-9]{8}$/, 'Le numéro doit commencer par 0 et contenir 9 chiffres'),
  otp: z.string()
    .min(4, 'L\'OTP doit contenir au moins 4 chiffres')
    .max(6, 'L\'OTP ne doit pas dépasser 6 chiffres')
    .regex(/^[0-9]+$/, 'L\'OTP doit contenir uniquement des chiffres'),
})

type FormData = z.infer<typeof schema>

// ─── Icônes ───────────────────────────────────────────────────────────────────

const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
)

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
)

const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

// ─── Icônes canaux ───────────────────────────────────────────────────────────
const IconUSSD = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">USSD</text>
  </svg>
)

const IconWeb = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h18" />
    <path d="M3 6h18" />
    <path d="M3 18h18" />
  </svg>
)

const IconWhatsApp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a5 5 0 01-3 3l-3 1 1-3a5 5 0 01-7-7 5 5 0 017 7l3-1z" />
    <path d="M16 11a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

// ─── Composant ───────────────────────────────────────────────────────────────-

export default function ConnexionPage() {
  const isMobile = useMobile()
  const navigate = useNavigate()
  const login    = useAuthStore((s) => s.login)

  const [globalError, setGlobalError] = useState('')
  const [failCount,   setFailCount]   = useState(0)
  const [blocked,     setBlocked]     = useState(false)
  const [otpSent,     setOtpSent]     = useState(false)
  const [otpCode,     setOtpCode]     = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      indicatif: '+241',
      otp: '',
    },
  })

  const numeroValue = watch('numero')
  const indicatifValue = watch('indicatif')

  const onSubmit = async (data: FormData) => {
    if (blocked) return
    await new Promise(r => setTimeout(r, 600))

    const telephone = `${data.indicatif}${data.numero}`
    const valid = telephone === '+241077456777' && data.otp === '1234'

    if (!valid) {
      const newCount = failCount + 1
      setFailCount(newCount)
      if (newCount >= 5) {
        setBlocked(true)
        setGlobalError('Compte temporairement bloqué après 5 tentatives. Réessayez dans 15 min.')
        setTimeout(() => { setBlocked(false); setFailCount(0); setGlobalError('') }, 15 * 60 * 1000)
      } else {
        setGlobalError('OTP incorrect. Veuillez vérifier et réessayer.')
      }
      return
    }

    setGlobalError('')
    login(
      { id: 'demo-user', nom: 'Obame', prenom: 'Jean-Pierre', telephone, typeClient: 'particulier' },
      'demo-token-' + Date.now()
    )
    navigate('/dashboard')
  }

  const handleSendOtp = async () => {
    if (!numeroValue || !indicatifValue) {
      setGlobalError('Veuillez entrer votre numéro de téléphone.')
      return
    }

    setGlobalError('')
    setOtpSent(true)
    setOtpCountdown(60)

    const interval = setInterval(() => {
      setOtpCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
          return 0
        }
        return c - 1
      })
    }, 1000)

    console.log(`OTP envoyé à ${indicatifValue}${numeroValue}`)
  }

  const handleResendOtp = () => {
    if (otpCountdown === 0) {
      handleSendOtp()
    }
  }

  if (isMobile) return <MobileConnexion />

  return (
    <div className="min-h-screen bg-mesh flex">

      {/* ── Panneau gauche — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <span className="text-white font-display font-bold text-base">T</span>
          </div>
          <span className="font-display font-bold text-white text-xl tracking-tight">Tonji</span>
        </div>

        {/* Texte central */}
        <div className="relative z-10">
          <h1 className="font-display font-bold text-white text-4xl leading-tight mb-6">
            Gérez vos tontines<br />
            <span className="text-gradient">en toute confiance.</span>
          </h1>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">
            Plateforme sécurisée de tontines et cagnottes. Simple, transparente et accessible à tous les groupes de tontines.
          </p>
        </div>

        {/* Stats modernisées (la carte '2%' a été retirée) */}
        <div className="relative z-10 mt-6">
          <ul className="grid grid-cols-2 gap-3">
            {[
              { val: 'USSD', label: 'Paiement sans internet' },
              { val: '100%', label: 'Sécurisé & transparent' },
            ].map((s) => (
              <li key={s.val} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/6">
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-accent to-primary text-white font-display font-bold text-sm shadow-sm">
                  {s.val}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-semibold leading-tight">{s.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
              <span className="text-white font-display font-bold text-sm">T</span>
            </div>
            <span className="font-display font-bold text-white text-lg tracking-tight">Tonji</span>
          </div>

          {/* Card formulaire */}
          <div className="bg-surface-elevated/95 backdrop-blur-sm rounded-[28px] border border-border/60 shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="font-display font-bold text-text-strong text-2xl tracking-tight mb-1">
                Connexion
              </h2>
              <p className="text-text-tertiary text-sm max-w-xl leading-relaxed">
                Connectez-vous avec votre numéro de téléphone et votre mot de passe pour accéder à votre espace de gestion de tontines.
              </p>
            </div>

            {/* Erreur globale */}
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl bg-error/8 border border-error/20 px-4 py-3"
              >
                <span className="text-error mt-0.5 flex-shrink-0"><IconAlert /></span>
                <p className="text-sm text-error leading-snug">{globalError}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

              {/* Téléphone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Numéro de téléphone <span className="text-accent">*</span>
                </label>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <label className="relative block">
                    <span className="sr-only">Indicatif</span>
                    <select
                      aria-invalid={!!errors.indicatif}
                      className={[
                        'w-full appearance-none rounded-xl px-4 py-3 text-sm text-text-strong bg-surface',
                        'border transition-all duration-150 placeholder:text-text-tertiary',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        errors.indicatif
                          ? 'border-error/50 bg-red-50/30 focus:ring-error/20 focus:border-error/60'
                          : 'border-border hover:border-border-strong focus:border-primary/50 focus:ring-primary/15',
                      ].join(' ')}
                      {...register('indicatif')}
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
                      <IconPhone />
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="077 45 67 77"
                      aria-invalid={!!errors.numero}
                      className={[
                        'w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-text-strong bg-surface',
                        'border transition-all duration-150 placeholder:text-text-tertiary',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        errors.numero
                          ? 'border-error/50 bg-red-50/30 focus:ring-error/20 focus:border-error/60'
                          : 'border-border hover:border-border-strong focus:border-primary/50 focus:ring-primary/15',
                      ].join(' ')}
                      {...register('numero')}
                    />
                  </div>
                </div>
                {(errors.indicatif || errors.numero) && (
                  <p role="alert" className="flex items-center gap-1.5 text-xs text-error font-medium">
                    <span className="w-1 h-1 rounded-full bg-error inline-block" />
                    {errors.indicatif?.message || errors.numero?.message}
                  </p>
                )}
              </div>

              {/* Mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Code OTP <span className="text-accent">*</span>
                </label>
                
                {!otpSent && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={handleSendOtp}
                    disabled={!numeroValue}
                  >
                    Envoyer un code OTP
                  </Button>
                )}

                {otpSent && (
                  <>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
                        <IconLock />
                      </span>
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        placeholder="0000"
                        maxLength={6}
                        aria-invalid={!!errors.otp}
                        className={[
                          'w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-text-strong bg-surface',
                          'border transition-all duration-150 placeholder:text-text-tertiary',
                          'focus:outline-none focus:ring-2 focus:ring-offset-0 tracking-widest',
                          errors.otp
                            ? 'border-error/50 bg-red-50/30 focus:ring-error/20 focus:border-error/60'
                            : 'border-border hover:border-border-strong focus:border-primary/50 focus:ring-primary/15',
                        ].join(' ')}
                        {...register('otp')}
                      />
                    </div>

                    {errors.otp && (
                      <p role="alert" className="flex items-center gap-1.5 text-xs text-error font-medium">
                        <span className="w-1 h-1 rounded-full bg-error inline-block" />
                        {errors.otp.message}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-text-tertiary">Code reçu par SMS ?</p>
                      <button 
                        type="button" 
                        onClick={handleResendOtp}
                        disabled={otpCountdown > 0}
                        className={[
                          'text-xs font-medium transition-colors',
                          otpCountdown > 0 
                            ? 'text-text-tertiary cursor-not-allowed' 
                            : 'text-primary hover:text-primary-dark'
                        ].join(' ')}
                      >
                        {otpCountdown > 0 ? `Renvoyer dans ${otpCountdown}s` : 'Renvoyer'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full mt-1"
                loading={isSubmitting}
                disabled={blocked}
              >
                Se connecter
              </Button>
            </form>

            <p className="text-center text-sm text-text-tertiary mt-6">
              Pas encore de compte ?{' '}
              <Link to="/inscription" className="text-primary font-semibold hover:text-primary-dark transition-colors">
                Créer un compte
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
