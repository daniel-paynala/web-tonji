import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { ajouterParticipant, rechercherParticipant, type LookupResult } from '@/lib/cagnottesApi'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
)
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textSec} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
)
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
)
const IconLink = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)
const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
)
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
)
const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.warning} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
)

// ── Args passés via location.state ────────────────────────────────────────────
interface AjoutArgs {
  titre: string
  nombreMax: number
  nombreInscrits: number
  type?: 'tontine' | 'cotisation'
}

// ── Utilitaire numéro gabonais ────────────────────────────────────────────────
function normaliserGabon(raw: string): string | null {
  const c = raw.replace(/[\s\-\.\(\)]/g, '')
  let nat = c.startsWith('+241') ? c.slice(4) : c.startsWith('00241') ? c.slice(5) : c
  if (nat.length === 8 && !nat.startsWith('0')) nat = '0' + nat
  return /^0\d{8}$/.test(nat) ? nat : null
}

// ── Onglet "Manuellement" ─────────────────────────────────────────────────────
function OngletManuel({ cagnotteId, nombreMax, nombreInscrits, type, onAjoute }: {
  cagnotteId: string; nombreMax: number; nombreInscrits: number
  type?: 'tontine' | 'cotisation'; onAjoute: () => void
}) {
  const [numero, setNumero] = useState('')
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [cherche, setCherche] = useState(false)
  const [ajout, setAjout] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState<string[]>([])
  // compte light manuel : formulaire nom/prénom
  const [nomManuel, setNomManuel] = useState('')
  const [prenomManuel, setPrenomManuel] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const estTontinePleine = type === 'tontine' && nombreMax > 0 && (nombreInscrits + succes.length) >= nombreMax

  const rechercher = async (val: string) => {
    setNumero(val)
    setLookup(null)
    setErreur('')
    const nat = normaliserGabon(val)
    if (!nat) return
    timerRef.current && clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setCherche(true)
      try {
        const res = await rechercherParticipant(nat)
        setLookup(res)
      } catch {
        setLookup({ trouve: false })
      } finally {
        setCherche(false)
      }
    }, 600)
  }

  const ajouter = async () => {
    const nat = normaliserGabon(numero)
    if (!nat) { setErreur('Numéro invalide'); return }
    if (!lookup?.trouve && (!nomManuel.trim() || !prenomManuel.trim())) {
      setErreur('Entrez le nom et prénom pour ce numéro non trouvé.')
      return
    }
    setAjout(true)
    setErreur('')
    try {
      const e164 = `+241${nat.slice(1)}`
      const isLight = !lookup?.trouve
      await ajouterParticipant(cagnotteId, {
        numero: e164,
        nom: isLight ? nomManuel.trim() : undefined,
        prenom: isLight ? prenomManuel.trim() : undefined,
        estCompteLight: isLight,
      })
      const label = lookup?.trouve ? `${lookup.prenom} ${lookup.nom}` : `${prenomManuel} ${nomManuel}`
      setSucces(prev => [...prev, label.trim()])
      setNumero('')
      setLookup(null)
      setNomManuel('')
      setPrenomManuel('')
      onAjoute()
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'Erreur lors de l\'ajout.')
    } finally {
      setAjout(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      {estTontinePleine && (
        <div style={{ padding: '12px 14px', borderRadius: '12px', background: `rgba(107,142,78,0.07)`, border: `1px solid rgba(107,142,78,0.30)`, marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: T.success }}>Tontine complète</p>
          <p style={{ fontSize: '12px', color: T.textSec }}>Tous les participants sont enregistrés ({nombreMax}).</p>
        </div>
      )}

      {/* Champ numéro */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: T.surfaceEl, borderRadius: '14px', border: `1.3px solid ${T.border}`, padding: '0 14px', height: '56px' }}>
          <IconSearch />
          <span style={{ fontSize: '14px', fontWeight: 600, color: T.textSec, flexShrink: 0 }}>🇬🇦 +241</span>
          <input
            type="tel"
            inputMode="numeric"
            value={numero}
            onChange={e => rechercher(e.target.value.replace(/\D/g, ''))}
            placeholder="07 XX XX XX XX"
            disabled={estTontinePleine}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '16px', fontWeight: 500, color: T.textStrong, fontFamily: 'inherit' }}
          />
          {cherche && <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${T.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
        </div>
      </div>

      {/* Résultat lookup */}
      {lookup && (
        <div style={{ padding: '14px', borderRadius: '14px', marginBottom: '12px', background: lookup.trouve ? `rgba(107,142,78,0.06)` : T.surfaceEl, border: `1.3px solid ${lookup.trouve ? `rgba(107,142,78,0.3)` : T.border}` }}>
          {lookup.trouve ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `rgba(15,76,92,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: T.primary }}>
                    {(lookup.prenom?.[0] ?? '') + (lookup.nom?.[0] ?? '')}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong }}>{lookup.prenom} {lookup.nom}</p>
                  {lookup.operateur && <p style={{ fontSize: '12px', color: T.textSec }}>{lookup.operateur}</p>}
                </div>
              </div>
              <p style={{ fontSize: '12px', color: T.success, fontWeight: 600 }}>✓ Compte Tonji trouvé</p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <IconWarning />
                <p style={{ fontSize: '13px', fontWeight: 700, color: T.warning }}>Numéro non trouvé dans Tonji</p>
              </div>
              <p style={{ fontSize: '12px', color: T.textSec, marginBottom: '10px' }}>Ce participant sera ajouté comme compte invité. Entrez son nom et prénom.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={prenomManuel}
                    onChange={e => setPrenomManuel(e.target.value)}
                    placeholder="Prénom"
                    style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', color: T.textStrong, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={nomManuel}
                    onChange={e => setNomManuel(e.target.value)}
                    placeholder="Nom"
                    style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', color: T.textStrong, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {erreur && <p style={{ fontSize: '12px', color: T.error, marginBottom: '10px' }}>{erreur}</p>}

      {/* Bouton ajouter */}
      {lookup && !estTontinePleine && (
        <button
          onClick={ajouter}
          disabled={ajout}
          style={{
            width: '100%', height: '50px', borderRadius: '14px', border: 'none',
            background: ajout ? T.surfaceDeep : T.primary, color: ajout ? T.textTert : T.surface,
            fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: ajout ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s',
          }}
        >
          {ajout
            ? <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid rgba(255,255,255,0.4)`, borderTopColor: T.surface, animation: 'spin 0.8s linear infinite' }} />
            : <><IconCheck /> Ajouter ce participant</>
          }
        </button>
      )}

      {/* Participants ajoutés en session */}
      {succes.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: T.success, marginBottom: '8px' }}>
            {succes.length} ajouté{succes.length > 1 ? 's' : ''} dans cette session
          </p>
          {succes.map((nom, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: i < succes.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.success, flexShrink: 0 }} />
              <p style={{ fontSize: '14px', color: T.textStrong }}>{nom}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Onglet "Via un lien" ──────────────────────────────────────────────────────
function OngletLien({ cagnotteId, titre, nombreMax, estPleine }: {
  cagnotteId: string; titre: string; nombreMax: number; estPleine: boolean
}) {
  const lien = `${window.location.origin}/rejoindre/${cagnotteId}`
  const [copied, setCopied] = useState(false)

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  const partager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Rejoindre ${titre}`, url: lien })
      } catch { /* annulé */ }
    } else {
      copier()
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      {estPleine && (
        <div style={{ padding: '12px 14px', borderRadius: '12px', background: `rgba(107,142,78,0.07)`, border: `1px solid rgba(107,142,78,0.30)`, marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: T.success }}>Tontine complète</p>
          <p style={{ fontSize: '12px', color: T.textSec }}>Aucun participant supplémentaire ({nombreMax} atteint).</p>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: `rgba(201,123,74,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.accent }}>
          <IconLink />
        </div>
      </div>
      <p style={{ fontSize: '18px', fontWeight: 700, color: T.textStrong, textAlign: 'center', marginBottom: '8px' }}>
        Lien d'inscription
      </p>
      <p style={{ fontSize: '13px', color: T.textSec, textAlign: 'center', lineHeight: 1.5, marginBottom: '20px' }}>
        Partagez ce lien avec vos participants. Chacun s'inscrit lui-même en quelques secondes.
      </p>

      {/* Lien affiché */}
      <div style={{ background: T.surfaceEl, borderRadius: '12px', border: `1px solid ${T.border}`, padding: '12px 14px', marginBottom: '16px', wordBreak: 'break-all' }}>
        <p style={{ fontSize: '12px', color: T.primary, fontWeight: 600 }}>{lien}</p>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={copier}
          style={{
            flex: 1, height: '50px', borderRadius: '14px', border: `1.5px solid ${copied ? T.success : T.primary}`,
            background: copied ? `rgba(107,142,78,0.08)` : 'none',
            color: copied ? T.success : T.primary,
            fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s',
          }}
        >
          <IconCopy />
          {copied ? 'Copié !' : 'Copier'}
        </button>
        <button
          onClick={partager}
          style={{
            flex: 1, height: '50px', borderRadius: '14px', border: 'none',
            background: T.primary, color: T.surface,
            fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <IconShare />
          Partager
        </button>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function MobileAjoutParticipants() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const args: AjoutArgs = location.state ?? { titre: 'Cagnotte', nombreMax: 0, nombreInscrits: 0 }

  const [onglet, setOnglet] = useState<'manuel' | 'lien'>('manuel')
  const [inscrits, setInscrits] = useState(args.nombreInscrits)
  const estPleine = args.type === 'tontine' && args.nombreMax > 0 && inscrits >= args.nombreMax

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: T.surface, minHeight: '100%' }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px 12px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: T.textStrong, display: 'flex' }}>
              <IconBack />
            </button>
            <div>
              <p style={{ fontSize: '17px', fontWeight: 700, color: T.textStrong, lineHeight: 1 }}>Ajouter des participants</p>
              <p style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>{args.titre}</p>
            </div>
            {args.type === 'tontine' && args.nombreMax > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: estPleine ? T.success : T.textSec, background: estPleine ? `rgba(107,142,78,0.1)` : T.surfaceEl, padding: '4px 10px', borderRadius: '20px' }}>
                {inscrits}/{args.nombreMax}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderTop: `1px solid ${T.border}` }}>
            {(['manuel', 'lien'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setOnglet(tab)}
                style={{
                  flex: 1, height: '44px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                  color: onglet === tab ? T.primary : T.textSec,
                  borderBottom: `2.5px solid ${onglet === tab ? T.primary : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'manuel' ? 'Manuellement' : 'Via un lien'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        {onglet === 'manuel' ? (
          <OngletManuel
            cagnotteId={id!}
            nombreMax={args.nombreMax}
            nombreInscrits={inscrits}
            type={args.type}
            onAjoute={() => setInscrits(n => n + 1)}
          />
        ) : (
          <OngletLien
            cagnotteId={id!}
            titre={args.titre}
            nombreMax={args.nombreMax}
            estPleine={estPleine}
          />
        )}
      </div>
    </>
  )
}
