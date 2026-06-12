/**
 * Détail d'une cagnotte — reproduction exacte du cagnotte_detail_screen.dart.
 *
 * Sections (RÈGLE 4-bis) :
 * 1. Hero  : type + ID, montant collecté, barre de progression (cotisation).
 * 2. Infos : créée le, date fin, périodicité, numéro de retrait, pénalité.
 * 3. Banners contextuels.
 * 4. Participants : vue gérant (liste complète) ou vue cotiseur (mon résumé).
 * 5. Historique : paiements + sorties, timeline compacte dans BlocSection.
 * 6. Actions : Cotiser / Partager / Quitter.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T, grad } from '@/lib/tokens'
import { chargerCagnotte, demarrerTontine, chargerInfoCagnottePublique, rejoindre } from '@/lib/cagnottesApi'
import type { CagnotteDetail, Participant, Paiement, Reversement, InfoCagnottePublique } from '@/lib/cagnottesApi'
import { useAuthStore } from '@/store/authStore'
import AuthBottomSheet from '@/components/auth/AuthBottomSheet'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMontant(n: number): string {
  const s = Math.round(n).toString()
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ' '
    out += s[i]
  }
  return out + ' FCFA'
}

const MOIS_ABBR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const JOURS_ABBR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

function formatDate(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getDate()} ${MOIS_ABBR[d.getMonth()]} ${d.getFullYear()}`
}

function formatDateHeure(isoStr: string): string {
  const d = new Date(isoStr)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${JOURS_ABBR[d.getDay()]} ${d.getDate()} ${MOIS_ABBR[d.getMonth()]} · ${h}h${m}`
}

function delaiTexte(isoStr: string): string {
  const now = new Date()
  const d = new Date(isoStr)
  const diff = Math.round((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff < 0) return 'Passé'
  if (diff < 7) return `Dans ${diff} jours`
  if (diff < 14) return 'Dans 1 semaine'
  return `Dans ${Math.round(diff / 7)} semaines`
}

function cadenceHumaine(c: CagnotteDetail): string {
  if (!c.periodicite) return ''
  const n = c.intervalle
  let tete = ''
  if (c.periodicite === 'hebdomadaire') {
    tete = n === 1 ? 'Chaque semaine' : `Toutes les ${n} semaines`
    if (c.jourSemaine) tete += `, le ${c.jourSemaine}`
  } else {
    tete = n === 1 ? 'Chaque mois' : `Tous les ${n} mois`
    if (c.jourMois) tete += `, le ${c.jourMois}`
  }
  return tete
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
)
const IconCoin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v8m-3-4h6"/>
  </svg>
)
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
)
const IconExit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IconHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
  </svg>
)
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconSync = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
)
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18C0 .44.57-.17 1.3-.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L5.09 7a16 16 0 006.29 6.29l.56-1.26a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/>
  </svg>
)
const IconTimer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  </svg>
)

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonDetail() {
  return (
    <div style={{ background: T.surface, minHeight: '100%' }}>
      <div style={{ height: '220px', background: `linear-gradient(135deg, ${T.primary} 0%, #1a6d82 100%)` }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[80, 180, 140].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 20, background: T.surfaceDeep }} />
        ))}
      </div>
    </div>
  )
}

// ── BlocSection — miroir exact du _BlocSection Flutter ────────────────────────

function BlocSection({ titre, compteur, action, children }: { titre: string; compteur?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingLeft: '4px' }}>
        <p style={{ fontSize: '18px', fontWeight: 700, color: T.textStrong }}>{titre}</p>
        {compteur !== undefined && (
          <span style={{
            fontSize: '12px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px',
            background: `rgba(15,76,92,0.08)`, color: T.primary,
          }}>{compteur}</span>
        )}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      <div style={{
        background: T.surfaceEl, borderRadius: '20px',
        border: `1px solid rgba(216,207,192,0.6)`,
        paddingTop: '6px', paddingBottom: '6px', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Section Infos — miroir de _SectionInfos / _LigneInfo ────────────────────

function SectionInfos({ c }: { c: CagnotteDetail }) {
  const isTontine = c.type === 'tontine'
  const cadence   = cadenceHumaine(c)

  const lignes: { icon: React.ReactNode; label: string; value: string; accent?: boolean }[] = [
    { icon: <IconCalendar />, label: 'Créée le', value: formatDate(c.dateCreation) },
  ]
  if (c.dateFin) lignes.push({ icon: <IconCalendar />, label: 'Date de fin', value: formatDate(c.dateFin) })
  if (isTontine && cadence) lignes.push({ icon: <IconSync />, label: 'Cadence', value: cadence })
  if (isTontine && c.numeroRetraitMasque) lignes.push({ icon: <IconPhone />, label: 'Retrait sur', value: c.numeroRetraitMasque, accent: true })
  if (isTontine) {
    const penalite = c.penaliteActive && c.penaliteMontant
      ? `${fmtMontant(c.penaliteMontant)} par ${c.penaliteCourante > 0 ? 'heure' : 'jour'}`
      : 'Aucune'
    lignes.push({ icon: <IconTimer />, label: 'Pénalité', value: penalite })
  }

  return (
    <div style={{
      background: T.surfaceEl, borderRadius: '20px',
      border: `1px solid rgba(216,207,192,0.6)`,
      padding: '2px 18px', marginBottom: '16px',
    }}>
      {lignes.map((l, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 0',
          borderBottom: i < lignes.length - 1 ? `1px solid rgba(216,207,192,0.5)` : 'none',
        }}>
          <span style={{ color: T.textSec, flexShrink: 0 }}>{l.icon}</span>
          <span style={{ fontSize: '14px', color: T.textSec, flex: 1 }}>{l.label}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: l.accent ? T.accent : T.textStrong }}>
            {l.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Ligne participant — miroir de _LigneParticipant Flutter ───────────────────

function LigneParticipant({ p, index, estTontine, tontineDemarree }: {
  p: Participant; index: number; estTontine: boolean; tontineDemarree: boolean
}) {
  const couleurStatut = p.statutPaiement === 'paye' ? T.success : p.statutPaiement === 'en_retard' ? T.error : T.warning
  const libelleStatut = p.statutPaiement === 'paye' ? 'Payé' : p.statutPaiement === 'en_retard' ? 'En retard' : 'En attente'
  const StatusIcon    = p.statutPaiement === 'paye' ? IconCheck : p.statutPaiement === 'en_retard' ? IconX : null

  // Avant démarrage tontine : en attente → pas de badge statut, juste opérateur
  const montrerBadge = !(estTontine && !tontineDemarree && p.statutPaiement === 'en_attente')

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        paddingLeft: '14px', paddingRight: '14px', paddingTop: '10px', paddingBottom: '10px',
      }}
    >
      {/* Numéro d'ordre tontine démarrée */}
      {estTontine && tontineDemarree && p.ordrePassage > 0 && (
        <span style={{ width: 24, fontSize: '11px', fontWeight: 800, color: T.primary, flexShrink: 0, textAlign: 'center' }}>
          #{p.ordrePassage}
        </span>
      )}

      {/* Avatar circulaire */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
        background: p.estMoi ? `rgba(15,76,92,0.18)` : `rgba(15,76,92,0.10)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 800, color: T.primary, letterSpacing: '0.4px',
      }}>
        {p.initiales}
      </div>

      {/* Nom + numéro */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.nomComplet}
          </p>
          {p.estMoi && (
            <span style={{ fontSize: '10px', fontWeight: 800, color: T.success, background: `rgba(107,142,78,0.13)`, padding: '1px 6px', borderRadius: '6px', flexShrink: 0 }}>
              Moi
            </span>
          )}
          {!p.estMoi && p.estCompteLight && (
            <span style={{ fontSize: '10px', fontWeight: 800, color: T.textSec, background: `rgba(92,98,95,0.13)`, padding: '1px 6px', borderRadius: '6px', flexShrink: 0 }}>
              Invité
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: T.textSec }}>{p.numeroMasque}</p>
        {/* Numéro retrait différent */}
        {!p.estCompteLight && p.numeroRetraitMasque && p.numeroRetraitMasque !== p.numeroMasque && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span style={{ color: T.accent, fontSize: '11px' }}>→</span>
            <p style={{ fontSize: '12px', fontWeight: 600, color: T.accent }}>{p.numeroRetraitMasque}</p>
          </div>
        )}
      </div>

      {/* Droite : badge statut + montant */}
      {montrerBadge ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', fontWeight: 700, color: couleurStatut,
            background: `${couleurStatut}20`, padding: '3px 8px', borderRadius: '20px',
          }}>
            {StatusIcon && <StatusIcon />}
            {libelleStatut}
          </span>
          {p.montantPaye > 0 && (
            <p style={{ fontSize: '12px', fontWeight: 700, color: T.textStrong }}>{fmtMontant(p.montantPaye)}</p>
          )}
        </div>
      ) : (
        /* Avant démarrage tontine : opérateur à droite */
        p.operateur ? (
          <span style={{
            fontSize: '9px', fontWeight: 700, color: T.textSec,
            background: `rgba(216,207,192,0.5)`, borderRadius: '3px', padding: '1px 4px', letterSpacing: '0.3px',
          }}>
            {p.operateur}
          </span>
        ) : null
      )}
    </motion.div>
  )
}

// ── Export PDF historique ─────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function exporterHistorique(c: CagnotteDetail) {
  const now = new Date()
  const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
  const JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
  const dateExport = `${now.getDate()} ${MOIS[now.getMonth()]} ${now.getFullYear()} à ${now.getHours().toString().padStart(2,'0')}h${now.getMinutes().toString().padStart(2,'0')}`

  const fmtM = (n: number) => {
    const s = Math.round(Math.abs(n)).toString()
    let out = ''
    for (let i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ' '
      out += s[i]
    }
    return out + ' FCFA'
  }

  const fmtD = (iso: string) => {
    const d = new Date(iso)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} · ${h}h${m}`
  }

  type Mvt = { estSortie: boolean; nom: string; montant: number; date: string }
  const mouvements: Mvt[] = [
    ...c.historique.map(p => ({ estSortie: false, nom: p.participantNom || '—', montant: p.montant, date: p.date })),
    ...c.sorties.map(r  => ({ estSortie: true,  nom: r.beneficiaireNom,         montant: r.montant, date: r.date })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const totalEntrees = c.historique.reduce((s, p) => s + p.montant, 0)
  const totalSorties = c.sorties.reduce((s, r) => s + r.montant, 0)
  const solde = totalEntrees - totalSorties

  // Filigrane : grille de "TONDO" tournés à -38°
  const wmCells = Array.from({ length: 30 }, (_, i) => {
    const col = i % 5
    const row = Math.floor(i / 5)
    return `<div style="position:absolute;left:${col * 22 - 6}%;top:${row * 16 - 4}%;font-size:54px;font-weight:900;color:rgba(15,76,92,0.055);transform:rotate(-38deg);white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;letter-spacing:5px;user-select:none;pointer-events:none;">TONDO</div>`
  }).join('')

  const lignes = mouvements.length === 0
    ? `<tr><td colspan="4" style="text-align:center;padding:32px;color:#8A8F8C;">Aucun mouvement enregistré.</td></tr>`
    : mouvements.map(m => `
      <tr>
        <td><span class="${m.estSortie ? 'b-sortie' : 'b-entree'}">${m.estSortie ? 'Reversement' : 'Paiement'}</span></td>
        <td>${escHtml(m.nom)}</td>
        <td style="white-space:nowrap">${fmtD(m.date)}</td>
        <td class="${m.estSortie ? 'amt-s' : 'amt-e'}">${m.estSortie ? '–' : '+'}${fmtM(m.montant)}</td>
      </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Historique — ${escHtml(c.titre)} — Tonji</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 16mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1A1F1E; background: #F4ECE0; }
    .wm { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
    .page { position: relative; z-index: 1; max-width: 660px; margin: 0 auto; padding: 48px 40px 60px; }
    /* Header */
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
    .brand-icon { width: 46px; height: 46px; border-radius: 13px; background: #0F4C5C; display: flex; align-items: center; justify-content: center; color: #F4ECE0; font-size: 22px; font-weight: 900; letter-spacing: -1px; flex-shrink: 0; }
    .brand-name { font-size: 22px; font-weight: 900; color: #0F4C5C; letter-spacing: -0.5px; }
    .brand-sub { font-size: 12px; color: #5C625F; margin-top: 1px; }
    .sep { height: 1px; background: #D8CFC0; margin-bottom: 20px; }
    .cag-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
    .cag-title { font-size: 20px; font-weight: 800; color: #1A1F1E; }
    .cag-meta { font-size: 12px; color: #5C625F; margin-top: 3px; }
    .badge-statut { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: rgba(15,76,92,0.10); color: #0F4C5C; }
    /* Résumé */
    .resume { display: flex; gap: 10px; margin: 22px 0; flex-wrap: wrap; }
    .rc { flex: 1; min-width: 110px; background: #FBF7F0; border: 1px solid #D8CFC0; border-radius: 12px; padding: 13px 15px; }
    .rc-label { font-size: 10px; font-weight: 700; color: #8A8F8C; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .rc-value { font-size: 16px; font-weight: 800; }
    .c-success { color: #6B8E4E; } .c-accent { color: #C97B4A; } .c-primary { color: #0F4C5C; }
    /* Table */
    table { width: 100%; border-collapse: collapse; background: #FBF7F0; border-radius: 14px; overflow: hidden; }
    thead tr { background: #0F4C5C; }
    th { padding: 10px 13px; text-align: left; font-size: 11px; font-weight: 700; color: #F4ECE0; letter-spacing: 0.5px; text-transform: uppercase; }
    td { padding: 10px 13px; font-size: 13px; border-bottom: 1px solid #EAE0CF; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: rgba(234,224,207,0.40); }
    .b-entree { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; background: rgba(107,142,78,0.13); color: #6B8E4E; }
    .b-sortie  { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; background: rgba(201,123,74,0.13); color: #C97B4A; }
    .amt-e { font-weight: 800; color: #6B8E4E; white-space: nowrap; }
    .amt-s { font-weight: 800; color: #C97B4A; white-space: nowrap; }
    /* Footer */
    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #D8CFC0; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
    .ft-l { font-size: 11px; color: #8A8F8C; line-height: 1.65; }
    .ft-r { font-size: 10px; color: #8A8F8C; text-align: right; }
    /* Bouton impression (non imprimé) */
    .print-btn { display: block; margin: 0 auto 28px; padding: 10px 28px; border-radius: 10px; border: none; background: #0F4C5C; color: #F4ECE0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
  </style>
</head>
<body>
<div class="wm">${wmCells}</div>
<div class="page">
  <button class="print-btn no-print" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  <div class="brand">
    <div class="brand-icon">T</div>
    <div>
      <div class="brand-name">Tonji</div>
      <div class="brand-sub">Tontines &amp; cotisations · Paynala</div>
    </div>
  </div>
  <div class="sep"></div>
  <div class="cag-row">
    <div>
      <div class="cag-title">${escHtml(c.titre)}</div>
      <div class="cag-meta">Référence #${escHtml(c.id)} · ${c.type === 'tontine' ? 'Tontine périodique' : 'Cotisation ouverte'}</div>
    </div>
    <span class="badge-statut">${c.statut === 'cloturee' ? 'Clôturée' : 'Active'}</span>
  </div>

  <div class="resume">
    <div class="rc"><div class="rc-label">Total encaissé</div><div class="rc-value c-success">+${fmtM(totalEntrees)}</div></div>
    ${totalSorties > 0 ? `<div class="rc"><div class="rc-label">Total reversé</div><div class="rc-value c-accent">–${fmtM(totalSorties)}</div></div>` : ''}
    <div class="rc"><div class="rc-label">Solde historique</div><div class="rc-value c-primary">${fmtM(solde)}</div></div>
    <div class="rc"><div class="rc-label">Mouvements</div><div class="rc-value c-primary">${mouvements.length}</div></div>
  </div>

  <table>
    <thead><tr><th>Type</th><th>Nom</th><th>Date &amp; heure</th><th>Montant</th></tr></thead>
    <tbody>${lignes}</tbody>
  </table>

  <div class="footer">
    <div class="ft-l">
      <strong>Tonji by Paynala</strong><br>
      Généré le ${dateExport}<br>
      <em>Relevé informatif non contractuel. Ce document comporte un filigrane numérique Tonji à des fins d'authenticité et d'anti-fraude.</em>
    </div>
    <div class="ft-r">Réf. #${escHtml(c.id)}</div>
  </div>
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=740,height=960,scrollbars=yes')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ── Historique unifié — miroir exact de _BlocHistoriqueUnifie ────────────────

function BlocHistoriqueUnifie({ historique, sorties, onExporter }: { historique: Paiement[]; sorties: Reversement[]; onExporter?: () => void }) {
  type Item = { key: string; nom: string; montant: number; date: string; estSortie: boolean }
  const items: Item[] = [
    ...historique.map(p => ({ key: `p-${p.id}`, nom: p.participantNom, montant: p.montant, date: p.date, estSortie: false })),
    ...sorties.map(r  => ({ key: `r-${r.id}`, nom: `→ ${r.beneficiaireNom}`, montant: r.montant, date: r.date, estSortie: true })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const total = items.length

  const exportBtn = onExporter ? (
    <button
      onClick={onExporter}
      title="Exporter l'historique"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px', borderRadius: '10px', border: `1.5px solid ${T.border}`,
        background: T.surfaceEl, color: T.textSec, fontSize: '12px', fontWeight: 700,
        fontFamily: 'inherit', cursor: 'pointer',
      }}
    >
      <IconDownload /> Exporter
    </button>
  ) : undefined

  return (
    <BlocSection titre="Historique" compteur={`${total}`} action={exportBtn}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 14px' }}>
          <span style={{ color: T.textTert }}><IconHistory /></span>
          <p style={{ fontSize: '14px', color: T.textTert }}>Aucun mouvement enregistré pour le moment.</p>
        </div>
      ) : (
        items.map((item, i) => {
          const estPremier = i === 0
          const estDernier = i === total - 1
          const dotColor   = item.estSortie ? T.accent : T.success
          const sign       = item.estSortie ? '–' : '+'
          const amountColor = item.estSortie ? T.accent : T.success

          return (
            <div key={item.key} style={{ display: 'flex', padding: '8px 14px', alignItems: 'stretch' }}>
              {/* Timeline: ligne + dot + ligne */}
              <div style={{ width: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                {/* Ligne au-dessus */}
                <div style={{ width: '1.5px', height: estPremier ? '8px' : '8px', background: estPremier ? 'transparent' : T.border }} />
                {/* Dot */}
                <div style={{
                  width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                  background: dotColor, border: `2px solid ${T.surfaceEl}`,
                }} />
                {/* Ligne en dessous */}
                {!estDernier && <div style={{ width: '1.5px', flex: 1, background: T.border, marginTop: '0px' }} />}
              </div>

              {/* Contenu */}
              <div style={{ flex: 1, marginLeft: '8px', paddingTop: '2px', paddingBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nom}
                  </p>
                  <p style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>{formatDateHeure(item.date)}</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 800, color: amountColor, flexShrink: 0 }}>
                  {sign}{fmtMontant(item.montant)}
                </p>
              </div>
            </div>
          )
        })
      )}
    </BlocSection>
  )
}

// ── Carte "Mon résumé" (cotiseur) — miroir de _CarteMonResume ────────────────

function CarteMonResume({ nbPaiements, total }: { nbPaiements: number; total: number }) {
  return (
    <div style={{
      background: `rgba(201,123,74,0.08)`, borderRadius: '20px',
      border: `1px solid rgba(201,123,74,0.30)`,
      padding: '16px 18px 18px', marginBottom: '24px',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      {/* Icône */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
        background: `rgba(201,123,74,0.18)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.accent,
      }}>
        <IconCoin />
      </div>
      {/* Texte */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: T.textSec, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '2px' }}>
          Vos cotisations
        </p>
        <p style={{ fontSize: '22px', fontWeight: 800, color: T.accent, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          {fmtMontant(total)}
        </p>
        <p style={{ fontSize: '12px', color: T.textSec, marginTop: '1px' }}>
          {nbPaiements > 1 ? `${nbPaiements} versements effectués` : nbPaiements === 1 ? '1 versement effectué' : 'aucun versement à ce jour'}
        </p>
      </div>
    </div>
  )
}

