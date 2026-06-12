/**
 * Écran profil mobile — reproduction exacte du profil_screen.dart Flutter.
 *
 * Structure :
 *  - Hero gradient avec initiales + complétion en anneau
 *  - Sections : Infos Personnelles / Infos Complémentaires / Compte
 *  - Boutons Déconnexion + Supprimer le compte
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { T, grad } from '@/lib/tokens'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)
const IconMapPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

// ── Completion ring ───────────────────────────────────────────────────────────
function CompletionRing({ pct }: { pct: number }) {
  const r = 28, c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute', top: 0, left: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(244,236,224,0.15)" strokeWidth="4"/>
      <circle cx="36" cy="36" r={r} fill="none"
        stroke={T.accent} strokeWidth="4"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
    </svg>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ icon, label, value, onTap, muted }: {
  icon: React.ReactNode; label: string; value?: string; onTap?: () => void; muted?: boolean
}) {
  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
        cursor: onTap ? 'pointer' : 'default',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ color: muted ? T.textTert : T.primary, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '11px', color: T.textTert, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '14px', fontWeight: value ? 600 : 500, color: value ? T.textStrong : T.textTert, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'Non renseigné'}
        </p>
      </div>
      {onTap && <span style={{ color: T.textTert }}><IconChevronRight /></span>}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '0 16px 16px', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${T.border}`, background: T.surfaceEl }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${T.border}` }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: T.textSec, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MobileProfil() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const initials = user ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() : 'JP'
  const displayName = user ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() : 'Jean-Pierre Obame'
  const telephone = user?.telephone ?? '+241 077 00 00 00'

  // Calcul complétion (champs renseignés)
  const champsTotal = 5 // nom, prénom, naissance, tel, email
  const champsRemplis = [user?.nom, user?.prenom, user?.telephone].filter(Boolean).length + 1 // +1 naissance toujours renseignée au signup
  const pct = Math.round((champsRemplis / champsTotal) * 100)

  return (
    <div style={{ background: T.surface, minHeight: '100%', paddingBottom: '40px' }}>

      {/* ── Hero gradient ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        style={{ background: grad.primary, padding: '24px 20px 32px', position: 'relative', overflow: 'hidden' }}
      >
        {/* Cercle deco */}
        <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(201,123,74,0.15)', top: '-60px', right: '-60px', pointerEvents: 'none' }} />

        {/* Avatar + ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
            <CompletionRing pct={pct} />
            <div style={{
              position: 'absolute', inset: '6px', borderRadius: '50%', background: `rgba(244,236,224,0.15)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 800, color: T.surface,
            }}>
              {initials}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '20px', fontWeight: 800, color: T.surface, marginBottom: '2px' }}>{displayName}</p>
            <p style={{ fontSize: '12px', color: 'rgba(244,236,224,0.75)' }}>{telephone}</p>

            {/* Barre de complétion */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(244,236,224,0.75)', fontWeight: 600 }}>Profil complété</span>
                <span style={{ fontSize: '11px', color: T.accent, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(244,236,224,0.20)', width: '180px' }}>
                <div style={{ height: '100%', borderRadius: '2px', background: T.accent, width: `${pct}%`, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: '-20px',
        background: T.surface,
        borderRadius: '20px 20px 0 0',
        paddingTop: '12px',
      }}>

        {/* Infos Personnelles */}
        <SectionCard title="Infos personnelles">
          <Row icon={<IconUser />} label="Prénom" value={user?.prenom ?? 'Jean-Pierre'} onTap={() => {}} />
          <Row icon={<IconUser />} label="Nom" value={user?.nom ?? 'Obame'} onTap={() => {}} />
          <Row icon={<IconCalendar />} label="Date de naissance" value="12 / 04 / 1982" onTap={() => {}} />
          <div style={{ borderBottom: 'none' }}>
            <Row icon={<IconPhone />} label="Téléphone Mobile Money" value={telephone} />
          </div>
        </SectionCard>

        {/* Infos Complémentaires */}
        <SectionCard title="Infos complémentaires">
          <Row icon={<IconMail />} label="E-mail" value={undefined} onTap={() => {}} />
          <div style={{ borderBottom: 'none' }}>
            <Row icon={<IconMapPin />} label="Adresse" value={undefined} onTap={() => {}} />
          </div>
        </SectionCard>

        {/* Compte */}
        <SectionCard title="Compte">
          <Row icon={<IconShield />} label="Type de compte" value="Particulier" />
          <div style={{ borderBottom: 'none' }}>
            <Row icon={<IconEdit />} label="Paramètres" onTap={() => navigate('/parametres')} />
          </div>
        </SectionCard>

        {/* Actions */}
        <div style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => { logout(); navigate('/connexion') }}
            style={{
              width: '100%', height: '52px', borderRadius: '16px', border: `1.5px solid ${T.border}`,
              background: T.surfaceEl, color: T.textStrong, fontSize: '15px', fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            }}
          >
            <IconLogout /> Se déconnecter
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%', height: '52px', borderRadius: '16px', border: `1.5px solid rgba(160,68,52,0.30)`,
              background: 'rgba(160,68,52,0.07)', color: T.error, fontSize: '15px', fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            }}
          >
            <IconTrash /> Supprimer mon compte
          </button>
        </div>
      </div>

      {/* ── Confirm delete overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,30,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: T.surfaceEl, borderRadius: '28px 28px 0 0', padding: '24px', width: '100%' }}
            >
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: T.border, margin: '0 auto 20px' }} />
              <p style={{ fontSize: '18px', fontWeight: 800, color: T.textStrong, marginBottom: '10px' }}>Supprimer le compte ?</p>
              <p style={{ fontSize: '14px', color: T.textSec, marginBottom: '24px', lineHeight: 1.6 }}>
                Cette action est irréversible. Toutes vos cagnottes et données associées seront définitivement supprimées.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, height: '52px', borderRadius: '16px', border: `1.5px solid ${T.border}`, background: T.surface, color: T.textStrong, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  style={{ flex: 1, height: '52px', borderRadius: '16px', border: 'none', background: T.error, color: '#fff', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
