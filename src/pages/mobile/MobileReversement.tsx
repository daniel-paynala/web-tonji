import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { reverser, type Participant } from '@/lib/cagnottesApi'
import { fermerCagnotte } from '@/lib/reversementApi'
import { useVerificationBeneficiaire } from '@/hooks/useVerificationBeneficiaire'
import { VerdictNumeroBeneficiaire } from '@/components/ui/VerdictNumeroBeneficiaire'
import { useSortiesAutorisees } from '@/lib/sortiesApi'
import { numeroFormate, resoudreMarchand, type Marchand } from '@/lib/marchandsCarnetApi'

// ─────────────────────────────────────────────────────────────────────────────
// Écran de sortie d'argent — miroir de reversement_screen.dart.
//
// Le service est SCINDÉ : « Transférer » envoie à une personne, « Payer »
// règle un commerce. Les deux mènent ici, et c'est `versMarchand` qui les
// différencie — le choix est fait sur la page détail, pas au milieu du
// formulaire. Il n'y a donc aucun sélecteur de destination dans la page.
//
// Peut aussi être appelé en mode « fermeture » (transfert intégral + clôture).
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Formatage des montants identique au _formatMontant Flutter : séparateur
/// d'espace tous les 3 chiffres + suffixe FCFA.
function formatMontant(montant: number): string {
  const s = Math.trunc(montant).toString()
  let b = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) b += ' '
    b += s[i]
  }
  return `${b} FCFA`
}

/// Initiales d'un participant (prénom + nom), en majuscules.
function initiales(p: Participant): string {
  return `${p.prenom[0] ?? ''}${p.nom[0] ?? ''}`.toUpperCase()
}

/// Validateur par défaut du champ téléphone — miroir de
/// ChampTelephoneGabon.validateurParDefaut : 9 chiffres commençant par 0.
function validerNumero(v: string): string | null {
  const n = v.trim()
  if (n.length === 0) return 'Numéro requis'
  if (!/^0\d{8}$/.test(n)) return 'Format : 0 suivi de 8 chiffres'
  return null
}

// ── Icônes (équivalents Material Icons utilisés côté Flutter) ──────────────────

const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
)
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
    <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
    <circle cx="17" cy="13" r="1" fill={T.primary}/>
  </svg>
)
const IconSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)
const IconPeople = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
)
const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
)
const IconCheck = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
)
const IconStore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v11H4z"/><path d="M9 20v-6h6v6"/></svg>
)
const IconError = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
)

// ── Arguments passés via location.state (= ReversementArgs Flutter) ────────────

export interface ReversementArgs {
  /// Titre de la cagnotte — affiché dans la barre supérieure.
  titre: string
  /// Solde actuel — plafond de validation du montant saisi.
  montantDisponible: number
  /// Membres proposés en sélection rapide (chips scrollables).
  participants?: Participant[]
  /// Si true : reversement intégral + clôture de la cagnotte, puis retour accueil.
  fermerApresReversement?: boolean
  /**
   * Destination voulue à l'ouverture : un commerce plutôt qu'une personne.
   *
   * La page détail a deux boutons distincts — « Transférer » et « Payer » —
   * qui mènent au même écran. C'est ce drapeau qui les différencie : le choix
   * est fait avant d'arriver ici, pas au milieu du formulaire.
   */
  versMarchand?: boolean
}

/// Phases du flux (pas de phase « attente » — l'API retourne de façon synchrone).
type Phase = 'formulaire' | 'envoi' | 'succes'

