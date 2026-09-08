/**
 * Création de cagnotte / tontine — réplique fidèle de create_cagnotte_screen.dart
 * (+ type_cagnotte_sheet.dart pour la sélection de type, + tondo_stepper logique).
 *
 * Architecture (identique au Flutter) :
 *   - Une feuille de choix de type (TypeCagnotteSheet) s'affiche tant qu'aucun type
 *     n'est sélectionné (sauf si fourni via location.state.type depuis l'accueil).
 *   - Puis un assistant pas-à-pas (PageView) :
 *       • Tontine    = 5 étapes (nom, membres, montant+pénalité, fréquence, retrait+créer)
 *       • Cotisation = 4 étapes (nom, objectif+durée, retrait, reversement+CGU+créer)
 *   - Navigation pilotée par les boutons « Suivant / Retour » uniquement (jamais par
 *     le glissement). Une barre supérieure interne reproduit l'AppBar Flutter :
 *     flèche retour → étape précédente, ou sortie de l'écran depuis l'étape 0.
 *   - Couleur d'accent : primaire (vert) pour tontine, or pour cagnotte.
 *   - Numéro de retrait pré-rempli + KYC opérateur réel, immutable après création.
 *   - Identifiant court auto via genererReference().
 *   - Conditions d'utilisation : lien → bottom sheet (résumé court + blocs légaux).
 *   - POST réel via creerCagnotte().
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { TONTINES_ACTIVES } from '@/lib/featureFlags'
import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import {
  genererReference,
  verifierNumeroRetrait,
  creerCagnotte,
} from '@/lib/cagnottesApi'
import type { Visibilite } from '@/lib/cagnottesApi'
import { useCgu } from '@/hooks/useCgu'

// ── Types métier ────────────────────────────────────────────────────────────
type TypeC = 'tontine' | 'cotisation'
type Periodicite = 'hebdomadaire' | 'mensuelle'
// Choix simplifié exposé à l'utilisateur (traduit en Periodicite + intervalle).
type PeriodiciteCourte = '1sem' | '2sem' | '1mois'
type FreqPenalite = 'heure' | 'jour'
type ChoixRetrait = 'mon_numero' | 'autre_numero'
type KycStatut = 'idle' | 'en_cours' | 'ok' | 'echec' | 'indisponible' | 'moov_warning'

// ── Courbe d'animation easeOutCubic (équivalent Curves.easeOutCubic Flutter) ──
const EASE_OUT_CUBIC: [number, number, number, number] = [0.33, 1, 0.68, 1]

// ── Génère un identifiant court local (fallback si le backend est indisponible) ─
function genererIdLocal(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ── Formatage de date « JJ/MM/AAAA » ──────────────────────────────────────────
function formaterDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ════════════════════════════════════════════════════════════════════════════
// SVG Icons (équivalents Material Icons utilisés dans le Flutter)
// ════════════════════════════════════════════════════════════════════════════

// Flèche retour AppBar (arrow_back_ios_new_rounded)
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
// Flèche « Suivant » (arrow_forward_rounded)
const IconForward = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)
// check_circle_outline_rounded
const IconCheckCircleOutline = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
// view_week_rounded
const IconWeek = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="9" y1="4" x2="9" y2="22" /><line x1="15" y1="4" x2="15" y2="22" />
  </svg>
)
// date_range_rounded
const IconDateRange = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
// calendar_month_rounded
const IconMonth = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
// hourglass_bottom_rounded
const IconHourglass = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 22h14M5 2h14" /><path d="M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22" /><path d="M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2" />
  </svg>
)
// wb_sunny_outlined
const IconSun = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
// autorenew_rounded
const IconAutorenew = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
  </svg>
)
// phone_iphone_rounded
const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
)
// dialpad_rounded
const IconDialpad = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="20" r="1" /><circle cx="6" cy="8" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="18" cy="8" r="1" /><circle cx="6" cy="14" r="1" /><circle cx="12" cy="14" r="1" /><circle cx="18" cy="14" r="1" />
  </svg>
)
// close_rounded
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
// check_circle_rounded (KYC ok)
const IconCheckCircle = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
// cancel_rounded (KYC échec)
const IconCancel = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
)
// warning_amber_rounded (Moov)
const IconWarning = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
// help_outline_rounded (indisponible)
const IconHelpOutline = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
// info_outline_rounded (lien CGU, petit)
const IconInfoSmall = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)
// groups_2_rounded (icône tontine, sheet)
const IconGroups = ({ color }: { color: string }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)
// loop_rounded (badge tontine)
const IconLoop = ({ color }: { color: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
)
// volunteer_activism_rounded (icône cagnotte, sheet)
const IconVolunteer = ({ color }: { color: string }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)
// add_rounded (badge cagnotte)
const IconAddSmall = ({ color }: { color: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
// arrow_forward_ios_rounded (chevron carte sheet)
const IconChevron = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
// link_rounded (pied CGU)
const IconLink = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)

// ════════════════════════════════════════════════════════════════════════════
// Feuille de choix de type — TypeCagnotteSheet
// ════════════════════════════════════════════════════════════════════════════

/** Carte cliquable d'un type de collecte (Tontine / Cagnotte). */
function CarteType({
  icone, badge, badgeColor, titre, description, accent, onTap, delay,
  disabled = false, badgeLabel,
}: {
  icone: React.ReactNode
  badge: React.ReactNode
  badgeColor: string
  titre: string
  description: string
  accent: string
  onTap: () => void
  delay: number
  disabled?: boolean
  badgeLabel?: string
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onMouseDown={disabled ? undefined : () => setPressed(true)}
      onMouseUp={disabled ? undefined : () => setPressed(false)}
      onMouseLeave={disabled ? undefined : () => setPressed(false)}
      onClick={disabled ? undefined : onTap}
      style={{
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.1s ease-out, background 0.15s, border-color 0.15s',
        padding: '16px', borderRadius: '18px',
        // Désactivée (ex : tontines au lancement) → grisée et non cliquable.
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: pressed ? `${accent}10` : T.surface,
        border: `1.5px solid ${accent}${pressed ? '80' : '40'}`,
        boxShadow: `0 4px 14px ${accent}12`,
        display: 'flex', alignItems: 'center', gap: '14px',
      }}
    >
      {/* Pastille icône + badge superposé */}
      <div style={{
        width: '58px', height: '58px', borderRadius: '16px', flexShrink: 0, position: 'relative',
        background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icone}
        <div style={{
          position: 'absolute', right: '-4px', bottom: '-4px', width: '18px', height: '18px',
          borderRadius: '50%', background: accent, border: `2px solid ${badgeColor}26`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {badge}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontSize: '17px', fontWeight: 800, color: T.textStrong }}>{titre}</p>
          {badgeLabel && (
            <span style={{
              fontSize: '10.5px', fontWeight: 700, color: accent,
              background: `${accent}24`, borderRadius: '20px', padding: '2px 8px',
            }}>{badgeLabel}</span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: T.textSec, lineHeight: 1.4, marginTop: '4px' }}>{description}</p>
      </div>
      <IconChevron color={`${accent}80`} />
    </motion.div>
  )
}

/** Bottom sheet « Que voulez-vous faire ? » — renvoie le type choisi. */
function TypeCagnotteSheet({ onChoisir }: { onChoisir: (t: TypeC) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20,32,46,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: EASE_OUT_CUBIC }}
        style={{
          width: '100%', maxWidth: '480px',
          background: T.surfaceEl,
          borderRadius: '28px 28px 0 0',
          padding: '12px 20px 36px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Poignée */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: T.border }} />
        </div>
        <div style={{ height: '22px' }} />
        <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong, textAlign: 'center' }}>
          Que voulez-vous faire ?
        </p>
        <div style={{ height: '22px' }} />
        <CarteType
          accent={T.primary}
          badgeColor={T.primary}
          icone={<IconGroups color={T.primary} />}
          badge={<IconLoop color="#fff" />}
          titre="Tontine"
          description="On met tous la même somme. À chaque tour, quelqu'un repart avec toute la mise."
          onTap={() => onChoisir('tontine')}
          delay={0.06}
          disabled={!TONTINES_ACTIVES}
          badgeLabel={TONTINES_ACTIVES ? undefined : 'Bientôt'}
        />
        <div style={{ height: '12px' }} />
        <CarteType
          accent={T.accent}
          badgeColor={T.accent}
          icone={<IconVolunteer color={T.accent} />}
          badge={<IconAddSmall color="#fff" />}
          titre="Cagnotte"
          description="Tout le monde met de l'argent pour quelqu'un — un anniversaire, un projet, une urgence."
          onTap={() => onChoisir('cotisation')}
          delay={0.16}
        />
      </motion.div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Primitives partagées (titre d'étape, champs, pills, bouton suivant)
// ════════════════════════════════════════════════════════════════════════════

/** Description d'étape (gris). Le titre en gras n'est plus par étape : il est
 *  affiché une seule fois en haut du contenu (« Nouvelle cagnotte / tontine »). */
function TitreEtape({ sous }: { sous: string }) {
  return (
    <p style={{ fontSize: '14px', color: T.textTert, marginTop: '4px', lineHeight: 1.4 }}>{sous}</p>
  )
}

/**
 * Interrupteur segmenté « Non / Oui » (miroir de _ToggleOuiNon Flutter).
 * Non par défaut ; une pastille coulissante marque le choix courant.
 */
function ToggleOuiNon({ valeur, accent, onChange }: {
  valeur: boolean; accent: string; onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', position: 'relative',
      background: T.surfaceEl, borderRadius: '14px',
      border: `1.3px solid ${T.border}`, padding: '4px', height: '52px',
    }}>
      {/* Pastille coulissante : moitié gauche (Non) ou droite (Oui). */}
      <div style={{
        position: 'absolute', top: '4px', bottom: '4px',
        left: valeur ? '50%' : '4px', right: valeur ? '4px' : '50%',
        background: valeur ? accent : T.borderStr,
        borderRadius: '10px', transition: 'left 0.22s, right 0.22s, background 0.22s',
      }} />
      {(['Non', 'Oui'] as const).map((lbl, i) => {
        const actif = (i === 1) === valeur
        return (
          <button
            key={lbl}
            type="button"
            onClick={() => onChange(i === 1)}
            style={{
              flex: 1, position: 'relative', zIndex: 1,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
              color: actif ? (valeur ? T.surface : T.textStrong) : T.textSec,
              transition: 'color 0.2s',
            }}
          >
            {lbl}
          </button>
        )
      })}
    </div>
  )
}

