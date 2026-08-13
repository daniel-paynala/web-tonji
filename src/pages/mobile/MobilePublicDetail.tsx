/**
 * Page détail d'une cagnotte PUBLIQUE — réplique fidèle de explorer_screen.dart
 * (PublicDetailScreen + _BarreContribuer).
 * Consultable par n'importe qui ; bouton « Contribuer » → flux de cotisation
 * existant (montant libre pour une cagnotte ouverte).
 * Backend : chargerCagnottePublique() → GET /api/public/cagnottes/:ref
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { T } from '@/lib/tokens'
import { chargerCagnottePublique } from '@/lib/cagnottesApi'
import type { Cagnotte } from '@/lib/cagnottesApi'
import type { CotiserArgs } from '@/pages/mobile/MobileCotiser'

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
// Flèche retour (AppBar).
const IconBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
// Cœur plein — bouton « Contribuer ».
const IconHeart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
)

// ── Page principale ─────────────────────────────────────────────────────────────
export default function MobilePublicDetail() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()

  const [cagnotte, setCagnotte]     = useState<Cagnotte | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur]         = useState(false)

  const charger = useCallback(async () => {
    if (!ref) return
    setChargement(true)
    setErreur(false)
    try {
      const c = await chargerCagnottePublique(ref)
      setCagnotte(c)
    } catch {
      setErreur(true)
    } finally {
      setChargement(false)
    }
  }, [ref])

  useEffect(() => { charger() }, [charger])

  // Lance le flux de cotisation (montant libre) — miroir de _BarreContribuer.
  const contribuer = () => {
    if (!cagnotte) return
    const args: CotiserArgs = { titre: cagnotte.titre, type: 'cotisation' }
    navigate(`/cagnottes/${cagnotte.id}/cotiser`, { state: args })
  }

  const pct = cagnotte ? pourcentage(cagnotte) : null
  const description = cagnotte?.description?.trim()

  return (
    <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* AppBar — retour (surface crème, sans titre) */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 0' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          style={{
            width: '40px', height: '40px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: 'transparent', color: T.textStrong,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
          }}
        >
          <IconBack />
        </button>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, padding: '8px 20px 120px' }}>
        {chargement ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '120px' }}>
            <span style={{
              width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.primary,
              borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : erreur ? (
          <p style={{ textAlign: 'center', paddingTop: '120px', color: T.textSec }}>Cagnotte introuvable.</p>
        ) : !cagnotte ? (
          <p style={{ textAlign: 'center', paddingTop: '120px', color: T.textSec }}>
            Cagnotte introuvable ou non publique.
          </p>
        ) : (
          <>
            {/* Titre */}
            <p style={{ fontSize: '24px', fontWeight: 800, color: T.textStrong }}>{cagnotte.titre}</p>

            {/* Créateur */}
            {cagnotte.createur && (
              <p style={{ fontSize: '13px', color: T.textTert, marginTop: '6px' }}>par {cagnotte.createur}</p>
            )}

            <div style={{ height: '20px' }} />

            {/* Montant collecté */}
            <p style={{ fontSize: '28px', fontWeight: 900, color: T.primary }}>
              {fmtMontant(cagnotte.montantCollecte)}
            </p>

            {/* Objectif + barre */}
            {cagnotte.montantCible != null && (
              <>
                <div style={{ height: '4px' }} />
                <p style={{ fontSize: '13.5px', color: T.textSec }}>
                  sur un objectif de {fmtMontant(cagnotte.montantCible)}
                </p>
                <div style={{ height: '12px' }} />
                <div style={{ height: '9px', borderRadius: '5px', background: T.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(pct ?? 0) * 100}%`, background: T.primary, borderRadius: '5px' }} />
                </div>
              </>
            )}

            {/* À propos / description */}
            {description && (
              <>
                <div style={{ height: '28px' }} />
                <p style={{ fontSize: '15px', fontWeight: 800, color: T.textStrong }}>À propos</p>
                <div style={{ height: '8px' }} />
                <p style={{ fontSize: '14.5px', color: T.textSec, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {description}
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* Barre fixe « Contribuer » — uniquement si la cagnotte est chargée (miroir _BarreContribuer) */}
      {cagnotte && !chargement && !erreur && (
        <div style={{
          position: 'sticky', bottom: 0, background: T.surface,
          padding: '8px 20px 16px',
        }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={contribuer}
            style={{
              width: '100%', height: '54px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: T.accent, color: T.textStrong, fontFamily: 'inherit',
              fontSize: '16px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <IconHeart /> Contribuer
          </motion.button>
        </div>
      )}
    </div>
  )
}
