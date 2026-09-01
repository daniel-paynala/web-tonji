/**
 * Point d'entrée de l'application web Tonji.
 *
 * SCISSION D'INTERFACE selon l'appareil (décidée par useMobile — UA mobile OU
 * largeur < 768px) :
 *  • Appareil mobile  → interface mobile (réplique exacte du Flutter, pages Mobile*).
 *  • PC / grand écran → interface desktop d'origine (pages Dashboard/Cagnottes/…).
 * Le même Worker sert les deux ; seul l'arbre de routes rendu change.
 *
 * Logique popup au démarrage :
 *  1. Sur mobile → tenter d'ouvrir l'app native via custom scheme tonji://home
 *     (iframe invisible). App installée → focus perdu, popup annulée. App absente
 *     → après 1 500 ms, afficher la popup d'installation.
 *  2. Sur desktop → afficher la popup d'installation directement (1×/session).
 *
 * La popup respecte sessionStorage : affichée une seule fois par session.
 * La route /rejoindre/:token a déjà son propre modal (DeepLinkModal) ;
 * on n'y déclenche pas la popup globale.
 */

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useMobile } from '@/hooks/useMobile'

// ── Pages mobile — reproduction exacte du Flutter (source de vérité) ───────────
import MobileInscription           from '@/pages/mobile/MobileInscription'
import MobileConnexion             from '@/pages/mobile/MobileConnexion'
import MobileHome                  from '@/pages/mobile/MobileHome'
import MobileCreateCagnotte        from '@/pages/mobile/MobileCreateCagnotte'
import MobileDetailCagnotte        from '@/pages/mobile/MobileDetailCagnotte'
import MobileCotiser               from '@/pages/mobile/MobileCotiser'
import MobileReversement           from '@/pages/mobile/MobileReversement'
import MobileAjoutParticipants     from '@/pages/mobile/MobileAjoutParticipants'
import MobileProfil                from '@/pages/mobile/MobileProfil'
import MobileExplorer              from '@/pages/mobile/MobileExplorer'
import MobilePublicDetail          from '@/pages/mobile/MobilePublicDetail'
import MobilePostCreationTontine   from '@/pages/mobile/MobilePostCreationTontine'
import MobilePostCreationCotisation from '@/pages/mobile/MobilePostCreationCotisation'
import MobileSplash                from '@/pages/mobile/MobileSplash'
import MobileLockGate              from '@/pages/mobile/MobileLockGate'
import MobilePinSetup             from '@/pages/mobile/MobilePinSetup'
import MobileLockSettings         from '@/pages/mobile/MobileLockSettings'

// ── Pages desktop — interface PC d'origine ────────────────────────────────────
import InscriptionPage        from '@/pages/auth/InscriptionPage'
import ConnexionPage          from '@/pages/auth/ConnexionPage'
import DashboardPage          from '@/pages/dashboard/DashboardPage'
import NouvelleCagnottePage   from '@/pages/cagnottes/NouvelleCagnottePage'
import DetailCagnottePage     from '@/pages/cagnottes/DetailCagnottePage'
import CotiserPage            from '@/pages/cagnottes/CotiserPage'
import PostCreationTontinePage from '@/pages/cagnottes/PostCreationTontinePage'
import ReversementPage        from '@/pages/cagnottes/ReversementPage'
import AjoutParticipantsPage  from '@/pages/cagnottes/AjoutParticipantsPage'
import ProfilPage             from '@/pages/profil/ProfilPage'
import ParametresPage         from '@/pages/parametres/ParametresPage'
import PaiementPage           from '@/pages/paiement/PaiementPage'

// ── Pages accessibles sans compte (partagées) ─────────────────────────────────
import InvitationPage from '@/pages/public/InvitationPage'

// ── Layout & Guards (partagés) ────────────────────────────────────────────────
import AppLayout    from '@/layouts/AppLayout'
import PrivateRoute from '@/components/guards/PrivateRoute'

// Popup téléchargement de l'app
import AppDownloadPopup, { shouldShowAppPopup, markAppPopupDone } from '@/components/AppDownloadPopup'

// Overlay de chargement global (anti double-clic)
import LoadingOverlay from '@/components/ui/LoadingOverlay'

// ── Détection navigateur mobile (pour la logique deep link uniquement) ─────────

