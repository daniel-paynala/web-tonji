/**
 * Création de cagnotte mobile — copie exacte de create_cagnotte_screen.dart
 *
 * Ordre des sections (identique au Flutter) :
 *   1. SegmentTypeCagnotte (toggle Tontine ↔ Cotisation)
 *   2. SectionTitre (titre + sous-titre)
 *   3. Champ Titre
 *   4. AnimatedSwitcher → SectionTontine | SectionCagnotteOuverte
 *   5. RecapTontineFraisCard (tontine seulement, si montant+participants valides)
 *   6. SectionReversementAuto (cotisation seulement)
 *   7. SectionNumeroRetrait (2 cartes : mon numéro / autre numéro + KYC)
 *   8. SectionIdentifiant (accent card, id auto)
 *   9. CartConditions (puces résumé + + détail + checkbox)
 *  10. Bouton Créer
 *  11. Note frais *
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { useAuthStore } from '@/store/authStore'
import {
  genererReference,
  verifierNumeroRetrait,
  creerCagnotte,
} from '@/lib/cagnottesApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMontant(n: number): string {
  const s = Math.round(n).toString()
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ' '
    out += s[i]
  }
  return `${out} FCFA`
}

function calcRecap(montant: number, participants: number) {
  const fees = Math.round(montant * 0.03)
  const totalAEnvoyer = montant + fees
  const parCotisant = Math.ceil(totalAEnvoyer / participants)
  return { cashLivre: montant, parCotisant }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TypeC = 'tontine' | 'cotisation'
type Periodicite = 'hebdomadaire' | 'mensuelle'
type PeriodiciteCourte = '1sem' | '2sem' | '1mois'
type FreqPenalite = 'heure' | 'jour'
type ChoixRetrait = 'mon_numero' | 'autre_numero'
type KycStatut = 'idle' | 'en_cours' | 'ok' | 'echec' | 'indisponible' | 'moov_warning'

const PERIODICITE_OPTIONS: { val: PeriodiciteCourte; label: string }[] = [
  { val: '1sem',  label: '1 semaine'  },
  { val: '2sem',  label: '2 semaines' },
  { val: '1mois', label: '1 mois'     },
]

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconSync = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
)
const IconCelebration = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
)
const IconText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
  </svg>
)
const IconGroup = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconPayments = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const IconFlag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconAutorenew = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
  </svg>
)
const IconWeek = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="9" y1="4" x2="9" y2="22"/><line x1="15" y1="4" x2="15" y2="22"/>
  </svg>
)
const IconMonth = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconHourglass = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 22h14M5 2h14"/><path d="M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22"/>
    <path d="M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2"/>
  </svg>
)
const IconSun = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconTag = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
)
const IconDialpad = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="20" r="1"/><circle cx="6" cy="8" r="1"/><circle cx="12" cy="8" r="1"/>
    <circle cx="18" cy="8" r="1"/><circle cx="6" cy="14" r="1"/><circle cx="12" cy="14" r="1"/>
    <circle cx="18" cy="14" r="1"/>
  </svg>
)
const IconInfo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconMinus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconAdd = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconCheckCircle = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IconCancel = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
)
const IconWarning = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconHelpOutline = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

// ── Primitives UI ─────────────────────────────────────────────────────────────

function LabelSection({ children }: { children: string }) {
  return (
    <p style={{
      fontSize: '11px', fontWeight: 700, color: T.textSec,
      letterSpacing: '1.2px', textTransform: 'uppercase',
    }}>{children}</p>
  )
}

function TField({
  label, hint, suffix, icon, value, onChange, type = 'text', error, inputMode,
}: {
  label: string; hint?: string; suffix?: string; icon?: React.ReactNode
  value: string; onChange: (v: string) => void
  type?: string; error?: string; inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0
  const labelUp = focused || hasValue
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: T.surfaceEl, borderRadius: '14px',
        border: `1.3px solid ${error ? T.error : focused ? T.primary : T.border}`,
        padding: '0 14px', transition: 'border-color 0.15s',
        boxShadow: focused ? `0 0 0 3px rgba(15,76,92,0.10)` : 'none',
      }}>
        {icon && (
          <span style={{ color: T.textSec, flexShrink: 0, paddingTop: '2px' }}>{icon}</span>
        )}
        <div style={{ flex: 1, position: 'relative', height: '58px' }}>
          <label style={{
            position: 'absolute', left: 0, pointerEvents: 'none',
            transition: 'all 0.15s',
            top: labelUp ? '10px' : '50%',
            transform: labelUp ? 'none' : 'translateY(-50%)',
            fontSize: labelUp ? '11px' : '15px',
            fontWeight: labelUp ? 600 : 400,
            color: focused ? T.primary : T.textSec,
          }}>
            {label}
          </label>
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              position: 'absolute', bottom: '10px', left: 0, right: 0,
              background: 'none', border: 'none', outline: 'none',
              fontSize: '16px', fontWeight: 500, color: T.textStrong,
              fontFamily: 'inherit', width: '100%',
            }}
            placeholder={focused ? hint : undefined}
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

// ── Pill fréquence ─────────────────────────────────────────────────────────────
function PillFreq({
  label, icon, actif, onTap,
}: { label: string; icon: React.ReactNode; actif: boolean; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      style={{
        flex: 1, padding: '14px 8px', borderRadius: '14px', border: 'none', cursor: 'pointer',
        background: actif ? T.primary : T.surfaceEl,
        outline: `1.4px solid ${actif ? T.primary : T.border}`,
        boxShadow: actif ? `0 4px 12px rgba(15,76,92,0.25)` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        transition: 'all 0.22s',
        color: actif ? T.surface : T.textSec,
        fontFamily: 'inherit',
      }}
    >
      {icon}
      <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{label}</span>
    </button>
  )
}

// ── Section Tontine ────────────────────────────────────────────────────────────
function SectionTontine({
  participants, onParticipants, montantCycle, onMontantCycle,
  periodiciteCourte, onPeriodiciteCourte,
  jourMois, onJourMois,
  sansPenalite, onSansPenalite, penaliteMontant, onPenaliteMontant,
  penaliteFrequence, onPenaliteFrequence,
  erreurs,
}: {
  participants: string; onParticipants: (v: string) => void
  montantCycle: string; onMontantCycle: (v: string) => void
  periodiciteCourte: PeriodiciteCourte; onPeriodiciteCourte: (v: PeriodiciteCourte) => void
  jourMois: number; onJourMois: (v: number) => void
  sansPenalite: boolean; onSansPenalite: (v: boolean) => void
  penaliteMontant: string; onPenaliteMontant: (v: string) => void
  penaliteFrequence: FreqPenalite; onPenaliteFrequence: (v: FreqPenalite) => void
  erreurs: Record<string, string>
}) {
  const [penaliteOuvertes, setPenaliteOuvertes] = useState(false)

  const togglePenalite = () => {
    const next = !penaliteOuvertes
    setPenaliteOuvertes(next)
    onSansPenalite(!next)
  }

  return (
    <div>
      <TField
        label="Nombre de participants"
        hint="ex :12"
        icon={<IconGroup />}
        value={participants}
        onChange={onParticipants}
        type="tel"
        inputMode="numeric"
        error={erreurs.participants}
      />
      <div style={{ height: '14px' }} />
      <TField
        label="Montant récupéré par participant (sans les frais)"
        hint="ex :50 000"
        suffix="FCFA"
        icon={<IconPayments />}
        value={montantCycle}
        onChange={onMontantCycle}
        type="tel"
        inputMode="numeric"
        error={erreurs.montantCycle}
      />
      <div style={{ height: '18px' }} />
      <LabelSection>Fréquence de reversement</LabelSection>
      <div style={{ height: '8px' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        {PERIODICITE_OPTIONS.map(opt => (
          <PillFreq
            key={opt.val}
            label={opt.label}
            icon={opt.val === '1mois' ? <IconMonth /> : <IconWeek />}
            actif={periodiciteCourte === opt.val}
            onTap={() => onPeriodiciteCourte(opt.val)}
          />
        ))}
      </div>
      <AnimatePresence>
        {periodiciteCourte === '1mois' && (
          <motion.div
            key="jour"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ height: '14px' }} />
            <LabelSection>Jour de versement</LabelSection>
            <div style={{ height: '8px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              {[5, 7, 15].map(j => (
                <PillFreq
                  key={j}
                  label={`Le ${j}`}
                  icon={<IconMonth />}
                  actif={jourMois === j}
                  onTap={() => onJourMois(j)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ height: '20px' }} />
      <button
        onClick={togglePenalite}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontFamily: 'inherit',
          color: T.primary, fontWeight: 600, fontSize: '14px',
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>{penaliteOuvertes ? '−' : '+'}</span>
        {penaliteOuvertes ? 'Masquer la pénalité de retard' : '+ Pénalité de retard'}
      </button>
      <AnimatePresence>
        {penaliteOuvertes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: '14px' }}>
              <TField
                label="Montant de la pénalité"
                hint="ex :1 000"
                suffix="FCFA"
                icon={<IconHourglass />}
                value={penaliteMontant}
                onChange={onPenaliteMontant}
                type="tel"
                inputMode="numeric"
                error={erreurs.penaliteMontant}
              />
              <div style={{ height: '12px' }} />
              <LabelSection>Fréquence</LabelSection>
              <div style={{ height: '8px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <PillFreq label="Par heure" icon={<IconHourglass />} actif={penaliteFrequence === 'heure'} onTap={() => onPenaliteFrequence('heure')} />
                <PillFreq label="Par jour"  icon={<IconSun />}       actif={penaliteFrequence === 'jour'}  onTap={() => onPenaliteFrequence('jour')} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Section Cotisation ouverte ─────────────────────────────────────────────────
function SectionCagnotteOuverte({
  montantCible, onMontantCible, dateFin, onDateFin, erreurs,
}: {
  montantCible: string; onMontantCible: (v: string) => void
  dateFin: string; onDateFin: (v: string) => void
  erreurs: Record<string, string>
}) {
  const dateRef = useRef<HTMLInputElement>(null)
  const fmt = (s: string) => {
    if (!s) return ''
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }
  const today = new Date().toISOString().slice(0, 10)
  const max2y = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return (
    <div>
      <TField
        label="Montant de la cotisation"
        hint="ex :500 000"
        suffix="FCFA"
        icon={<IconFlag />}
        value={montantCible}
        onChange={onMontantCible}
        type="tel"
        inputMode="numeric"
        error={erreurs.montantCible}
      />
      <div style={{ height: '14px' }} />
      <input
        ref={dateRef}
        type="date"
        min={today}
        max={max2y}
        value={dateFin}
        onChange={e => onDateFin(e.target.value)}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 0, height: 0, top: 0, left: 0 }}
      />
      <div
        onClick={() => dateRef.current?.showPicker?.()}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: T.surfaceEl, borderRadius: '14px',
          border: `1.3px solid ${T.border}`,
          padding: '0 14px', height: '58px', cursor: 'pointer',
        }}
      >
        <span style={{ color: T.textSec, flexShrink: 0 }}><IconCalendar /></span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: T.textSec, lineHeight: 1 }}>
            Date de fin
          </p>
          <p style={{ fontSize: '16px', color: dateFin ? T.textStrong : T.textTert, marginTop: '4px', lineHeight: 1 }}>
            {dateFin ? fmt(dateFin) : 'JJ/MM/AAAA'}
          </p>
        </div>
        {dateFin && (
          <button
            onClick={e => { e.stopPropagation(); onDateFin('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textTert, padding: '4px', display: 'flex', flexShrink: 0 }}
          >
            <IconClose />
          </button>
        )}
      </div>
      <div style={{ height: '8px' }} />
      <p style={{ fontSize: '12px', color: T.textTert, paddingLeft: '4px' }}>
        Plafond : 500&nbsp;000 FCFA par transaction.
      </p>
    </div>
  )
}

// ── Recap frais tontine ───────────────────────────────────────────────────────
function RecapTontineCard({ montantCycle, participants }: { montantCycle: string; participants: string }) {
  const montant = parseInt(montantCycle.replace(/\s/g, '')) || 0
  const nb = parseInt(participants) || 0
  if (montant < 100 || nb < 2) return null
  const { cashLivre, parCotisant } = calcRecap(montant, nb)
  return (
    <div>
      <div style={{ height: '12px' }} />
      <div style={{
        padding: '14px 16px', borderRadius: '14px',
        background: T.surfaceEl, border: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '12px' }}>
          <span style={{ color: '#5B9BD5' }}><IconInfo /></span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#5B9BD5', letterSpacing: '0.3px' }}>
            Récapitulatif estimé *
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', color: T.textSec }}>Le gagnant reçoit</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: T.primary }}>{fmtMontant(cashLivre)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: T.textSec }}>Chaque participant paie</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: T.accent }}>{fmtMontant(parCotisant)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Reversement systématique ──────────────────────────────────────────────────
function SectionReversementAuto({
  actif, onChanged,
}: {
  actif: boolean; onChanged: (v: boolean) => void
}) {
  return (
    <div style={{
      padding: '12px 14px 14px 16px', borderRadius: '16px', transition: 'all 0.22s',
      background: actif ? `rgba(107,142,78,0.06)` : T.surfaceEl,
      border: `1.3px solid ${actif ? `rgba(107,142,78,0.40)` : T.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ color: actif ? T.success : T.textSec, paddingTop: '2px' }}><IconAutorenew /></span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, marginBottom: '2px' }}>
            Reversement systématique
          </p>
          <p style={{ fontSize: '12px', color: actif ? T.success : T.textSec, fontWeight: 500 }}>
            {actif
              ? 'Chaque paiement reçu est reversé en fin de journée sur votre numéro de retrait.'
              : 'Le reversement se fera manuellement depuis la page de la cotisation.'}
          </p>
        </div>
        {/* Toggle switch */}
        <div
          onClick={() => onChanged(!actif)}
          style={{
            position: 'relative', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '12px',
            background: actif ? `rgba(107,142,78,0.35)` : T.border, transition: 'background 0.2s',
          }} />
          <div style={{
            position: 'absolute', width: '20px', height: '20px', borderRadius: '50%',
            background: actif ? T.success : '#fff', top: '2px',
            left: actif ? '22px' : '2px', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── KYC Indicateur ─────────────────────────────────────────────────────────────
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

// ── Section numéro de retrait ──────────────────────────────────────────────────
function SectionNumeroRetrait({
  userNumero, choix, onChoix, autreNumero, onAutreNumero,
  kycStatut, kycMessage,
}: {
  userNumero: string
  choix: ChoixRetrait | null; onChoix: (c: ChoixRetrait) => void
  autreNumero: string; onAutreNumero: (v: string) => void
  kycStatut: KycStatut; kycMessage: string
}) {
  const bgKyc = (s: KycStatut) => {
    if (s === 'ok') return { bg: `rgba(107,142,78,0.10)`, color: T.success }
    if (s === 'echec') return { bg: `rgba(160,68,52,0.10)`, color: T.error }
    if (s === 'moov_warning') return { bg: `rgba(212,155,63,0.12)`, color: T.warning }
    return { bg: T.surfaceEl, color: T.textTert }
  }

  const CarteOption = ({
    id, icone, titre, sousTitre, enfant,
  }: {
    id: ChoixRetrait; icone: React.ReactNode; titre: string; sousTitre: string; enfant?: React.ReactNode
  }) => {
    const selected = choix === id
    const ks = selected ? kycStatut : 'idle'
    const showBandeau = selected && kycMessage && !['idle', 'en_cours'].includes(kycStatut)
    return (
      <div
        onClick={() => onChoix(id)}
        style={{
          padding: '12px 14px', borderRadius: '16px', cursor: 'pointer',
          background: selected ? `rgba(15,76,92,0.05)` : T.surfaceEl,
          border: `1.5px solid ${selected ? `rgba(15,76,92,0.50)` : T.border}`,
          transition: 'all 0.22s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: T.primary }}>{icone}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: T.textStrong }}>{titre}</p>
            <p style={{ fontSize: '12px', color: T.textSec }}>{sousTitre}</p>
          </div>
          <KycIndicateur statut={ks} />
        </div>
        {enfant}
        {showBandeau && (
          <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '10px', background: bgKyc(kycStatut).bg }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: bgKyc(kycStatut).color }}>{kycMessage}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '16px', fontWeight: 700, color: T.textStrong, marginBottom: '2px' }}>
        Numéro de retrait
      </p>
      <p style={{ fontSize: '12px', color: T.textTert, lineHeight: 1.5, marginBottom: '14px' }}>
        Ce numéro recevra automatiquement les fonds collectés.
        Il ne pourra plus être modifié après création.
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
            <div style={{ marginTop: '14px' }} onClick={e => e.stopPropagation()}>
              <TField
                label="Numéro de retrait"
                hint="077 12 34 56"
                icon={<IconPhone />}
                value={autreNumero}
                onChange={onAutreNumero}
                type="tel"
                inputMode="numeric"
              />
            </div>
          ) : undefined
        }
      />
    </div>
  )
}

