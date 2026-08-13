import { useMobile } from '@/hooks/useMobile'
import MobileCreateCagnotte from '@/pages/mobile/MobileCreateCagnotte'
import { T } from '@/lib/tokens'

// ─────────────────────────────────────────────────────────────────────────────
// NouvelleCagnottePage (desktop) — process STRICTEMENT identique au web mobile.
// La création est un assistant complexe (choix de type → étapes par type → KYC
// numéro de retrait → objectif/durée / pénalité → reversement → CGU → creerCagnotte).
// Pour garantir un alignement parfait avec le web mobile, on réutilise le MÊME
// composant (donc mêmes étapes, mêmes validations, mêmes appels backend), présenté
// en panneau centré et encadré sur desktop.
// ─────────────────────────────────────────────────────────────────────────────
export default function NouvelleCagnottePage() {
  const isMobile = useMobile()
  if (isMobile) return <MobileCreateCagnotte />

  return (
    <div className="flex justify-center py-2">
      <div
        className="w-full max-w-md rounded-[24px] overflow-hidden shadow-2xl"
        style={{ border: `1px solid ${T.border}`, background: T.surface, minHeight: 620 }}
      >
        <MobileCreateCagnotte />
      </div>
    </div>
  )
}
