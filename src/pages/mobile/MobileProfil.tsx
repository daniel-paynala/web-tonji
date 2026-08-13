/**
 * Écran profil mobile — réplique FIDÈLE de profil_screen.dart (Flutter).
 *
 * Reproduit :
 *  - Carte hero gradient (avatar initiales accent + nom complet + numéro + badge KYC)
 *  - Carte de complétion (visible si profil incomplet) avec barre de progression animée
 *  - Section « Informations personnelles » (lecture seule)
 *  - Section « Informations complémentaires » (sexe / adresse / e-mail éditables via sheets)
 *  - Section « Compte » (KYC + recheck, sécurité, conditions, aide)
 *  - Bouton « Se déconnecter » + lien « Supprimer mon compte »
 *
 * Logique métier reproduite à l'identique : calcul de complétion (base 80 %,
 * +7 sexe, +7 adresse, +6 email), validation e-mail regex, process d'édition
 * (sheet → PATCH /profil → refresh store), recheck KYC (POST kyc-recheck).
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { T } from '@/lib/tokens'
import { ApiError } from '@/lib/api'
import {
  updateProfil,
  recheckKyc,
  getMe,
  authUserToStoreUser,
} from '@/lib/profilApi'
import type { AuthUser } from '@/lib/authApi'
import { logout as apiLogout } from '@/lib/authApi'

// ─────────────────────────────────────────────────────────────────────────────
// Icônes Material (équivalents SVG inline des Icons Flutter utilisés)
// ─────────────────────────────────────────────────────────────────────────────
type IcoProps = { size?: number }
const stroke = (size = 18) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})
// badge_outlined → Nom
const IconBadge = ({ size }: IcoProps) => (<svg {...stroke(size)}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h3"/><path d="M15 12h3"/><path d="M7 16h10"/></svg>)
// person_outline_rounded → Prénom
const IconPerson = ({ size }: IcoProps) => (<svg {...stroke(size)}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0112 0v1"/></svg>)
// verified_user_outlined → Majorité
const IconVerifiedUser = ({ size }: IcoProps) => (<svg {...stroke(size)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>)
// phone_iphone_rounded → Numéro Mobile Money
const IconPhone = ({ size }: IcoProps) => (<svg {...stroke(size)}><rect x="6" y="2" width="12" height="20" rx="3"/><line x1="11" y1="18" x2="13" y2="18"/></svg>)
// business_outlined → Type de client
const IconBusiness = ({ size }: IcoProps) => (<svg {...stroke(size)}><rect x="3" y="8" width="8" height="13"/><rect x="11" y="3" width="10" height="18"/><path d="M14 7h.01M14 11h.01M14 15h.01M18 7h.01M18 11h.01M18 15h.01"/></svg>)
// wc_outlined → Sexe
const IconWc = ({ size }: IcoProps) => (<svg {...stroke(size)}><circle cx="7" cy="5" r="2"/><path d="M7 8v6M5 11h4M7 14v6"/><circle cx="17" cy="5" r="2"/><path d="M14 9l6 0-3 7M17 16v4M15 20h4"/></svg>)
// home_outlined → Adresse
const IconHome = ({ size }: IcoProps) => (<svg {...stroke(size)}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>)
// alternate_email_rounded → E-mail
const IconEmail = ({ size }: IcoProps) => (<svg {...stroke(size)}><circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 005 0V12a9 9 0 10-3.5 7.1"/></svg>)
// sim_card_outlined → KYC line
const IconSim = ({ size }: IcoProps) => (<svg {...stroke(size)}><path d="M6 2h8l4 4v16H6z"/><rect x="9" y="11" width="6" height="7" rx="1"/><path d="M12 11v7M9 14.5h6"/></svg>)
// lock_outline_rounded → Sécurité
const IconLock = ({ size }: IcoProps) => (<svg {...stroke(size)}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>)
// description_outlined → Conditions
const IconDescription = ({ size }: IcoProps) => (<svg {...stroke(size)}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>)
// help_outline_rounded → Aide
const IconHelp = ({ size }: IcoProps) => (<svg {...stroke(size)}><circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 014.5 1.5c0 1.5-2 2-2 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)
// chevron_right_rounded
const IconChevron = ({ size }: IcoProps) => (<svg {...stroke(size)}><polyline points="9 18 15 12 9 6"/></svg>)
// edit_outlined
const IconEdit = ({ size }: IcoProps) => (<svg {...stroke(size)}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>)
// logout_rounded
const IconLogout = ({ size }: IcoProps) => (<svg {...stroke(size)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>)
// arrow_back_ios_new_rounded
const IconBack = ({ size }: IcoProps) => (<svg {...stroke(size)}><polyline points="15 18 9 12 15 6"/></svg>)
// auto_awesome_rounded (complétion)
const IconAwesome = ({ size }: IcoProps) => (<svg {...stroke(size)}><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.7 1.6L21 16l-1.3.4L19 18l-.7-1.6L17 16l1.3-.4z"/></svg>)
// verified_rounded (badge KYC hero)
const IconVerifiedBadge = ({ size }: IcoProps) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.9 3.1-3.2-.3L12 23l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1.3-2.9L2.7 7.5 5.5 5.9l.9-3.1 3.2.3z"/><polyline points="8.5 12 11 14.5 15.5 9.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>)
// check_circle_rounded
const IconCheckCircle = ({ size }: IcoProps) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9" fill="none" stroke={T.surfaceEl} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)

// ─────────────────────────────────────────────────────────────────────────────
// Toast minimal (équivalent TonjiToast) — affiché en bas, auto-disparition.
// ─────────────────────────────────────────────────────────────────────────────
type Toast = { kind: 'success' | 'error' | 'info'; message: string }

// ─────────────────────────────────────────────────────────────────────────────
// Logique de complétion — miroir EXACT de Utilisateur.pourcentageComplete (Dart).
// Base 80 %, +7 sexe, +7 adresse, +6 email.
// ─────────────────────────────────────────────────────────────────────────────
function pourcentageComplete(u: { sexe?: string; adresse?: string; email?: string }): number {
  let total = 80 // champs obligatoires toujours remplis après inscription
  if (u.sexe != null) total += 7
  if (u.adresse != null && u.adresse.trim() !== '') total += 7
  if (u.email != null && u.email.trim() !== '') total += 6
  return total
}

// Libellés enum (miroir TypeClient.libelle / Sexe.libelle).
const libelleTypeClient: Record<string, string> = {
  particulier: 'Particulier',
  entreprise: 'Entreprise',
  marchand: 'Marchand',
}
const libelleSexe: Record<string, string> = { homme: 'Homme', femme: 'Femme' }

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────
export default function MobileProfil() {
  const navigate = useNavigate()
  const { user, token, login, logout } = useAuthStore()

  // AuthUser complet (inclut kyc_valide + sexe), hydraté depuis /auth/me au
  // montage — comme le provider Riverpod qui dérive de l'AuthUser complet.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  // États d'UI
  const [recheckEnCours, setRecheckEnCours] = useState(false)
  const [sheet, setSheet] = useState<null | 'sexe' | 'adresse' | 'email'>(null)
  const [confirmDeco, setConfirmDeco] = useState(false)
  const [confirmSuppr, setConfirmSuppr] = useState(false)

  // Hydratation : charge l'AuthUser complet au montage (kyc_valide, sexe…).
  useEffect(() => {
    let actif = true
    getMe()
      .then((u) => { if (actif) setAuthUser(u) })
      .catch(() => { /* token invalide → la garde de route gère la redirection */ })
    return () => { actif = false }
  }, [])

  // Affiche un toast auto-effaçant (3,5 s).
  function showToast(t: Toast) {
    setToast(t)
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 3500)
  }

  // Source de vérité : authUser si chargé, sinon fallback sur le store
  // (évite un flash vide pendant le getMe).
  const nom = authUser?.nom ?? user?.nom ?? ''
  const prenom = authUser?.prenom ?? user?.prenom ?? ''
  const numero = formatNumero(authUser?.numero ?? user?.telephone ?? '')
  const typeClientRaw = authUser?.type_client ?? user?.typeClient ?? 'particulier'
  const sexeRaw = (authUser as (AuthUser & { sexe?: string }) | null)?.sexe ?? user?.sexe
  const adresse = authUser?.adresse ?? user?.adresse
  const email = authUser?.email ?? user?.email
  const kycValide = authUser?.kyc_valide ?? false

  // Dérivés (miroir des getters Utilisateur).
  const nomComplet = `${prenom} ${nom}`
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
  const pct = pourcentageComplete({ sexe: sexeRaw, adresse, email })
  const profilComplet = pct === 100

  // ── Process d'édition : PATCH /profil puis refresh AuthUser + store ───────
  async function completer(params: { sexe?: string; adresse?: string; email?: string }) {
    try {
      const updated = await updateProfil(params)
      setAuthUser(updated)
      // Refresh store (token inchangé) pour que le reste de l'app voie les MAJ.
      if (token) login(authUserToStoreUser(updated), token)
    } catch (e) {
      if (e instanceof ApiError) showToast({ kind: 'error', message: e.message })
      else showToast({ kind: 'error', message: 'Impossible d’enregistrer pour l’instant.' })
    }
  }

  // ── Recheck KYC : POST /profil/kyc-recheck (miroir _LigneKycState) ────────
  async function onRecheck() {
    setRecheckEnCours(true)
    try {
      const updated = await recheckKyc()
      setAuthUser(updated)
      if (token) login(authUserToStoreUser(updated), token)
      showToast({ kind: 'success', message: 'Numéro Mobile Money vérifié.' })
    } catch (e) {
      if (e instanceof ApiError) showToast({ kind: 'error', message: e.message })
      else showToast({ kind: 'error', message: 'Impossible de vérifier pour l’instant.' })
    } finally {
      setRecheckEnCours(false)
    }
  }

  // ── Déconnexion (miroir _confirmerDeconnexion) ───────────────────────────
  async function onDeconnexion() {
    setConfirmDeco(false)
    try { await apiLogout() } catch { /* best-effort, miroir Flutter */ }
    logout()
    navigate('/welcome')
  }

  // ── Suppression compte (miroir _confirmerSuppression) ────────────────────
  function onSuppression() {
    setConfirmSuppr(false)
    // Redirige vers la page CGU qui explique la procédure (en attendant DELETE /account).
    window.open('https://tonji.ga/cgu', '_blank', 'noopener')
  }

  return (
    <div style={{ background: T.surface, minHeight: '100%' }}>
      {/* ── AppBar (SliverAppBar Flutter) ─────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center',
        gap: '4px', padding: '8px 12px', background: T.surface,
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          style={{
            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', color: T.textStrong, cursor: 'pointer', borderRadius: '50%',
          }}
        >
          <IconBack size={20} />
        </button>
        <span style={{ fontSize: '17px', fontWeight: 800, color: T.textStrong }}>Mon profil</span>
      </div>

      {/* ── Corps ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 32px' }}>

        {/* Carte hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          style={{
            padding: '20px', borderRadius: '28px',
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryLight} 50%, ${T.primaryLighter} 100%)`,
            boxShadow: `0 14px 28px ${T.primary}59`, display: 'flex', alignItems: 'center',
          }}
        >
          {/* Avatar initiales (cercle accent) */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', background: T.accent, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 18px ${T.accent}66`,
          }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: T.textStrong, letterSpacing: '0.4px' }}>{initiales}</span>
          </div>
          <div style={{ width: '18px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: T.surface, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px' }}>{nomComplet}</p>
            <div style={{ height: '4px' }} />
            <p style={{ color: 'rgba(246,247,244,0.85)', fontSize: '14px', fontWeight: 500 }}>{numero}</p>
            {kycValide && (
              <>
                <div style={{ height: '8px' }} />
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px',
                  borderRadius: '20px', background: `${T.success}40`,
                }}>
                  <span style={{ color: '#fff', display: 'flex' }}><IconVerifiedBadge size={13} /></span>
                  <span style={{ color: T.surface, fontSize: '11px', fontWeight: 800, letterSpacing: '0.3px' }}>Mobile Money vérifié</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        <div style={{ height: '24px' }} />

        {/* Carte de complétion — uniquement si profil incomplet */}
        {!profilComplet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{
                padding: '18px', borderRadius: '20px', background: `${T.accent}14`,
                border: `1px solid ${T.accent}4D`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: T.accent, display: 'flex' }}><IconAwesome size={24} /></span>
                <div style={{ width: '10px' }} />
                <span style={{ flex: 1, fontSize: '17px', fontWeight: 700, color: T.textStrong }}>Complétez votre profil</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: T.accent }}>{pct}%</span>
              </div>
              <div style={{ height: '12px' }} />
              {/* Barre de progression animée (TweenAnimationBuilder → motion width) */}
              <div style={{ height: '8px', borderRadius: '4px', background: `${T.accent}2E`, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
                  style={{ height: '100%', background: T.accent }}
                />
              </div>
              <div style={{ height: '10px' }} />
              <p style={{ fontSize: '12px', color: T.textSec, lineHeight: 1.5 }}>
                Sexe, adresse et e-mail nous permettent d&rsquo;éditer vos reçus et de mieux vous accompagner. À renseigner quand vous le souhaitez.
              </p>
            </motion.div>
            <div style={{ height: '24px' }} />
          </>
        )}

        {/* ── Section : Informations personnelles ─────────────────────────── */}
        <Section titre="Informations personnelles" delay={0.15}>
          <LigneInfo icon={<IconBadge />} label="Nom" valeur={nom} />
          <LigneInfo icon={<IconPerson />} label="Prénom" valeur={prenom} />
          <LigneInfo icon={<IconVerifiedUser />} label="Majorité" valeur="Certifié(e) ✓" />
          <LigneInfo icon={<IconPhone />} label="Numéro Mobile Money" valeur={numero} />
          <LigneInfo icon={<IconBusiness />} label="Type de client" valeur={libelleTypeClient[typeClientRaw] ?? 'Particulier'} />
        </Section>

        <div style={{ height: '20px' }} />

        {/* ── Section : Informations complémentaires ──────────────────────── */}
        <Section
          titre="Informations complémentaires"
          sousTitre="Optionnel, demandé au moment où vous en avez besoin."
          delay={0.2}
        >
          <LigneInfoEditable icon={<IconWc />} label="Sexe" valeur={sexeRaw ? libelleSexe[sexeRaw] : undefined} onTap={() => setSheet('sexe')} />
          <LigneInfoEditable icon={<IconHome />} label="Adresse" valeur={adresse} onTap={() => setSheet('adresse')} />
          <LigneInfoEditable icon={<IconEmail />} label="E-mail" valeur={email} onTap={() => setSheet('email')} />
        </Section>

        <div style={{ height: '20px' }} />

        {/* ── Section : Compte ────────────────────────────────────────────── */}
        <Section titre="Compte" delay={0.25}>
          <LigneKyc kycValide={kycValide} enCours={recheckEnCours} onRecheck={onRecheck} />
          <LigneAction icon={<IconLock />} label="Verrouillage de l'app" sousLabel="Désactivé" onTap={() => navigate('/securite')} />
          <LigneAction icon={<IconDescription />} label="Conditions d'utilisation" onTap={() => showToast({ kind: 'info', message: 'Page conditions complète à brancher.' })} />
          <LigneAction icon={<IconHelp />} label="Aide & support" onTap={() => { /* TODO : page aide */ }} />
        </Section>

        <div style={{ height: '20px' }} />

        {/* Bouton déconnexion (OutlinedButton error) */}
        <button
          onClick={() => setConfirmDeco(true)}
          style={{
            width: '100%', height: '48px', borderRadius: '12px', border: `1.5px solid ${T.error}`,
            background: 'transparent', color: T.error, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <IconLogout /> Se déconnecter
        </button>

        <div style={{ height: '16px' }} />

        {/* Lien supprimer mon compte (TextButton souligné, error atténué) */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setConfirmSuppr(true)}
            style={{
              border: 'none', background: 'transparent', padding: '8px 16px', cursor: 'pointer',
              color: `${T.error}80`, fontSize: '13px', fontWeight: 500, textDecoration: 'underline', fontFamily: 'inherit',
            }}
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* ── Sheet d'édition (sexe / adresse / e-mail) ─────────────────────── */}
      <AnimatePresence>
        {sheet === 'sexe' && (
          <SheetSexe
            valeurActuelle={sexeRaw}
            onClose={() => setSheet(null)}
            onChoix={(s) => { setSheet(null); completer({ sexe: s }) }}
          />
        )}
        {sheet === 'adresse' && (
          <SheetTexte
            titre="Adresse"
            label="Quartier, ville"
            initial={adresse}
            onClose={() => setSheet(null)}
            onSave={(v) => { setSheet(null); completer({ adresse: v }) }}
          />
        )}
        {sheet === 'email' && (
          <SheetTexte
            titre="E-mail"
            label="exemple@mail.com"
            initial={email}
            type="email"
            validator={(v) => {
              if (v.trim() === '') return null // champ optionnel
              const r = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
              return r.test(v.trim()) ? null : 'Format e-mail invalide'
            }}
            onClose={() => setSheet(null)}
            onSave={(v) => { setSheet(null); completer({ email: v }) }}
          />
        )}
      </AnimatePresence>

      {/* ── Dialogue déconnexion ──────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDeco && (
          <Dialog
            titre="Se déconnecter ?"
            contenu="Vous devrez ressaisir votre numéro et un nouveau code SMS pour revenir."
            labelConfirm="Déconnexion"
            onCancel={() => setConfirmDeco(false)}
            onConfirm={onDeconnexion}
          />
        )}
      </AnimatePresence>

      {/* ── Dialogue suppression ──────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmSuppr && (
          <Dialog
            titre="Supprimer mon compte ?"
            contenu="Cette action est irréversible. Toutes vos tontines, cagnottes et données personnelles seront définitivement supprimées."
            labelConfirm="Supprimer"
            onCancel={() => setConfirmSuppr(false)}
            onConfirm={onSuppression}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', left: '20px', right: '20px', bottom: '24px', zIndex: 300,
              padding: '14px 18px', borderRadius: '14px', fontSize: '14px', fontWeight: 600,
              color: T.surface, textAlign: 'center',
              background: toast.kind === 'error' ? T.error : toast.kind === 'success' ? T.success : T.textStrong,
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Sous-composants (miroirs des widgets Flutter privés)
// ═════════════════════════════════════════════════════════════════════════════

// _BlocSection : titre + sous-titre optionnel + carte contenant les lignes.
function Section({ titre, sousTitre, children, delay }: {
  titre: string; sousTitre?: string; children: React.ReactNode; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <div style={{ padding: '0 4px' }}>
        <p style={{ fontSize: '20px', fontWeight: 700, color: T.textStrong }}>{titre}</p>
        {sousTitre && (
          <>
            <div style={{ height: '2px' }} />
            <p style={{ fontSize: '12px', color: T.textSec }}>{sousTitre}</p>
          </>
        )}
      </div>
      <div style={{ height: '10px' }} />
      <div style={{
        padding: '4px 0', borderRadius: '20px', background: T.surfaceEl,
        border: `1px solid ${T.border}99`,
      }}>
        {children}
      </div>
    </motion.div>
  )
}

// _LigneInfo : icône + label (gauche) + valeur (droite), lecture seule.
function LigneInfo({ icon, label, valeur }: { icon: React.ReactNode; label: string; valeur: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
      <span style={{ color: T.textSec, display: 'flex' }}>{icon}</span>
      <div style={{ width: '14px' }} />
      <span style={{ flex: 1, fontSize: '14px', color: T.textSec }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong }}>{valeur}</span>
    </div>
  )
}

// _LigneInfoEditable : vide → "Ajouter" + chevron ; rempli → valeur + crayon.
function LigneInfoEditable({ icon, label, valeur, onTap }: {
  icon: React.ReactNode; label: string; valeur?: string; onTap: () => void
}) {
  const estVide = valeur == null || valeur.trim() === ''
  return (
    <div onClick={onTap} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
      <span style={{ color: T.textSec, display: 'flex' }}>{icon}</span>
      <div style={{ width: '14px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', color: T.textSec }}>{label}</p>
        {!estVide && (
          <>
            <div style={{ height: '2px' }} />
            <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valeur}</p>
          </>
        )}
      </div>
      <div style={{ width: '8px' }} />
      {estVide ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: T.primary, fontWeight: 700, fontSize: '14px' }}>Ajouter</span>
          <div style={{ width: '4px' }} />
          <span style={{ color: T.primary, display: 'flex' }}><IconChevron size={18} /></span>
        </div>
      ) : (
        <span style={{ color: T.textTert, display: 'flex' }}><IconEdit size={18} /></span>
      )}
    </div>
  )
}

// _LigneAction : icône + label + sous-label optionnel + chevron si cliquable.
function LigneAction({ icon, label, sousLabel, onTap }: {
  icon: React.ReactNode; label: string; sousLabel?: string; onTap?: () => void
}) {
  return (
    <div onClick={onTap} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: onTap ? 'pointer' : 'default' }}>
      <span style={{ color: T.textSec, display: 'flex' }}>{icon}</span>
      <div style={{ width: '14px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong }}>{label}</p>
        {sousLabel && (
          <p style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>{sousLabel}</p>
        )}
      </div>
      {onTap && <span style={{ color: T.textTert, display: 'flex' }}><IconChevron size={22} /></span>}
    </div>
  )
}

// _LigneKyc : statut KYC + bouton Recheck (ou badge vert / spinner).
function LigneKyc({ kycValide, enCours, onRecheck }: {
  kycValide: boolean; enCours: boolean; onRecheck: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px' }}>
      <span style={{ color: T.textSec, display: 'flex' }}><IconSim /></span>
      <div style={{ width: '14px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: T.textStrong }}>Numéro Mobile Money</p>
        <div style={{ height: '2px' }} />
        <p style={{ fontSize: '12px', fontWeight: 600, color: kycValide ? T.success : T.error }}>
          {kycValide ? 'Vérifié' : 'Non vérifié'}
        </p>
      </div>
      {kycValide ? (
        <span style={{ color: T.success, display: 'flex' }}><IconCheckCircle size={22} /></span>
      ) : enCours ? (
        <span style={{
          width: '20px', height: '20px', borderRadius: '50%', display: 'inline-block',
          border: `2px solid ${T.primary}33`, borderTopColor: T.primary, animation: 'tspin 0.7s linear infinite',
        }} />
      ) : (
        <button
          onClick={onRecheck}
          style={{
            border: 'none', background: 'transparent', color: T.primary, fontWeight: 700, fontSize: '13px',
            padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Recheck
        </button>
      )}
      {/* Keyframes du spinner (injectées une seule fois côté DOM). */}
      <style>{'@keyframes tspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

// _saisirTexte / _SheetSaisieTexte : bottom sheet de saisie générique.
function SheetTexte({ titre, label, initial, type, validator, onClose, onSave }: {
  titre: string; label: string; initial?: string; type?: 'text' | 'email';
  validator?: (v: string) => string | null; onClose: () => void; onSave: (v: string) => void
}) {
  const [val, setVal] = useState(initial ?? '')
  const [err, setErr] = useState<string | null>(null)

  // Valide puis ferme en retournant la valeur ; chaîne vide → annule (null).
  function enregistrer() {
    const e = validator ? validator(val) : null
    if (e) { setErr(e); return }
    const t = val.trim()
    if (t === '') { onClose(); return } // _saisirTexte ignore les chaînes vides
    onSave(t)
  }

  return (
    <SheetShell onClose={onClose}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: T.textStrong }}>{titre}</p>
      <div style={{ height: '16px' }} />
      <input
        autoFocus
        type={type ?? 'text'}
        value={val}
        placeholder={label}
        onChange={(e) => { setVal(e.target.value); if (err) setErr(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter') enregistrer() }}
        style={{
          width: '100%', boxSizing: 'border-box', height: '52px', padding: '0 16px', borderRadius: '12px',
          border: `1.5px solid ${err ? T.error : T.border}`, background: T.surface, color: T.textStrong,
          fontSize: '15px', fontFamily: 'inherit', outline: 'none',
        }}
      />
      {err && <p style={{ color: T.error, fontSize: '12px', marginTop: '6px' }}>{err}</p>}
      <div style={{ height: '16px' }} />
      <button
        onClick={enregistrer}
        style={{
          width: '100%', height: '52px', borderRadius: '16px', border: 'none', background: T.primary,
          color: T.surface, fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        Enregistrer
      </button>
    </SheetShell>
  )
}

// Sélecteur de sexe (showModalBottomSheet<Sexe>) — check sur le choix actif.
function SheetSexe({ valeurActuelle, onClose, onChoix }: {
  valeurActuelle?: string; onClose: () => void; onChoix: (s: string) => void
}) {
  const options: Array<{ name: string; libelle: string }> = [
    { name: 'homme', libelle: 'Homme' },
    { name: 'femme', libelle: 'Femme' },
  ]
  return (
    <SheetShell onClose={onClose}>
      <p style={{ fontSize: '20px', fontWeight: 700, color: T.textStrong }}>Sexe</p>
      <div style={{ height: '16px' }} />
      {options.map((s) => (
        <div
          key={s.name}
          onClick={() => onChoix(s.name)}
          style={{ display: 'flex', alignItems: 'center', padding: '14px 4px', cursor: 'pointer' }}
        >
          <span style={{ flex: 1, fontSize: '16px', color: T.textStrong }}>{s.libelle}</span>
          {valeurActuelle === s.name && (
            <span style={{ color: T.primary, display: 'flex' }}><IconCheckCircle size={22} /></span>
          )}
        </div>
      ))}
      <div style={{ height: '8px' }} />
    </SheetShell>
  )
}

// Coquille commune des bottom sheets (overlay + slide-up + radius haut).
function SheetShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,32,46,0.5)', zIndex: 250, display: 'flex', alignItems: 'flex-end' }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.surfaceEl, borderRadius: '28px 28px 0 0', padding: '20px', width: '100%' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// AlertDialog Flutter (déconnexion / suppression) — bouton confirm rouge.
function Dialog({ titre, contenu, labelConfirm, onCancel, onConfirm }: {
  titre: string; contenu: string; labelConfirm: string; onCancel: () => void; onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,32,46,0.6)', zIndex: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.surfaceEl, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '340px' }}
      >
        <p style={{ fontSize: '18px', fontWeight: 800, color: T.textStrong }}>{titre}</p>
        <div style={{ height: '12px' }} />
        <p style={{ fontSize: '14px', color: T.textSec, lineHeight: 1.6 }}>{contenu}</p>
        <div style={{ height: '24px' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{ height: '44px', padding: '0 16px', borderRadius: '12px', border: 'none', background: 'transparent', color: T.primary, fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            style={{ height: '44px', padding: '0 20px', borderRadius: '12px', border: 'none', background: T.error, color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {labelConfirm}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

// Formate `+24177123456` → `+241 77 12 34 56` (miroir _formatNumero Dart).
function formatNumero(e164: string): string {
  if (!e164.startsWith('+241') || e164.length !== 12) return e164
  const local = e164.substring(4)
  return `+241 ${local.substring(0, 2)} ${local.substring(2, 4)} ${local.substring(4, 6)} ${local.substring(6, 8)}`
}
