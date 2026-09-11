import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { T, fmt } from '@/lib/tokens'
import { useMobile } from '@/hooks/useMobile'
import MobileReversement, { type ReversementArgs } from '@/pages/mobile/MobileReversement'
import { reverser, type Participant } from '@/lib/cagnottesApi'
import { fermerCagnotte } from '@/lib/reversementApi'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useVerificationBeneficiaire } from '@/hooks/useVerificationBeneficiaire'
import { VerdictNumeroBeneficiaire } from '@/components/ui/VerdictNumeroBeneficiaire'

// ─────────────────────────────────────────────────────────────────────────────
// ReversementPage (desktop) — pendant desktop de MobileReversement.
// MÊME flux (formulaire → envoi → succès) et MÊME logique (bénéficiaire membre
// ou numéro manuel, plafond = solde, mode « fermeture »), habillés desktop.
// ─────────────────────────────────────────────────────────────────────────────

function initiales(p: Participant): string {
  return `${p.prenom[0] ?? ''}${p.nom[0] ?? ''}`.toUpperCase()
}
function validerNumero(v: string): string | null {
  const n = v.trim()
  if (n.length === 0) return 'Numéro requis'
  if (!/^0\d{8}$/.test(n)) return 'Format : 0 suivi de 8 chiffres'
  return null
}

// ── Icônes ───────────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" /><circle cx="17" cy="13" r="1" fill={T.primary} /></svg>
)
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
)
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
const IconPeople = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
)
const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const IconCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const IconError = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
)

type Phase = 'formulaire' | 'envoi' | 'succes'

