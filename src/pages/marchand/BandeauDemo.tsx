/**
 * Bandeau de démonstration.
 *
 * Présent sur TOUTES les vues du portail tant que `MODE_DEMO` est actif. Un
 * commerçant qui lirait « 525 000 FCFA encaissés » sans savoir que le chiffre
 * est inventé croirait avoir reçu de l'argent qu'il n'a pas : l'avertissement
 * n'est pas un ornement, c'est ce qui rend la mise en ligne anticipée
 * acceptable.
 *
 * Il disparaît de lui-même le jour où l'API est branchée — rien à retirer à la
 * main, donc rien à oublier.
 */
import { MODE_DEMO } from '@/lib/marchandApi'

export default function BandeauDemo() {
  if (!MODE_DEMO) return null

  return (
    <div
      role="status"
      style={{
        background: '#E8A830',
        color: '#14202E',
        padding: '9px 14px',
        fontSize: 13,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.4,
      }}
    >
      Démonstration — les montants et les paiements affichés sont fictifs.
    </div>
  )
}
