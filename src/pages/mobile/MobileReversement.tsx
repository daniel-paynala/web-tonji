import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { reverser, type Participant } from '@/lib/cagnottesApi'
import { fermerCagnotte } from '@/lib/reversementApi'

// ─────────────────────────────────────────────────────────────────────────────
// Écran de reversement Mobile Money — miroir de reversement_screen.dart.
// Le gérant envoie tout ou partie du solde à un bénéficiaire (membre sélectionné
// ou numéro saisi manuellement). Peut être appelé en mode « fermeture »
// (reversement intégral + clôture de la cagnotte).
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

  // ── État local ──────────────────────────────────────────────────────────────
  const [montant, setMontant] = useState('')
  // Numéro saisi manuellement (ignoré si un membre est sélectionné).
  const [numero, setNumero] = useState('')
  // Participant sélectionné via les chips — prioritaire sur la saisie manuelle.
  const [selected, setSelected] = useState<Participant | null>(null)
  const [phase, setPhase] = useState<Phase>('formulaire')
  const [erreur, setErreur] = useState('')

  // Fermeture : pré-remplir le montant total et le verrouiller (cf. initState Flutter).
  useEffect(() => {
    if (fermerApres) setMontant(String(args.montantDisponible))
  }, [fermerApres, args.montantDisponible])

  // Nom affiché à l'écran de succès.
  const nomBeneficiaire = selected
    ? `${selected.prenom} ${selected.nom}`.trim()
    : `+241 ${numero.trim()}`

  /// Sélectionne un membre comme bénéficiaire et vide la saisie manuelle.
  const selectionnerMembre = (p: Participant) => {
    setSelected(p)
    setNumero('')
    setErreur('')
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

  /// Valide le formulaire puis appelle l'API de reversement (et fermer si mode fermeture).
  const soumettre = async () => {
    // Validation numéro (uniquement si pas de membre sélectionné).
    if (!selected) {
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

    setErreur('')
    setPhase('envoi')
    try {
      // Envoie soit l'ID du membre, soit le numéro saisi manuellement (comme Flutter).
      await reverser(id!, n, {
        participantId: selected?.id,
        numeroBeneficiaire: selected ? undefined : numero.trim(),
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
          Reversement effectué
        </p>
        <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', marginBottom: '32px' }}>
          Le montant a été envoyé à {nomBeneficiaire}.
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

          {/* Titre + sous-titre */}
          <p style={{ fontSize: '26px', fontWeight: 800, color: T.textStrong, marginBottom: '4px' }}>Reversement</p>
          <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '20px' }}>
            Envoyez une partie de la cagnotte sur un numéro Mobile Money.
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

          {/* ── Bénéficiaire ──────────────────────────────────────────────── */}

          {selected ? (
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
                  placeholder="0x xx xx xx xx"
                  style={{ flex: 1, minWidth: 0, background: T.surfaceEl, borderRadius: '16px', border: `1.5px solid ${T.border}`, padding: '0 16px', height: '56px', outline: 'none', fontSize: '16px', fontWeight: 500, color: T.textStrong, fontFamily: 'inherit' }}
                />
              </div>
            </div>
          )}

          {/* Liste des membres (chips horizontaux) si la cagnotte en a */}
          {participants.length > 0 && (
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
            {fermerApres ? 'Montant total à reverser (FCFA)' : 'Montant à reverser (FCFA)'}
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
              Le solde intégral sera reversé avant fermeture.
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

          {/* Bouton confirmer */}
          <button
            onClick={soumettre}
            disabled={enEnvoi}
            style={{
              width: '100%', height: '54px', borderRadius: '16px', border: 'none',
              background: enEnvoi ? T.surfaceDeep : T.primary,
              color: enEnvoi ? T.textTert : T.surfaceEl,
              fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
              cursor: enEnvoi ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            {enEnvoi ? (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2.4px solid rgba(255,255,255,0.4)', borderTopColor: T.surfaceEl, animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <><IconSend /> Confirmer le reversement</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
