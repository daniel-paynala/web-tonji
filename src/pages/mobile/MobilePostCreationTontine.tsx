import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { T } from '@/lib/tokens'
import { chargerCagnotte, type CagnotteDetail } from '@/lib/cagnottesApi'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconCheck = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={T.surface} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
)
const IconGroupAdd = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
)
const IconLink = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)
const IconArrow = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
)

// ── Confettis décoratifs ──────────────────────────────────────────────────────
const CONFETTIS = [
  { emoji: '🎉', left: '10%', delay: '0ms', size: 28 },
  { emoji: '✨', left: '40%', delay: '100ms', size: 22 },
  { emoji: '🎊', left: '75%', delay: '200ms', size: 26 },
  { emoji: '⭐', left: '25%', delay: '300ms', size: 20 },
  { emoji: '✨', left: '60%', delay: '400ms', size: 22 },
  { emoji: '🎉', left: '90%', delay: '500ms', size: 24 },
]

// ── Composant principal ───────────────────────────────────────────────────────
export default function MobilePostCreationTontine() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cagnotte, setCagnotte] = useState<CagnotteDetail | null>(null)
  const [erreur, setErreur] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    chargerCagnotte(id).then(c => {
      if (c) setCagnotte(c)
      else setErreur('Tontine introuvable.')
    }).catch(() => setErreur('Erreur lors du chargement.'))
  }, [id])

  const lienInvitation = `${window.location.origin}/rejoindre/${id}`

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(lienInvitation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: sélection manuelle
    }
  }

  const cadenceHumaine = () => {
    if (!cagnotte) return ''
    const p = cagnotte.periodicite
    const n = cagnotte.intervalle ?? 1
    if (p === 'hebdomadaire') return n === 1 ? 'Toutes les semaines' : `Toutes les ${n} semaines`
    if (p === 'mensuelle') return n === 1 ? 'Tous les mois' : `Tous les ${n} mois`
    return ''
  }

  if (erreur) {
    return (
      <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <p style={{ fontSize: '16px', color: T.error, textAlign: 'center', marginBottom: '24px' }}>{erreur}</p>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '14px 28px', borderRadius: '14px', background: T.primary, color: T.surface, border: 'none', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
          Retour à l'accueil
        </button>
      </div>
    )
  }

  if (!cagnotte) {
    return (
      <div style={{ background: T.surface, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `3px solid ${T.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes confetti { 0% { opacity:0; transform:translateY(0) rotate(-20deg); } 10% { opacity:1; } 80% { opacity:0.6; } 100% { opacity:0; transform:translateY(55vh) rotate(40deg); } }
        @keyframes pulse { 0%,100% { transform:scale(0.95); } 50% { transform:scale(1.05); } }
      `}</style>

      {/* Confettis */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {CONFETTIS.map((c, i) => (
          <div key={i} style={{
            position: 'absolute', top: '-40px', left: c.left,
            fontSize: `${c.size}px`, lineHeight: 1,
            animation: `confetti 2.8s ${c.delay} ease-in forwards`,
          }}>
            {c.emoji}
          </div>
        ))}
      </div>

      <div style={{ background: T.surface, minHeight: '100%', paddingBottom: '40px', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '24px 20px 0' }}>

          {/* Pastille succès */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '140px', height: '140px', borderRadius: '50%',
                background: `rgba(107,142,78,0.10)`,
                animation: 'pulse 2s infinite',
                position: 'absolute', top: '-22px', left: '-22px',
              }} />
              <div style={{
                width: '96px', height: '96px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.success}, #8ab868)`,
                boxShadow: `0 10px 24px rgba(107,142,78,0.4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <IconCheck />
              </div>
            </div>
          </div>

          <p style={{ fontSize: '28px', fontWeight: 800, color: T.textStrong, textAlign: 'center', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Tontine créée !
          </p>
          <p style={{ fontSize: '14px', color: T.textSec, textAlign: 'center', lineHeight: 1.5, marginBottom: '24px' }}>
            «&nbsp;{cagnotte.titre}&nbsp;» est prête à accueillir ses participants.
          </p>

          {/* Carte récap */}
          <div style={{
            padding: '14px 16px', borderRadius: '16px',
            background: T.surfaceEl, border: `1px solid rgba(216,207,192,0.6)`,
            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px',
          }}>
            <div style={{ padding: '4px 10px', borderRadius: '8px', background: `rgba(201,123,74,0.15)`, flexShrink: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 800, color: T.accent, letterSpacing: '0.5px' }}>#{cagnotte.id}</p>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: T.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cagnotte.titre}</p>
              {cadenceHumaine() && <p style={{ fontSize: '12px', color: T.textSec, marginTop: '1px' }}>{cadenceHumaine()}</p>}
            </div>
          </div>

          {/* Titre comment continuer */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: T.textTert, textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: '12px' }}>
            Comment voulez-vous continuer ?
          </p>

          {/* Carte action : enregistrer participants */}
          <ActionCard
            icon={<IconGroupAdd />}
            titre="Enregistrer les participants"
            sous="Ajoutez vous-même chaque membre, un à un."
            couleur={T.primary}
            onClick={() => navigate(`/cagnottes/${id}/participants`, {
              state: {
                titre: cagnotte.titre,
                nombreMax: cagnotte.nombreParticipants,
                nombreInscrits: cagnotte.nombreInscrits,
              }
            })}
          />

          <div style={{ height: '12px' }} />

          {/* Carte action : partager lien */}
          <ActionCard
            icon={<IconLink />}
            titre="Partager le lien d'invitation"
            sous="Chaque personne s'inscrit elle-même via un formulaire."
            couleur={T.accent}
            onClick={copierLien}
            badge={copied ? '✓ Copié !' : undefined}
          />

          <div style={{ height: '32px' }} />

          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: '100%', height: '48px', background: 'none', border: 'none', cursor: 'pointer', color: T.textSec, fontSize: '15px', fontWeight: 600, fontFamily: 'inherit' }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </>
  )
}

function ActionCard({ icon, titre, sous, couleur, onClick, badge }: {
  icon: React.ReactNode; titre: string; sous: string
  couleur: string; onClick: () => void; badge?: string
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        padding: '18px', borderRadius: '20px', cursor: 'pointer',
        background: T.surfaceEl,
        border: `1.5px solid rgba(${couleur === T.primary ? '15,76,92' : '201,123,74'},0.30)`,
        boxShadow: `0 6px 18px rgba(${couleur === T.primary ? '15,76,92' : '201,123,74'},0.10)`,
        display: 'flex', alignItems: 'center', gap: '14px',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.12s',
        position: 'relative',
      }}
    >
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
        background: `linear-gradient(135deg, rgba(${couleur === T.primary ? '15,76,92' : '201,123,74'},0.22), rgba(${couleur === T.primary ? '15,76,92' : '201,123,74'},0.08))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: couleur,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '15px', fontWeight: 800, color: T.textStrong, marginBottom: '2px' }}>{titre}</p>
        <p style={{ fontSize: '12px', color: T.textSec, lineHeight: 1.4 }}>{sous}</p>
      </div>
      {badge
        ? <span style={{ fontSize: '13px', fontWeight: 700, color: T.success }}>{badge}</span>
        : <span style={{ color: couleur }}><IconArrow /></span>
      }
    </div>
  )
}