// ── Banner générique ───────────────────────────────────────────────────────────

function Banner({ icon, message, couleur, bg, border }: {
  icon: React.ReactNode; message: string; couleur: string; bg: string; border: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 14px', borderRadius: '14px',
        background: bg, border: `1px solid ${border}`, marginBottom: '16px',
      }}
    >
      <span style={{ color: couleur, flexShrink: 0 }}>{icon}</span>
      <p style={{ fontSize: '13px', fontWeight: 600, color: couleur, lineHeight: 1.5 }}>{message}</p>
    </motion.div>
  )
}

// ── Carte prochaine échéance ───────────────────────────────────────────────────

function CarteProchaineEcheance({ c }: { c: CagnotteDetail }) {
  const date  = c.prochaineDate
  const benef = c.prochainBeneficiaire
  if (!date && !benef) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '14px 16px 16px', borderRadius: '20px', marginBottom: '24px',
        background: `linear-gradient(135deg, rgba(15,76,92,0.12) 0%, rgba(201,123,74,0.07) 100%)`,
        border: `1px solid rgba(15,76,92,0.30)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ color: T.primary }}><IconCalendar /></span>
        <p style={{ fontSize: '12px', fontWeight: 700, color: T.primary, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
          Prochaine échéance
        </p>
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        {date && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: T.textTert, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Date de retrait</p>
            <p style={{ fontSize: '15px', fontWeight: 800, color: T.primary }}>{formatDate(date)}</p>
            <p style={{ fontSize: '12px', color: T.textSec }}>{delaiTexte(date)}</p>
          </div>
        )}
        {benef && date && <div style={{ width: '1px', background: `rgba(15,76,92,0.20)`, alignSelf: 'stretch' }} />}
        {benef && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: T.textTert, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Prochain bénéficiaire</p>
            <p style={{ fontSize: '15px', fontWeight: 800, color: benef.estMoi ? T.accent : T.primary }}>
              {benef.estMoi ? 'Vous !' : `${benef.prenom} ${benef.nom}`}
            </p>
            {benef.ordrePassage > 0 && (
              <p style={{ fontSize: '12px', color: T.textSec }}>Tour n° {benef.ordrePassage}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroDetail({ c }: { c: CagnotteDetail }) {
  const isTontine   = c.type === 'tontine'
  const isGerant    = c.role === 'gerant'
  const heroGrad    = isTontine
    ? grad.primary
    : `linear-gradient(135deg, #9B6A30 0%, ${T.accent} 55%, #D4954A 100%)`
  const progression = c.montantCible ? Math.min(c.montantCollecte / c.montantCible, 1) : null

  const s = Math.round(c.montantCollecte).toString()
  let montantFmt = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) montantFmt += ' '
    montantFmt += s[i]
  }

  return (
    <div style={{ background: heroGrad, position: 'relative', overflow: 'hidden', padding: '24px 24px 24px' }}>
      {/* Cercle déco */}
      <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', top: -30, right: -30, pointerEvents: 'none' }} />

      {/* Type + ID + Gérant */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.95)', letterSpacing: '0.4px' }}>
          {isTontine ? 'Tontine' : 'Cotisation'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.6px' }}>
          #{c.id}
        </span>
        {isGerant && (
          <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.90)' }}>
            Gérant
          </span>
        )}
      </div>

      {/* Titre */}
      <p style={{ fontSize: '20px', fontWeight: 800, color: 'rgba(255,255,255,0.95)', lineHeight: 1.2, marginBottom: '14px' }}>{c.titre}</p>

      {/* Label montant */}
      <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
        Total collecté
      </p>

      {/* Montant animé */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '4px' }}
      >
        <span style={{ fontSize: '36px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{montantFmt}</span>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', paddingBottom: '6px' }}>FCFA</span>
      </motion.div>

      {/* Progression (cotisation avec cible) */}
      {progression !== null && c.montantCible && (
        <div style={{ marginTop: '18px', marginBottom: '14px' }}>
          <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.18)', position: 'relative', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progression * 100}%` }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: T.surface }}>{Math.round(progression * 100)} %</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>cible : {fmtMontant(c.montantCible)}</span>
          </div>
        </div>
      )}

      {/* Cadence (tontine avec montant/cycle) */}
      {isTontine && c.montantParCycle && !progression && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
          <span style={{ color: T.surface, opacity: 0.75 }}><IconCoin /></span>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
            {fmtMontant(c.montantParCycle)}{cadenceHumaine(c) ? ` · ${cadenceHumaine(c)}` : ''}
          </p>
        </div>
      )}

      {/* Collecte libre */}
      {!isTontine && !c.montantCible && (
        <span style={{ display: 'inline-block', marginTop: '12px', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.18)', color: T.surface }}>
          Collecte libre · sans objectif fixé
        </span>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
        {c.participants.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.70)' }}><IconUsers /></span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              {isTontine ? `${c.nombreInscrits + 1}/${c.nombreParticipants}` : `${c.participants.length}`} participants
            </span>
          </div>
        )}
        {isTontine && c.periodicite && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.70)' }}><IconClock /></span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              {c.periodicite === 'mensuelle' ? 'Mensuelle' : 'Hebdomadaire'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

// ── Vue publique (non connecté / non membre) ──────────────────────────────────

function VuePublique({ info, id, onAction, enCours }: {
  info: InfoCagnottePublique
  id: string
  onAction: (action: 'participer' | 'cotiser') => void
  enCours: boolean
}) {
  const isTontine   = info.type === 'tontine'
  const estCloturee = info.statut === 'cloturee'
  const pleine      = isTontine && info.nombreInscrits >= info.nombreParticipants && info.nombreParticipants > 0
  const actionLabel = isTontine && !pleine ? 'Participer' : 'Cotiser'
  const action      = isTontine && !pleine ? 'participer' : 'cotiser'

  const s = Math.round(info.montantCollecte).toString()
  let montantFmt = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) montantFmt += ' '
    montantFmt += s[i]
  }

  const heroGrad = isTontine
    ? `linear-gradient(135deg, #0F4C5C 0%, #1a6d82 100%)`
    : `linear-gradient(135deg, #9B6A30 0%, #C97B4A 55%, #D4954A 100%)`

  return (
    <div style={{ background: T.surface, minHeight: '100%', paddingBottom: '80px' }}>
      {/* Hero */}
      <div style={{ background: heroGrad, padding: '24px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', top: -30, right: -30 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.95)', letterSpacing: '0.4px' }}>
            {isTontine ? 'Tontine' : 'Cotisation'}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.6px' }}>#{id}</span>
        </div>
        <p style={{ fontSize: '20px', fontWeight: 800, color: 'rgba(255,255,255,0.95)', lineHeight: 1.2, marginBottom: '14px' }}>{info.titre}</p>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Total collecté</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '12px' }}>
          <span style={{ fontSize: '36px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{montantFmt}</span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', paddingBottom: '6px' }}>FCFA</span>
        </div>
        {info.nombreParticipants > 0 && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {isTontine
              ? `${info.nombreInscrits}/${info.nombreParticipants} participants`
              : `${info.nombreInscrits} participant${info.nombreInscrits > 1 ? 's' : ''}`}
          </p>
        )}
        {isTontine && info.montantParCycle && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.80)', fontWeight: 500, marginTop: '6px' }}>
            {Math.round(info.montantParCycle).toLocaleString('fr-FR')} FCFA / cycle
          </p>
        )}
      </div>

      {/* Action */}
      <div style={{ padding: '24px 16px' }}>
        {estCloturee ? (
          <div style={{ width: '100%', height: '52px', borderRadius: '16px', background: T.surfaceDeep, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textTert, fontSize: '15px', fontWeight: 700 }}>
            Cagnotte clôturée
          </div>
        ) : (
          <button
            onClick={() => onAction(action)}
            disabled={enCours}
            style={{
              width: '100%', height: '56px', borderRadius: '18px', border: 'none',
              cursor: enCours ? 'not-allowed' : 'pointer',
              background: isTontine && !pleine ? T.primary : T.accent,
              color: isTontine && !pleine ? T.surface : T.textStrong,
              fontSize: '17px', fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              opacity: enCours ? 0.7 : 1,
            }}
          >
            {enCours
              ? <span style={{ width: 22, height: 22, border: `2.5px solid rgba(255,255,255,0.4)`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : actionLabel}
          </button>
        )}

        <p style={{ fontSize: '12px', color: T.textTert, textAlign: 'center', marginTop: '10px' }}>
          {estCloturee ? '' : 'Vous serez invité à vous connecter ou créer un compte.'}
        </p>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function MobileDetailCagnotte() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [cagnotte, setCagnotte]         = useState<CagnotteDetail | null>(null)
  const [infoPub, setInfoPub]           = useState<InfoCagnottePublique | null>(null)
  const [chargement, setChargement]     = useState(true)
  const [erreur, setErreur]             = useState<string | null>(null)
  const [showAllP, setShowAllP]         = useState(false)
  const [quitterModal, setQuitterModal] = useState(false)
  const [demarrageEnCours, setDemarrageEnCours] = useState(false)
  const [showAuthSheet, setShowAuthSheet]       = useState(false)
  const [pendingAction, setPendingAction]       = useState<'participer' | 'cotiser' | null>(null)
  const [rejointEnCours, setRejointEnCours]     = useState(false)

  const charger = useCallback(async () => {
    if (!id) return
    setChargement(true)
    setErreur(null)
    if (user) {
      const data = await chargerCagnotte(id)
      if (data) {
        setCagnotte(data)
        setInfoPub(null)
      } else {
        // Utilisateur connecté mais non membre → vue publique
        const pub = await chargerInfoCagnottePublique(id)
        setInfoPub(pub)
        setCagnotte(null)
        if (!pub) setErreur('Cagnotte introuvable.')
      }
    } else {
      // Non connecté → vue publique
      const pub = await chargerInfoCagnottePublique(id)
      setInfoPub(pub)
      setCagnotte(null)
      if (!pub) setErreur('Cagnotte introuvable.')
    }
    setChargement(false)
  }, [id, user])

  useEffect(() => { charger() }, [charger])

  // ── Handlers action publique ────────────────────────────────────────────────

  const executerAction = async (action: 'participer' | 'cotiser', detailApresAuth?: CagnotteDetail | null) => {
    const detail = detailApresAuth !== undefined ? detailApresAuth : cagnotte
    const titre  = detail?.titre ?? infoPub?.titre ?? '—'
    const type   = detail?.type  ?? infoPub?.type  ?? 'cotisation'
    if (action === 'cotiser') {
      navigate(`/cagnottes/${id}/cotiser`, {
        state: {
          titre, type,
          montantSuggere: detail?.montantParCycle ?? infoPub?.montantParCycle ?? 0,
          montantAffiche: detail?.montantParCycle ?? infoPub?.montantParCycle ?? 0,
          montantRecuperation: 0,
          penaliteActive: detail?.penaliteActive ?? false,
          penaliteCourante: detail?.penaliteMontant ?? 0,
        }
      })
    } else {
      // participer → rejoindre
      setRejointEnCours(true)
      try {
        await rejoindre(id!)
        const data = await chargerCagnotte(id!)
        if (data) { setCagnotte(data); setInfoPub(null) }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur'
        if (!msg.includes('409') && !msg.toLowerCase().includes('déjà')) alert(msg)
        else {
          // Déjà membre → on recharge juste
          const data = await chargerCagnotte(id!)
          if (data) { setCagnotte(data); setInfoPub(null) }
        }
      } finally {
        setRejointEnCours(false)
      }
    }
  }

  const handleAction = (action: 'participer' | 'cotiser') => {
    if (!user) {
      setPendingAction(action)
      setShowAuthSheet(true)
    } else {
      executerAction(action)
    }
  }

  const handleAuthSuccess = async () => {
    setShowAuthSheet(false)
    const action = pendingAction
    setPendingAction(null)
    // L'utilisateur est maintenant connecté — recharger les données complètes
    const data = await chargerCagnotte(id!)
    if (data) { setCagnotte(data); setInfoPub(null) }
    if (action) executerAction(action, data)
  }

  // ── États de rendu ──────────────────────────────────────────────────────────

  if (chargement) return <SkeletonDetail />

  if (erreur) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '32px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '18px', fontWeight: 700, color: T.textStrong, marginBottom: '8px' }}>Impossible d'afficher</p>
        <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '24px' }}>{erreur}</p>
        <button onClick={charger} style={{ height: '48px', padding: '0 24px', borderRadius: '14px', border: 'none', background: T.primary, color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <IconRefresh /> Réessayer
        </button>
      </div>
    )
  }

  // Vue publique (non connecté ou non membre)
  if (!cagnotte && infoPub) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <VuePublique info={infoPub} id={id!} onAction={handleAction} enCours={rejointEnCours} />
        <AuthBottomSheet
          open={showAuthSheet}
          onClose={() => { setShowAuthSheet(false); setPendingAction(null) }}
          onSuccess={handleAuthSuccess}
          actionLabel={infoPub.type === 'tontine' && infoPub.nombreInscrits < infoPub.nombreParticipants
            ? 'Rejoindre la tontine'
            : 'Cotiser'}
        />
      </>
    )
  }

  if (!cagnotte) return null

  // ── Logique métier ──────────────────────────────────────────────────────────
  const isTontine        = cagnotte.type === 'tontine'
  const isGerant         = cagnotte.role === 'gerant'
  const estCloturee      = cagnotte.statut === 'cloturee'
  const tontineDemarree  = isTontine && cagnotte.statut === 'en_cours'
  const tontineActive    = isTontine && cagnotte.statut === 'active'
  const objectifAtteint  = !isTontine && !!cagnotte.montantCible && cagnotte.montantCollecte >= cagnotte.montantCible
  const dateLimiteDepassee = !isTontine && !!cagnotte.dateFin && new Date(cagnotte.dateFin) < new Date()
  const estTerminee      = estCloturee || (isTontine && cagnotte.rotationTerminee)
  const peutCotiser      = !estTerminee && !objectifAtteint && !dateLimiteDepassee && (isTontine ? tontineDemarree : true)
  const aDejaPayeCycle   = isTontine && cagnotte.participants.some(p => p.estMoi && p.statutPaiement === 'paye')
  const peutQuitter      = !isGerant && (isTontine ? !tontineDemarree : true) && !estCloturee

  const montantDisponible = cagnotte.montantCollecte - cagnotte.sorties.reduce((s, r) => s + r.montant, 0)
  const monTotal = cagnotte.historique.reduce((s, p) => s + p.montant, 0)

  const partagerLien = async () => {
    const lien = window.location.origin + '/rejoindre/' + cagnotte.id
    if (navigator.share) {
      try { await navigator.share({ title: cagnotte.titre, text: 'Rejoins ma cagnotte sur Tonji', url: lien }) } catch { /* annulé */ }
    } else {
      await navigator.clipboard.writeText(lien)
      alert('Lien copié !')
    }
  }

  const lancerDemarrage = async () => {
    if (!id) return
    setDemarrageEnCours(true)
    try {
      await demarrerTontine(id)
      await charger()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors du démarrage.')
    } finally {
      setDemarrageEnCours(false)
    }
  }

  // Tri participants
  const participantsTries: Participant[] = isTontine
    ? (cagnotte.participants.some(p => p.ordrePassage > 0)
        ? [...cagnotte.participants].sort((a, b) => {
            const ao = a.ordrePassage === 0 ? 9999 : a.ordrePassage
            const bo = b.ordrePassage === 0 ? 9999 : b.ordrePassage
            return ao - bo
          })
        : cagnotte.participants)
    : [...cagnotte.participants].sort((a, _b) => a.estMoi ? -1 : 1)

  const displayedP = showAllP ? participantsTries : participantsTries.slice(0, 5)

  return (
    <div style={{ background: T.surface, minHeight: '100%', paddingBottom: '100px' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <HeroDetail c={cagnotte} />
      </motion.div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── Infos ─────────────────────────────────────────────────────── */}
        <SectionInfos c={cagnotte} />

        {/* ── Banner : payé ce cycle ────────────────────────────────────── */}
        {aDejaPayeCycle && (
          <Banner icon={<IconCheckCircle />} message="Vous avez payé votre cotisation pour ce cycle."
            couleur={T.success} bg="rgba(107,142,78,0.10)" border="rgba(107,142,78,0.35)" />
        )}

        {/* ── Banner : rotation terminée ────────────────────────────────── */}
        {isTontine && tontineDemarree && cagnotte.rotationTerminee && (
          <Banner icon={<IconStar />} message="Rotation terminée — tous les participants ont reçu leur mise."
            couleur={T.success} bg="rgba(107,142,78,0.10)" border="rgba(107,142,78,0.40)" />
        )}

        {/* ── Banner : objectif atteint / date dépassée ─────────────────── */}
        {!isTontine && (objectifAtteint || dateLimiteDepassee) && !estTerminee && (
          <Banner
            icon={<IconCheckCircle />}
            message={objectifAtteint ? 'Objectif atteint — les cotisations sont fermées.' : 'Date limite dépassée — les cotisations sont fermées.'}
            couleur={T.success} bg="rgba(107,142,78,0.10)" border="rgba(107,142,78,0.40)" />
        )}

        {/* ── Banner : c'est votre tour ─────────────────────────────────── */}
        {isTontine && tontineDemarree && cagnotte.prochainBeneficiaire?.estMoi && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px',
              borderRadius: '16px', marginBottom: '16px',
              background: `linear-gradient(135deg, rgba(201,123,74,0.15) 0%, rgba(201,123,74,0.07) 100%)`,
              border: `1px solid rgba(201,123,74,0.50)`,
            }}
          >
            <span style={{ color: T.accent }}><IconStar /></span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 800, color: T.accent, marginBottom: '2px' }}>C'est bientôt votre tour !</p>
              {cagnotte.prochaineDate && (
                <p style={{ fontSize: '13px', fontWeight: 500, color: T.accent }}>
                  Vous recevrez les fonds le {formatDate(cagnotte.prochaineDate)}.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Prochaine échéance ────────────────────────────────────────── */}
        {isTontine && tontineDemarree && !cagnotte.rotationTerminee && !cagnotte.prochainBeneficiaire?.estMoi &&
          (cagnotte.prochaineDate || cagnotte.prochainBeneficiaire) && (
          <CarteProchaineEcheance c={cagnotte} />
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VUE GÉRANT
        ══════════════════════════════════════════════════════════════════ */}
        {isGerant && (
          <>
            {/* Participants */}
            {participantsTries.length > 0 && (
              <BlocSection
                titre="Participants"
                compteur={isTontine && cagnotte.nombreParticipants > 0
                  ? `${cagnotte.nombreInscrits + 1}/${cagnotte.nombreParticipants}`
                  : `${participantsTries.length}`}
              >
                {displayedP.map((p, i) => (
                  <div key={p.id} style={{ borderBottom: i < displayedP.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                    <LigneParticipant p={p} index={i} estTontine={isTontine} tontineDemarree={tontineDemarree} />
                  </div>
                ))}
                {participantsTries.length > 5 && (
                  <button
                    onClick={() => setShowAllP(v => !v)}
                    style={{
                      width: '100%', padding: '12px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: T.primary,
                      fontFamily: 'inherit', textAlign: 'center',
                    }}
                  >
                    {showAllP ? 'Voir moins' : `Voir tous (${participantsTries.length - 5} autres)`}
                  </button>
                )}
              </BlocSection>
            )}

            {/* Historique + sorties */}
            {(cagnotte.historique.length > 0 || cagnotte.sorties.length > 0) && (
              <BlocHistoriqueUnifie historique={cagnotte.historique} sorties={cagnotte.sorties} onExporter={() => exporterHistorique(cagnotte)} />
            )}

            {/* État vide total */}
            {participantsTries.length === 0 && cagnotte.historique.length === 0 && cagnotte.sorties.length === 0 && (
              <div style={{ padding: '20px', borderRadius: '20px', background: T.surfaceEl, border: `1px solid ${T.border}`, marginBottom: '24px' }}>
                <p style={{ fontSize: '13px', color: T.textSec, lineHeight: 1.5 }}>
                  Aucun participant ni paiement pour le moment. Partagez le lien d'invitation pour démarrer.
                </p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VUE COTISEUR
        ══════════════════════════════════════════════════════════════════ */}
        {!isGerant && (
          <>
            <CarteMonResume nbPaiements={cagnotte.historique.length} total={monTotal} />

            {(cagnotte.historique.length > 0 || cagnotte.sorties.length > 0)
              ? <BlocHistoriqueUnifie historique={cagnotte.historique} sorties={cagnotte.sorties} onExporter={() => exporterHistorique(cagnotte)} />
              : (
                <div style={{ padding: '16px 20px', borderRadius: '20px', background: T.surfaceEl, border: `1px solid ${T.border}`, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: T.textTert }}><IconHistory /></span>
                  <p style={{ fontSize: '14px', color: T.textSec }}>Vous n'avez pas encore cotisé. Tapez sur « Cotiser » pour démarrer.</p>
                </div>
              )
            }
          </>
        )}

        {/* ── Boutons d'action ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          {peutCotiser && !aDejaPayeCycle && (
            <button
              onClick={() => handleAction('cotiser')}
              style={{ width: '100%', height: '56px', borderRadius: '18px', border: 'none', cursor: 'pointer', background: T.accent, color: T.textStrong, fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <IconCoin /> Cotiser
            </button>
          )}
          {peutCotiser && aDejaPayeCycle && (
            <div style={{ width: '100%', height: '52px', borderRadius: '16px', background: 'rgba(107,142,78,0.10)', border: `1px solid rgba(107,142,78,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: T.success, fontSize: '14px', fontWeight: 700 }}>
              <IconCheckCircle /> Payé ce cycle
            </div>
          )}

          {/* ── Actions gérant tontine ────────────────────────────── */}
          {isGerant && isTontine && tontineActive && (
            <button
              onClick={lancerDemarrage}
              disabled={demarrageEnCours}
              style={{ width: '100%', height: '52px', borderRadius: '16px', border: 'none', cursor: demarrageEnCours ? 'not-allowed' : 'pointer', background: T.primary, color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: demarrageEnCours ? 0.7 : 1 }}
            >
              {demarrageEnCours ? 'Démarrage…' : '▶ Démarrer la tontine'}
            </button>
          )}
          {isGerant && isTontine && (
            <button
              onClick={() => navigate(`/cagnottes/${cagnotte.id}/participants`, {
                state: {
                  titre: cagnotte.titre,
                  nombreMax: cagnotte.nombreParticipants ?? 0,
                  nombreInscrits: cagnotte.nombreInscrits ?? 0,
                  type: 'tontine',
                }
              })}
              style={{ width: '100%', height: '50px', borderRadius: '16px', cursor: 'pointer', background: 'transparent', border: `1.5px solid ${T.primary}`, color: T.primary, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <IconUsers /> Gérer les participants
            </button>
          )}

          {/* ── Action gérant cotisation : reverser ───────────────── */}
          {isGerant && !isTontine && montantDisponible > 0 && !estTerminee && (
            <button
              onClick={() => navigate(`/cagnottes/${cagnotte.id}/reverser`, {
                state: {
                  titre: cagnotte.titre,
                  montantDisponible,
                  participants: cagnotte.participants,
                }
              })}
              style={{ width: '100%', height: '52px', borderRadius: '16px', border: 'none', cursor: 'pointer', background: T.primary, color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <IconDownload /> Reverser les fonds
            </button>
          )}

          <button
            onClick={partagerLien}
            style={{ width: '100%', height: '50px', borderRadius: '16px', cursor: 'pointer', background: 'transparent', border: `1.5px solid ${T.border}`, color: T.textStrong, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <IconShare /> Partager le lien
          </button>
          {peutQuitter && (
            <button
              onClick={() => setQuitterModal(true)}
              style={{ width: '100%', height: '50px', borderRadius: '16px', cursor: 'pointer', background: 'transparent', border: `1.5px solid ${T.error}`, color: T.error, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <IconExit /> Quitter cette cagnotte
            </button>
          )}
        </div>
      </div>

      {/* ── Auth bottom sheet (cas où l'utilisateur n'est pas encore membre) ── */}
      <AuthBottomSheet
        open={showAuthSheet}
        onClose={() => { setShowAuthSheet(false); setPendingAction(null) }}
        onSuccess={handleAuthSuccess}
        actionLabel={pendingAction === 'participer' ? 'Rejoindre la tontine' : 'Cotiser'}
      />

      {/* ── Modale Quitter ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {quitterModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,30,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setQuitterModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: T.surface, borderRadius: '24px 24px 0 0', padding: '20px 24px 40px', width: '100%' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 20px' }} />
              <p style={{ fontSize: '20px', fontWeight: 800, color: T.textStrong, marginBottom: '8px' }}>Quitter cette cagnotte ?</p>
              <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '24px', lineHeight: 1.5 }}>
                {isTontine
                  ? 'Vous serez retiré de la liste des participants. Cette action est irréversible.'
                  : "Vous ne ferez plus partie de cette cotisation. Vous pourrez rejoindre à nouveau via le lien d'invitation."}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setQuitterModal(false)} style={{ flex: 1, height: '50px', borderRadius: '14px', border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textStrong, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => { setQuitterModal(false); navigate(-1) }} style={{ flex: 1, height: '50px', borderRadius: '14px', border: 'none', background: T.error, color: '#fff', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
