import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLoadingStore } from '@/store/loadingStore'

/**
 * Overlay de chargement global (plein écran, bloquant).
 *
 * S'affiche dès qu'une requête mutante est en vol (cf. loadingStore). Il
 * **bloque les clics** pendant l'action → plus de double-clic possible, et
 * donne un retour visuel clair. Un léger délai (180 ms) évite le flash sur les
 * requêtes très rapides.
 */
export default function LoadingOverlay() {
  const actif = useLoadingStore((s) => s.count > 0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!actif) {
      setVisible(false)
      return
    }
    const t = setTimeout(() => setVisible(true), 180)
    return () => clearTimeout(t)
  }, [actif])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          aria-live="polite"
          aria-busy="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(6, 20, 15, 0.38)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              padding: '26px 30px',
              borderRadius: 22,
              background: 'rgba(255,255,255,0.96)',
              boxShadow: '0 20px 60px rgba(6,20,15,0.30)',
            }}
          >
            {/* Anneau rotatif branché sur le vert Tonji. */}
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '4px solid rgba(10,104,71,0.15)',
                borderTopColor: '#0A6847',
              }}
            />
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                letterSpacing: 0.2,
                color: '#0A6847',
              }}
            >
              Un instant…
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
