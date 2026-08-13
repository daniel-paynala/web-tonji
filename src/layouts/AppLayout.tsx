import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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

// ── Icônes de la barre d'onglets (miroir des NavigationDestination Flutter) ──
// Tirelire — onglet « Mes cotisations ».
const IconSavingsTab = ({ filled }: { filled: boolean }) => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 10c0-3.3-3.1-6-7-6s-7 2.7-7 6c0 1.6.7 3 1.9 4.1V18a1 1 0 001 1h1.6a1 1 0 001-.7l.2-.6c.4.1.8.1 1.3.1s.9 0 1.3-.1l.2.6a1 1 0 001 .7H17a1 1 0 001-1v-2.4c.6-.6 1-1.3 1-2.6z"/>
    <line x1="9" y1="9" x2="13" y2="9" stroke={filled ? 'var(--tab-bg)' : 'currentColor'}/>
  </svg>
)
// Boussole — onglet « Découvrir ».
const IconExploreTab = ({ filled }: { filled: boolean }) => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill={filled ? 'currentColor' : 'none'}/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
      fill={filled ? 'var(--tab-bg)' : 'none'} stroke={filled ? 'var(--tab-bg)' : 'currentColor'}/>
  </svg>
)
// Personne — onglet « Profil ».
const IconPersonTab = ({ filled }: { filled: boolean }) => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

// ── Barre d'onglets du bas (miroir HomeShellScreen — barre BLANCHE, actif vert) ──
// Affichée uniquement sur les 3 routes-onglets ; hauteur 68, pastille verte sur l'actif.
// Lancement « Cagnotte d'abord » : 2 onglets (Mes cagnottes · Profil).
// L'onglet « Découvrir » (annuaire public) est parqué en phase 3 : repasser
// DECOUVRIR_ACTIF à true pour le réactiver, aucune autre modification requise.
const DECOUVRIR_ACTIF = false
const TABS = [
  { path: '/dashboard', label: 'Mes cagnottes', Icon: IconSavingsTab },
  ...(DECOUVRIR_ACTIF ? [{ path: '/explorer', label: 'Découvrir', Icon: IconExploreTab }] : []),
  { path: '/profil',    label: 'Profil',        Icon: IconPersonTab },
]

// Routes sur lesquelles la barre d'onglets doit apparaître.
const TAB_PATHS = TABS.map(t => t.path) as readonly string[]

function BottomTabBar({ pathname }: { pathname: string }) {
  const navigate = useNavigate()
  return (
    <nav
      className="sticky bottom-0 z-40 flex-shrink-0 flex"
      style={{
        backgroundColor: T.surfaceEl,           // barre blanche
        height: '68px',
        borderTop: `1px solid ${T.border}`,
        // Variable consommée par les icônes pleines pour « creuser » le glyphe.
        ['--tab-bg' as string]: T.surfaceEl,
      }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const actif = pathname === path
        const couleur = actif ? T.primary : T.textTert
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: couleur }}
            aria-label={label}
            aria-current={actif ? 'page' : undefined}
          >
            {/* Pastille verte translucide derrière l'icône active (indicatorColor Flutter) */}
            <span
              className="flex items-center justify-center"
              style={{
                width: '54px', height: '30px', borderRadius: '15px',
                background: actif ? 'rgba(10,104,71,0.12)' : 'transparent',
                transition: 'background 0.2s',
              }}
            >
              <Icon filled={actif} />
            </span>
            <span style={{ fontSize: '12px', fontWeight: actif ? 700 : 500, color: couleur }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ── Route titles ──────────────────────────────────────────────────────────

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':           'Accueil',
  '/explorer':            'Découvrir',
  '/cagnottes/nouvelle':  'Nouvelle cagnotte',
  '/profil':              'Mon profil',
  '/parametres':          'Paramètres',
  '/parametres/securite': 'Sécurité',
}

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/public/')) return 'Cagnotte'
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

  // Routes-onglets (Mes cotisations / Découvrir / Profil) : pas d'AppBar verte
  // ni de flèche retour — la navigation se fait via la barre du bas (miroir HomeShell).
  const estOngletTab = TAB_PATHS.includes(pathname)
  // Le détail public a son propre AppBar interne (flèche retour) → pas de header global.
  const estDetailPublic = pathname.startsWith('/public/')
  const showBackBtn = pathname.startsWith('/cagnottes/') || pathname.startsWith('/parametres')

  return (
    // Hauteur bornée au viewport (100dvh) : la zone <main> scrolle en interne
    // et la barre d'onglets du bas reste FIXE (miroir bottomNavigationBar Flutter).
    <div className="flex flex-col tap-none" style={{ backgroundColor: T.surface, height: '100dvh' }}>

      {/* AppBar verte — masquée sur les routes-onglets (profil désormais dans la
          barre du bas) et sur le détail public (qui fournit sa propre barre). */}
      {!estOngletTab && !estDetailPublic && (
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

          {/* Bouton connexion uniquement si non connecté (le profil a son onglet). */}
          {!user && (
            <Link
              to="/connexion"
              className="px-3 h-8 rounded-full flex items-center text-xs font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: T.surfaceEl }}
            >
              Se connecter
            </Link>
          )}
        </header>
      )}

      {/* Contenu scrollable — animé en fondu/glissé entre les onglets (miroir PageView). */}
      <main className="flex-1 overflow-auto">
        {estOngletTab ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
              style={{ minHeight: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Barre d'onglets du bas — uniquement sur les 3 routes-onglets. */}
      {estOngletTab && <BottomTabBar pathname={pathname} />}
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
        {/* Logo — wordmark officiel Tonji (Ton blanc / ji or), lisible sur le vert. */}
        <img src="/logo-tonji-wordmark-trim.png" alt="Tonji" className="h-9 w-auto" />

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
