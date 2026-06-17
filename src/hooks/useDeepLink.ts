import { useState, useEffect, useRef } from 'react'
import { DEEPLINK } from '@/lib/deeplink'

interface UseDeepLinkOptions {
  /** URL custom scheme à tenter (ex: tonji://rejoindre/123456). */
  appUrl: string
  /** Déclencher la tentative automatiquement au montage. */
  autoTry?: boolean
}

interface UseDeepLinkReturn {
  /** true si le timeout est écoulé et que l'app ne s'est pas ouverte. */
  showModal: boolean
  /** Tenter manuellement d'ouvrir l'app. */
  tryOpen: () => void
  /** Fermer le modal (l'utilisateur choisit de rester sur le web). */
  dismissModal: () => void
}

/**
 * Tente d'ouvrir l'app Tonji via deep link custom scheme.
 * Si l'app n'est pas installée, le navigateur reste sur la page et le modal
 * s'affiche après `DEEPLINK.openTimeout` ms.
 *
 * Mécanisme : on crée un iframe invisible pointant vers l'URL custom scheme.
 * Les navigateurs mobiles tentent de lancer l'app ; si elle n'est pas là,
 * rien ne se passe et la page reste visible → le timeout déclenche le modal.
 * Sur desktop (où le scheme est toujours inconnu), le modal s'affiche aussi.
 */
export function useDeepLink({ appUrl, autoTry = true }: UseDeepLinkOptions): UseDeepLinkReturn {
  const [showModal, setShowModal] = useState(false)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triedRef   = useRef(false)

  const tryOpen = () => {
    if (triedRef.current) return
    triedRef.current = true

    // Iframe invisible — déclenche le custom scheme sans quitter la page.
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = appUrl
    document.body.appendChild(iframe)

    // Après le timeout, si la page est toujours visible → app absente.
    timerRef.current = setTimeout(() => {
      document.body.removeChild(iframe)
      setShowModal(true)
    }, DEEPLINK.openTimeout)

    // Si la page perd le focus (app ouverte), annuler le timer.
    const onBlur = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      window.removeEventListener('blur', onBlur)
    }
    window.addEventListener('blur', onBlur)
  }

  useEffect(() => {
    if (autoTry) tryOpen()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissModal = () => setShowModal(false)

  return { showModal, tryOpen, dismissModal }
}
