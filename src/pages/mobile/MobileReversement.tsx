import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { reverser, type Participant } from '@/lib/cagnottesApi'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function initiales(p: Participant) { return (p.prenom[0] ?? '') + (p.nom[0] ?? '') }

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)
const IconPeople = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textTert} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
)
const IconCheck = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
)
const IconError = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
)

// ── Args passés via location.state ────────────────────────────────────────────
export interface ReversementArgs {
  titre: string
  montantDisponible: number
  participants?: Participant[]
}

type Phase = 'formulaire' | 'envoi' | 'succes'

export default function MobileReversement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const args: ReversementArgs = location.state ?? { titre: 'Cagnotte', montantDisponible: 0 }
  const participants = args.participants ?? []

  const [montant, setMontant] = useState('')
  const [numero, setNumero] = useState('')
  const [selected, setSelected] = useState<Participant | null>(null)
  const [phase, setPhase] = useState<Phase>('formulaire')
  const [erreur, setErreur] = useState('')

  const nomBeneficiaire = selected
    ? `${selected.prenom} ${selected.nom}`.trim()
    : numero ? `+241 ${numero}` : ''

  const selectionner = (p: Participant) => {
    setSelected(p)
    setNumero('')
    setErreur('')
  }

  const deselectionner = () => setSelected(null)

  const soumettre = async () => {
    const m = parseInt(montant.replace(/\s/g, ''))
    if (!m || m < 100) { setErreur('Montant minimum : 100 FCFA'); return }
    if (m > args.montantDisponible) { setErreur(`Solde insuffisant (max : ${fmt(args.montantDisponible)})`); return }

    const numBenef = selected ? undefined : numero.trim()
    if (!selected && (!numBenef || numBenef.length < 9)) {
      setErreur('Entrez le numéro du bénéficiaire.')
      return
    }

    setErreur('')
    setPhase('envoi')
    try {
      await reverser(id!, m, {
        participantId: selected?.id,
        numeroBeneficiaire: numBenef ? `+241${numBenef.replace(/^0/, '')}` : undefined,
      })
      setPhase('succes')
    } catch (e: unknown) {
      setPhase('formulaire')
      setErreur(e instanceof Error ? e.message : 'Erreur inattendue. Réessaie.')
    }
  }

  // ── Écran succès ──────────────────────────────────────────────────────────
  if (phase === 'succes') {
    return (
      <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `rgba(107,142,78,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <IconCheck />
        </div>
        <p style={{ fontSize: '22px', fontWeight: 700, color: T.textStrong, textAlign: 'center', marginBottom: '8px' }}>Reversement effectué</p>
        {nomBeneficiaire && (
          <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', marginBottom: '32px' }}>
            Le montant a été envoyé à {nomBeneficiaire}.
          </p>
        )}
        <button
          onClick={() => navigate(`/cagnottes/${id}`, { replace: true })}
          style={{ width: '100%', maxWidth: '320px', height: '52px', borderRadius: '14px', border: 'none', background: T.primary, color: T.surface, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          Retour à la cagnotte
        </button>
      </div>
    )
  }

  const enEnvoi = phase === 'envoi'

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: T.surface, minHeight: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: T.textStrong, display: 'flex' }}>
            <IconBack />
          </button>
          <div>
            <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, lineHeight: 1 }}>Reversement</p>
            <p style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>{args.titre}</p>
          </div>
        </div>

        <div style={{ padding: '20px 20px 40px' }}>

          {/* Solde dispo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px',
            borderRadius: '14px', background: `rgba(15,76,92,0.07)`,
            border: `1px solid rgba(15,76,92,0.18)`, marginBottom: '24px',
          }}>
            <IconWallet />
            <div>
              <p style={{ fontSize: '11px', color: T.textTert, fontWeight: 600 }}>Solde disponible</p>
              <p style={{ fontSize: '18px', fontWeight: 800, color: T.primary }}>{fmt(args.montantDisponible)}</p>
            </div>
          </div>

          {/* Bénéficiaire */}
          <p style={{ fontSize: '13px', fontWeight: 700, color: T.textSec, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Bénéficiaire
          </p>

          {selected ? (
            /* Participant sélectionné */
            <div style={{ padding: '12px 14px', borderRadius: '14px', background: `rgba(201,123,74,0.08)`, border: `1px solid rgba(201,123,74,0.40)`, marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `rgba(201,123,74,0.18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: T.accent }}>{initiales(selected)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong }}>{selected.prenom} {selected.nom}</p>
                  {selected.estCompteLight && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: T.warning, background: `rgba(212,155,63,0.13)`, padding: '2px 6px', borderRadius: '6px' }}>Invité</span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: T.textSec }}>{selected.numeroRetraitMasque ?? selected.numeroMasque}</p>
                {selected.estCompteLight && (
                  <p style={{ fontSize: '11px', color: T.warning, fontStyle: 'italic', marginTop: '2px' }}>Vérification Mobile Money requise</p>
                )}
                {selected.montantRecu != null && selected.montantRecu > 0 && (
                  <p style={{ fontSize: '11px', color: T.accent, fontWeight: 600, marginTop: '4px' }}>Déjà reçu : {fmt(selected.montantRecu)}</p>
                )}
              </div>
              <button onClick={deselectionner} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: T.textSec, flexShrink: 0 }}>
                <IconClose />
              </button>
            </div>
          ) : (
            /* Saisie numéro manuelle */
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: T.surfaceEl, borderRadius: '14px', border: `1.3px solid ${T.border}`, padding: '0 14px', height: '56px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: T.textSec, flexShrink: 0 }}>🇬🇦 +241</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={numero}
                  onChange={e => { setNumero(e.target.value.replace(/\D/g, '')); setErreur('') }}
                  placeholder="07 XX XX XX XX"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '16px', fontWeight: 500, color: T.textStrong, fontFamily: 'inherit' }}
                />
              </div>
            </div>
          )}

          {/* Chips participants */}
          {participants.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <IconPeople />
                <p style={{ fontSize: '12px', color: T.textTert, fontWeight: 600 }}>Choisir parmi les cotisants</p>
              </div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }}>
                {participants.map(p => {
                  const sel = selected?.id === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectionner(p)}
                      style={{
                        flexShrink: 0, padding: '8px 12px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                        background: sel ? `rgba(201,123,74,0.12)` : T.surfaceEl,
                        outline: `${sel ? 1.6 : 1}px solid ${sel ? T.accent : 'rgba(216,207,192,0.6)'}`,
                        fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: sel ? `rgba(201,123,74,0.20)` : `rgba(15,76,92,0.10)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: sel ? T.accent : T.primary }}>{initiales(p)}</span>
                        </div>
                        {p.estCompteLight && (
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: T.warning, border: `1.5px solid ${T.surface}` }} />
                        )}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: sel ? T.accent : T.textStrong }}>{p.prenom}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Montant */}
          <p style={{ fontSize: '13px', fontWeight: 700, color: T.textSec, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Montant à reverser
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: T.surfaceEl, borderRadius: '16px',
            border: `1.5px solid ${erreur ? T.error : T.border}`,
            padding: '16px 18px', marginBottom: '8px',
          }}>
            <input
              type="tel"
              inputMode="numeric"
              value={montant}
              onChange={e => { setMontant(e.target.value.replace(/\D/g, '')); setErreur('') }}
              placeholder="Ex : 50 000"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '24px', fontWeight: 800, color: T.textStrong, fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: '16px', fontWeight: 700, color: T.textSec }}>FCFA</span>
          </div>

          {/* Erreur */}
          {erreur && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: `rgba(160,68,52,0.08)`, border: `1px solid rgba(160,68,52,0.30)`, marginBottom: '16px' }}>
              <IconError />
              <p style={{ fontSize: '13px', color: T.error }}>{erreur}</p>
            </div>
          )}

          <div style={{ height: '12px' }} />

          {/* Bouton */}
          <button
            onClick={soumettre}
            disabled={enEnvoi}
            style={{
              width: '100%', height: '54px', borderRadius: '16px', border: 'none',
              background: enEnvoi ? T.surfaceDeep : T.primary,
              color: enEnvoi ? T.textTert : T.surface,
              fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
              cursor: enEnvoi ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            {enEnvoi ? (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2.4px solid rgba(255,255,255,0.4)`, borderTopColor: T.surface, animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <><IconSend /> Confirmer le reversement</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