// ── Identifiant ───────────────────────────────────────────────────────────────
function SectionIdentifiant({ id }: { id: string }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: '16px',
      background: `rgba(201,123,74,0.08)`,
      border: `1px solid rgba(201,123,74,0.30)`,
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: `rgba(201,123,74,0.18)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.accent,
      }}>
        <IconTag />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '12px', color: T.textTert }}>Identifiant</p>
        <p style={{ fontSize: '22px', fontWeight: 800, color: T.textStrong, letterSpacing: '1px', lineHeight: 1.2 }}>
          {id}
        </p>
      </div>
      <p style={{ fontSize: '11px', fontWeight: 700, color: T.accent, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
        généré
      </p>
    </div>
  )
}

// ── Conditions ────────────────────────────────────────────────────────────────
function CartConditions({
  accepte, onAccepte,
}: {
  accepte: boolean; onAccepte: (v: boolean) => void
}) {
  const [detail, setDetail] = useState(false)

  const RESUME = [
    'Le montant collecté sera reversé sur votre numéro de retrait.',
    'Le numéro de retrait ne pourra plus être modifié après création.',
    'Les frais sont à la charge du cotisant, appliqués au paiement.',
    "Tonji n'arbitre pas les conflits entre membres, sauf cas manifestement clair.",
  ]
  const DETAIL = [
    {
      titre: 'Modèle économique',
      corps: 'Tonji prélève une commission de 2 % à la charge du cotisant. Les frais opérateur (3 % paiement, plafonnés à 5 000 FCFA, et 3 % retrait) sont également à la charge du cotisant. Le bénéficiaire reçoit le montant net transféré.',
    },
    {
      titre: 'Numéro de retrait',
      corps: 'Une fois la cagnotte créée et active, le numéro Mobile Money de retrait ne peut plus être modifié. Cette règle protège tous les participants contre la fraude.',
    },
    {
      titre: 'Différends entre participants',
      corps: "Tonji facilite la collecte mais n'arbitre pas les conflits entre cotisants et bénéficiaires, sauf cas manifestement clair (ex : usurpation d'identité). Vous restez responsable du choix de vos co-participants.",
    },
    {
      titre: 'Périmètre v1',
      corps: "Les cagnottes publiques (ouvertes au grand public) et les associations comme bénéficiaires ne sont pas disponibles dans cette version. Cf. réglementation gabonaise sur les dons (loi n°35/62).",
    },
  ]

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '16px',
      background: T.surfaceEl,
      border: `1px solid rgba(216,207,192,0.6)`,
    }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={accepte}
          onChange={e => onAccepte(e.target.checked)}
          style={{ width: '18px', height: '18px', accentColor: T.primary, cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
        />
        <span style={{ fontSize: '14px', fontWeight: 600, color: T.textStrong, lineHeight: 1.5 }}>
          J'accepte les{' '}
          <span
            onClick={e => { e.preventDefault(); setDetail(v => !v) }}
            style={{ color: T.primary, textDecoration: 'underline', cursor: 'pointer' }}
          >
            conditions d'utilisation
          </span>
        </span>
      </label>
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: '14px' }}>
              {RESUME.map((txt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%', background: T.primary,
                    flexShrink: 0, marginTop: '7px',
                  }} />
                  <p style={{ fontSize: '13px', color: T.textStrong, lineHeight: 1.45 }}>{txt}</p>
                </div>
              ))}
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              {DETAIL.map((bloc, i) => (
                <div key={i} style={{ marginBottom: i < DETAIL.length - 1 ? '10px' : 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: T.primary, marginBottom: '3px' }}>
                    {bloc.titre}
                  </p>
                  <p style={{ fontSize: '12px', color: T.textSec, lineHeight: 1.5 }}>{bloc.corps}</p>
                </div>
              ))}
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <a
                  href="https://tonji.com/conditions-utilisation"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: T.primary, fontWeight: 600 }}
                >
                  tonji.com/conditions-utilisation
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function MobileCreateCagnotte() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [type, setType] = useState<TypeC>('tontine')
  const [titre, setTitre] = useState('')
  const [participants, setParticipants] = useState('')
  const [montantCycle, setMontantCycle] = useState('')
  const [montantCible, setMontantCible] = useState('')

  // UI — 3 choix simples
  const [periodiciteCourte, setPeriodiciteCourte] = useState<PeriodiciteCourte>('1sem')

  // API — champs backend, dérivés de periodiciteCourte
  const [periodicite, setPeriodicite] = useState<Periodicite>('hebdomadaire')
  const [intervalle, setIntervalle] = useState(1)
  const [jourSemaine, setJourSemaine] = useState(1)
  const [jourMois, setJourMois] = useState(7)

  const choisirPeriodicite = (choix: PeriodiciteCourte) => {
    setPeriodiciteCourte(choix)
    if (choix === '1sem')  { setPeriodicite('hebdomadaire'); setIntervalle(1); setJourSemaine(1) }
    if (choix === '2sem')  { setPeriodicite('hebdomadaire'); setIntervalle(2); setJourSemaine(1) }
    if (choix === '1mois') { setPeriodicite('mensuelle');    setIntervalle(1); setJourMois(7) }
  }

  const [dateFin, setDateFin] = useState('')
  const [sansPenalite, setSansPenalite] = useState(true)
  const [penaliteMontant, setPenaliteMontant] = useState('')
  const [penaliteFrequence, setPenaliteFrequence] = useState<FreqPenalite>('jour')
  const [reversementAuto, setReversementAuto] = useState(true)
  const [choix, setChoix] = useState<ChoixRetrait | null>(null)
  const [autreNumero, setAutreNumero] = useState('')
  const [kycStatut, setKycStatut] = useState<KycStatut>('idle')
  const [kycMessage, setKycMessage] = useState('')
  const [reference, setReference] = useState('------')
  const [enCours, setEnCours] = useState(false)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const estTontine = type === 'tontine'
  const userNumero = user?.telephone || ''

  // Charge la référence depuis le backend au montage
  useEffect(() => {
    genererReference()
      .then(ref => setReference(ref))
      .catch(() => setReference(String(Math.floor(10000 + Math.random() * 90000))))
  }, [])

  // KYC réel — déclenchement auto quand 9 chiffres sur "autre numéro"
  useEffect(() => {
    if (choix !== 'autre_numero') return
    const n = autreNumero.replace(/\s/g, '')
    if (n.length === 9 && /^0\d{8}$/.test(n)) {
      setKycStatut('en_cours')
      setKycMessage('')
      let cancelled = false
      verifierNumeroRetrait(n).then(res => {
        if (cancelled) return
        const op = res.operateur
        if (op === 'airtel') {
          if (res.kyc_ok === true) {
            setKycStatut('ok')
            setKycMessage(res.message ?? 'Numéro Mobile Money Airtel vérifié.')
          } else if (res.kyc_ok === false) {
            setKycStatut('echec')
            setKycMessage(res.message ?? "Ce numéro n'est pas reconnu comme un compte Mobile Money actif.")
          } else {
            setKycStatut('indisponible')
            setKycMessage(res.message ?? 'Vérification indisponible pour l\'instant.')
          }
        } else if (op === 'moov') {
          setKycStatut('moov_warning')
          setKycMessage(res.message ?? 'Numéro Moov détecté. Les retraits Moov ne sont pas encore disponibles.')
        } else {
          setKycStatut('echec')
          setKycMessage(res.message ?? "Ce numéro n'est pas reconnu.")
        }
      }).catch(() => {
        if (!cancelled) {
          setKycStatut('indisponible')
          setKycMessage('Vérification indisponible pour l\'instant.')
        }
      })
      return () => { cancelled = true }
    } else {
      setKycStatut('idle')
      setKycMessage('')
    }
  }, [autreNumero, choix])

  const handleChoix = (c: ChoixRetrait) => {
    if (c === 'mon_numero') {
      if (choix === 'mon_numero' && kycStatut === 'ok') return
      setChoix('mon_numero')
      setKycStatut('en_cours')
      setKycMessage('')
      const local = userNumero.startsWith('+241')
        ? '0' + userNumero.slice(4)
        : userNumero
      verifierNumeroRetrait(local).then(res => {
        const op = res.operateur
        if (op === 'airtel') {
          if (res.kyc_ok === true) {
            setKycStatut('ok')
            setKycMessage(res.message ?? 'Numéro Mobile Money Airtel vérifié.')
          } else if (res.kyc_ok === false) {
            setKycStatut('echec')
            setKycMessage(res.message ?? "Numéro non reconnu.")
          } else {
            setKycStatut('indisponible')
            setKycMessage(res.message ?? 'Vérification indisponible.')
          }
        } else if (op === 'moov') {
          setKycStatut('moov_warning')
          setKycMessage(res.message ?? 'Numéro Moov — retraits pas encore disponibles.')
        } else {
          setKycStatut('echec')
          setKycMessage(res.message ?? "Ce numéro n'est pas reconnu.")
        }
      }).catch(() => {
        setKycStatut('indisponible')
        setKycMessage('Vérification indisponible pour l\'instant.')
      })
    } else {
      setChoix('autre_numero')
      setKycStatut('idle')
      setKycMessage('')
    }
  }

  const valider = (): boolean => {
    const e: Record<string, string> = {}
    if (!titre.trim()) e.titre = 'Titre requis'
    if (estTontine) {
      const nb = parseInt(participants)
      if (!nb || nb < 2) e.participants = 'Au moins 2 participants'
      else if (nb > 200) e.participants = 'Maximum 200 participants'
      const mc = parseInt(montantCycle.replace(/\s/g, ''))
      if (!mc || mc < 100) e.montantCycle = 'Minimum 100 FCFA'
      else if (mc > 2500000) e.montantCycle = 'Maximum 2 500 000 FCFA'
      if (!sansPenalite && !parseInt(penaliteMontant)) {
        e.penaliteMontant = 'Montant requis (min 1 FCFA)'
      }
    } else {
      const mc2 = parseInt(montantCible.replace(/\s/g, ''))
      if (montantCible && mc2 < 100) e.montantCible = 'Minimum 100 FCFA'
    }
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const creer = async () => {
    if (!valider()) return
    const kycOk = kycStatut === 'ok' || kycStatut === 'moov_warning'
    if (!kycOk) {
      alert('Choisissez et vérifiez un numéro de retrait.')
      return
    }

    const numeroRetrait = choix === 'mon_numero'
      ? userNumero
      : (autreNumero.startsWith('0')
        ? '+241' + autreNumero.slice(1)
        : autreNumero)

    setEnCours(true)
    try {
      if (estTontine) {
        const payload: Parameters<typeof creerCagnotte>[0] = {
          type: 'tontine_periodique',
          titre: titre.trim(),
          numero_retrait: numeroRetrait,
          reference,
          montant_par_cycle: parseInt(montantCycle.replace(/\s/g, '')),
          periodicite,
          intervalle,
          nombre_participants: parseInt(participants),
          penalite_active: !sansPenalite,
        }
        if (periodicite === 'hebdomadaire') {
          const JOURS_FR = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
          payload.jour_semaine = JOURS_FR[jourSemaine]
        } else {
          payload.jour_mois = jourMois
        }
        if (!sansPenalite && penaliteMontant) {
          payload.penalite_montant = parseInt(penaliteMontant)
          payload.penalite_frequence = penaliteFrequence
        }
        const creee = await creerCagnotte(payload)
        navigate(`/cagnottes/${creee.id}/tontine-creee`)
      } else {
        const payload: Parameters<typeof creerCagnotte>[0] = {
          type: 'cagnotte_ouverte',
          titre: titre.trim(),
          numero_retrait: numeroRetrait,
          reference,
          reversement_auto: reversementAuto,
        }
        if (montantCible) payload.montant_cible = parseInt(montantCible.replace(/\s/g, ''))
        if (dateFin) payload.date_fin = dateFin
        const creee = await creerCagnotte(payload)
        navigate(`/cagnottes/${creee.id}/cotisation-creee`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inattendue. Réessaie.'
      alert(msg)
      setEnCours(false)
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: T.surface, minHeight: '100%', paddingBottom: '40px' }}>
        <div style={{ padding: '16px 20px 32px' }}>

          {/* 1 — Toggle type */}
          <div style={{
            height: '56px', padding: '4px',
            background: T.surfaceEl, borderRadius: '18px',
            border: `1px solid rgba(216,207,192,0.6)`,
            position: 'relative', display: 'flex',
          }}>
            <div style={{
              position: 'absolute', top: '4px', bottom: '4px',
              width: 'calc(50% - 4px)',
              left: estTontine ? '4px' : 'calc(50%)',
              background: T.primary, borderRadius: '14px',
              boxShadow: `0 4px 12px rgba(15,76,92,0.25)`,
              transition: 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: 'none',
            }} />
            {([
              { v: 'tontine' as TypeC, label: 'Tontine', icon: <IconSync /> },
              { v: 'cotisation' as TypeC, label: 'Cotisation', icon: <IconCelebration /> },
            ]).map(opt => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', background: 'none', border: 'none', cursor: 'pointer',
                  position: 'relative', zIndex: 1, fontFamily: 'inherit',
                  color: type === opt.v ? T.surface : T.textSec,
                  fontSize: '15px', fontWeight: type === opt.v ? 700 : 600,
                  transition: 'color 0.2s', letterSpacing: '0.2px',
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ height: '24px' }} />

          {/* 2 — Titre de section */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, color: T.textStrong }}>
              {estTontine ? 'Votre tontine' : 'Votre cotisation'}
            </p>
            <p style={{ fontSize: '14px', color: T.textSec, marginTop: '2px' }}>
              {estTontine
                ? 'Montant fixe, rotation entre participants.'
                : 'Montant libre, événement ponctuel.'}
            </p>
          </div>

          {/* 2.5 — Identifiant (généré, informatif) */}
          <SectionIdentifiant id={reference} />
          <div style={{ height: '16px' }} />

          {/* 3 — Champ Titre */}
          <TField
            label="Titre"
            hint={estTontine ? 'ex :Tontine du quartier' : 'ex :Anniversaire Maman'}
            icon={<IconText />}
            value={titre}
            onChange={setTitre}
            error={erreurs.titre}
          />

          <div style={{ height: '14px' }} />

          {/* 4 — Section animée */}
          <AnimatePresence mode="wait">
            {estTontine ? (
              <motion.div key="tontine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
                <SectionTontine
                  participants={participants} onParticipants={setParticipants}
                  montantCycle={montantCycle} onMontantCycle={setMontantCycle}
                  periodiciteCourte={periodiciteCourte} onPeriodiciteCourte={choisirPeriodicite}
                  jourMois={jourMois} onJourMois={setJourMois}
                  sansPenalite={sansPenalite} onSansPenalite={setSansPenalite}
                  penaliteMontant={penaliteMontant} onPenaliteMontant={setPenaliteMontant}
                  penaliteFrequence={penaliteFrequence} onPenaliteFrequence={setPenaliteFrequence}
                  erreurs={erreurs}
                />
              </motion.div>
            ) : (
              <motion.div key="cotisation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
                <SectionCagnotteOuverte
                  montantCible={montantCible} onMontantCible={setMontantCible}
                  dateFin={dateFin} onDateFin={setDateFin}
                  erreurs={erreurs}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5 — Récap frais tontine — TODO(detail): afficher sur la page de détail */}
          {/* {estTontine && <RecapTontineCard montantCycle={montantCycle} participants={participants} />} */}

          {/* 6 — Reversement auto */}
          <AnimatePresence>
            {!estTontine && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ height: '16px' }} />
                <SectionReversementAuto
                  actif={reversementAuto} onChanged={setReversementAuto}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ height: '24px' }} />

          {/* 7 — Numéro de retrait */}
          <SectionNumeroRetrait
            userNumero={userNumero}
            choix={choix} onChoix={handleChoix}
            autreNumero={autreNumero} onAutreNumero={setAutreNumero}
            kycStatut={kycStatut} kycMessage={kycMessage}
          />

          <div style={{ height: '24px' }} />

          {/* 8 — Rappel conditions + Bouton Créer */}
          <p style={{ fontSize: '13px', color: T.primary, textAlign: 'center', marginBottom: '12px', opacity: 0.75 }}>
            <a href="https://tonji.ga/cgu" target="_blank" rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
              Rappel des conditions d'utilisation
            </a>
          </p>
          <button
            onClick={creer}
            disabled={enCours}
            style={{
              width: '100%', height: '54px', borderRadius: '16px', border: 'none',
              background: enCours ? T.surfaceDeep : T.primary,
              color: enCours ? T.textTert : T.surface,
              fontSize: '16px', fontWeight: 700, letterSpacing: '0.3px',
              fontFamily: 'inherit', cursor: enCours ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
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
                <IconCheck />
                {estTontine ? 'Créer la tontine' : 'Créer la cotisation'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
