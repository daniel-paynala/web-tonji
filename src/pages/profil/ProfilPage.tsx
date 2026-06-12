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
import MobileProfil from '@/pages/mobile/MobileProfil'

// ─── Icônes ───────────────────────────────────────────────────────────────────

const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconLock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
)

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

// ─── Types & schémas ──────────────────────────────────────────────────────────

interface ProfilOptionnels { sexe?: string; adresse?: string; email?: string }

const emailSchema   = z.object({ email:   z.string().email('Email invalide') })
const adresseSchema = z.object({ adresse: z.string().min(3, 'Adresse trop courte') })
const sexeSchema    = z.object({ sexe:    z.enum(['homme', 'femme', 'autre'], { required_error: 'Obligatoire' }) })

// ─── Modale de complétion ─────────────────────────────────────────────────────

function ModalCompletion({ champ, onSave, onClose }: {
  champ: 'email' | 'adresse' | 'sexe'
  onSave: (val: string) => void
  onClose: () => void
}) {
  const schema = champ === 'email' ? emailSchema : champ === 'adresse' ? adresseSchema : sexeSchema
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = (data: Record<string, string>) => { onSave(data[champ]); onClose() }
  const labels: Record<string, string> = { email: 'Adresse email', adresse: 'Adresse postale', sexe: 'Sexe' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm bg-surface-elevated rounded-2xl shadow-xl border border-border p-6"
      >
        <h3 id="modal-title" className="font-display font-bold text-text-strong text-lg tracking-tight mb-1">
          Compléter votre profil
        </h3>
        <p className="text-text-tertiary text-sm mb-5">
          Ce service nécessite votre <strong className="text-text-secondary">{labels[champ]}</strong>.
        </p>

        <form onSubmit={handleSubmit(onSubmit as never)} className="flex flex-col gap-4" noValidate>
          {champ === 'sexe' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Sexe <span className="text-accent">*</span>
              </label>
              <select className="w-full px-4 py-3 rounded-xl text-sm border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-strong"
                {...register('sexe')}>
                <option value="">Sélectionner…</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="autre">Autre</option>
              </select>
              {(errors as Record<string, { message?: string }>).sexe && (
                <p className="text-xs text-error font-medium">
                  {(errors as Record<string, { message?: string }>).sexe?.message}
                </p>
              )}
            </div>
          ) : (
            <Input label={labels[champ]} required
              type={champ === 'email' ? 'email' : 'text'}
              placeholder={champ === 'email' ? 'vous@exemple.com' : 'Votre adresse…'}
              error={(errors as Record<string, { message?: string }>)[champ]?.message}
              {...register(champ as never)} />
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" size="md" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" size="md" className="flex-1">Enregistrer</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function ProfilPage() {
  const isMobile = useMobile()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const [optionnels, setOptionnels] = useState<ProfilOptionnels>({})
  const [modalChamp, setModalChamp] = useState<'email' | 'adresse' | 'sexe' | null>(null)
  const [saved, setSaved]           = useState<string | null>(null)

  const champsFilled  = [optionnels.sexe, optionnels.adresse, optionnels.email].filter(Boolean).length
  const completionPct = Math.round((champsFilled / 3) * 100)

  const saveChamp = (champ: 'email' | 'adresse' | 'sexe', val: string) => {
    setOptionnels((prev) => ({ ...prev, [champ]: val }))
    setSaved(champ)
    setTimeout(() => setSaved(null), 2500)
  }

  const initiales = user ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase() : 'U'

  if (isMobile) return <MobileProfil />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-primary font-semibold hover:opacity-90">
          <IconBack />
          Retour
        </button>
      </div>
      <h1 className="font-display font-bold text-text-strong text-2xl tracking-tight">Mon profil</h1>

      {/* Avatar + complétion */}
      <Card elevated>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
            {initiales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-text-strong text-lg tracking-tight">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-text-tertiary text-sm">{user?.telephone}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-tertiary font-medium">Complétion du profil</span>
                <span className="font-semibold text-text-secondary">{champsFilled}/3 champs</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Informations de base */}
      <Card>
        <h2 className="text-sm font-semibold text-text-strong mb-4">Informations de base</h2>
        <div className="flex flex-col divide-y divide-border">
          {[
            { label: 'Nom',               value: user?.nom },
            { label: 'Prénom',            value: user?.prenom },
            { label: 'Date de naissance', value: '—' },
            { label: 'Téléphone',         value: user?.telephone, locked: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-text-tertiary w-40 flex-shrink-0">{item.label}</span>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="text-sm font-medium text-text-strong">{item.value}</span>
                {item.locked ? (
                  <span className="text-text-tertiary"><IconLock /></span>
                ) : (
                  <button className="flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary-dark transition-colors">
                    <IconEdit />
                    Modifier
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Informations complémentaires */}
      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-text-strong">Informations complémentaires</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Demandées selon les services utilisés.</p>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {([
            { key: 'sexe',    label: 'Sexe',    value: optionnels.sexe    },
            { key: 'adresse', label: 'Adresse', value: optionnels.adresse },
            { key: 'email',   label: 'Email',   value: optionnels.email   },
          ] as const).map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-text-tertiary w-40 flex-shrink-0">{item.label}</span>
              <div className="flex items-center gap-2 flex-1 justify-end">
                {item.value ? (
                  <>
                    <span className="text-sm font-medium text-text-strong">{item.value}</span>
                    {saved === item.key && (
                      <span className="flex items-center gap-1 text-xs text-success font-medium">
                        <IconCheck /> Enregistré
                      </span>
                    )}
                    <button onClick={() => setModalChamp(item.key)}
                      className="flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary-dark transition-colors">
                      <IconEdit /> Modifier
                    </button>
                  </>
                ) : (
                  <button onClick={() => setModalChamp(item.key)}
                    className="flex items-center gap-1.5 text-xs text-accent font-semibold hover:text-accent-dark transition-colors">
                    <IconPlus /> Ajouter
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Numéro de retrait */}
      <Card>
        <h2 className="text-sm font-semibold text-text-strong mb-3">Numéro de retrait par défaut</h2>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface border border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <span className="font-semibold text-text-strong text-sm">{user?.telephone}</span>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-text-tertiary">
            <IconLock />
            <span>Utilisé par une cagnotte active</span>
          </div>
        </div>
      </Card>

      {/* Modale */}
      <AnimatePresence>
        {modalChamp && (
          <ModalCompletion
            key={modalChamp}
            champ={modalChamp}
            onSave={(val) => saveChamp(modalChamp, val)}
            onClose={() => setModalChamp(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
