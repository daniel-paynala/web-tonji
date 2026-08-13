/**
 * Page d'accueil mobile — reproduction exacte du home_screen.dart Flutter.
 * Référence : _ContenuHome, _CarteHero, _CarteCagnotte, _BlocCagnottes,
 *             _BlocTerminees, _BadgeRole, _labelCollecte, _valeurCollecte.
 * Backend   : listerMesCagnottes() → GET /api/mobile/cagnottes
 *             rejoindre()         → POST /api/mobile/cagnottes/:ref/rejoindre
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, animate } from 'framer-motion'
import { T, grad } from '@/lib/tokens'
import { TONTINES_ACTIVES } from '@/lib/featureFlags'
import { listerMesCagnottes, rejoindre, enModeration, badgeStatutValidation } from '@/lib/cagnottesApi'
import type { Cagnotte } from '@/lib/cagnottesApi'
import { ApiError } from '@/lib/api'
import { useAuthStore, estCompteLight } from '@/store/authStore'

// ── Formatage montant style Flutter ──────────────────────────────────────────
function fmtMontant(n: number): string {
  const s = Math.round(n).toString()
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ' '
    out += s[i]
  }
  return out + ' FCFA'
}

// ── Label contextuel (_labelCollecte) ────────────────────────────────────────
function labelCollecte(c: Cagnotte): string {
  if (c.type === 'cotisation' && !c.montantCible) return 'Collecte libre'
  if (c.type === 'tontine' && c.periodicite) {
    const n = c.intervalle ?? 1
    if (c.periodicite === 'mensuelle') {
      return n === 1 ? 'Collecté ce mois' : `Collecté ces ${n} derniers mois`
    }
    if (c.periodicite === 'hebdomadaire') {
      return n === 1 ? 'Collecté cette semaine' : `Collecté ces ${n} dernières semaines`
    }
  }
  return 'Collecté'
}

// ── Valeur affichée (_valeurCollecte) ─────────────────────────────────────────
function valeurCollecte(c: Cagnotte): string {
  if (c.type === 'cotisation' && c.montantCible) {
    return `${fmtMontant(c.montantCollecte)} / ${fmtMontant(c.montantCible)}`
  }
  return fmtMontant(c.montantCollecte)
}

// ── estTerminee — miroir exact du getter Cagnotte.estTerminee (Flutter) ───────
// Définitivement fermée : statut clôturé OU (tontine ET rotation complète).
// Pour une cotisation, rotationTerminee ne suffit pas — seule la clôture compte.
function estTermineeCagnotte(c: Cagnotte): boolean {
  return c.statut === 'cloturee' || (c.type === 'tontine' && c.rotationTerminee)
}

// ── Icons SVG ─────────────────────────────────────────────────────────────────
const IconAdd = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
)
const IconLogin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
    <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
  </svg>
)
const IconSync = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
)
// Bourse avec une pièce — symbole de la cagnotte (miroir du peintre Flutter
// IconeBourse : grille 24×24 réduite à 0.68 autour du centre, trait fin 1.3).
const IconeBourse = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
    <g transform="translate(12,12) scale(0.68) translate(-12,-12)">
      <path d="M8.1 11 C4.3 13.2 2.9 17 4.4 19.9 C5.9 22.6 14.9 22.6 16.4 19.9 C17.9 17 16.5 13.2 12.7 11 Z"/>
      <path d="M7.3 11 H13.5"/>
      <path d="M9.1 10.9 C8.6 9.6 8.2 9 7.5 8.6"/>
      <path d="M11.7 10.9 C12.2 9.6 12.6 9 13.3 8.6"/>
      <circle cx="18.3" cy="7.6" r="3.4"/>
      <path d="M18.3 6.1 V9.1"/>
    </g>
  </svg>
)
const IconGroup = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconPremium = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IconHandshake = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
  </svg>
)
const IconChevronDown = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

// ── Badge rôle (_BadgeRole) ───────────────────────────────────────────────────
function BadgeRole({ estGerant }: { estGerant: boolean }) {
  const bg    = estGerant ? `rgba(10,104,71,0.10)`    : `rgba(232,168,48,0.14)`
  const color = estGerant ? T.primary                : T.accent
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '20px', background: bg,
      fontSize: '11px', fontWeight: 700, color,
    }}>
      {estGerant ? <IconPremium /> : <IconHandshake />}
      {estGerant ? 'Organisateur' : 'Cotiseur'}
    </span>
  )
}

// ── Skeleton carte (pendant le chargement) ────────────────────────────────────
function SkeletonCarte() {
  return (
    <div style={{
      background: T.surfaceEl, borderRadius: '20px',
      border: `1px solid rgba(232,237,233,0.6)`,
      padding: '18px', marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: T.surfaceDeep, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, borderRadius: 8, background: T.surfaceDeep, marginBottom: 8, width: '70%' }} />
          <div style={{ height: 12, borderRadius: 8, background: T.surfaceDeep, width: '40%' }} />
        </div>
        <div style={{ width: 64, height: 24, borderRadius: 20, background: T.surfaceDeep }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ height: 12, borderRadius: 8, background: T.surfaceDeep, width: 100, marginBottom: 6 }} />
          <div style={{ height: 22, borderRadius: 8, background: T.surfaceDeep, width: 140 }} />
        </div>
        <div style={{ width: 60, height: 34, borderRadius: 8, background: T.surfaceDeep }} />
      </div>
    </div>
  )
}

// ── Carte cagnotte (_CarteCagnotte) ──────────────────────────────────────────
function CarteCagnotte({ c, delay }: { c: Cagnotte; delay: number }) {
  const navigate    = useNavigate()
  const isTontine   = c.type === 'tontine'
  const estGerant   = c.role === 'gerant'
  const estCloturee = c.statut === 'cloturee'
  // Flutter : badge « Terminé » affiché via le else-if, donc uniquement
  // quand estTerminee est vrai SANS être clôturée (sinon « Clôturée » prime).
  const estTerminee = estTermineeCagnotte(c) && !estCloturee

  // Flutter ajoute +1 pour compter le créateur dans le nombre d'inscrits.
  const participantsLabel = isTontine && c.nombreParticipants > 0
    ? `${(c.nombreInscrits ?? 0) + 1}/${c.nombreParticipants}`
    : `${c.nombreParticipants}`

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/cagnottes/${c.id}`)}
      style={{
        background: T.surfaceEl,
        borderRadius: '20px',
        border: `1px solid rgba(232,237,233,0.6)`,
        padding: '18px',
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: `0 6px 18px rgba(10,104,71,0.05)`,
        marginBottom: '12px',
      }}
    >
      {/* Ligne haute */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>

        {/* Icône */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
          background: isTontine ? `rgba(10,104,71,0.10)` : `rgba(232,168,48,0.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isTontine ? T.primary : T.accent,
        }}>
          {isTontine ? <IconSync /> : <IconeBourse size={22} />}
        </div>

        {/* Titre + sous-titre */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: T.textStrong, lineHeight: 1.25, marginBottom: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {c.titre}
          </p>
          <p style={{ fontSize: '12px', color: T.textSec }}>
            {isTontine ? 'Tontine' : 'Cagnotte'} · N°{c.id}
          </p>
          {/* Badge de modération pour les cagnottes publiques non encore approuvées
              (en_attente / rejetee / suspendue) — miroir du bloc c.enModeration Flutter. */}
          {enModeration(c) && (() => {
            const enAttente = c.statutValidation === 'en_attente'
            // En attente → ambre ; refusée/suspendue → corail (erreur).
            const couleurFond = enAttente ? `rgba(196,138,26,0.12)` : `rgba(217,79,61,0.12)`
            const couleurTexte = enAttente ? T.accentDark : T.error
            return (
              <span style={{
                display: 'inline-block', marginTop: '6px',
                padding: '3px 8px', borderRadius: '20px',
                background: couleurFond, color: couleurTexte,
                fontSize: '11px', fontWeight: 700,
              }}>
                {badgeStatutValidation(c.statutValidation)}
              </span>
            )
          })()}
        </div>

        {/* Badges droite */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <BadgeRole estGerant={estGerant} />
          {estCloturee && (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
              background: T.surface, border: `1px solid ${T.border}`, color: T.textTert, letterSpacing: '0.4px',
            }}>
              Clôturée
            </span>
          )}
          {estTerminee && (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
              background: `rgba(107,142,78,0.10)`, border: `1px solid rgba(107,142,78,0.4)`, color: T.success, letterSpacing: '0.4px',
            }}>
              Terminé
            </span>
          )}
        </div>
      </div>

      {/* Ligne basse */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '12px', color: T.textSec, marginBottom: '2px' }}>{labelCollecte(c)}</p>
          <p style={{ fontSize: '19px', fontWeight: 800, color: T.accent, letterSpacing: '-0.4px' }}>
            {valeurCollecte(c)}
          </p>
        </div>

        {/* Chip participants */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: T.surface, borderRadius: '8px', padding: '6px 10px',
        }}>
          <span style={{ color: T.textSec }}><IconGroup /></span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: T.textStrong }}>
            {participantsLabel}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Bottom sheet rejoindre ────────────────────────────────────────────────────
function ModalRejoindre({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const navigate = useNavigate()
  const [code, setCode]       = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur]   = useState<string | null>(null)

  // Rejoint puis navigue — miroir de _rejoindreEtNaviguer (Flutter) :
  // gestion fine des statuts d'erreur (404 / 409 / 422 / autre).
  const handleRejoindre = async () => {
    const ref = code.trim()
    // Flutter exige 6 chiffres dans la bottom sheet de saisie.
    if (ref.length < 6) return
    setEnCours(true)
    setErreur(null)
    let naviguer = true
    try {
      await rejoindre(ref)
      onSuccess() // invalide la liste (ref.invalidate(mesCagnottesProvider))
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        switch (e.status) {
          case 404:
            // Cagnotte introuvable — on reste sur la feuille, message inline.
            setErreur('Cagnotte introuvable.')
            naviguer = false
            break
          case 422:
            // Cagnotte complète — on navigue quand même vers le détail.
            break
          case 409:
            // Déjà inscrit — on navigue silencieusement vers le détail.
            break
          default:
            setErreur(e.message)
            naviguer = false
        }
      } else {
        setErreur(e instanceof Error ? e.message : 'Erreur lors de la connexion')
        naviguer = false
      }
    } finally {
      setEnCours(false)
    }
    if (naviguer) {
      onClose()
      navigate(`/cagnottes/${ref}`)
    }
  }

  const pret = code.trim().length >= 6 && !enCours

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,30,0.50)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ background: T.surface, borderRadius: '24px 24px 0 0', padding: '20px 24px 40px', width: '100%' }}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: T.border, margin: '0 auto 20px' }} />
        <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong, marginBottom: '6px' }}>Rejoindre une cagnotte</p>
        <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '20px' }}>
          Entrez le code de la cagnotte partagé par l'organisateur.
        </p>
        <input
          type="number"
          value={code}
          onChange={e => { setCode(e.target.value.slice(0, 6)); setErreur(null) }}
          autoFocus
          placeholder="000000"
          style={{
            width: '100%', height: '64px', borderRadius: '16px',
            border: `1.2px solid ${erreur ? T.error : T.border}`, background: T.surfaceEl,
            fontSize: '28px', fontWeight: 800, letterSpacing: '8px',
            color: T.textStrong, textAlign: 'center', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
            caretColor: T.primary,
          }}
        />
        {erreur && (
          <p style={{ fontSize: '13px', color: T.error, marginTop: '8px', textAlign: 'center' }}>
            {erreur}
          </p>
        )}
        <button
          onClick={handleRejoindre}
          disabled={!pret}
          style={{
            width: '100%', height: '50px', borderRadius: '14px', border: 'none',
            background: pret ? T.primary : T.surfaceDeep,
            color: pret ? T.surface : T.textTert,
            fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', cursor: pret ? 'pointer' : 'default',
            marginTop: '16px', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {enCours
            ? <span style={{ width: 20, height: 20, border: `2px solid ${T.surface}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            : 'Rejoindre la cagnotte'
          }
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Carte hero (_CarteHero) ───────────────────────────────────────────────────
function CarteHero({ total, nombreActives, onRejoindre, onCreer }: {
  total: number; nombreActives: number; onRejoindre: () => void; onCreer: () => void
}) {
  // Compteur anime du total -- miroir de _MontantAnime (Flutter) :
  // deroule de 0 vers `total` en 1,1 s avec une courbe easeOutCubic.
  const montantRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const node = montantRef.current
    if (!node) return
    // Formatage : espace tous les 3 chiffres depuis la droite (separateur milliers).
    const formate = (v: number): string => {
      const s = Math.round(v).toString()
      let out = ''
      for (let i = 0; i < s.length; i++) {
        if (i > 0 && (s.length - i) % 3 === 0) out += ' '
        out += s[i]
      }
      return out
    }
    const controls = animate(0, total, {
      duration: 1.1,
      ease: [0.215, 0.61, 0.355, 1], // easeOutCubic
      onUpdate: (v) => { node.textContent = formate(v) },
    })
    return () => controls.stop()
  }, [total])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: grad.primary, borderRadius: '0 0 32px 32px',
        padding: '28px 24px 24px',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Cercle accent */}
      <div style={{
        position: 'absolute', width: '140px', height: '140px', borderRadius: '50%',
        background: `rgba(232,168,48,0.18)`, top: '-40px', right: '-30px', pointerEvents: 'none',
      }} />

      {/* Marque (vrai logo) + slogan de lancement « Cagnotte d'abord » (P2 #7) */}
      <div style={{ marginBottom: '16px' }}>
        <img src="/logo-tonji-wordmark.png" alt="Tonji" style={{ height: 64, width: 'auto', display: 'block' }} />
        <p style={{ fontSize: '13px', color: `rgba(246,247,244,0.85)`, fontWeight: 500, marginTop: '2px' }}>
          Cotisez simplement.
        </p>
      </div>

      {/* Label */}
      <p style={{ fontSize: '11px', color: `rgba(255,255,255,0.65)`, letterSpacing: '1.8px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
        Total collecté
      </p>

      {/* Montant + FCFA */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '4px' }}>
        <span ref={montantRef} style={{ fontSize: '36px', fontWeight: 800, color: T.surface, letterSpacing: '-1.2px', lineHeight: 1.1 }}>
          0
        </span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: `rgba(246,247,244,0.80)`, letterSpacing: '1px', paddingBottom: '6px' }}>
          FCFA
        </span>
      </div>

      {/* Indicateur actives */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.accent, flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: `rgba(246,247,244,0.90)`, fontWeight: 500 }}>
          {nombreActives} {nombreActives > 1 ? 'cagnottes actives' : 'cagnotte active'}
        </span>
      </div>

      {/* Boutons en ligne (miroir _EnTeteHero Flutter : Créer + Rejoindre côte à côte) */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Créer (CTA principal doré) */}
        <button
          onClick={onCreer}
          style={{
            flex: 1, height: '50px', borderRadius: '14px', border: 'none',
            background: T.accent, color: T.textStrong, fontSize: '15px', fontWeight: 700,
            letterSpacing: '0.3px', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <IconAdd /> Créer une cagnotte
        </button>
        {/* Rejoindre une cagnotte par code — parcours clé du lancement, toujours actif (P1 #2). */}
        <button
          onClick={onRejoindre}
          style={{
            flex: 1, height: '50px', borderRadius: '14px', cursor: 'pointer',
            background: 'transparent', border: `1px solid rgba(246,247,244,0.45)`,
            color: T.surface, fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}
        >
          <IconLogin /> Rejoindre une cagnotte
        </button>
      </div>
    </motion.div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, count, muted }: { title: string; count: number; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: muted ? T.textSec : T.textStrong }}>
        {title}
      </p>
      <div style={{
        padding: '4px 10px', borderRadius: '8px',
        background: T.surfaceEl, border: `1px solid rgba(232,237,233,0.6)`,
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: T.textSec }}>{count}</span>
      </div>
    </div>
  )
}

