/**
 * Page « Découvrir » — réplique fidèle de explorer_screen.dart (ExplorerScreen).
 * Liste les cagnottes PUBLIQUES approuvées (crowdfunding). Tap sur une carte → détail public.
 * Backend : listerCagnottesPubliques() → GET /api/public/cagnottes
 * Référence Flutter : ExplorerScreen, _CarteExplorer, _ExplorerVide, _ExplorerErreur.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { T } from '@/lib/tokens'
import { listerCagnottesPubliques } from '@/lib/cagnottesApi'
import type { Cagnotte } from '@/lib/cagnottesApi'

// ── Formatage montant style Flutter (_fmtMontant) ─────────────────────────────
function fmtMontant(n: number): string {
  const s = Math.round(n).toString()
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ' '
    out += s[i]
  }
  return out + ' FCFA'
}

// Ratio de progression vers la cible (0 → 1), null si pas de cible (miroir pourcentageAtteint).
function pourcentage(c: Cagnotte): number | null {
  if (!c.montantCible || c.montantCible === 0) return null
  return Math.min(1, Math.max(0, c.montantCollecte / c.montantCible))
}

// ── Icônes SVG ─────────────────────────────────────────────────────────────────
// Icône « public_off » — état vide.
const IconPublicOff = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
)
// Icône « error_outline » — état erreur.
const IconError = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// ── Carte d'une cagnotte publique (_CarteExplorer) ────────────────────────────
function CarteExplorer({ c, delay }: { c: Cagnotte; delay: number }) {
  const navigate = useNavigate()
  const pct = pourcentage(c)
  const description = c.description?.trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/public/${c.id}`)}
      style={{
        background: T.surfaceEl,
        borderRadius: '18px',
        border: `1px solid ${T.border}`,
        padding: '16px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Titre */}
      <p style={{
        fontSize: '16px', fontWeight: 800, color: T.textStrong,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {c.titre}
      </p>

      {/* Extrait de description (2 lignes max) */}
      {description && (
        <p style={{
          fontSize: '13.5px', color: T.textSec, lineHeight: 1.35, marginTop: '6px',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {description}
        </p>
      )}

      <div style={{ height: '14px' }} />

      {/* Barre de progression vers l'objectif (si défini) */}
      {pct !== null && (
        <>
          <div style={{ height: '7px', borderRadius: '4px', background: T.border, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct * 100}%`, background: T.primary, borderRadius: '4px' }} />
          </div>
          <div style={{ height: '8px' }} />
        </>
      )}

      {/* Montant collecté / cible + créateur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '14px', fontWeight: 800, color: T.primary }}>
          {fmtMontant(c.montantCollecte)}
        </span>
        {c.montantCible != null && (
          <span style={{ fontSize: '12.5px', color: T.textTert }}>
            {' / '}{fmtMontant(c.montantCible)}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {c.createur && (
          <span style={{
            fontSize: '12px', color: T.textTert,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%',
          }}>
            par {c.createur}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── État vide (_ExplorerVide) ─────────────────────────────────────────────────
function ExplorerVide() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '120px' }}>
      <span style={{ color: T.textTert }}><IconPublicOff /></span>
      <div style={{ height: '16px' }} />
      <p style={{
        fontSize: '14.5px', color: T.textSec, textAlign: 'center', lineHeight: 1.4,
        padding: '0 40px', whiteSpace: 'pre-line',
      }}>
        {'Aucune cagnotte publique pour l\'instant.\nRevenez bientôt !'}
      </p>
    </div>
  )
}

// ── État erreur (_ExplorerErreur) ─────────────────────────────────────────────
function ExplorerErreur({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '120px' }}>
      <span style={{ color: T.error }}><IconError /></span>
      <div style={{ height: '16px' }} />
      <p style={{ fontSize: '14.5px', color: T.textSec, textAlign: 'center', padding: '0 40px' }}>
        Impossible de charger les cagnottes publiques.
      </p>
      <div style={{ height: '16px' }} />
      <button
        onClick={onRetry}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '14px', fontWeight: 600, color: T.primary, padding: '8px',
        }}
      >
        Réessayer
      </button>
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────────
export default function MobileExplorer() {
  const [cagnottes, setCagnottes]   = useState<Cagnotte[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur]         = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(false)
    try {
      const data = await listerCagnottesPubliques()
      setCagnottes(data)
    } catch {
      setErreur(true)
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])

  return (
    <div style={{ background: T.surface, minHeight: '100%', paddingBottom: '80px' }}>
      {/* En-tête « Découvrir » (miroir AppBar Flutter, sur surface crème) */}
      <div style={{ padding: '16px 16px 4px' }}>
        <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong }}>Découvrir</p>
      </div>

      <div style={{ padding: '8px 16px 32px' }}>
        {chargement ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '120px' }}>
            <span style={{
              width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.primary,
              borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : erreur ? (
          <ExplorerErreur onRetry={charger} />
        ) : cagnottes.length === 0 ? (
          <ExplorerVide />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cagnottes.map((c, i) => (
              <CarteExplorer key={c.id} c={c} delay={i * 0.05} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
