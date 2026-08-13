import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { useMobile } from '@/hooks/useMobile'
import MobileAjoutParticipants from '@/pages/mobile/MobileAjoutParticipants'
import { urlRejoindre } from '@/lib/deeplink'
import {
  ajouterParticipant,
  rechercherParticipant,
  type LookupResult,
  type Participant,
} from '@/lib/cagnottesApi'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// ─────────────────────────────────────────────────────────────────────────────
// AjoutParticipantsPage (desktop) — pendant desktop de MobileAjoutParticipants.
// Deux onglets (« Manuellement » : lookup numéro → ajout ; « Via un lien » :
// copie/partage du lien d'inscription) + garde « tontine complète ». Même logique
// que le mobile, habillage desktop.
// ─────────────────────────────────────────────────────────────────────────────

interface AjoutArgs {
  titre: string
  nombreMax: number
  nombreInscrits: number
  type?: 'tontine' | 'cotisation'
}

function couleurOperateur(operateur: string): string {
  switch (operateur) {
    case 'Airtel': return '#E30613'
    case 'Moov':   return '#005BAA'
    default:       return T.textSec
  }
}
function enE164(local9: string): string { return `+241${local9.slice(1)}` }

// ── Icônes ───────────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
const IconCheckCircle = ({ color = T.success, size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
)
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
const IconPerson = ({ color = T.success }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
const IconInfo = ({ color = T.accent }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const IconError = ({ color = T.error }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
)
const IconPersonAdd = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
)
const IconLink = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
)
const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
)
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
)
const IconGroup = () => (
  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
)

// ── Éléments partagés ────────────────────────────────────────────────────────
function BulleOperateur({ operateur }: { operateur: string }) {
  if (!operateur) return null
  const couleur = couleurOperateur(operateur)
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${couleur}1F`, color: couleur }}>{operateur}</span>
  )
}

function BadgeInfo({ couleur, icone, texte, operateur }: {
  couleur: string; icone: React.ReactNode; texte: string; operateur?: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${couleur}14`, border: `1px solid ${couleur}4D` }}>
      {icone}
      <span className="flex-1 text-[13px] font-semibold" style={{ color: couleur }}>{texte}</span>
      {operateur ? <BulleOperateur operateur={operateur} /> : null}
    </div>
  )
}

function BandeauTontinePleine({ max }: { max: number }) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <IconGroup />
      <p className="mt-4 text-lg font-bold" style={{ color: T.textStrong }}>Tontine complète</p>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: T.textSec }}>
        Le nombre maximum de membres ({max}) a été atteint.
      </p>
    </div>
  )
}

const champCls = 'w-full rounded-xl px-3.5 py-3 text-sm outline-none'
const champStyle = (readonly: boolean): React.CSSProperties => ({
  background: readonly ? T.surfaceDeep : T.surfaceEl,
  border: `1px solid ${T.border}`, color: T.textStrong, fontFamily: 'inherit',
})

