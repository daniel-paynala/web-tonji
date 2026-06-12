import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages mobile — reproduction exacte du Flutter (source de vérité)
import MobileInscription           from '@/pages/mobile/MobileInscription'
import MobileConnexion             from '@/pages/mobile/MobileConnexion'
import MobileHome                  from '@/pages/mobile/MobileHome'
import MobileCreateCagnotte        from '@/pages/mobile/MobileCreateCagnotte'
import MobileDetailCagnotte        from '@/pages/mobile/MobileDetailCagnotte'
import MobileCotiser               from '@/pages/mobile/MobileCotiser'
import MobileReversement           from '@/pages/mobile/MobileReversement'
import MobileAjoutParticipants     from '@/pages/mobile/MobileAjoutParticipants'
import MobileProfil                from '@/pages/mobile/MobileProfil'
import MobilePostCreationTontine   from '@/pages/mobile/MobilePostCreationTontine'
import MobilePostCreationCotisation from '@/pages/mobile/MobilePostCreationCotisation'

// Pages accessibles sans compte
import InvitationPage from '@/pages/public/InvitationPage'

// Layout & Guards
import AppLayout    from '@/layouts/AppLayout'
import PrivateRoute from '@/components/guards/PrivateRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Publiques sans layout ──────────────────────────────────────── */}
        <Route path="/inscription" element={<MobileInscription />} />
        <Route path="/connexion"   element={<MobileConnexion />} />
        <Route path="/rejoindre/:token" element={<InvitationPage />} />

        {/* ── Post-création : plein écran (pas d'AppBar) ─────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route path="/cagnottes/:id/cotisation-creee" element={<MobilePostCreationCotisation />} />
          <Route path="/cagnottes/:id/tontine-creee"    element={<MobilePostCreationTontine />} />
        </Route>

        {/* ── Privées avec AppBar ────────────────────────────────────────── */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"                  element={<MobileHome />} />
            <Route path="/cagnottes/nouvelle"         element={<MobileCreateCagnotte />} />
            <Route path="/cagnottes/:id/participants" element={<MobileAjoutParticipants />} />
            <Route path="/cagnottes/:id/cotiser"      element={<MobileCotiser />} />
            <Route path="/cagnottes/:id/reverser"     element={<MobileReversement />} />
            <Route path="/cagnottes/:id"              element={<MobileDetailCagnotte />} />
            <Route path="/profil"                     element={<MobileProfil />} />
          </Route>
        </Route>

        {/* ── Redirections ───────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
