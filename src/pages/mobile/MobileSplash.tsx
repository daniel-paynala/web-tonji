/**
 * Splash de démarrage — réplique web de `splash_screen.dart`.
 *
 * Affiche la marque Tonji avec une entrée animée pendant qu'on bootstrap
 * l'auth, puis redirige :
 *   - token présent  → /dashboard  (équivalent AppRoutes.home côté Flutter)
 *   - pas de token   → /connexion  (côté Flutter : welcome ; le web n'a pas
 *                       d'écran welcome → on route vers la connexion).
 *
 * ÉCART ASSUMÉ vs Flutter :
 *  - Flutter lit le token dans `flutter_secure_storage` puis valide via
 *    GET /auth/me. Le bootstrap web se contente de vérifier la présence du
 *    token persisté dans le store zustand (localStorage 'tonji-auth'), car
 *    l'app web ne dispose pas (encore) d'un helper de validation /auth/me
 *    réutilisable sans modifier les fichiers partagés. La validation fine du
 *    token est déléguée au PrivateRoute / aux appels API qui renverront 401.
 *  - Le minimum de 1.5 s est conservé pour garantir la lecture des animations.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import { T } from '@/lib/tokens'
import { useAuthStore } from '@/store/authStore'

// Durée minimale d'affichage du splash (ms) — garantit la lecture des animations.
const SPLASH_MIN_MS = 1500

/**
 * Halo coloré flouté — équivalent web du `GlowCircle` Flutter.
 * Décoratif : `pointer-events: none` pour ne pas intercepter les clics.
 */
function GlowCircle({
  color,
  size,
  opacity,
  blur = 80,
}: {
  color: string
  size: number
  opacity: number
  blur?: number
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        opacity,
        // Flou diffus reproduisant le boxShadow blurRadius de Flutter.
        filter: `blur(${blur / 2}px)`,
        pointerEvents: 'none',
      }}
    />
  )
}

// Le wordmark texte dessiné a été remplacé par le vrai logo de marque (image
// transparente public/logo-tonji-wordmark.png) — voir usage plus bas.

/** Écran splash animé. */
export default function MobileSplash() {
  const navigate = useNavigate()
  // Lecture directe du token persisté (équivalent au bootstrap auth Flutter).
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    // Timer minimum pour laisser jouer les animations, comme `_splashMin`.
    const timer = setTimeout(() => {
      if (token && isAuthenticated) {
        navigate('/dashboard', { replace: true }) // session valide → écran principal
      } else {
        navigate('/connexion', { replace: true }) // pas de session → connexion
      }
    }, SPLASH_MIN_MS)

    return () => clearTimeout(timer)
  }, [navigate, token, isAuthenticated])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // Fond vert forêt — identique au fond de l'icône d'app.
        backgroundColor: T.primary,
        overflow: 'hidden',
      }}
    >
      {/* Halo doré haut-droite — fadeIn + scale (easeOut/easeOutQuart). */}
      <motion.div
        style={{ position: 'absolute', top: -80, right: -60 }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: [0.165, 0.84, 0.44, 1] }}
      >
        <GlowCircle color={T.accent} size={300} opacity={0.28} />
      </motion.div>

      {/* Halo vert clair bas-gauche — profondeur, delay 200ms. */}
      <motion.div
        style={{ position: 'absolute', bottom: -100, left: -80 }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, delay: 0.2, ease: [0.165, 0.84, 0.44, 1] }}
      >
        <GlowCircle color={T.primaryLighter} size={340} opacity={0.22} />
      </motion.div>

      {/* Marque centrée — blanc sur vert, comme sur l'icône. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Wordmark : fadeIn (800ms) + slideY (0.3 → 0, easeOutCubic). */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.33, 0, 0.2, 1] }}
        >
          <img src="/logo-tonji-wordmark.png" alt="Tonji" style={{ height: 180, width: 'auto', display: 'block' }} />
        </motion.div>

        {/* Espace : SizedBox(height: 14). */}
        <div style={{ height: 14 }} />

        {/* Tagline — delay 600ms, fadeIn + slideY. */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease: [0.33, 0, 0.2, 1] }}
          style={{
            letterSpacing: 1.5,
            color: 'rgba(255,255,255,0.65)', // blanc 65% (withValues alpha: 0.65)
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          Cotisez simplement.
        </motion.div>
      </div>

      {/* Indicateur de chargement subtil en bas — delay 900ms. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 60,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {/* Spinner circulaire — blanc 50%, strokeWidth 2.5. */}
        <svg
          width={32}
          height={32}
          viewBox="0 0 32 32"
          style={{ animation: 'tonji-splash-spin 0.9s linear infinite' }}
        >
          <circle
            cx={16}
            cy={16}
            r={14}
            fill="none"
            stroke="rgba(255,255,255,0.50)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={Math.PI * 2 * 14}
            strokeDashoffset={Math.PI * 2 * 14 * 0.75}
          />
        </svg>
      </motion.div>

      {/* Keyframes de rotation du spinner (CircularProgressIndicator). */}
      <style>{`
        @keyframes tonji-splash-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