function TuileMembreAjoute({ membre, operateur }: { membre: Participant; operateur: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 mb-2 px-3.5 py-2.5 rounded-xl"
      style={{ background: T.surfaceEl, border: `1px solid ${T.border}` }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${T.success}1F` }}>
        <span className="text-[13px] font-bold" style={{ color: T.success }}>{membre.initiales}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate" style={{ color: T.textStrong }}>{membre.nomComplet}</span>
          {membre.estCompteLight && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0" style={{ background: `${T.textSec}21`, color: T.textSec }}>Invité</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs" style={{ color: T.textSec }}>{membre.numeroMasque}</span>
          {operateur ? <BulleOperateur operateur={operateur} /> : null}
        </div>
      </div>
      <IconCheckCircle size={18} />
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Manuellement »
// ════════════════════════════════════════════════════════════════════════════
function OngletManuel({ cagnotteId, estPleine, max, onAjoute }: {
  cagnotteId: string; estPleine: boolean; max: number; onAjoute: () => void
}) {
  const [numero, setNumero] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [enRecherche, setEnRecherche] = useState(false)
  const [dansSysteme, setDansSysteme] = useState(false)
  const [rechercheEffectuee, setRechercheEffectuee] = useState(false)
  const [nomReadonly, setNomReadonly] = useState(false)
  const [enCoursAjout, setEnCoursAjout] = useState(false)
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const [operateurDetecte, setOperateurDetecte] = useState('')
  const [ajoutes, setAjoutes] = useState<{ p: Participant; op: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const peutAjouter = !enCoursAjout && !enRecherche &&
    /^0\d{8}$/.test(numero.trim()) && prenom.trim().length > 0 && nom.trim().length > 0

  const rechercherNumero = async (local: string) => {
    if (!/^0\d{8}$/.test(local)) return
    setEnRecherche(true); setErreurAjout(null)
    try {
      const res: LookupResult = await rechercherParticipant(enE164(local))
      setEnRecherche(false); setRechercheEffectuee(true)
      setDansSysteme(res.trouve); setNomReadonly(res.trouve)
      setOperateurDetecte(res.operateur ?? '')
      if (res.trouve) { setPrenom(res.prenom ?? ''); setNom(res.nom ?? '') }
    } catch {
      setEnRecherche(false); setRechercheEffectuee(true)
    }
  }

  const onNumeroChange = (raw: string) => {
    const val = raw.replace(/\D/g, '').slice(0, 9)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setNumero(val); setPrenom(''); setNom('')
    setDansSysteme(false); setRechercheEffectuee(false); setNomReadonly(false)
    setErreurAjout(null); setOperateurDetecte('')
    if (/^0\d{8}$/.test(val.trim())) debounceRef.current = setTimeout(() => rechercherNumero(val), 600)
  }

  const ajouter = async () => {
    if (estPleine) return
    setEnCoursAjout(true); setErreurAjout(null)
    try {
      const membre = await ajouterParticipant(cagnotteId, {
        numero: enE164(numero.trim()), nom: nom.trim(), prenom: prenom.trim(), estCompteLight: !dansSysteme,
      })
      setAjoutes(prev => [{ p: membre, op: operateurDetecte }, ...prev])
      setNumero(''); setPrenom(''); setNom(''); setOperateurDetecte('')
      setDansSysteme(false); setRechercheEffectuee(false); setNomReadonly(false)
      setEnCoursAjout(false)
      onAjoute()
    } catch (e: unknown) {
      setEnCoursAjout(false)
      setErreurAjout(e instanceof Error ? e.message : 'Erreur inattendue. Réessaie.')
    }
  }

  if (estPleine) return <BandeauTontinePleine max={max} />

  return (
    <div className="flex flex-col gap-4">
      {/* Numéro Mobile Money */}
      <div>
        <label className="text-[13px] font-semibold" style={{ color: T.textSec }}>Numéro Mobile Money</label>
        <div className="mt-1.5 flex items-center gap-1 rounded-xl pl-3.5 pr-3" style={{ background: T.surfaceEl, border: `1px solid ${T.border}`, height: '48px' }}>
          <span className="text-lg">🇬🇦</span>
          <span className="ml-1 text-sm font-bold" style={{ color: T.textStrong }}>+241</span>
          <span className="mx-2" style={{ width: '1px', height: '18px', background: T.border }} />
          <input
            type="tel" inputMode="numeric" value={numero}
            onChange={e => onNumeroChange(e.target.value)} placeholder="077 xx xx xx"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] font-medium"
            style={{ color: T.textStrong, fontFamily: 'inherit' }}
          />
          {dansSysteme && <IconCheckCircle size={16} />}
          {enRecherche && <div className="w-3.5 h-3.5 rounded-full animate-spin shrink-0" style={{ border: `1.8px solid ${T.primary}`, borderTopColor: 'transparent' }} />}
        </div>
      </div>

      {/* Badge statut lookup */}
      <AnimatePresence>
        {rechercheEffectuee && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {dansSysteme ? (
              <BadgeInfo couleur={T.success} icone={<IconPerson color={T.success} />} texte="Compte Tonji trouvé — coordonnées pré-remplies" operateur={operateurDetecte} />
            ) : (
              <BadgeInfo couleur={T.accent} icone={<IconInfo color={T.accent} />} texte="Numéro non enregistré — saisis les coordonnées" operateur={operateurDetecte} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prénom + Nom */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[13px] font-semibold" style={{ color: T.textSec }}>Prénom</label>
          <div className="relative mt-1.5">
            <input type="text" value={prenom} readOnly={nomReadonly} onChange={e => setPrenom(e.target.value)} placeholder="jean" className={champCls} style={{ ...champStyle(nomReadonly), paddingRight: nomReadonly ? '34px' : undefined }} />
            {nomReadonly && <span className="absolute right-3 top-1/2 -translate-y-1/2"><IconLock /></span>}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[13px] font-semibold" style={{ color: T.textSec }}>Nom</label>
          <div className="relative mt-1.5">
            <input type="text" value={nom} readOnly={nomReadonly} onChange={e => setNom(e.target.value)} placeholder="koumba" className={champCls} style={{ ...champStyle(nomReadonly), paddingRight: nomReadonly ? '34px' : undefined }} />
            {nomReadonly && <span className="absolute right-3 top-1/2 -translate-y-1/2"><IconLock /></span>}
          </div>
        </div>
      </div>

      {/* Erreur */}
      {erreurAjout && <BadgeInfo couleur={T.error} icone={<IconError color={T.error} />} texte={erreurAjout} />}

      {/* Bouton Ajouter */}
      <Button variant="primary" size="lg" className="w-full mt-1" loading={enCoursAjout} disabled={!peutAjouter} onClick={ajouter}>
        {!enCoursAjout && <IconPersonAdd />}
        {enCoursAjout ? 'Ajout en cours…' : 'Ajouter ce membre'}
      </Button>

      {/* Liste session */}
      {ajoutes.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[13px] font-bold tracking-wide" style={{ color: T.textSec }}>Ajoutés dans cette session</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${T.primary}1A`, color: T.primary }}>{ajoutes.length}</span>
          </div>
          {ajoutes.map(({ p, op }) => <TuileMembreAjoute key={p.id} membre={p} operateur={op} />)}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Via un lien »
// ════════════════════════════════════════════════════════════════════════════
function OngletLien({ cagnotteId, titre, type, estPleine, max }: {
  cagnotteId: string; titre: string; type?: 'tontine' | 'cotisation'; estPleine: boolean; max: number
}) {
  const [copied, setCopied] = useState(false)
  const lien = urlRejoindre(cagnotteId)
  const motType = type === 'tontine' ? 'tontine' : 'cagnotte'

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* ignore */ }
  }
  const partager = async () => {
    const texte = `Rejoins la collecte « ${titre} » sur Tonji !\nTélécharge l'app et entre le lien : ${lien}`
    if (navigator.share) { try { await navigator.share({ title: `Invitation Tonji — ${titre}`, text: texte }) } catch { /* annulé */ } }
    else copier()
  }

  if (estPleine) return <BandeauTontinePleine max={max} />

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5" style={{ background: T.surfaceEl, border: `1px solid ${T.border}99` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${T.primary}1A` }}><IconLink /></div>
          <span className="flex-1 text-[15px] font-bold" style={{ color: T.textStrong }}>Lien d'inscription</span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed" style={{ color: T.textSec }}>
          Partagez ce lien à vos membres. Chacun clique, saisit ses informations et rejoint la {motType} automatiquement.
        </p>
        <div className="mt-4 px-3.5 py-3 rounded-lg truncate" style={{ background: T.surface, border: `1px solid ${T.border}CC` }}>
          <span className="text-[13px]" style={{ color: T.textSec }}>{lien}</span>
        </div>
      </div>

      <Button variant="outline" size="lg" className="w-full" onClick={copier} style={copied ? { borderColor: T.success, color: T.success, background: `${T.success}14` } : undefined}>
        <IconCopy />
        {copied ? 'Lien copié dans le presse-papiers.' : 'Copier le lien'}
      </Button>

      <Button variant="primary" size="lg" className="w-full" onClick={partager}>
        <IconShare /> Partager
      </Button>

      <div className="mt-2 p-3.5 rounded-xl" style={{ background: `${T.accent}12` }}>
        <p className="text-xs leading-relaxed" style={{ color: T.textTert }}>
          Le lien d'inscription par formulaire web sera disponible dans une prochaine mise à jour.
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════════════════════════════════════════
export default function AjoutParticipantsPage() {
  const isMobile = useMobile()

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const args: AjoutArgs = location.state ?? { titre: 'Cagnotte', nombreMax: 0, nombreInscrits: 0 }

  const [onglet, setOnglet] = useState<'manuel' | 'lien'>('manuel')
  const [ajoutesEnSession, setAjoutesEnSession] = useState(0)

  const estTontinePleine =
    args.type === 'tontine' && args.nombreMax > 0 &&
    (args.nombreInscrits + 1) + ajoutesEnSession >= args.nombreMax

  if (isMobile) return <MobileAjoutParticipants />

  return (
    <div className="max-w-lg mx-auto">
      {/* En-tête */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
        style={{ color: T.textTert, background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.color = T.textStrong)}
        onMouseLeave={e => (e.currentTarget.style.color = T.textTert)}
      >
        <IconArrowLeft /> Retour
      </button>
      <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: T.textStrong }}>Ajouter des membres</h1>
      <p className="mt-1 text-sm" style={{ color: T.textSec }}>{args.titre}</p>

      {/* Onglets */}
      <div className="flex mt-5">
        {(['manuel', 'lien'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setOnglet(tab)}
            className="flex-1 h-11 text-[13px] font-bold transition-colors"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              color: onglet === tab ? T.primary : T.textSec,
              borderBottom: `2.5px solid ${onglet === tab ? T.primary : T.border}`,
            }}
          >
            {tab === 'manuel' ? 'Manuellement' : 'Via un lien'}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <Card elevated className="mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={onglet}
            initial={{ opacity: 0, x: onglet === 'manuel' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {onglet === 'manuel' ? (
              <OngletManuel cagnotteId={id!} estPleine={estTontinePleine} max={args.nombreMax} onAjoute={() => setAjoutesEnSession(n => n + 1)} />
            ) : (
              <OngletLien cagnotteId={id!} titre={args.titre} type={args.type} estPleine={estTontinePleine} max={args.nombreMax} />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  )
}
