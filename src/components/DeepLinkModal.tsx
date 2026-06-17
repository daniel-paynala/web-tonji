/**
 * Modal affiché quand l'app Tonji n'est pas détectée.
 * Deux options : rester sur le web, ou aller sur WhatsApp.
 */

const P = {
  primary:   '#0A6847',
  accent:    '#E8A830',
  surface:   '#F6F7F4',
  bg:        '#FFFFFF',
  textMain:  '#14202E',
  textSec:   '#4A5568',
  border:    '#E8EDE9',
}

const WA_GREEN = '#25D366'

interface Props {
  /** Texte principal sous le logo (ex: "Rejoindre la cagnotte Second test"). */
  title?: string
  /** URL WhatsApp pré-construite (wa.me/…). Vide = bouton désactivé. */
  waUrl: string
  /** Appelé quand l'utilisateur choisit "Rester ici". */
  onStay: () => void
}

export default function DeepLinkModal({ title, waUrl, onStay }: Props) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoCircle}>T</div>
          <span style={styles.logoName}>Tonji</span>
        </div>

        {/* Titre */}
        <p style={styles.title}>
          {title ?? 'Ouvrir avec Tonji'}
        </p>
        <p style={styles.sub}>
          Comment souhaitez-vous continuer ?
        </p>

        {/* Boutons */}
        <div style={styles.btnGroup}>

          {/* WhatsApp */}
          {waUrl ? (
            <a href={waUrl} style={{ ...styles.btn, background: WA_GREEN, color: '#fff' }}>
              <WhatsAppIcon />
              Continuer sur WhatsApp
            </a>
          ) : (
            <button style={{ ...styles.btn, background: '#ddd', color: '#999', cursor: 'not-allowed' }} disabled>
              <WhatsAppIcon color="#999" />
              WhatsApp non configuré
            </button>
          )}

          {/* Rester sur le web */}
          <button
            onClick={onStay}
            style={{ ...styles.btn, background: P.primary, color: '#fff' }}
          >
            <GlobeIcon />
            Rester sur le web
          </button>

        </div>

        {/* Note */}
        <p style={styles.note}>
          L'application Tonji ne semble pas installée sur cet appareil.
        </p>

      </div>
    </div>
  )
}

// ── Icônes inline (pas de dépendance externe) ──────────────────────────────────

function WhatsAppIcon({ color = '#fff' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={color} style={{ marginRight: 8, flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '24px 16px',
  },
  card: {
    background: P.bg,
    borderRadius: 20,
    padding: '32px 24px 24px',
    maxWidth: 380,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: P.primary,
    color: '#fff',
    fontSize: 22,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    fontSize: 26,
    fontWeight: 900,
    color: P.primary,
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: P.textMain,
    marginBottom: 8,
    lineHeight: 1.3,
  },
  sub: {
    fontSize: 14,
    color: P.textSec,
    marginBottom: 28,
  },
  btnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 20px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  note: {
    fontSize: 11,
    color: P.textSec,
    opacity: 0.6,
    lineHeight: 1.5,
  },
}
