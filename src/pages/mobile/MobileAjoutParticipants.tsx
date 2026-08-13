import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import {
  ajouterParticipant,
  rechercherParticipant,
  type LookupResult,
  type Participant,
} from '@/lib/cagnottesApi'

// ════════════════════════════════════════════════════════════════════════════
// MobileAjoutParticipants — réplique fidèle de add_membres_screen.dart (Flutter)
// Deux onglets : « Manuellement » (lookup numéro → ajout) et « Via un lien »
// (copie / partage du lien d'inscription). Bandeau « Tontine complète » quand
// la capacité maximale est atteinte.
// ════════════════════════════════════════════════════════════════════════════

// ── Icônes (équivalents inline des Material Icons utilisés côté Flutter) ───────
const IconBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
)
const IconCheckCircle = ({ color = T.success, size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
)
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
)
const IconPerson = ({ color = T.success }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
)
const IconInfo = ({ color = T.accent }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
)
const IconError = ({ color = T.error }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
)
const IconPersonAdd = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
)
const IconLink = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
)
const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
)
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
)
const IconGroup = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)

// ── Arguments passés via location.state à l'ouverture de l'écran ──────────────
interface AjoutArgs {
  titre: string
  nombreMax: number          // nombreParticipantsMax (0 = illimité / cagnotte ouverte)
  nombreInscrits: number     // nombreInscritsInitial au moment de l'ouverture
  type?: 'tontine' | 'cotisation'
}

// ── Couleur de marque d'un opérateur Mobile Money gabonais ────────────────────
// Valeurs hex = couleurs officielles externes des opérateurs, non modifiables.
function couleurOperateur(operateur: string): string {
  switch (operateur) {
    case 'Airtel': return '#E30613' // Rouge Airtel — couleur marque externe
    case 'Moov':   return '#005BAA' // Bleu Moov — couleur marque externe
    default:       return T.textSec // opérateur inconnu — couleur neutre
  }
}

// Format E164 attendu par le backend (ChampTelephoneGabon.enE164).
function enE164(local9: string): string {
  return `+241${local9.slice(1)}`
}

// ── Bulle opérateur (badge texte coloré, fallback du logo distant) ────────────
function BulleOperateur({ operateur }: { operateur: string }) {
  if (!operateur) return null
  const couleur = couleurOperateur(operateur)
  return (
    <span style={{
      padding: '2px 6px', borderRadius: '5px',
      background: `${couleur}1F`, color: couleur,
      fontSize: '10px', fontWeight: 700,
    }}>
      {operateur}
    </span>
  )
}

// ── Badge d'information coloré (statut lookup / erreur) ────────────────────────
function BadgeInfo({ couleur, icone, texte, operateur }: {
  couleur: string; icone: React.ReactNode; texte: string; operateur?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderRadius: '10px',
      background: `${couleur}14`, border: `1px solid ${couleur}4D`,
    }}>
      {icone}
      <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: couleur }}>{texte}</span>
      {operateur ? <BulleOperateur operateur={operateur} /> : null}
    </div>
  )
}

// ── Bandeau plein écran « Tontine complète » ──────────────────────────────────
function BandeauTontinePleine({ max }: { max: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <IconGroup />
        <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, marginTop: '16px' }}>
          Tontine complète
        </p>
        <p style={{ fontSize: '13px', color: T.textSec, lineHeight: 1.5, marginTop: '8px' }}>
          Le nombre maximum de membres ({max}) a été atteint.
        </p>
      </div>
    </div>
  )
}

// ── Libellé de champ de formulaire ────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '13px', fontWeight: 600, color: T.textSec }}>{children}</span>
  )
}

// Style commun des champs texte (réplique de _inputDecoration côté Flutter).
const champBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: T.surfaceEl, borderRadius: '12px',
  border: `1px solid ${T.border}`,
  padding: '14px', fontSize: '14px', fontFamily: 'inherit',
  color: T.textStrong, outline: 'none',
}

