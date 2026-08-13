import { useState, useEffect } from 'react'

/**
 * Détection « appareil mobile ».
 *
 * Vrai si l'user-agent est un mobile/tablette CONNU (Android/iPhone/iPad/iPod)
 * OU si la largeur de la fenêtre est < 768px.
 *
 * C'est la SOURCE DE VÉRITÉ UNIQUE de la scission d'interface :
 *  - App.tsx s'en sert pour choisir l'arbre de routes (interface PC vs mobile),
 *  - AppLayout s'en sert pour choisir la coquille (DesktopLayout vs MobileLayout).
 * Les deux doivent TOUJOURS s'accorder, d'où le calcul centralisé ici.
 */
function computeIsMobile(): boolean {
  const uaMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  return uaMobile || window.innerWidth < 768
}

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(computeIsMobile)

  useEffect(() => {
    // Recalcule au redimensionnement (ex : PC dont on rétrécit la fenêtre < 768px).
    const handler = () => setIsMobile(computeIsMobile())
    const mq = window.matchMedia('(max-width: 767px)')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}