/** Libellé de section en majuscules espacées. */
function LabelSection({ children }: { children: string }) {
  return (
    <p style={{
      fontSize: '11px', fontWeight: 700, color: T.textSec,
      letterSpacing: '1.2px', textTransform: 'uppercase',
    }}>{children}</p>
  )
}

/** Champ texte avec label flottant et bordure colorée selon l'accent. */
function TField({
  label, hint, suffix, value, onChange, error, inputMode, onEnter, accent, autoFocus,
}: {
  label: string; hint?: string; suffix?: string
  value: string; onChange: (v: string) => void
  error?: string; inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode']
  onEnter?: () => void; accent: string; autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  // Donne le focus au montage si demandé (équivaut au requestFocus Flutter).
  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])
  const labelUp = focused || value.length > 0
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: T.surfaceEl, borderRadius: '16px',
        border: `${focused ? '2px' : '1.3px'} solid ${error ? T.error : focused ? accent : T.border}`,
        padding: '0 14px', transition: 'border-color 0.15s',
      }}>
        <div style={{ flex: 1, position: 'relative', height: '58px' }}>
          <label style={{
            position: 'absolute', left: 0, pointerEvents: 'none', transition: 'all 0.15s',
            top: labelUp ? '9px' : '50%',
            transform: labelUp ? 'none' : 'translateY(-50%)',
            fontSize: labelUp ? '11px' : '15px',
            fontWeight: labelUp ? 600 : 400,
            color: focused ? accent : T.textSec,
          }}>{label}</label>
          <input
            ref={ref}
            inputMode={inputMode}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
            placeholder={focused ? hint : undefined}
            style={{
              position: 'absolute', bottom: '9px', left: 0, right: 0,
              background: 'none', border: 'none', outline: 'none',
              fontSize: '16px', fontWeight: 500, color: T.textStrong,
              fontFamily: 'inherit', width: '100%',
            }}
          />
        </div>
        {suffix && (
          <span style={{ fontSize: '14px', fontWeight: 600, color: T.textSec, flexShrink: 0 }}>{suffix}</span>
        )}
      </div>
      {error && (
        <p style={{ fontSize: '12px', color: T.error, fontWeight: 500, marginTop: '4px', paddingLeft: '14px' }}>{error}</p>
      )}
    </div>
  )
}

/** Champ description multiligne (cagnotte publique) — bordure colorée + compteur. */
function DescriptionField({
  value, onChange, accent,
}: { value: string; onChange: (v: string) => void; accent: string }) {
  const [focused, setFocused] = useState(false)
  const labelUp = focused || value.length > 0
  return (
    <div>
      <div style={{
        position: 'relative',
        background: T.surfaceEl, borderRadius: '16px',
        border: `${focused ? '2px' : '1.3px'} solid ${focused ? accent : T.border}`,
        padding: '0 14px', transition: 'border-color 0.15s',
      }}>
        <label style={{
          position: 'absolute', left: '14px', pointerEvents: 'none', transition: 'all 0.15s',
          top: '12px',
          fontSize: labelUp ? '11px' : '15px',
          fontWeight: labelUp ? 600 : 400,
          color: focused ? accent : T.textSec,
        }}>Description</label>
        <textarea
          value={value}
          maxLength={2000}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? 'Racontez votre cagnotte : pourquoi, pour qui…' : undefined}
          rows={4}
          style={{
            width: '100%', resize: 'vertical', minHeight: '92px',
            background: 'none', border: 'none', outline: 'none',
            paddingTop: '30px', paddingBottom: '12px',
            fontSize: '16px', fontWeight: 500, color: T.textStrong,
            fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.4,
          }}
        />
      </div>
      {/* Compteur de caractères (maxLength 2000, miroir Flutter). */}
      <p style={{ fontSize: '11px', color: T.textTert, textAlign: 'right', marginTop: '4px' }}>
        {value.length}/2000
      </p>
    </div>
  )
}