function isMobileUA(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// ── Arbre de routes MOBILE (pages Mobile*, réplique du Flutter) ────────────────

function MobileRoutes() {
  return (
    <Routes>
      {/* ── Publiques sans layout ──────────────────────────────────────── */}
      {/* Splash plein écran : redirige lui-même vers /dashboard ou /connexion. */}
      <Route path="/" element={<MobileSplash />} />
      <Route path="/inscription" element={<MobileInscription />} />
      <Route path="/connexion"   element={<MobileConnexion />} />
      <Route path="/rejoindre/:token" element={<InvitationPage />} />
      {/* Écran de verrouillage (kiosque) — plein écran, hors AppLayout. */}
      <Route path="/lock" element={<MobileLockGate />} />
      {/* Alias /welcome (cible du logout côté MobileProfil) → connexion. */}
      <Route path="/welcome" element={<Navigate to="/connexion" replace />} />
      {/* Alias /securite (tuile « Verrouillage de l'app ») → écran sécurité. */}
      <Route path="/securite" element={<Navigate to="/parametres/securite" replace />} />

      {/* ── Post-création : plein écran (pas d'AppBar) ─────────────────── */}
      <Route element={<PrivateRoute />}>
        <Route path="/cagnottes/:id/cotisation-creee" element={<MobilePostCreationCotisation />} />
        <Route path="/cagnottes/:id/tontine-creee"    element={<MobilePostCreationTontine />} />
        {/* Configuration du code PIN : AppBar propre (titre dynamique selon ?mode=). */}
        <Route path="/parametres/securite/pin"        element={<MobilePinSetup />} />
      </Route>

      {/* ── Privées avec AppBar ────────────────────────────────────────── */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"                  element={<MobileHome />} />
          {/* Onglet « Découvrir » : cagnottes publiques approuvées (P2). */}
          <Route path="/explorer"                   element={<MobileExplorer />} />
          {/* Détail public d'une cagnotte (bouton « Contribuer »). */}
          <Route path="/public/:ref"                element={<MobilePublicDetail />} />
          <Route path="/cagnottes/nouvelle"         element={<MobileCreateCagnotte />} />
          <Route path="/cagnottes/:id/participants" element={<MobileAjoutParticipants />} />
          <Route path="/cagnottes/:id/cotiser"      element={<MobileCotiser />} />
          <Route path="/cagnottes/:id/reverser"     element={<MobileReversement />} />
          <Route path="/cagnottes/:id"              element={<MobileDetailCagnotte />} />
          <Route path="/profil"                     element={<MobileProfil />} />
          {/* Réglages de sécurité (AppBar « Sécurité » fournie par AppLayout). */}
          <Route path="/parametres/securite"        element={<MobileLockSettings />} />
        </Route>
      </Route>

      {/* ── Redirections ───────────────────────────────────────────────── */}
      {/* Toute route inconnue repasse par le splash (décision token centralisée). */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ── Arbre de routes DESKTOP (interface PC d'origine) ───────────────────────────

function DesktopRoutes() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/inscription" element={<InscriptionPage />} />
      <Route path="/connexion" element={<ConnexionPage />} />
      <Route path="/rejoindre/:token" element={<InvitationPage />} />
      <Route path="/paiement/:id" element={<PaiementPage />} />

      {/* Route semi-publique : détail cagnotte accessible sans compte */}
      <Route element={<AppLayout />}>
        <Route path="/cagnottes/:id" element={<DetailCagnottePage />} />
      </Route>

      {/* Routes privées */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/cagnottes/nouvelle" element={<NouvelleCagnottePage />} />
          <Route path="/cagnottes/:id/cotiser" element={<CotiserPage />} />
          <Route path="/cagnottes/:id/tontine-creee" element={<PostCreationTontinePage />} />
          <Route path="/cagnottes/:id/reverser" element={<ReversementPage />} />
          <Route path="/cagnottes/:id/participants" element={<AjoutParticipantsPage />} />
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="/parametres" element={<ParametresPage />} />
        </Route>
      </Route>

      {/* Redirect racine */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function App() {
  const isMobile = useMobile()
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    /* Ne pas afficher la popup sur la page d'invitation (a son propre modal). */
    if (window.location.pathname.startsWith('/rejoindre')) return

    /* Ne plus montrer si déjà vue cette session. */
    if (!shouldShowAppPopup()) return

    if (isMobileUA()) {
      /* Sur mobile : tenter d'ouvrir l'app native d'abord. */
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = 'tonji://home'
      document.body.appendChild(iframe)

      const timer = setTimeout(() => {
        /* Timeout écoulé, l'app n'était pas installée → afficher la popup. */
        document.body.removeChild(iframe)
        setShowPopup(true)
      }, 1500)

      /* Si la page perd le focus, l'app s'est ouverte → annuler la popup. */
      const onBlur = () => {
        clearTimeout(timer)
        markAppPopupDone()  // Ne plus proposer le téléchargement cette session
        window.removeEventListener('blur', onBlur)
      }
      window.addEventListener('blur', onBlur)

      return () => {
        clearTimeout(timer)
        window.removeEventListener('blur', onBlur)
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
      }
    } else {
      /* Desktop : PAS de popup de téléchargement d'app. L'utilisateur est sur
         ordinateur — on ne pousse pas les apps mobiles ; il utilise le web
         (ou l'USSD depuis son téléphone). On marque comme vue pour rester
         cohérent avec la clé de session. */
      markAppPopupDone()
    }
  }, []) /* Une seule fois au montage. */

  return (
    <>
      <BrowserRouter>
        {/* Scission d'interface : arbre de routes choisi selon l'appareil. */}
        {isMobile ? <MobileRoutes /> : <DesktopRoutes />}
      </BrowserRouter>

      {/* Overlay de chargement global : bloque l'écran pendant toute action
          mutante (POST/PATCH/DELETE) → empêche les double-clics. */}
      <LoadingOverlay />

      {/* Popup téléchargement (hors BrowserRouter pour éviter les conflits de contexte) */}
      {showPopup && (
        <AppDownloadPopup
          onDismiss={() => setShowPopup(false)}
        />
      )}
    </>
  )
}
