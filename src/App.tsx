import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages publiques
import InscriptionPage from '@/pages/auth/InscriptionPage'
import ConnexionPage from '@/pages/auth/ConnexionPage'
import InvitationPage from '@/pages/public/InvitationPage'

// Pages privées
import DashboardPage from '@/pages/dashboard/DashboardPage'
import NouvelleCagnottePage from '@/pages/cagnottes/NouvelleCagnottePage'
import DetailCagnottePage from '@/pages/cagnottes/DetailCagnottePage'
import ProfilPage from '@/pages/profil/ProfilPage'
import ParametresPage from '@/pages/parametres/ParametresPage'
import PaiementPage from '@/pages/paiement/PaiementPage'

// Nouvelles pages mobile
import CotiserPage from '@/pages/cagnottes/CotiserPage'
import PostCreationTontinePage from '@/pages/cagnottes/PostCreationTontinePage'
import ReversementPage from '@/pages/cagnottes/ReversementPage'
import AjoutParticipantsPage from '@/pages/cagnottes/AjoutParticipantsPage'

// Brand board (accès libre)
import BrandBoard from '@/pages/BrandBoard'

// Layout & Guards
import AppLayout from '@/layouts/AppLayout'
import PrivateRoute from '@/components/guards/PrivateRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Brand board */}
        <Route path="/brand" element={<BrandBoard />} />

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
    </BrowserRouter>
  )
}
