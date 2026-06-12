import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useMobile } from '@/hooks/useMobile'
import { T } from '@/lib/tokens'

// ── Icons ──────────────────────────────────────────────────────────────────

const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

// ── Route titles ──────────────────────────────────────────────────────────

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':           'Accueil',
  '/cagnottes/nouvelle':  'Nouvelle cagnotte',
  '/profil':              'Mon profil',
  '/parametres':          'Paramètres',
}

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/cagnottes/')) return 'Détail cagnotte'
  return 'Tonji'
}

// ── Mobile layout — miroir exact du Flutter ───────────────────────────────

function MobileLayout() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const title = getTitle(pathname)
  const showBackBtn = pathname.startsWith('/cagnottes/') || pathname.startsWith('/profil') || pathname.startsWith('/parametres')

  const initiales = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : '?'

  return (
    <div className="min-h-screen flex flex-col tap-none" style={{ backgroundColor: T.surface }}>

      {/* AppBar — identique au Flutter AppBarTheme */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 flex-shrink-0"
        style={{ backgroundColor: T.primary, height: '56px', minHeight: '56px' }}
      >
        <div className="flex items-center gap-3">
          {showBackBtn && (
            <button
              onClick={() => navigate(-1)}
              className="mr-1 p-1 rounded-full transition-opacity active:opacity-60"
              style={{ color: T.surfaceEl }}
              aria-label="Retour"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <span className="font-bold text-[18px] tracking-tight" style={{ color: T.surfaceEl }}>
            {title}
          </span>
        </div>

        {/* Avatar initiales ou bouton connexion */}
        {user ? (
          <button
            onClick={() => navigate('/profil')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold active:opacity-70 transition-opacity"
            style={{ backgroundColor: T.accent, color: T.textStrong }}
            aria-label="Mon profil"
          >
            {initiales}
          </button>
        ) : (
          <Link
            to="/connexion"
            className="px-3 h-8 rounded-full flex items-center text-xs font-bold"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: T.surfaceEl }}
          >
            Se connecter
          </Link>
        )}
      </header>

      {/* Contenu scrollable */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

// ── Desktop layout ─────────────────────────────────────────────────────────

function DesktopLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/connexion') }

  const initiales = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : '?'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: T.surface }}>

      {/* Header desktop */}
      <header
        className="sticky top-0 h-16 flex items-center justify-between px-6 flex-shrink-0 z-40"
        style={{ backgroundColor: T.primary, borderBottom: `1px solid rgba(255,255,255,0.10)` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-glow font-bold text-sm tracking-tight"
            style={{ backgroundColor: T.accent, color: T.textStrong }}
          >
            T
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: T.surfaceEl }}>Tonji</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profil')}
            className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-colors duration-150"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold"
              style={{ backgroundColor: T.accent, color: T.textStrong }}
            >
              {initiales}
            </div>
            <span className="text-xs font-medium">
              {user?.prenom} {user?.nom}
            </span>
          </button>

          <button
            onClick={() => navigate('/parametres')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.75)' }}
            onMouseEnter={e => (e.currentTarget.style.color = T.surfaceEl)}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
          >
            <IconSettings />
            <span className="hidden sm:inline">Paramètres</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.60)' }}
            onMouseEnter={e => (e.currentTarget.style.color = T.surfaceEl)}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')}
          >
            <IconLogout />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 overflow-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ── Export principal ───────────────────────────────────────────────────────

export default function AppLayout() {
  const isMobile = useMobile()
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