// Coquille AU NIVEAU MODULE — pas recréée à chaque render (sinon l'input montant
// perd le focus à chaque frappe : démontage/remontage du sous-arbre).
function Shell({ onBack, disabled, children }: { onBack: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={disabled ? undefined : onBack}
        disabled={disabled}
        className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
        style={{ color: T.textTert, background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer' }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = T.textStrong }}
        onMouseLeave={e => (e.currentTarget.style.color = T.textTert)}
      >
        <IconArrowLeft /> Retour
      </button>
      {children}
    </div>
  )
}

export default function ReversementPage() {
  const isMobile = useMobile()

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const args: ReversementArgs = location.state ?? { titre: 'Cagnotte', montantDisponible: 0 }
  const participants = args.participants ?? []
  const fermerApres = args.fermerApresReversement ?? false

  const [montant, setMontant] = useState('')
  const [numero, setNumero] = useState('')
  const [selected, setSelected] = useState<Participant | null>(null)
  // Vérification du bénéficiaire : déclenchée quand l'utilisateur quitte le
  // champ numéro pour saisir le montant.
  const verif = useVerificationBeneficiaire(numero, selected !== null)
  const [phase, setPhase] = useState<Phase>('formulaire')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (fermerApres) setMontant(String(args.montantDisponible))
  }, [fermerApres, args.montantDisponible])

  const nomBeneficiaire = selected
    ? `${selected.prenom} ${selected.nom}`.trim()
    : `+241 ${numero.trim()}`

  const selectionnerMembre = (p: Participant) => {
    setSelected(p); setNumero(''); setErreur('')
    verif.reinitialiser()
  }
  const deselectionner = () => setSelected(null)
  const onNumeroChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 9)
    setNumero(digits)
    if (selected && digits.length > 0) setSelected(null)
    setErreur('')
  }
  const onMontantChange = (v: string) => {
    if (fermerApres) return
    const digits = v.replace(/\D/g, '')
    if (digits === '') { setMontant(''); setErreur(''); return }
    const n = parseInt(digits, 10)
    if (n > args.montantDisponible) return
    setMontant(digits)
    setErreur('')
  }

  const soumettre = async () => {
    if (!selected) {
      const errNum = validerNumero(numero)
      if (errNum) { setErreur(errNum); return }
    }
    const n = parseInt(montant.trim(), 10)
    if (isNaN(n) || n < 100) { setErreur('Montant minimum : 100 FCFA'); return }
    if (n > args.montantDisponible) { setErreur(`Solde insuffisant (max : ${fmt(args.montantDisponible)})`); return }

    setErreur('')
    setPhase('envoi')
    try {
      await reverser(id!, n, {
        participantId: selected?.id,
        numeroBeneficiaire: selected ? undefined : numero.trim(),
      })
      if (fermerApres) await fermerCagnotte(id!)
      setPhase('succes')
    } catch (e: unknown) {
      setPhase('formulaire')
      setErreur(e instanceof Error ? e.message : 'Erreur inattendue. Réessaie.')
    }
  }

  const enEnvoi = phase === 'envoi'

  if (isMobile) return <MobileReversement />

  // ── Écran succès ─────────────────────────────────────────────────────────────
  if (phase === 'succes') {
    return (
      <Shell onBack={() => navigate(-1)} disabled={enEnvoi}>
        <Card elevated className="flex flex-col items-center text-center py-10 px-8">
          <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: T.successSoft }}>
            <IconCheck />
          </div>
          <p className="mt-6 text-xl font-bold" style={{ color: T.textStrong }}>Transfert effectué</p>
          <p className="mt-2 text-sm" style={{ color: T.textSec }}>Le montant a été envoyé à {nomBeneficiaire}.</p>
          <Button
            variant="primary" size="lg" className="mt-8 w-full"
            onClick={() => fermerApres ? navigate('/', { replace: true }) : navigate(`/cagnottes/${id}`, { replace: true })}
          >
            {fermerApres ? "Retour à l'accueil" : 'Retour à la cagnotte'}
          </Button>
        </Card>
      </Shell>
    )
  }

  // ── Formulaire ───────────────────────────────────────────────────────────────
  return (
    <Shell onBack={() => navigate(-1)} disabled={enEnvoi}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
        <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: T.textStrong }}>Transfert</h1>
        <p className="mt-1 text-sm" style={{ color: T.textSec }}>
          Envoyez une partie de la cagnotte sur un numéro Mobile Money.
        </p>

        <Card elevated className="mt-6 flex flex-col gap-5">
          {/* Solde disponible */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: 'rgba(10,104,71,0.07)', border: '1px solid rgba(10,104,71,0.20)' }}>
            <IconWallet />
            <div>
              <p className="text-[11px] font-semibold" style={{ color: T.textTert }}>Solde disponible</p>
              <p className="text-lg font-extrabold" style={{ color: T.primary }}>{fmt(args.montantDisponible)}</p>
            </div>
          </div>

          {/* Bénéficiaire */}
          {selected ? (
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(232,168,48,0.08)', border: '1px solid rgba(232,168,48,0.40)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(232,168,48,0.18)' }}>
                <span className="text-[13px] font-extrabold" style={{ color: T.accent }}>{initiales(selected)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold truncate" style={{ color: T.textStrong }}>{selected.prenom} {selected.nom}</span>
                  {selected.estCompteLight && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: T.warning, background: 'rgba(196,138,26,0.13)' }}>Invité</span>
                  )}
                </div>
                <p className="text-xs mt-px" style={{ color: T.textSec }}>
                  {(selected.numeroRetraitMasque && selected.numeroRetraitMasque !== selected.numeroMasque) ? selected.numeroRetraitMasque : selected.numeroMasque}
                </p>
                {selected.montantRecu != null && selected.montantRecu > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <IconInfo />
                    <span className="text-xs font-semibold" style={{ color: T.accent }}>Déjà reçu : {fmt(selected.montantRecu)}</span>
                  </div>
                )}
              </div>
              <button onClick={deselectionner} title="Saisir manuellement" className="shrink-0 p-1 flex" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textSec }}>
                <IconClose />
              </button>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>Numéro du bénéficiaire</label>
              <div className="mt-1.5 flex items-stretch gap-2.5">
                <div className="flex items-center gap-2 rounded-lg px-3 shrink-0" style={{ background: T.surfaceEl, border: `1.2px solid ${T.border}`, height: '48px' }}>
                  <span className="text-xl">🇬🇦</span>
                  <span className="text-sm font-bold" style={{ color: T.textStrong }}>+241</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={numero}
                  onChange={e => onNumeroChange(e.target.value)}
                  // La vérification part quand l'utilisateur quitte le champ
                  // pour saisir le montant : assez tôt pour qu'il corrige,
                  // assez tard pour ne pas interroger l'opérateur à chaque frappe.
                  onBlur={verif.verifier}
                  placeholder="0x xx xx xx xx"
                  className="flex-1 min-w-0 rounded-lg px-4 outline-none text-base font-medium"
                  style={{ background: T.surfaceEl, border: `1.5px solid ${T.border}`, height: '48px', color: T.textStrong, fontFamily: 'inherit' }}
                />
              </div>
              {/* Verdict sous le champ : il commente ce qui vient d'être saisi. */}
              <VerdictNumeroBeneficiaire verdict={verif.verdict} titulaire={verif.titulaire} />
            </div>
          )}

          {/* Chips membres */}
          {participants.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <IconPeople />
                <span className="text-xs font-semibold" style={{ color: T.textTert }}>Choisir parmi les cotisants</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map(p => {
                  const sel = selected?.id === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectionnerMembre(p)}
                      className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
                      style={{
                        background: sel ? 'rgba(232,168,48,0.12)' : T.surfaceEl,
                        border: `${sel ? 1.6 : 1}px solid ${sel ? T.accent : 'rgba(212,218,213,0.6)'}`,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: sel ? 'rgba(232,168,48,0.20)' : 'rgba(10,104,71,0.10)' }}>
                          <span className="text-[11px] font-extrabold" style={{ color: sel ? T.accent : T.primary }}>{initiales(p)}</span>
                        </div>
                        {p.estCompteLight && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" style={{ background: T.warning, border: `1.5px solid ${T.surfaceEl}` }} />
                        )}
                      </div>
                      <span className="text-[11px] font-semibold max-w-[64px] truncate" style={{ color: sel ? T.accent : T.textStrong }}>{p.prenom}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="h-px" style={{ background: T.border }} />

          {/* Montant */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSec }}>
              {fermerApres ? 'Montant total à transférer' : 'Montant à transférer'}
            </label>
            <div
              className="mt-1.5 flex items-center gap-3 rounded-xl px-4 py-3.5"
              style={{ background: fermerApres ? T.surfaceDeep : T.surfaceEl, border: `1.5px solid ${erreur ? T.error : T.border}` }}
            >
              <input
                type="tel"
                inputMode="numeric"
                value={montant}
                readOnly={fermerApres}
                onChange={e => onMontantChange(e.target.value)}
                placeholder="ex : 50 000"
                className="flex-1 min-w-0 bg-transparent border-none outline-none font-extrabold"
                style={{ fontSize: '24px', color: T.textStrong, fontFamily: 'inherit' }}
              />
              <span className="text-base font-bold" style={{ color: T.textSec }}>FCFA</span>
            </div>
            {fermerApres && (
              <p className="text-xs mt-1.5" style={{ color: T.textTert }}>Le solde intégral sera transféré avant fermeture.</p>
            )}
          </div>

          {/* Erreur */}
          {erreur && (
            <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5" style={{ background: T.errorSoft, border: `1px solid ${T.error}4D` }}>
              <IconError />
              <p className="text-xs" style={{ color: T.error }}>{erreur}</p>
            </div>
          )}

          {/* Confirmer */}
          {/* Grisé quand on SAIT que le numéro n'a pas de compte Airtel Money :
              le transfert échouerait chez l'opérateur, et un échec de
              décaissement laisse le solde décrémenté le temps de le compenser. */}
          <Button variant="primary" size="lg" className="w-full" loading={enEnvoi}
                  disabled={verif.interdit} onClick={soumettre}>
            {!enEnvoi && <IconSend />}
            {enEnvoi ? 'Envoi…' : 'Confirmer le transfert'}
          </Button>
        </Card>
      </motion.div>
    </Shell>
  )
}