export default function MobileReversement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const args: ReversementArgs = location.state ?? { titre: 'Cagnotte', montantDisponible: 0 }
  const participants = args.participants ?? []
  const fermerApres = args.fermerApresReversement ?? false
  // Une fermeture reverse le solde sur le numéro de retrait : ce n'est jamais
  // un paiement de commerce, même si l'écran a été ouvert depuis « Payer ».
  const versMarchand = (args.versMarchand ?? false) && !fermerApres

  // ── État local ──────────────────────────────────────────────────────────────
  const [montant, setMontant] = useState('')
  // Numéro saisi manuellement (ignoré si un membre est sélectionné).
  const [numero, setNumero] = useState('')
  // Participant sélectionné via les chips — prioritaire sur la saisie manuelle.
  const [selected, setSelected] = useState<Participant | null>(null)
  const [phase, setPhase] = useState<Phase>('formulaire')
  const [erreur, setErreur] = useState('')

  // ── Destination marchande ───────────────────────────────────────────────────
  // Saisie unique : le client tape le code affiché à la caisse ou le numéro du
  // commerce. On ne devine pas lequel — le serveur cherche les deux pistes.
  const [saisieMarchand, setSaisieMarchand] = useState('')
  const [marchand, setMarchand] = useState<Marchand | null>(null)
  // Plusieurs fiches peuvent répondre : une chaîne encaisse sur un seul numéro
  // pour plusieurs points de vente. Le client désigne alors l'établissement.
  const [candidats, setCandidats] = useState<Marchand[]>([])
  const [resolution, setResolution] = useState(false)
  const [marchandIntrouvable, setMarchandIntrouvable] = useState<string | null>(null)
  // Récapitulatif nommé avant l'envoi — dernier filet.
  const [confirmation, setConfirmation] = useState(false)

  // Droits de sortie, relus à l'arrivée sur l'écran et avant de valider.
  const { sorties, revalider } = useSortiesAutorisees(id)

  // Un numéro refusé par l'opérateur est EFFACÉ, comme dans l'app : laisser
  // neuf chiffres faux à l'écran invite à les corriger un par un, alors que
  // c'est le plus souvent le mauvais numéro qui a été dicté.
  const surRefusNumero = useCallback(() => setNumero(''), [])
  const verif = useVerificationBeneficiaire(numero, selected !== null, surRefusNumero)

  // Fermeture : pré-remplir le montant total et le verrouiller (cf. initState Flutter).
  useEffect(() => {
    if (fermerApres) setMontant(String(args.montantDisponible))
  }, [fermerApres, args.montantDisponible])

  // Nom affiché à l'écran de succès.
  const nomBeneficiaire = versMarchand
    ? (marchand?.nom ?? 'ce commerce')
    : selected
      ? `${selected.prenom} ${selected.nom}`.trim()
      : `+241 ${numero.trim()}`

  /**
   * Vrai quand la vérification interdit d'aller plus loin.
   *
   * Règle de l'app : **tant que la destination n'est pas établie, on n'envoie
   * pas.** Pour un commerce, c'est qu'aucune fiche n'est retenue — son numéro
   * a déjà été vérifié à son enregistrement. Pour une personne, c'est que le
   * compte Airtel Money n'est pas confirmé ; un membre pris dans les chips a
   * son numéro connu du serveur, il n'y a rien à vérifier.
   */
  const envoiInterdit = versMarchand
    ? marchand === null
    : selected !== null
      ? false
      : verif.interdit

  /**
   * Libellé du bouton d'envoi — il nomme le destinataire dès qu'il est connu.
   *
   * Dernier filet avant l'envoi, et le même des deux côtés : on lit
   * « Payer TRAITEUR LE BARACHOIS » ou « Transférer à Daniel » plutôt qu'un
   * verbe seul. Tant que le destinataire n'est pas établi, le libellé reste
   * générique — et le bouton est de toute façon grisé.
   */
  const libelleEnvoi = (() => {
    if (versMarchand) {
      // « Payer X » et non « Payer à X » : en français on paie quelqu'un.
      const nom = marchand?.nom?.trim()
      return nom ? `Payer ${nom}` : 'Payer'
    }
    const prenom = selected?.prenom?.trim() || verif.prenom
    return prenom ? `Transférer à ${prenom}` : 'Transférer'
  })()

  /** Retient une fiche et aligne le champ dessus. */
  const retenirMarchand = (m: Marchand) => {
    setMarchand(m)
    setSaisieMarchand(m.code ?? numeroFormate(m))
    setCandidats([])
    setMarchandIntrouvable(null)
    // Les destinations s'excluent : une enseigne efface le membre et le
    // numéro, sinon on ne saurait plus qui est payé.
    setSelected(null)
    setNumero('')
    setErreur('')
  }

  /** Résout la saisie à la sortie du champ : un code, ou le numéro du commerce. */
  const resoudre = async () => {
    const saisie = saisieMarchand.trim()
    if (saisie === '') return
    // Déjà résolue à l'identique : un aller-retour de focus ne relance rien.
    if (marchand && (marchand.code === saisie || numeroFormate(marchand) === saisie)) return

    setResolution(true)
    setMarchandIntrouvable(null)
    try {
      const trouves = await resoudreMarchand(saisie)
      if (trouves.length === 0) {
        setMarchand(null)
        setCandidats([])
        setMarchandIntrouvable(saisie)
      } else if (trouves.length === 1) {
        retenirMarchand(trouves[0])
      } else {
        setMarchand(null)
        setCandidats(trouves)
      }
    } catch {
      setMarchand(null)
      setCandidats([])
      setMarchandIntrouvable(saisie)
    } finally {
      setResolution(false)
    }
  }

  /// Sélectionne un membre comme bénéficiaire et vide la saisie manuelle.
  const selectionnerMembre = (p: Participant) => {
    setSelected(p)
    setNumero('')
    setErreur('')
    verif.reinitialiser()
  }

  /// Désélectionne le membre et revient à la saisie manuelle.
  const deselectionner = () => setSelected(null)

  /// Quand l'utilisateur tape manuellement, on désélectionne le membre (listener Flutter).
  const onNumeroChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 9)
    setNumero(digits)
    if (selected && digits.length > 0) setSelected(null)
    setErreur('')
  }

  /// Saisie du montant — bloque toute valeur dépassant le solde (MaxMontantFormatter),
  /// sauf en mode fermeture où le champ est en lecture seule.
  const onMontantChange = (v: string) => {
    if (fermerApres) return
    const digits = v.replace(/\D/g, '')
    if (digits === '') { setMontant(''); setErreur(''); return }
    const n = parseInt(digits, 10)
    if (n > args.montantDisponible) return // refus comme le formatter Flutter
    setMontant(digits)
    setErreur('')
  }

  /// Valide le formulaire, puis demande confirmation en nommant le destinataire.
  ///
  /// C'est ici que se prévient l'erreur de saisie, pas dans le libellé du
  /// bouton : deux chiffres intervertis ne donnent pas une erreur, ils donnent
  /// un AUTRE numéro valide, et l'argent part chez quelqu'un d'autre sans
  /// retour possible.
  const demanderConfirmation = async () => {
    if (versMarchand) {
      if (!marchand) { setErreur('Choisissez le commerce à payer.'); return }
    } else if (!selected) {
      const errNum = validerNumero(numero)
      if (errNum) { setErreur(errNum); return }
    }
    // Validation montant.
    const n = parseInt(montant.trim(), 10)
    if (isNaN(n) || n < 100) { setErreur('Montant minimum : 100 FCFA'); return }
    if (n > args.montantDisponible) {
      setErreur(`Solde insuffisant (max : ${formatMontant(args.montantDisponible)})`)
      return
    }

    // Troisième et dernier contrôle du verrou — à l'arrivée sur l'écran, au
    // clic du bouton d'entrée, et ici. Il a pu être posé pendant la saisie.
    const frais = await revalider()
    const permis = versMarchand ? frais.marchand : frais.transfert
    if (!permis) {
      setErreur(versMarchand
        ? "Le paiement d'un commerce est momentanément suspendu sur cette cagnotte."
        : 'Le transfert est momentanément suspendu sur cette cagnotte.')
      return
    }

    setErreur('')
    setConfirmation(true)
  }

  /// Exécute la sortie d'argent après confirmation explicite.
  const soumettre = async () => {
    setConfirmation(false)
    const n = parseInt(montant.trim(), 10)
    setErreur('')
    setPhase('envoi')
    try {
      // Une seule des trois destinations part : l'enseigne, le membre, ou le
      // numéro saisi (voir `reverser`).
      await reverser(id!, n, {
        marchandId: versMarchand ? marchand?.id : undefined,
        participantId: versMarchand ? undefined : selected?.id,
        numeroBeneficiaire: versMarchand || selected ? undefined : numero.trim(),
      })

      // Mode fermeture : on clôture la cagnotte après le reversement intégral.
      if (fermerApres) {
        await fermerCagnotte(id!)
      }

      setPhase('succes')
    } catch (e: unknown) {
      setPhase('formulaire')
      setErreur(e instanceof Error ? e.message : 'Erreur inattendue. Réessaie.')
    }
  }

  const enEnvoi = phase === 'envoi'

  // ── Écran succès ──────────────────────────────────────────────────────────
  if (phase === 'succes') {
    return (
      <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        {/* Pastille verte de confirmation */}
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(26,122,80,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <IconCheck />
        </div>
        <p style={{ fontSize: '22px', fontWeight: 700, color: T.textStrong, textAlign: 'center', marginBottom: '10px' }}>
          {versMarchand ? 'Paiement effectué' : 'Transfert effectué'}
        </p>
        <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', marginBottom: '32px' }}>
          {versMarchand
            ? `Le montant a été réglé à ${nomBeneficiaire}.`
            : `Le montant a été envoyé à ${nomBeneficiaire}.`}
        </p>
        <button
          onClick={() => fermerApres ? navigate('/', { replace: true }) : navigate(`/cagnottes/${id}`, { replace: true })}
          style={{ width: '100%', maxWidth: '320px', height: '52px', borderRadius: '14px', border: 'none', background: T.primary, color: T.surfaceEl, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          {fermerApres ? "Retour à l'accueil" : 'Retour à la cagnotte'}
        </button>
      </div>
    )
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: T.surface, minHeight: '100%' }}>

        {/* Barre supérieure — titre = cagnotte (comme l'AppBar Flutter) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          <button
            onClick={enEnvoi ? undefined : () => navigate(-1)}
            disabled={enEnvoi}
            style={{ background: 'none', border: 'none', cursor: enEnvoi ? 'default' : 'pointer', padding: '4px', color: enEnvoi ? T.textTert : T.textStrong, display: 'flex' }}
          >
            <IconBack />
          </button>
          <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {args.titre}
          </p>
        </div>

        <div style={{ padding: '20px 20px 32px' }}>

          {/* Titre + sous-titre — le service est scindé, l'écran le dit. */}
          <p style={{ fontSize: '26px', fontWeight: 800, color: T.textStrong, marginBottom: '4px' }}>
            {versMarchand ? 'Payer un commerce' : 'Transférer'}
          </p>
          <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '20px' }}>
            {versMarchand
              ? 'Réglez un commerce enregistré avec l\'argent de la cagnotte.'
              : 'Envoyez une partie de la cagnotte sur un numéro Mobile Money.'}
          </p>

          {/* Solde disponible */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px',
            borderRadius: '14px', background: 'rgba(10,104,71,0.07)',
            border: '1px solid rgba(10,104,71,0.20)', marginBottom: '24px',
          }}>
            <IconWallet />
            <div>
              <p style={{ fontSize: '11px', color: T.textTert, fontWeight: 600 }}>Solde disponible</p>
              <p style={{ fontSize: '18px', fontWeight: 800, color: T.primary }}>{formatMontant(args.montantDisponible)}</p>
            </div>
          </div>

          {/* ── Destination ──────────────────────────────────────────────────
              Une enseigne OU une personne, jamais les deux à l'écran : le
              service est scindé en amont, il n'y a pas de sélecteur ici. */}

          {versMarchand ? (
            <ChampMarchand
              saisie={saisieMarchand}
              onSaisie={v => {
                setSaisieMarchand(v)
                // La saisie change → la fiche retenue devient caduque. Garder
                // le nom d'avant sous un code en cours de correction produirait
                // exactement la méprise qu'on veut empêcher.
                if (marchand) setMarchand(null)
                setCandidats([])
                setMarchandIntrouvable(null)
                setErreur('')
              }}
              onBlur={resoudre}
              marchand={marchand}
              candidats={candidats}
              onChoisir={retenirMarchand}
              enCours={resolution}
              introuvable={marchandIntrouvable}
            />
          ) : selected ? (
            /* Carte « membre sélectionné » (= _CarteMembreSelectionne) */
            <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'rgba(232,168,48,0.08)', border: '1px solid rgba(232,168,48,0.40)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(232,168,48,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: T.accent }}>{initiales(selected)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.prenom} {selected.nom}</span>
                  {selected.estCompteLight && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: T.warning, background: 'rgba(196,138,26,0.13)', padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.3px', flexShrink: 0 }}>Invité</span>
                  )}
                </div>
                {/* Numéro de retrait s'il diffère du numéro d'inscription, sinon numéro d'inscription. */}
                <p style={{ fontSize: '12px', color: T.textSec, marginTop: '1px' }}>
                  {(selected.numeroRetraitMasque && selected.numeroRetraitMasque !== selected.numeroMasque)
                    ? selected.numeroRetraitMasque
                    : selected.numeroMasque}
                </p>
                {selected.estCompteLight && (
                  <p style={{ fontSize: '12px', color: T.warning, fontStyle: 'italic', marginTop: '1px' }}>Vérification Mobile Money requise</p>
                )}
                {selected.montantRecu != null && selected.montantRecu > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <IconInfo />
                    <span style={{ fontSize: '12px', color: T.accent, fontWeight: 600 }}>Déjà reçu : {formatMontant(selected.montantRecu)}</span>
                  </div>
                )}
              </div>
              <button onClick={deselectionner} title="Saisir manuellement" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: T.textSec, flexShrink: 0, display: 'flex' }}>
                <IconClose />
              </button>
            </div>
          ) : (
            /* Saisie manuelle — chip 🇬🇦 +241 (= ChampTelephoneGabon, label « Numéro du bénéficiaire ») */
            <div>
              <p style={{ fontSize: '12px', color: T.textSec, fontWeight: 600, marginBottom: '6px' }}>Numéro du bénéficiaire</p>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px' }}>
                {/* Pastille pays Gabon (non éditable pour l'instant) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: T.surfaceEl, borderRadius: '16px', border: `1.2px solid ${T.border}`, padding: '0 12px', height: '56px', flexShrink: 0 }}>
                  <span style={{ fontSize: '22px' }}>🇬🇦</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: T.textStrong }}>+241</span>
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
                  style={{ flex: 1, minWidth: 0, background: T.surfaceEl, borderRadius: '16px', border: `1.5px solid ${T.border}`, padding: '0 16px', height: '56px', outline: 'none', fontSize: '16px', fontWeight: 500, color: T.textStrong, fontFamily: 'inherit' }}
                />
              </div>
              {/* Verdict sous le champ : il commente ce qui vient d'être saisi. */}
              <VerdictNumeroBeneficiaire verdict={verif.verdict} titulaire={verif.titulaire} />
            </div>
          )}

          {/* Liste des membres (chips horizontaux) si la cagnotte en a.
              Masquée pour un paiement de commerce : un membre n'est pas une
              destination possible dans ce service. */}
          {!versMarchand && participants.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', marginBottom: '8px' }}>
                <IconPeople />
                <span style={{ fontSize: '12px', color: T.textTert, fontWeight: 600 }}>Choisir parmi les cotisants</span>
              </div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }}>
                {participants.map(p => {
                  const sel = selected?.id === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectionnerMembre(p)}
                      style={{
                        flexShrink: 0, padding: '8px 12px', borderRadius: '14px', cursor: 'pointer',
                        background: sel ? 'rgba(232,168,48,0.12)' : T.surfaceEl,
                        border: `${sel ? 1.6 : 1}px solid ${sel ? T.accent : 'rgba(212,218,213,0.6)'}`,
                        fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all 0.18s',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: sel ? 'rgba(232,168,48,0.20)' : 'rgba(10,104,71,0.10)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: sel ? T.accent : T.primary }}>{initiales(p)}</span>
                        </div>
                        {/* Pastille ambre pour les comptes light */}
                        {p.estCompteLight && (
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: T.warning, border: `1.5px solid ${T.surface}` }} />
                        )}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: sel ? T.accent : T.textStrong, maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.prenom}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div style={{ height: '20px' }} />

          {/* Montant — verrouillé en mode fermeture (reversement intégral obligatoire) */}
          <p style={{ fontSize: '12px', color: T.textSec, fontWeight: 600, marginBottom: '6px' }}>
            {fermerApres
              ? 'Montant total à transférer (FCFA)'
              : versMarchand ? 'Montant à payer (FCFA)' : 'Montant à transférer (FCFA)'}
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: fermerApres ? T.surfaceDeep : T.surfaceEl, borderRadius: '16px',
            border: `1.5px solid ${erreur ? T.error : T.border}`,
            padding: '16px 18px',
          }}>
            <input
              type="tel"
              inputMode="numeric"
              value={montant}
              readOnly={fermerApres}
              onChange={e => onMontantChange(e.target.value)}
              placeholder="ex : 50 000"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontSize: '24px', fontWeight: 800, color: T.textStrong, fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: '16px', fontWeight: 700, color: T.textSec }}>FCFA</span>
          </div>
          {/* Helper text en mode fermeture */}
          {fermerApres && (
            <p style={{ fontSize: '12px', color: T.textTert, marginTop: '6px' }}>
              Le solde intégral sera transféré avant fermeture.
            </p>
          )}

          {/* Frais du commerce : la PART annoncée, jamais le détail du calcul.
              C'est le taux résolu — négocié pour cette enseigne, ou celui du
              projet — et le client n'a pas à savoir lequel des deux il voit. */}
          {versMarchand && marchand && marchand.frais > 0 && (
            <p style={{ fontSize: '12px', color: T.textTert, marginTop: '6px' }}>
              * Des frais de {String(marchand.frais).replace('.', ',')} % seront appliqués au moment du paiement.
            </p>
          )}

          {/* Bandeau d'erreur */}
          {erreur && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(217,79,61,0.08)', border: '1px solid rgba(217,79,61,0.30)', marginTop: '16px' }}>
              <IconError />
              <p style={{ fontSize: '12px', color: T.error }}>{erreur}</p>
            </div>
          )}

          <div style={{ height: '28px' }} />

          {/* Bouton d'envoi — il NOMME le destinataire dès qu'il est connu.
              Grisé tant que la destination n'est pas établie : un compte
              Airtel Money non confirmé ou aucune enseigne retenue. */}
          <button
            onClick={() => { void demanderConfirmation() }}
            disabled={enEnvoi || envoiInterdit}
            style={{
              width: '100%', height: '54px', borderRadius: '16px', border: 'none',
              background: (enEnvoi || envoiInterdit) ? T.surfaceDeep : T.primary,
              color: (enEnvoi || envoiInterdit) ? T.textTert : T.surfaceEl,
              fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
              cursor: (enEnvoi || envoiInterdit) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            {enEnvoi ? (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2.4px solid rgba(255,255,255,0.4)', borderTopColor: T.surfaceEl, animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>{versMarchand ? <IconStore /> : <IconSend />} {libelleEnvoi}</>
            )}
          </button>

          {/* Dire POURQUOI la sortie est fermée. Un bouton inerte sans
              explication se lit comme une panne, et l'utilisateur rappelle le
              support au lieu de comprendre. */}
          {(versMarchand ? !sorties.marchand : !sorties.transfert) && (
            <p style={{ fontSize: '12px', fontWeight: 600, color: T.warning, marginTop: '10px', lineHeight: 1.35 }}>
              {versMarchand
                ? "Le paiement d'un commerce est momentanément suspendu sur cette cagnotte."
                : 'Le transfert est momentanément suspendu sur cette cagnotte.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Récapitulatif nommé, avant tout envoi d'argent ──────────────────
          Le destinataire est nommé en toutes lettres, avec le numéro qui
          encaissera, avant que quoi que ce soit parte. */}
      {confirmation && (
        <div
          onClick={() => setConfirmation(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,20,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 60 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: T.surface, borderRadius: '20px', padding: '22px', width: '100%', maxWidth: '360px' }}
          >
            <p style={{ fontSize: '17px', fontWeight: 800, color: T.textStrong, marginBottom: '12px' }}>
              {versMarchand ? 'Payer ce commerce ?' : 'Envoyer cet argent ?'}
            </p>
            <div style={{ fontSize: '14px', color: T.textSec, lineHeight: 1.7, marginBottom: '20px' }}>
              <div>Montant : <strong style={{ color: T.textStrong }}>{formatMontant(parseInt(montant || '0', 10))}</strong></div>
              <div>
                {versMarchand ? 'Commerce : ' : 'Bénéficiaire : '}
                <strong style={{ color: T.textStrong }}>{nomBeneficiaire}</strong>
              </div>
              <div style={{ fontSize: '13px', color: T.textTert }}>
                {versMarchand
                  ? (marchand ? numeroFormate(marchand) : '')
                  : selected
                    ? (selected.numeroRetraitMasque || selected.numeroMasque)
                    : `+241 ${numero.trim()}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmation(false)}
                style={{ flex: 1, height: '46px', borderRadius: '12px', cursor: 'pointer', background: 'transparent', border: `1.5px solid ${T.border}`, color: T.textSec, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit' }}
              >
                Annuler
              </button>
              <button
                onClick={() => { void soumettre() }}
                style={{ flex: 1, height: '46px', borderRadius: '12px', cursor: 'pointer', background: T.primary, border: 'none', color: T.surfaceEl, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit' }}
              >
                {versMarchand ? 'Payer' : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Champ « commerce » ────────────────────────────────────────────────────────

/**
 * Saisie unique : le code affiché à la caisse, ou le numéro du commerce.
 *
 * On ne demande pas au client lequel des deux il tape — le serveur cherche les
 * deux pistes. Quand plusieurs points de vente partagent un numéro, les fiches
 * sont proposées et c'est lui qui désigne : le nom affiché sur le bouton doit
 * être celui qu'il a validé.
 */
function ChampMarchand({
  saisie, onSaisie, onBlur, marchand, candidats, onChoisir, enCours, introuvable,
}: {
  saisie: string
  onSaisie: (v: string) => void
  onBlur: () => void | Promise<void>
  marchand: Marchand | null
  candidats: Marchand[]
  onChoisir: (m: Marchand) => void
  enCours: boolean
  introuvable: string | null
}) {
  return (
    <div>
      <p style={{ fontSize: '12px', color: T.textSec, fontWeight: 600, marginBottom: '6px' }}>
        Code ou numéro du commerce
      </p>
      <input
        value={saisie}
        onChange={e => onSaisie(e.target.value)}
        onBlur={() => { void onBlur() }}
        placeholder="ex : BARACHOIS01"
        autoCapitalize="characters"
        style={{ width: '100%', background: T.surfaceEl, borderRadius: '16px', border: `1.5px solid ${marchand ? T.primary : T.border}`, padding: '0 16px', height: '56px', outline: 'none', fontSize: '16px', fontWeight: 600, color: T.textStrong, fontFamily: 'inherit' }}
      />

      {enCours && (
        <p style={{ fontSize: '12px', color: T.textTert, marginTop: '6px' }}>Recherche du commerce…</p>
      )}

      {/* Fiche retenue : le nom ET le numéro qui encaissera. Le client doit
          pouvoir lire les deux avant de valider. */}
      {marchand && !enCours && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(10,104,71,0.07)', border: '1px solid rgba(10,104,71,0.22)' }}>
          <IconStore />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {marchand.nom}
            </p>
            <p style={{ fontSize: '12px', color: T.textSec }}>
              {numeroFormate(marchand)}{marchand.ville ? ` · ${marchand.ville}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Plusieurs points de vente sur le même numéro : au client de désigner. */}
      {candidats.length > 0 && !enCours && (
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontSize: '12px', color: T.textSec, fontWeight: 600, marginBottom: '6px' }}>
            Plusieurs commerces encaissent sur ce numéro — lequel payez-vous ?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {candidats.map(m => (
              <button
                key={m.id}
                onClick={() => onChoisir(m)}
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', background: T.surfaceEl, border: `1.2px solid ${T.border}`, fontFamily: 'inherit' }}
              >
                <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong }}>{m.nom}</p>
                {m.ville && <p style={{ fontSize: '12px', color: T.textSec }}>{m.ville}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {introuvable && !enCours && (
        <p style={{ fontSize: '12px', color: T.error, marginTop: '6px' }}>
          Aucun commerce ne correspond à « {introuvable} ». Vérifiez le code affiché à la caisse.
        </p>
      )}
    </div>
  )
}