/** Pill de sélection (fréquence ou jour) — fond primaire quand active. */
function Pill({
  label, icon, actif, onTap,
}: { label: string; icon?: React.ReactNode; actif: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      style={{
        flex: 1, padding: '14px 6px', borderRadius: '14px', cursor: 'pointer',
        background: actif ? T.primary : T.surfaceEl,
        border: `1.4px solid ${actif ? T.primary : T.border}`,
        boxShadow: actif ? `0 4px 12px rgba(10,104,71,0.25)` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        transition: 'all 0.22s', color: actif ? T.surface : T.textSec, fontFamily: 'inherit',
      }}
    >
      {icon}
      <span style={{ fontSize: '14px', fontWeight: 700 }}>{label}</span>
    </button>
  )
}

/** Bouton pleine largeur « Suivant » (ou libellé personnalisé). */
function BoutonSuivant({ onTap, accent, label = 'Suivant' }: { onTap: () => void; accent: string; label?: string }) {
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%', height: '52px', borderRadius: '14px', border: 'none',
        background: accent, color: T.surface, cursor: 'pointer',
        fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}
    >
      <IconForward />
      {label}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Sélecteur de visibilité (cagnotte ouverte, étape « Visibilité »)
// Réplique de _SelecteurVisibilite + _OptionVisibilite (create_cagnotte_screen.dart).
// ════════════════════════════════════════════════════════════════════════════

// Icône cadenas — option « Privée ».
const IconLock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)
// Icône globe — option « Publique ».
const IconPublic = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
)
// Icône bouclier — note « Soumise à validation ».
const IconShieldCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

// Une carte d'option du sélecteur de visibilité (Privée ou Publique).
function OptionVisibilite({
  actif, accent, icone, titre, sous, onTap,
}: {
  actif: boolean; accent: string; icone: React.ReactNode
  titre: string; sous: string; onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      style={{
        flex: 1, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
        padding: '14px 12px', borderRadius: '16px',
        background: actif ? `rgba(10,104,71,0.08)` : T.surfaceEl,
        border: `${actif ? '2px' : '1.2px'} solid ${actif ? accent : T.border}`,
        transition: 'all 0.18s',
      }}
    >
      <span style={{ color: actif ? accent : T.textSec, display: 'inline-flex' }}>{icone}</span>
      <p style={{ fontSize: '15px', fontWeight: 800, color: T.textStrong, marginTop: '8px' }}>{titre}</p>
      <p style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>{sous}</p>
    </button>
  )
}