// ── Icône erreur (Icons.error_outline) — état erreur ──────────────────────────
const IconError = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

// ── État vide (_EtatVide) ─────────────────────────────────────────────────────
// Miroir exact du Flutter : cercle vert, tirelire, titre + sous-titre, sans bouton.
function EtatVide() {
  return (
    <div style={{ padding: '32px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: `rgba(10,104,71,0.07)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.primary,
        }}>
          <IconeBourse size={36} />
        </div>
        <div style={{ height: '16px' }} />
        <p style={{ fontSize: '16px', fontWeight: 600, color: T.textStrong }}>
          Aucune cagnotte pour l'instant
        </p>
        <div style={{ height: '4px' }} />
        <p style={{ fontSize: '14px', color: T.textSec }}>
          Créez votre première cagnotte pour commencer.
        </p>
      </div>
    </div>
  )
}

// ── État erreur (_MessageErreur) ──────────────────────────────────────────────
// Miroir exact du Flutter : icône d'erreur, titre, message centré, sans bouton.
function EtatErreur({ message }: { message: string }) {
  return (
    <div style={{ padding: '32px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <span style={{ color: T.error }}><IconError /></span>
        <div style={{ height: '8px' }} />
        <p style={{ fontSize: '16px', fontWeight: 600, color: T.textStrong }}>
          Impossible de charger vos cagnottes
        </p>
        <div style={{ height: '4px' }} />
        <p style={{ fontSize: '12px', color: T.textSec }}>
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Teaser tontine (P2 #6) — réplique fidèle du _TeaserTontine Flutter ─────────
// Fond vert dégradé, halos décoratifs, badge doré « BIENTÔT », icône de rotation
// animée (chacun son tour) et balayage brillant (shimmer) périodique.
function TeaserTontine() {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: '20px',
      background: 'linear-gradient(135deg, #064D34 0%, #0A6847 55%, #1A9060 100%)',
      boxShadow: '0 8px 20px rgba(10,104,71,0.28)',
    }}>
      {/* Halos décoratifs (profondeur) */}
      <div style={{ position: 'absolute', top: -28, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(232,168,48,0.14)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(26,144,96,0.30)', pointerEvents: 'none' }} />
      {/* Balayage brillant périodique */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)',
        transform: 'translateX(-120%)', animation: 'teaserShimmer 4.1s linear infinite',
      }} />
      {/* Contenu */}
      <div style={{ position: 'relative', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#F5D078', display: 'inline-flex', animation: 'spin 4.2s linear infinite' }}><IconSync /></span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-block', padding: '3px 8px', borderRadius: '20px',
            background: 'rgba(232,168,48,0.22)', color: '#F5D078',
            fontSize: '10px', fontWeight: 800, letterSpacing: '1.2px',
          }}>BIENTÔT</span>
          <p style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, marginTop: '7px' }}>La tontine arrive</p>
          <p style={{ fontSize: '12px', lineHeight: 1.35, color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>L'épargne à tour de rôle, entre proches.</p>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MobileHome() {
  const navigate = useNavigate()
  const user     = useAuthStore(s => s.user)
  const estLight = estCompteLight(user)

  const [cagnottes, setCagnottes]   = useState<Cagnotte[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur]         = useState<string | null>(null)
  const [toutAfficher, setToutAfficher] = useState(false)
  const [showRejoindre, setShowRejoindre] = useState(false)
  const [showLightModal, setShowLightModal] = useState(false)

  const handleCreer = () => {
    if (estLight) { setShowLightModal(true); return }
    navigate('/cagnottes/nouvelle')
  }

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const data = await listerMesCagnottes()
      setCagnottes(data)
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])

  // Tri identique au Flutter _ContenuHome : actives (non terminées) puis
  // terminées triées par date de création décroissante.
  const enCours   = cagnottes.filter(c => !estTermineeCagnotte(c))
  const terminees = cagnottes.filter(estTermineeCagnotte)
    .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))

  const totalGlobal = cagnottes.reduce((s, c) => s + c.montantCollecte, 0)
  const visibles    = toutAfficher ? enCours : enCours.slice(0, 6)
  const restantes   = enCours.length - 6

  return (
    <div style={{ background: T.surface, minHeight: '100%' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes teaserShimmer { 0%,63% { transform: translateX(-120%); opacity: 0 } 66% { opacity: 1 } 100% { transform: translateX(130%); opacity: 0 } }`}</style>

      {/* ── Hero plein cadre — en-tête vert pleine largeur, coins bas arrondis
          (miroir _EnTeteHero Flutter : header fixe, pas de marge blanche). ── */}
      <CarteHero
        total={totalGlobal}
        nombreActives={enCours.length}
        onRejoindre={() => setShowRejoindre(true)}
        onCreer={handleCreer}
      />

      {/* ── Contenu (liste + teaser) avec marge latérale ──────────────────── */}
      <div style={{ padding: '24px 20px 32px' }}>

        {/* ── Contenu ───────────────────────────────────────────────────── */}
        {chargement ? (
          <div>
            <div style={{ height: '34px', borderRadius: 8, background: T.surfaceDeep, width: '40%', marginBottom: '14px' }} />
            {[0, 1, 2].map(i => <SkeletonCarte key={i} />)}
          </div>
        ) : erreur ? (
          <EtatErreur message={erreur} />
        ) : cagnottes.length === 0 ? (
          <EtatVide />
        ) : (
          <>
            {enCours.length > 0 && (
              <div>
                <SectionHeader title="Vos cagnottes" count={enCours.length} />
                {visibles.map((c, i) => (
                  <CarteCagnotte key={c.id} c={c} delay={i * 0.08} />
                ))}
                {enCours.length > 6 && (
                  <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '8px' }}>
                    <button
                      onClick={() => setToutAfficher(v => !v)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', fontWeight: 600, color: T.primary, fontFamily: 'inherit',
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px',
                      }}
                    >
                      <IconChevronDown open={toutAfficher} />
                      {toutAfficher
                        ? 'Voir moins'
                        : `Voir plus (${restantes} ${restantes > 1 ? 'autres' : 'autre'})`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Terminées ─────────────────────────────────────────────── */}
            {terminees.length > 0 && (
              <div style={{ marginTop: enCours.length > 0 ? '32px' : 0 }}>
                <SectionHeader title="Terminées" count={terminees.length} muted />
                {terminees.map((c, i) => (
                  <CarteCagnotte key={c.id} c={c} delay={i * 0.06} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Teaser tontine (P2 #6) — la tontine annoncée comme promesse ──── */}
        {!chargement && !erreur && !TONTINES_ACTIVES && (
          <div style={{ marginTop: '28px' }}>
            <TeaserTontine />
          </div>
        )}
      </div>

      {/* ── Modal rejoindre ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRejoindre && (
          <ModalRejoindre
            onClose={() => setShowRejoindre(false)}
            onSuccess={charger}
          />
        )}
      </AnimatePresence>

      {/* ── Modal compte light ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLightModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,30,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowLightModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: T.surface, borderRadius: '24px 24px 0 0', padding: '20px 24px 44px', width: '100%' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 20px' }} />
              <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>🔒</div>
              <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong, marginBottom: '8px', textAlign: 'center' }}>
                Profil incomplet
              </p>
              <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '24px', lineHeight: 1.6, textAlign: 'center' }}>
                Pour créer une cagnotte, vous devez compléter votre profil avec votre date de naissance.
              </p>
              <button
                onClick={() => { setShowLightModal(false); navigate('/inscription') }}
                style={{ width: '100%', height: '52px', borderRadius: '16px', border: 'none', background: T.primary, color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginBottom: '10px' }}
              >
                Compléter mon profil
              </button>
              <button
                onClick={() => setShowLightModal(false)}
                style={{ width: '100%', height: '46px', borderRadius: '14px', border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSec, fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Plus tard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