// ── Tuile d'un membre ajouté dans la session courante ─────────────────────────
function TuileMembreAjoute({ membre, operateur }: { membre: Participant; operateur: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '8px', padding: '10px 14px',
        background: T.surfaceEl, borderRadius: '12px',
        border: `1px solid ${T.border}`,
      }}
    >
      {/* Avatar initiales */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: `${T.success}1F`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: T.success }}>{membre.initiales}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '14px', fontWeight: 600, color: T.textStrong,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {membre.nomComplet}
          </span>
          {membre.estCompteLight && (
            <span style={{
              padding: '2px 6px', borderRadius: '6px', flexShrink: 0,
              background: `${T.textSec}21`, color: T.textSec,
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px',
            }}>
              Invité
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <span style={{ fontSize: '12px', color: T.textSec }}>{membre.numeroMasque}</span>
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
  const [numero, setNumero] = useState('')      // numéro local 0XXXXXXXX en saisie
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [enRecherche, setEnRecherche] = useState(false)   // spinner lookup
  const [dansSysteme, setDansSysteme] = useState(false)   // compte Tonji trouvé
  const [rechercheEffectuee, setRechercheEffectuee] = useState(false)
  const [nomReadonly, setNomReadonly] = useState(false)   // champs verrouillés (pré-remplis)
  const [enCoursAjout, setEnCoursAjout] = useState(false)
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const [operateurDetecte, setOperateurDetecte] = useState('')
  // Membres ajoutés dans cette session : (participant, opérateur). Dernier en tête.
  const [ajoutes, setAjoutes] = useState<{ p: Participant; op: string }[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Nettoyage du timer de debounce au démontage.
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  // Conditions d'activation du bouton « Ajouter » (réplique de _peutAjouter).
  const peutAjouter =
    !enCoursAjout && !enRecherche &&
    /^0\d{8}$/.test(numero.trim()) &&
    prenom.trim().length > 0 &&
    nom.trim().length > 0

  // Lookup du numéro via le repository — met à jour les champs selon le résultat.
  const rechercherNumero = async (local: string) => {
    if (!/^0\d{8}$/.test(local)) return
    setEnRecherche(true)
    setErreurAjout(null)
    try {
      const res: LookupResult = await rechercherParticipant(enE164(local))
      setEnRecherche(false)
      setRechercheEffectuee(true)
      setDansSysteme(res.trouve)
      setNomReadonly(res.trouve)
      setOperateurDetecte(res.operateur ?? '')
      if (res.trouve) {
        setPrenom(res.prenom ?? '')
        setNom(res.nom ?? '')
      }
    } catch {
      setEnRecherche(false)
      setRechercheEffectuee(true)
    }
  }

  // Appelée à chaque frappe dans le champ numéro — réinitialise puis lance le debounce.
  const onNumeroChange = (raw: string) => {
    const val = raw.replace(/\D/g, '').slice(0, 9) // chiffres uniquement, 9 max
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setNumero(val)
    setPrenom('')
    setNom('')
    setDansSysteme(false)
    setRechercheEffectuee(false)
    setNomReadonly(false)
    setErreurAjout(null)
    setOperateurDetecte('')
    if (/^0\d{8}$/.test(val.trim())) {
      debounceRef.current = setTimeout(() => rechercherNumero(val), 600)
    }
  }

  // Soumet l'ajout du membre via le repository et réinitialise le formulaire.
  const ajouter = async () => {
    if (estPleine) return // garde-fou côté client
    setEnCoursAjout(true)
    setErreurAjout(null)
    try {
      const membre = await ajouterParticipant(cagnotteId, {
        numero: enE164(numero.trim()),
        nom: nom.trim(),
        prenom: prenom.trim(),
        estCompteLight: !dansSysteme,
      })
      const op = operateurDetecte
      // Réinitialise le formulaire et insère le nouveau membre en tête de liste.
      setAjoutes(prev => [{ p: membre, op }, ...prev])
      setNumero('')
      setPrenom('')
      setNom('')
      setOperateurDetecte('')
      setDansSysteme(false)
      setRechercheEffectuee(false)
      setNomReadonly(false)
      setEnCoursAjout(false)
      onAjoute()
    } catch (e: unknown) {
      setEnCoursAjout(false)
      setErreurAjout(e instanceof Error ? e.message : 'Erreur inattendue. Réessaie.')
    }
  }

  // Si la tontine est pleine → on remplace tout le formulaire par le bandeau.
  if (estPleine) return <BandeauTontinePleine max={max} />

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      {/* ── Numéro Mobile Money ─────────────────────────────────────────── */}
      <Label>Numéro Mobile Money</Label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px',
        background: T.surfaceEl, borderRadius: '12px',
        border: `1px solid ${T.border}`, padding: '0 12px 0 14px', height: '52px',
      }}>
        {/* Préfixe pays */}
        <span style={{ fontSize: '18px' }}>🇬🇦</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, marginLeft: '4px' }}>+241</span>
        <span style={{ width: '1px', height: '18px', background: T.border, margin: '0 8px 0 6px' }} />
        <input
          type="tel"
          inputMode="numeric"
          value={numero}
          onChange={e => onNumeroChange(e.target.value)}
          placeholder="077 xx xx xx"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: '15px', fontWeight: 500, color: T.textStrong, fontFamily: 'inherit',
            minWidth: 0,
          }}
        />
        {/* Suffixe : check si trouvé, spinner si recherche en cours */}
        {dansSysteme && <IconCheckCircle size={16} />}
        {enRecherche && (
          <div style={{
            width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
            border: `1.8px solid ${T.primary}`, borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }} />
        )}
      </div>

      {/* ── Badge statut lookup ──────────────────────────────────────────── */}
      <AnimatePresence>
        {rechercheEffectuee && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '10px', overflow: 'hidden' }}
          >
            {dansSysteme ? (
              <BadgeInfo
                couleur={T.success}
                icone={<IconPerson color={T.success} />}
                texte="Compte Tonji trouvé — coordonnées pré-remplies"
                operateur={operateurDetecte}
              />
            ) : (
              <BadgeInfo
                couleur={T.accent}
                icone={<IconInfo color={T.accent} />}
                texte="Numéro non enregistré — saisis les coordonnées"
                operateur={operateurDetecte}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prénom + Nom — toujours visibles ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Label>Prénom</Label>
          <div style={{ position: 'relative', marginTop: '6px' }}>
            <input
              type="text"
              value={prenom}
              readOnly={nomReadonly}
              onChange={e => setPrenom(e.target.value)}
              placeholder="jean"
              style={{ ...champBase, paddingRight: nomReadonly ? '34px' : '14px' }}
            />
            {nomReadonly && (
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}><IconLock /></span>
            )}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Label>Nom</Label>
          <div style={{ position: 'relative', marginTop: '6px' }}>
            <input
              type="text"
              value={nom}
              readOnly={nomReadonly}
              onChange={e => setNom(e.target.value)}
              placeholder="koumba"
              style={{ ...champBase, paddingRight: nomReadonly ? '34px' : '14px' }}
            />
            {nomReadonly && (
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}><IconLock /></span>
            )}
          </div>
        </div>
      </div>

      {/* ── Erreur ───────────────────────────────────────────────────────── */}
      {erreurAjout && (
        <div style={{ marginTop: '10px' }}>
          <BadgeInfo couleur={T.error} icone={<IconError color={T.error} />} texte={erreurAjout} />
        </div>
      )}

      {/* ── Bouton Ajouter ───────────────────────────────────────────────── */}
      <button
        onClick={peutAjouter ? ajouter : undefined}
        disabled={!peutAjouter}
        style={{
          width: '100%', height: '52px', marginTop: '20px',
          borderRadius: '14px', border: 'none',
          background: peutAjouter ? T.primary : `${T.primary}59`,
          color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
          cursor: peutAjouter ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.15s',
        }}
      >
        {enCoursAjout ? (
          <>
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%',
              border: `2px solid rgba(246,247,244,0.4)`, borderTopColor: T.surface,
              animation: 'spin 0.8s linear infinite',
            }} />
            Ajout en cours…
          </>
        ) : (
          <><IconPersonAdd /> Ajouter ce membre</>
        )}
      </button>

      {/* ── Liste session ────────────────────────────────────────────────── */}
      {ajoutes.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: T.textSec, letterSpacing: '0.5px' }}>
              Ajoutés dans cette session
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: '20px',
              background: `${T.primary}1A`, color: T.primary,
              fontSize: '12px', fontWeight: 700,
            }}>
              {ajoutes.length}
            </span>
          </div>
          {ajoutes.map(({ p, op }) => (
            <TuileMembreAjoute key={p.id} membre={p} operateur={op} />
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Onglet « Via un lien »
// ════════════════════════════════════════════════════════════════════════════
function OngletLien({ cagnotteId, titre, type, estPleine, max }: {
  cagnotteId: string; titre: string; type?: 'tontine' | 'cotisation'
  estPleine: boolean; max: number
}) {
  const [copied, setCopied] = useState(false)
  // URL d'inscription — le domaine sera activé quand le deep link sera configuré.
  const lien = `https://app.tonda.ga/${cagnotteId}`
  const motType = type === 'tontine' ? 'tontine' : 'cagnotte'

  // Copie le lien dans le presse-papiers et affiche un retour visuel.
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* presse-papiers indisponible */ }
  }

  // Partage natif (Web Share API) si disponible, sinon copie.
  const partager = async () => {
    const texte = `Rejoins la collecte « ${titre} » sur Tonji !\nTélécharge l'app et entre le lien : ${lien}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invitation Tonji — ${titre}`, text: texte })
      } catch { /* partage annulé */ }
    } else {
      copier()
    }
  }

  if (estPleine) return <BandeauTontinePleine max={max} />

  return (
    <div style={{ padding: '28px 20px 32px' }}>
      {/* Carte « Lien d'inscription » */}
      <div style={{
        padding: '20px', borderRadius: '16px',
        background: T.surfaceEl, border: `1px solid ${T.border}99`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: `${T.primary}1A`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconLink />
          </div>
          <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: T.textStrong }}>
            Lien d'inscription
          </span>
        </div>
        <p style={{ fontSize: '13px', color: T.textSec, lineHeight: 1.5, marginTop: '12px' }}>
          Partagez ce lien à vos membres. Chacun clique, saisit ses informations et rejoint la {motType} automatiquement.
        </p>
        {/* Lien affiché dans la police de l'app (monospace retiré, miroir Flutter). */}
        <div style={{
          marginTop: '16px', padding: '12px 14px', borderRadius: '10px',
          background: T.surface, border: `1px solid ${T.border}CC`,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '13px', color: T.textSec }}>{lien}</span>
        </div>
      </div>

      {/* Bouton « Copier le lien » */}
      <button
        onClick={copier}
        style={{
          width: '100%', height: '52px', marginTop: '16px',
          borderRadius: '14px',
          border: `1px solid ${copied ? T.success : T.primary}`,
          background: copied ? `${T.success}14` : 'none',
          color: copied ? T.success : T.primary,
          fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.2s',
        }}
      >
        <IconCopy />
        {copied ? 'Lien copié dans le presse-papiers.' : 'Copier le lien'}
      </button>

      {/* Bouton « Partager » */}
      <button
        onClick={partager}
        style={{
          width: '100%', height: '52px', marginTop: '12px',
          borderRadius: '14px', border: 'none',
          background: T.primary, color: T.surface,
          fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        <IconShare />
        Partager
      </button>

      {/* Note bas de page */}
      <div style={{
        marginTop: '24px', padding: '14px', borderRadius: '12px',
        background: `${T.accent}12`,
      }}>
        <p style={{ fontSize: '12px', color: T.textTert, lineHeight: 1.5 }}>
          Le lien d'inscription par formulaire web sera disponible dans une prochaine mise à jour.
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Composant principal — en-tête + onglets (TabBar Flutter)
// ════════════════════════════════════════════════════════════════════════════
export default function MobileAjoutParticipants() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const args: AjoutArgs = location.state ?? { titre: 'Cagnotte', nombreMax: 0, nombreInscrits: 0 }

  const [onglet, setOnglet] = useState<'manuel' | 'lien'>('manuel')
  // Membres ajoutés depuis l'ouverture (partagé pour le calcul de capacité).
  const [ajoutesEnSession, setAjoutesEnSession] = useState(0)

  // Tontine pleine : (nombreInscritsInitial + 1) + ajoutésEnSession >= max.
  // Le +1 correspond au créateur, membre implicite non compté dans nombreInscrits.
  const estTontinePleine =
    args.type === 'tontine' &&
    args.nombreMax > 0 &&
    (args.nombreInscrits + 1) + ajoutesEnSession >= args.nombreMax

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: T.surface, minHeight: '100%' }}>
        {/* ── En-tête ──────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: T.textStrong, display: 'flex' }}
            >
              <IconBack />
            </button>
            <div style={{ paddingTop: '4px' }}>
              <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, lineHeight: 1.1 }}>
                Ajouter des membres
              </p>
              <p style={{ fontSize: '12px', fontWeight: 500, color: T.textSec, marginTop: '2px' }}>
                {args.titre}
              </p>
            </div>
          </div>

          {/* ── TabBar ─────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', marginTop: '12px' }}>
            {(['manuel', 'lien'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setOnglet(tab)}
                style={{
                  flex: 1, height: '44px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                  color: onglet === tab ? T.primary : T.textSec,
                  borderBottom: `2.5px solid ${onglet === tab ? T.primary : T.border}`,
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'manuel' ? 'Manuellement' : 'Via un lien'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu de l'onglet ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={onglet}
            initial={{ opacity: 0, x: onglet === 'manuel' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {onglet === 'manuel' ? (
              <OngletManuel
                cagnotteId={id!}
                estPleine={estTontinePleine}
                max={args.nombreMax}
                onAjoute={() => setAjoutesEnSession(n => n + 1)}
              />
            ) : (
              <OngletLien
                cagnotteId={id!}
                titre={args.titre}
                type={args.type}
                estPleine={estTontinePleine}
                max={args.nombreMax}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
