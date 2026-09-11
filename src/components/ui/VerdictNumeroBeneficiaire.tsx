import { T } from '@/lib/tokens'
import type { VerdictNumero } from '@/hooks/useVerificationBeneficiaire'

/**
 * Retour de la vérification, affiché sous le champ du bénéficiaire.
 *
 * Miroir de `_VerdictNumero` côté Flutter. Trois registres, et un seul bloque :
 * un compte vérifié montre le nom de son titulaire, un numéro sans compte
 * Mobile Money interdit le reversement, tout le reste informe sans empêcher.
 */
export function VerdictNumeroBeneficiaire({
  verdict,
  titulaire,
}: {
  verdict: VerdictNumero
  titulaire: string | null
}) {
  if (verdict === 'idle') return null

  if (verdict === 'en_cours') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingLeft: '4px' }}>
        <span style={{
          width: '13px', height: '13px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${T.border}`, borderTopColor: T.textSec,
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ fontSize: '14px', color: T.textSec }}>Vérification du numéro…</span>
      </div>
    )
  }

  // Le nom prime sur le libellé générique : c'est lui que l'utilisateur doit
  // lire pour s'assurer qu'il envoie l'argent à la bonne personne.
  const { couleur, texte, icone } = {
    ok: {
      couleur: T.success,
      texte: titulaire ?? 'Compte Mobile Money vérifié',
      icone: 'bouclier' as const,
    },
    pas_de_compte: {
      couleur: T.error,
      texte: "Ce numéro n'a pas de compte Airtel Money actif.",
      icone: 'croix' as const,
    },
    moov: {
      couleur: T.warning,
      texte: 'Numéro Moov Money — vérifiez que le compte est actif.',
      icone: 'alerte' as const,
    },
    operateur_inconnu: {
      couleur: T.textTert,
      texte: 'Opérateur non reconnu pour ce numéro.',
      icone: 'aide' as const,
    },
    indisponible: {
      couleur: T.textTert,
      texte: "Vérification indisponible pour l'instant.",
      icone: 'aide' as const,
    },
  }[verdict]

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '10px', paddingLeft: '4px' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={couleur}
           strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
           style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true">
        {icone === 'bouclier' && (<>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </>)}
        {icone === 'croix' && (<>
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6M9 9l6 6" />
        </>)}
        {icone === 'alerte' && (<>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 17h.01" />
        </>)}
        {icone === 'aide' && (<>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
        </>)}
      </svg>
      <span style={{
        fontSize: '15px',
        fontWeight: verdict === 'ok' ? 600 : 500,
        color: couleur,
      }}>
        {texte}
      </span>
    </div>
  )
}