// Sélecteur Privée / Publique affiché après le nom de la cagnotte.
function SelecteurVisibilite({
  valeur, accent, onChange,
}: { valeur: Visibilite; accent: string; onChange: (v: Visibilite) => void }) {
  return (
    <div>
      <LabelSection>Visibilité</LabelSection>
      <div style={{ height: '10px' }} />
      <div style={{ display: 'flex', gap: '12px' }}>
        <OptionVisibilite
          actif={valeur === 'prive'} accent={accent}
          icone={<IconLock />} titre="Privée" sous="Vous et vos membres"
          onTap={() => onChange('prive')}
        />
        <OptionVisibilite
          actif={valeur === 'public'} accent={accent}
          icone={<IconPublic />} titre="Publique" sous="Visible de tous"
          onTap={() => onChange('public')}
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Carte pénalité de retard (tontine, étape montant)
// ════════════════════════════════════════════════════════════════════════════

function CartePenalite({
  sansPenalite, onSansPenalite,
  penaliteMontant, onPenaliteMontant,
  penaliteFrequence, onPenaliteFrequence,
  erreur, accent,
}: {
  sansPenalite: boolean; onSansPenalite: (v: boolean) => void
  penaliteMontant: string; onPenaliteMontant: (v: string) => void
  penaliteFrequence: FreqPenalite; onPenaliteFrequence: (v: FreqPenalite) => void
  erreur?: string; accent: string
}) {
  return (
    <div style={{
      padding: '10px 14px 14px', borderRadius: '16px', transition: 'all 0.22s',
      background: sansPenalite ? T.surfaceEl : T.warningSoft,
      border: `1.3px solid ${sansPenalite ? T.border : `${T.warning}66`}`,
    }}>
      {/* Case « Pas de pénalité de retard » */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={sansPenalite}
          onChange={e => onSansPenalite(e.target.checked)}
          style={{ width: '22px', height: '22px', accentColor: T.primary, cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontSize: '16px', fontWeight: 600, color: T.textStrong }}>
          Pas de pénalité de retard
        </span>
      </label>
      <AnimatePresence>
        {!sansPenalite && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: EASE_OUT_CUBIC }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ height: '14px' }} />
            <TField
              label="Montant de la pénalité"
              hint="ex : 1 000"
              suffix="FCFA"
              value={penaliteMontant}
              onChange={onPenaliteMontant}
              inputMode="numeric"
              error={erreur}
              accent={accent}
            />
            <div style={{ height: '12px' }} />
            <LabelSection>Fréquence</LabelSection>
            <div style={{ height: '8px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Pill label="Par heure" icon={<IconHourglass />} actif={penaliteFrequence === 'heure'} onTap={() => onPenaliteFrequence('heure')} />
              <Pill label="Par jour" icon={<IconSun />} actif={penaliteFrequence === 'jour'} onTap={() => onPenaliteFrequence('jour')} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Reversement automatique (cotisation ouverte, dernière étape)
// ════════════════════════════════════════════════════════════════════════════

function SectionReversementAuto({
  reversementAuto, onChanged, accent,
}: { reversementAuto: boolean; onChanged: (v: boolean) => void; accent: string }) {
  return (
    <div style={{
      padding: '12px 14px 14px 16px', borderRadius: '16px', transition: 'all 0.22s',
      background: reversementAuto ? `${accent}10` : T.surfaceEl,
      border: `1.3px solid ${reversementAuto ? `${accent}66` : T.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ color: reversementAuto ? accent : T.textSec, paddingTop: '2px' }}><IconAutorenew /></span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '18px', fontWeight: 700, color: T.textStrong, marginBottom: '2px' }}>
            Reversement systématique
          </p>
          <p style={{ fontSize: '15px', color: reversementAuto ? accent : T.textSec, fontWeight: 500, lineHeight: 1.4 }}>
            {reversementAuto
              ? 'Chaque paiement reçu est reversé en fin de journée sur votre numéro de retrait.'
              : 'Le reversement se fera manuellement depuis la page de la cagnotte.'}
          </p>
        </div>
        {/* Toggle switch */}
        <div
          onClick={() => onChanged(!reversementAuto)}
          style={{ position: 'relative', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}
        >
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '12px',
            background: reversementAuto ? `${accent}59` : T.border, transition: 'background 0.2s',
          }} />
          <div style={{
            position: 'absolute', width: '20px', height: '20px', borderRadius: '50%',
            background: reversementAuto ? accent : '#fff', top: '2px',
            left: reversementAuto ? '22px' : '2px', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Section numéro de retrait + KYC opérateur
// ════════════════════════════════════════════════════════════════════════════

/** Indicateur compact d'état KYC. */
function KycIndicateur({ statut }: { statut: KycStatut }) {
  if (statut === 'idle') return null
  if (statut === 'en_cours') return (
    <div style={{
      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
      border: `2.5px solid ${T.primary}`, borderTopColor: 'transparent',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
  if (statut === 'ok') return <IconCheckCircle color={T.success} />
  if (statut === 'echec') return <IconCancel color={T.error} />
  if (statut === 'moov_warning') return <IconWarning color={T.warning} />
  return <IconHelpOutline color={T.textTert} />
}

/** Couleurs du bandeau KYC selon le statut. */
function bandeauKycCouleurs(s: KycStatut): { bg: string; color: string } {
  if (s === 'ok') return { bg: T.successSoft, color: T.success }
  if (s === 'echec') return { bg: T.errorSoft, color: T.error }
  if (s === 'moov_warning') return { bg: `${T.warning}1F`, color: T.warning }
  if (s === 'indisponible') return { bg: T.surfaceEl, color: T.textTert }
  return { bg: T.surfaceEl, color: T.textSec }
}

function SectionNumeroRetrait({
  userNumero, choix, onChoix, autreNumero, onAutreNumero, kycStatut, kycMessage,
}: {
  userNumero: string
  choix: ChoixRetrait | null; onChoix: (c: ChoixRetrait) => void
  autreNumero: string; onAutreNumero: (v: string) => void
  kycStatut: KycStatut; kycMessage: string
}) {
  // Carte d'option (mon numéro / autre numéro) avec bordure primaire si sélectionnée.
  const CarteOption = ({
    id, icone, titre, sousTitre, enfant,
  }: {
    id: ChoixRetrait; icone: React.ReactNode; titre: string; sousTitre: string; enfant?: React.ReactNode
  }) => {
    const selected = choix === id
    const ks: KycStatut = selected ? kycStatut : 'idle'
    const showBandeau = selected && kycMessage.length > 0 && ks !== 'idle' && ks !== 'en_cours'
    const c = bandeauKycCouleurs(kycStatut)
    return (
      <div
        onClick={() => onChoix(id)}
        style={{
          padding: '12px 14px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.22s',
          background: selected ? `rgba(10,104,71,0.05)` : T.surfaceEl,
          border: `1.5px solid ${selected ? `rgba(10,104,71,0.50)` : T.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: T.primary, flexShrink: 0 }}>{icone}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: T.textStrong }}>{titre}</p>
            <p style={{ fontSize: '15px', color: T.textSec }}>{sousTitre}</p>
          </div>
          <KycIndicateur statut={ks} />
        </div>
        {enfant}
        {showBandeau && (
          <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '10px', background: c.bg }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: c.color }}>{kycMessage}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '16px', fontWeight: 700, color: T.textStrong, marginBottom: '14px' }}>
        Numéro de retrait
      </p>
      <CarteOption
        id="mon_numero"
        icone={<IconPhone />}
        titre={userNumero || 'Votre numéro'}
        sousTitre="Mon numéro Mobile Money"
      />
      <div style={{ height: '10px' }} />
      <CarteOption
        id="autre_numero"
        icone={<IconDialpad />}
        titre="Un autre numéro"
        sousTitre="Saisir un numéro différent"
        enfant={
          choix === 'autre_numero' ? (
            // Champ téléphone Gabon (indicatif +241 figé + saisie locale 0XXXXXXXX).
            <div style={{ marginTop: '14px' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  height: '58px', padding: '0 12px', borderRadius: '16px', display: 'flex', alignItems: 'center',
                  background: T.surface, border: `1.2px solid ${T.border}`,
                  fontSize: '14px', fontWeight: 700, color: T.textStrong, whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  🇬🇦 +241
                </div>
                <input
                  inputMode="numeric"
                  value={autreNumero}
                  onChange={e => onAutreNumero(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="077 00 00 00"
                  style={{
                    flex: 1, height: '58px', padding: '0 14px', borderRadius: '16px',
                    background: T.surfaceEl, border: `1.2px solid ${T.border}`, outline: 'none',
                    fontSize: '16px', fontWeight: 500, color: T.textStrong, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          ) : undefined
        }
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Lien + Bottom sheet des conditions d'utilisation
// ════════════════════════════════════════════════════════════════════════════

/** Lien centré « Rappel des conditions d'utilisation » → ouvre la sheet CGU. */
function LienRappelCGU({ accent, onOpen }: { accent: string; onOpen: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={onOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit',
        }}
      >
        <IconInfoSmall color={`${accent}99`} />
        <span style={{ fontSize: '13px', color: `${accent}B3` }}>
          Rappel des conditions d'utilisation
        </span>
      </button>
    </div>
  )
}

/** Bottom sheet CGU — résumé court en puces + blocs légaux détaillés. */
function BottomSheetCgu({ onClose }: { onClose: () => void }) {
  // Résumé et détail produits par le serveur depuis la config opérateur : les
  // copies figées qui vivaient ici annonçaient encore des frais de retrait à la
  // charge du cotisant, retirés le 31 août.
  const { cgu, erreur: cguErreur } = useCgu()
  const RESUME = cgu?.resume ?? []
  const DETAIL = cgu?.blocs ?? []
  if (cguErreur) {
    RESUME.push(
      'Conditions momentanément indisponibles. Vous pouvez les consulter sur tonji.ga/conditions.',
    )
  }
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,32,46,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: EASE_OUT_CUBIC }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px', maxHeight: '85vh',
          background: T.surface, borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Poignée */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 16px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: T.border }} />
        </div>
        <div style={{ padding: '0 22px' }}>
          <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong }}>Conditions d'utilisation</p>
          <p style={{ fontSize: '12px', color: T.primary, fontWeight: 600, marginTop: '2px' }}>tonji.com</p>
        </div>
        <div style={{ height: '14px' }} />
        <div style={{ height: '1px', background: T.border }} />
        {/* Corps scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 8px' }}>
          {RESUME.map((txt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '4px 0' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.primary, flexShrink: 0, marginTop: '7px' }} />
              <p style={{ fontSize: '14px', color: T.textStrong, lineHeight: 1.45 }}>{txt}</p>
            </div>
          ))}
          <div style={{ height: '20px' }} />
          <div style={{ height: '1px', background: T.border }} />
          <div style={{ height: '20px' }} />
          {DETAIL.map((bloc, i) => (
            <div key={i} style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 800, color: T.primary, marginBottom: '4px' }}>{bloc.titre}</p>
              <p style={{ fontSize: '12px', color: T.textSec, lineHeight: 1.5 }}>{bloc.corps}</p>
            </div>
          ))}
        </div>
        <div style={{ height: '1px', background: T.border }} />
        {/* Pied — lien CGU complet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 22px calc(16px + env(safe-area-inset-bottom))' }}>
          <IconLink color={T.primary} />
          <a
            href="https://tonji.com/conditions-utilisation"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '12px', color: T.primary, fontWeight: 600, textDecoration: 'underline' }}
          >
            tonji.com/conditions-utilisation
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Bouton « Créer » (dernière étape)
// ════════════════════════════════════════════════════════════════════════════

function BoutonCreer({ enCours, label, onTap, accent }: { enCours: boolean; label: string; onTap: () => void; accent: string }) {
  return (
    <button
      onClick={onTap}
      disabled={enCours}
      style={{
        width: '100%', height: '52px', borderRadius: '14px', border: 'none',
        background: enCours ? `${accent}80` : accent, color: T.surface,
        cursor: enCours ? 'default' : 'pointer',
        fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}
    >
      {enCours ? (
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%',
          border: `2.4px solid rgba(255,255,255,0.4)`, borderTopColor: T.surface,
          animation: 'spin 0.8s linear infinite',
        }} />
      ) : (
        <>
          <IconCheckCircleOutline />
          {label}
        </>
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Wrapper d'animation d'étape (fadeIn + slideY décalé, comme flutter_animate)
// ════════════════════════════════════════════════════════════════════════════

function AnimItem({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE_OUT_CUBIC }}
    >
      {children}
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════════════════════════════════════════

export default function MobileCreateCagnotte() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)

  // Seules les associations peuvent créer une cagnotte PUBLIQUE (crowdfunding
  // modéré) : l'étape de portée n'apparaît que pour elles ; les autres comptes
  // créent des cagnottes privées. Le backend applique la même règle.
  const estAssociation = user?.typeCompte === 'association'
  // Plafond total de collecte (UX) selon le type de compte. Le backend enforce
  // la valeur exacte configurée en base (renvoie une 422 si dépassement).
  const plafondCible = estAssociation ? 10000000 : 2500000

  // Type éventuellement transmis par l'accueil via location.state (sinon sheet).
  const typeFromState = (location.state as { type?: TypeC } | null)?.type ?? null

  // ── État global de l'assistant ──────────────────────────────────────────────
  // P1 #1 « Cagnotte d'abord » : au lancement (tontines off), on saute la feuille
  // de choix de type et on démarre directement le parcours cagnotte.
  const [type, setType] = useState<TypeC | null>(
    typeFromState ?? (TONTINES_ACTIVES ? null : 'cotisation')
  )
  const [etape, setEtape] = useState(0)            // index de l'étape courante (0-based)
  const [showCgu, setShowCgu] = useState(false)    // bottom sheet CGU

  // ── Champs du formulaire ────────────────────────────────────────────────────
  const [titre, setTitre] = useState('')
  const [participants, setParticipants] = useState('')
  const [montantCycle, setMontantCycle] = useState('')
  const [montantCible, setMontantCible] = useState('')
  const [dateFin, setDateFin] = useState('')
  // Étapes Objectif / Durée : question Non/Oui d'abord (Non par défaut), le
  // champ n'apparaît qu'en cas de Oui (miroir _aObjectifMontant / _aDateFin).
  const [aObjectifMontant, setAObjectifMontant] = useState(false)
  const [aDateFin, setADateFin] = useState(false)

  // Périodicité — choix simplifié + valeurs métier dérivées.
  const [periodiciteCourte, setPeriodiciteCourte] = useState<PeriodiciteCourte>('1sem')
  const [periodicite, setPeriodicite] = useState<Periodicite>('hebdomadaire')
  const [intervalle, setIntervalle] = useState(1)
  const [jourSemaine, setJourSemaine] = useState(1)   // 1 = lundi
  const [jourMois, setJourMois] = useState(7)

  // Pénalité de retard (tontine).
  const [penaliteOuvertes, setPenaliteOuvertes] = useState(false)
  const [sansPenalite, setSansPenalite] = useState(true)
  const [penaliteMontant, setPenaliteMontant] = useState('')
  const [penaliteFrequence, setPenaliteFrequence] = useState<FreqPenalite>('jour')

  // Reversement auto (cotisation ouverte).
  const [reversementAuto, setReversementAuto] = useState(true)

  // Visibilité (cotisation ouverte uniquement ; tontine = toujours privée).
  const [visibilite, setVisibilite] = useState<Visibilite>('prive')
  // Description / histoire (cagnotte publique uniquement).
  const [description, setDescription] = useState('')

  // Numéro de retrait + KYC.
  const [choix, setChoix] = useState<ChoixRetrait | null>(null)
  const [autreNumero, setAutreNumero] = useState('')
  const [kycStatut, setKycStatut] = useState<KycStatut>('idle')
  const [kycMessage, setKycMessage] = useState('')
  const [numeroRetraitFinal, setNumeroRetraitFinal] = useState<string | null>(null)

  // Identifiant + création.
  const [reference, setReference] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const estTontine = type === 'tontine'
  const accent = estTontine ? T.primary : T.accent
  const userNumero = user?.telephone ?? ''

  // Toast d'erreur transitoire (équivaut à TonjiToast.error).
  const [toast, setToast] = useState('')

  // Charge l'identifiant court depuis le backend au montage (fallback local sinon).
  useEffect(() => {
    genererReference()
      .then(ref => setReference(ref))
      .catch(() => setReference(genererIdLocal()))
  }, [])

  // ── Traduit le choix simplifié de fréquence en valeurs métier. ───────────────
  const setPeriodiciteChoix = (choixP: PeriodiciteCourte) => {
    setPeriodiciteCourte(choixP)
    if (choixP === '1sem') { setPeriodicite('hebdomadaire'); setIntervalle(1); setJourSemaine(1) }
    else if (choixP === '2sem') { setPeriodicite('hebdomadaire'); setIntervalle(2); setJourSemaine(1) }
    else { setPeriodicite('mensuelle'); setIntervalle(1); setJourMois(7) }
  }

  // ── KYC : vérification du « mon numéro » au clic. ────────────────────────────
  const verifierMonNumero = () => {
    // Déjà vérifié → pas d'appel réseau inutile (parité avec Flutter).
    if (choix === 'mon_numero' && kycStatut === 'ok') return
    setChoix('mon_numero')
    setKycStatut('en_cours')
    setKycMessage('')
    setNumeroRetraitFinal(null)
    const local = userNumero.startsWith('+241') ? '0' + userNumero.slice(4) : userNumero
    lancerKyc(local)
  }

  // ── KYC : vérification automatique du « autre numéro » à 9 chiffres. ─────────
  useEffect(() => {
    if (choix !== 'autre_numero') return
    const v = autreNumero.trim()
    if (v.length === 9 && /^0\d{8}$/.test(v)) {
      let cancelled = false
      setKycStatut('en_cours')
      setKycMessage('')
      setNumeroRetraitFinal(null)
      verifierNumeroRetrait(v)
        .then(res => { if (!cancelled) appliquerResultatKyc(res, v) })
        .catch(() => {
          if (!cancelled) {
            setKycStatut('indisponible')
            setKycMessage("Vérification indisponible pour l'instant.")
          }
        })
      return () => { cancelled = true }
    } else {
      // Numéro incomplet → réinitialise le statut.
      if (kycStatut !== 'idle') {
        setKycStatut('idle')
        setKycMessage('')
        setNumeroRetraitFinal(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autreNumero, choix])

  // Lance la vérification KYC d'un numéro local 0XXXXXXXX (cas « mon numéro »).
  const lancerKyc = (local9: string) => {
    verifierNumeroRetrait(local9)
      .then(res => appliquerResultatKyc(res, local9))
      .catch(() => {
        setKycStatut('indisponible')
        setKycMessage("Vérification indisponible pour l'instant.")
      })
  }

  // Applique le résultat KYC (opérateur + kyc_ok + message) et calcule le numéro E.164.
  const appliquerResultatKyc = (
    res: { operateur: string; kyc_ok?: boolean; message?: string },
    local9: string,
  ) => {
    const op = res.operateur
    let statut: KycStatut
    if (op === 'airtel') {
      statut = res.kyc_ok === true ? 'ok' : res.kyc_ok === false ? 'echec' : 'indisponible'
    } else if (op === 'moov') {
      statut = 'moov_warning'
    } else {
      statut = 'echec'
    }
    setKycStatut(statut)
    setKycMessage(res.message ?? '')
    // Airtel OK ou Moov accepté → numéro prêt en E.164.
    if (statut === 'ok' || statut === 'moov_warning') {
      setNumeroRetraitFinal('+241' + local9.slice(1))
    } else {
      setNumeroRetraitFinal(null)
    }
  }

  const onChoix = (c: ChoixRetrait) => {
    if (c === 'mon_numero') {
      verifierMonNumero()
    } else {
      setChoix('autre_numero')
      setKycStatut('idle')
      setKycMessage('')
      setNumeroRetraitFinal(null)
    }
  }

  // ── Validation par étape (réplique exacte des validators Flutter). ───────────
  const validerEtape = (e: number): boolean => {
    const errs: Record<string, string> = {}
    if (estTontine) {
      if (e === 0) {
        if (!titre.trim()) errs.titre = 'Nom requis'
      } else if (e === 1) {
        const n = parseInt(participants.trim())
        if (!n || n < 2) errs.participants = 'Au moins 2 membres'
        else if (n > 200) errs.participants = 'Maximum 200 membres'
      } else if (e === 2) {
        const m = parseInt(montantCycle.replace(/\s/g, ''))
        if (!m || m < 100) errs.montantCycle = 'Minimum 100 FCFA'
        else if (m > 2500000) errs.montantCycle = 'Maximum 2 500 000 FCFA'
        if (!sansPenalite) {
          const p = parseInt(penaliteMontant.trim())
          if (!p || p < 1) errs.penaliteMontant = 'Montant requis (min 1 FCFA)'
        }
      }
    } else {
      // Étapes Objectif puis Durée. Index +1 chacune si l'étape Portée est
      // active (association), sinon Objectif=1, Durée=2.
      const idxObjectif = estAssociation ? 2 : 1
      if (e === 0) {
        if (!titre.trim()) errs.titre = 'Nom requis'
      } else if (e === idxObjectif) {
        // Validé uniquement si l'utilisateur a dit Oui : Oui puis champ vide
        // n'a pas de sens, on exige une valeur ≥ 100.
        if (aObjectifMontant) {
          const m = parseInt(montantCible.replace(/\s/g, ''))
          if (!montantCible.trim()) errs.montantCible = 'Indiquez un montant'
          else if (!m || m < 100) errs.montantCible = 'Minimum 100 FCFA'
          else if (m > plafondCible)
            errs.montantCible = `Maximum ${plafondCible.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`
        }
      }
      // L'étape Durée (idxObjectif + 1) n'a pas de validation : la date reste
      // optionnelle même après un Oui.
    }
    setErreurs(errs)
    return Object.keys(errs).length === 0
  }

  // ── Navigation entre étapes. ─────────────────────────────────────────────────
  const etapeSuivante = () => {
    if (!validerEtape(etape)) return
    setEtape(s => s + 1)
  }
  const etapePrecedente = () => {
    if (etape === 0) {
      navigate(-1)   // équivaut à context.pop() : quitte l'écran de création
      return
    }
    setEtape(s => s - 1)
  }

  // ── Création réelle (POST creerCagnotte). ────────────────────────────────────
  const creer = async () => {
    if (!titre.trim()) return
    const numeroRetrait = numeroRetraitFinal ?? ''
    if (!numeroRetrait) {
      setToast('Choisissez et vérifiez un numéro de retrait.')
      return
    }
    setEnCours(true)
    try {
      if (estTontine) {
        const payload: Parameters<typeof creerCagnotte>[0] = {
          type: 'tontine_periodique',
          titre: titre.trim(),
          numero_retrait: numeroRetrait,
          reference: reference ?? genererIdLocal(),
          montant_par_cycle: parseInt(montantCycle.replace(/\s/g, '')) || 0,
          periodicite,
          intervalle,
          nombre_participants: parseInt(participants.trim()) || 0,
          penalite_active: !sansPenalite,
        }
        // Jour de versement selon la périodicité.
        if (periodicite === 'hebdomadaire') {
          const JOURS_FR = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
          payload.jour_semaine = JOURS_FR[jourSemaine]
        } else {
          payload.jour_mois = jourMois
        }
        if (!sansPenalite && penaliteMontant.trim()) {
          payload.penalite_montant = parseInt(penaliteMontant.trim())
          payload.penalite_frequence = penaliteFrequence
        }
        const creee = await creerCagnotte(payload)
        navigate(`/cagnottes/${creee.id}/tontine-creee`)
        return
      } else {
        const payload: Parameters<typeof creerCagnotte>[0] = {
          type: 'cagnotte_ouverte',
          titre: titre.trim(),
          numero_retrait: numeroRetrait,
          reference: reference ?? genererIdLocal(),
          reversement_auto: reversementAuto,
          // Visibilité : publique réservée aux ASSOCIATIONS (le backend force
          // privé sinon). Une publique passe en modération avant publication.
          visibilite: (estAssociation && visibilite === 'public') ? 'public' : 'prive',
        }
        // Description envoyée uniquement si publique et non vide.
        if (visibilite === 'public' && description.trim()) payload.description = description.trim()
        // Envoyés seulement si le toggle correspondant est sur Oui.
        if (aObjectifMontant && montantCible.trim()) payload.montant_cible = parseInt(montantCible.replace(/\s/g, ''))
        if (aDateFin && dateFin) payload.date_fin = dateFin
        const creee = await creerCagnotte(payload)
        navigate(`/cagnottes/${creee.id}/cotisation-creee`)
        return
      }
    } catch (err: unknown) {
      // Message exact de l'API si ApiException, sinon message générique Flutter.
      setToast(err instanceof ApiError ? err.message : 'Erreur inattendue. Réessaie.')
      setEnCours(false)
    }
  }

  // ── Tant qu'aucun type n'est choisi : feuille de sélection. ──────────────────
  if (type === null) {
    return (
      <div style={{ background: T.surface, minHeight: '100%' }}>
        <AnimatePresence>
          <TypeCagnotteSheet
            onChoisir={t => { setType(t); setEtape(0) }}
          />
        </AnimatePresence>
      </div>
    )
  }

  // ── Construction des étapes selon le type. ───────────────────────────────────
  // (L'identifiant `reference` n'est PAS affiché à l'écran — miroir Flutter.)

  // Étape « numéro de retrait » (partagée tontine/cotisation, sous-titre différent).
  const renderEtapeNumeroRetrait = (sous: string) => (
    <>
      <AnimItem><TitreEtape sous={sous} /></AnimItem>
      <div style={{ height: '32px' }} />
      <AnimItem delay={0.12}>
        <SectionNumeroRetrait
          userNumero={userNumero}
          choix={choix} onChoix={onChoix}
          autreNumero={autreNumero} onAutreNumero={setAutreNumero}
          kycStatut={kycStatut} kycMessage={kycMessage}
        />
      </AnimItem>
    </>
  )

  // Liste des étapes (chacune = fonction de rendu).
  const etapesTontine: (() => React.ReactNode)[] = [
    // 0 — Nom de la tontine
    () => (
      <>
        <AnimItem><TitreEtape sous="Un nom court qui parle à tous les membres." /></AnimItem>
        <div style={{ height: '40px' }} />
        <AnimItem delay={0.12}>
          <TField label="Nom de la tontine" hint="ex : Tontine du quartier" value={titre} onChange={setTitre} error={erreurs.titre} onEnter={etapeSuivante} accent={accent} autoFocus />
        </AnimItem>
        <div style={{ height: '48px' }} />
        <AnimItem delay={0.24}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    ),
    // 1 — Membres
    () => (
      <>
        <AnimItem><TitreEtape sous="Combien de personnes participent à cette tontine ?" /></AnimItem>
        <div style={{ height: '40px' }} />
        <AnimItem delay={0.12}>
          <TField label="Nombre de membres" hint="ex : 12" value={participants} onChange={v => setParticipants(v.replace(/[^\d]/g, ''))} inputMode="numeric" error={erreurs.participants} onEnter={etapeSuivante} accent={accent} autoFocus />
        </AnimItem>
        <div style={{ height: '48px' }} />
        <AnimItem delay={0.24}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    ),
    // 2 — Montant du tour + pénalité dépliable
    () => (
      <>
        <AnimItem><TitreEtape sous="Combien cotise chaque membre ?" /></AnimItem>
        <div style={{ height: '40px' }} />
        <AnimItem delay={0.12}>
          <TField label="Montant par membre" hint="ex : 50 000" suffix="FCFA" value={montantCycle} onChange={v => setMontantCycle(v.replace(/[^\d]/g, ''))} inputMode="numeric" error={erreurs.montantCycle} onEnter={etapeSuivante} accent={accent} autoFocus />
        </AnimItem>
        <div style={{ height: '24px' }} />
        {/* Bouton +/− Pénalité de retard */}
        <AnimItem delay={0.2}>
          <button
            onClick={() => setPenaliteOuvertes(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', color: accent, fontWeight: 600 }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{penaliteOuvertes ? '⊖' : '⊕'}</span>
            {penaliteOuvertes ? 'Masquer la pénalité' : '+ Pénalité de retard'}
          </button>
        </AnimItem>
        <AnimatePresence>
          {penaliteOuvertes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_CUBIC }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ height: '14px' }} />
              <CartePenalite
                sansPenalite={sansPenalite} onSansPenalite={setSansPenalite}
                penaliteMontant={penaliteMontant} onPenaliteMontant={v => setPenaliteMontant(v.replace(/[^\d]/g, ''))}
                penaliteFrequence={penaliteFrequence} onPenaliteFrequence={setPenaliteFrequence}
                erreur={erreurs.penaliteMontant} accent={accent}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ height: '48px' }} />
        <AnimItem delay={0.28}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    ),
    // 3 — Fréquence
    () => (
      <>
        <AnimItem><TitreEtape sous="À quelle fréquence chacun cotise-t-il ?" /></AnimItem>
        <div style={{ height: '40px' }} />
        <AnimItem><LabelSection>Fréquence de reversement</LabelSection></AnimItem>
        <div style={{ height: '12px' }} />
        <AnimItem delay={0.12}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Pill label="1 sem." icon={<IconWeek />} actif={periodiciteCourte === '1sem'} onTap={() => setPeriodiciteChoix('1sem')} />
            <Pill label="2 sem." icon={<IconDateRange />} actif={periodiciteCourte === '2sem'} onTap={() => setPeriodiciteChoix('2sem')} />
            <Pill label="1 mois" icon={<IconMonth />} actif={periodiciteCourte === '1mois'} onTap={() => setPeriodiciteChoix('1mois')} />
          </div>
        </AnimItem>
        <AnimatePresence>
          {periodiciteCourte === '1mois' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT_CUBIC }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ height: '14px' }} />
              <LabelSection>Jour de versement</LabelSection>
              <div style={{ height: '8px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                {[5, 7, 15].map(j => (
                  <Pill key={j} label={`Le ${j}`} actif={jourMois === j} onTap={() => setJourMois(j)} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ height: '48px' }} />
        <AnimItem delay={0.24}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    ),
    // 4 — Numéro de retrait + CGU + Créer
    () => (
      <>
        {renderEtapeNumeroRetrait("C'est sur ce numéro que vous recevrez l'argent à votre tour. Ce numéro ne pourra plus être changé après création.")}
        <div style={{ height: '24px' }} />
        <AnimItem delay={0.2}><LienRappelCGU accent={accent} onOpen={() => setShowCgu(true)} /></AnimItem>
        <div style={{ height: '16px' }} />
        <AnimItem delay={0.28}><BoutonCreer enCours={enCours} label="Créer la tontine" onTap={creer} accent={accent} /></AnimItem>
      </>
    ),
  ]

  const etapesCotisation: (() => React.ReactNode)[] = [
    // 0 — Nom de la cagnotte
    () => (
      <>
        <AnimItem><TitreEtape sous="Un nom court et clair pour vos membres." /></AnimItem>
        <div style={{ height: '40px' }} />
        <AnimItem delay={0.12}>
          <TField label="Nom de la cagnotte" hint="ex : Anniversaire Maman" value={titre} onChange={setTitre} error={erreurs.titre} onEnter={etapeSuivante} accent={accent} autoFocus />
        </AnimItem>
        <div style={{ height: '48px' }} />
        <AnimItem delay={0.24}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    ),
    // 1 — Portée (privée / publique) : étape affichée UNIQUEMENT pour les
    // comptes association (crowdfunding modéré réservé aux associations). Les
    // autres comptes n'ont pas cette étape (cagnotte privée par défaut).
    ...(estAssociation ? [() => (
      <>
        <AnimItem><TitreEtape sous="Qui peut voir et contribuer à cette cagnotte ?" /></AnimItem>
        <div style={{ height: '32px' }} />
        <AnimItem delay={0.12}>
          <SelecteurVisibilite valeur={visibilite} accent={accent} onChange={setVisibilite} />
        </AnimItem>
        {/* Description : visible uniquement si la cagnotte est publique. */}
        <AnimatePresence>
          {visibilite === 'public' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_CUBIC }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ height: '24px' }} />
              <DescriptionField value={description} onChange={setDescription} accent={accent} />
              <div style={{ height: '10px' }} />
              {/* Note « Soumise à validation » (miroir Flutter). */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: T.textSec, flexShrink: 0, marginTop: '1px' }}><IconShieldCheck /></span>
                <span style={{ fontSize: '12.5px', color: T.textSec, lineHeight: 1.3 }}>
                  Soumise à validation avant d'apparaître publiquement.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ height: '40px' }} />
        <AnimItem delay={0.2}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    )] : []),
    // 2 — Objectif de montant (question Non/Oui, champ affiché si Oui)
    () => (
      <>
        <AnimItem><TitreEtape sous="Souhaitez-vous fixer un montant pour la cagnotte ?" /></AnimItem>
        <div style={{ height: '32px' }} />
        <AnimItem delay={0.12}>
          <ToggleOuiNon
            valeur={aObjectifMontant}
            accent={accent}
            onChange={v => {
              setAObjectifMontant(v)
              if (!v) { setMontantCible(''); setErreurs({}) }
            }}
          />
        </AnimItem>
        {/* Champ affiché uniquement si l'utilisateur répond Oui. */}
        {aObjectifMontant && (
          <>
            <div style={{ height: '24px' }} />
            <AnimItem delay={0.06}>
              <TField label="Montant à collecter" hint="ex : 500 000" suffix="FCFA" value={montantCible} onChange={v => setMontantCible(v.replace(/[^\d]/g, ''))} inputMode="numeric" error={erreurs.montantCible} onEnter={etapeSuivante} accent={accent} autoFocus />
            </AnimItem>
            <div style={{ height: '8px' }} />
            <AnimItem delay={0.1}>
              <p style={{ fontSize: '12px', color: T.textTert }}>Plafond : 500&nbsp;000 FCFA par transaction.</p>
            </AnimItem>
          </>
        )}
        <div style={{ height: '48px' }} />
        <AnimItem delay={0.2}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    ),
    // 3 — Date limite (question Non/Oui, sélecteur affiché si Oui)
    () => {
      const today = new Date().toISOString().slice(0, 10)
      const max2y = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      return (
        <>
          <AnimItem><TitreEtape sous="Souhaitez-vous fixer une date limite de la cagnotte ?" /></AnimItem>
          <div style={{ height: '32px' }} />
          <AnimItem delay={0.12}>
            <ToggleOuiNon
              valeur={aDateFin}
              accent={accent}
              onChange={v => {
                setADateFin(v)
                if (!v) setDateFin('')
              }}
            />
          </AnimItem>
          {/* Sélecteur affiché uniquement si l'utilisateur répond Oui. */}
          {aDateFin && (
            <>
              <div style={{ height: '24px' }} />
              <AnimItem delay={0.06}>
                <DateFinField date={dateFin} onDate={setDateFin} min={today} max={max2y} accent={accent} />
              </AnimItem>
            </>
          )}
          <div style={{ height: '48px' }} />
          <AnimItem delay={0.2}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
        </>
      )
    },
    // 3 — Numéro de retrait
    () => (
      <>
        {renderEtapeNumeroRetrait('Les fonds seront versés ici. Ce numéro ne pourra plus être changé après création.')}
        <div style={{ height: '48px' }} />
        <AnimItem delay={0.24}><BoutonSuivant onTap={etapeSuivante} accent={accent} /></AnimItem>
      </>
    ),
    // 4 — Reversement auto + CGU + Créer
    () => (
      <>
        <AnimItem><TitreEtape sous="Comment souhaitez-vous recevoir les fonds collectés ?" /></AnimItem>
        <div style={{ height: '32px' }} />
        <AnimItem delay={0.12}>
          <SectionReversementAuto reversementAuto={reversementAuto} onChanged={setReversementAuto} accent={accent} />
        </AnimItem>
        <div style={{ height: '24px' }} />
        <AnimItem delay={0.2}><LienRappelCGU accent={accent} onOpen={() => setShowCgu(true)} /></AnimItem>
        <div style={{ height: '16px' }} />
        <AnimItem delay={0.28}><BoutonCreer enCours={enCours} label="Créer la cagnotte" onTap={creer} accent={accent} /></AnimItem>
      </>
    ),
  ]

  const etapes = estTontine ? etapesTontine : etapesCotisation
  const titreAppBar = estTontine ? 'Nouvelle tontine' : 'Nouvelle cagnotte'

  return (
    <div style={{ background: T.surface, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Barre supérieure : uniquement la flèche retour (le titre est descendu
          dans le contenu, juste au-dessus de la description). */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 12px 8px',
      }}>
        <button
          onClick={etapePrecedente}
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

      {/* Titre unique en haut du contenu (plus de titre en gras par étape) :
          « Nouvelle cagnotte » → description → champ, sur toutes les étapes. */}
      <div style={{ padding: '4px 24px 0' }}>
        <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong }}>{titreAppBar}</p>
      </div>

      {/* Contenu de l'étape — animé à chaque changement. */}
      <div style={{ flex: 1, padding: '6px 24px 48px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={etape}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: EASE_OUT_CUBIC }}
          >
            {etapes[etape]()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Toast d'erreur transitoire. */}
      <AnimatePresence>
        {toast && (
          <ToastErreur message={toast} onDone={() => setToast('')} />
        )}
      </AnimatePresence>

      {/* Bottom sheet CGU. */}
      <AnimatePresence>
        {showCgu && <BottomSheetCgu onClose={() => setShowCgu(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Champ « Date de fin » (cotisation, étape objectif & durée)
// ════════════════════════════════════════════════════════════════════════════

function DateFinField({
  date, onDate, min, max, accent,
}: { date: string; onDate: (v: string) => void; min: string; max: string; accent: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      {/* Input date natif masqué, déclenché via showPicker(). */}
      <input
        ref={ref}
        type="date"
        min={min}
        max={max}
        value={date}
        onChange={e => onDate(e.target.value)}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 0, height: 0, top: 0, left: 0 }}
      />
      <div
        onClick={() => ref.current?.showPicker?.()}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: T.surfaceEl, borderRadius: '16px',
          border: `1.3px solid ${T.border}`, padding: '0 14px', height: '58px', cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: T.textSec, lineHeight: 1 }}>
            Date limite (optionnelle)
          </p>
          <p style={{ fontSize: '16px', color: date ? T.textStrong : T.textTert, marginTop: '4px', lineHeight: 1 }}>
            {date ? formaterDate(date) : 'JJ/MM/AAAA'}
          </p>
        </div>
        {date && (
          <button
            onClick={e => { e.stopPropagation(); onDate('') }}
            aria-label="Effacer la date"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: '4px', display: 'flex', flexShrink: 0 }}
          >
            <IconClose />
          </button>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Toast d'erreur (équivaut à TonjiToast.error)
// ════════════════════════════════════════════════════════════════════════════

function ToastErreur({ message, onDone }: { message: string; onDone: () => void }) {
  // Disparaît automatiquement après 3,5 s (parité avec le toast Flutter).
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 70,
        maxWidth: '420px', width: 'calc(100% - 48px)',
        background: T.error, color: '#fff', borderRadius: '14px',
        padding: '12px 16px', fontSize: '14px', fontWeight: 600,
        boxShadow: '0 8px 24px rgba(217,79,61,0.4)', textAlign: 'center',
      }}
    >
      {message}
    </motion.div>
  )
}
