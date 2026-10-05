/**
 * Entrée du portail marchand — `/marchand`.
 *
 * Deux étapes sur une seule page : le numéro, puis le code reçu par e-mail.
 * Pas de compte, pas de mot de passe — c'est la décision produit, et l'écran
 * doit la rendre évidente plutôt que de ressembler à une page de connexion.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { demanderCode, ouvrirSession, ErreurPortail } from '@/lib/marchandApi'

const P = {
  primary: '#0A6847',
  accent: '#E8A830',
  surface: '#F6F7F4',
  carte: '#FFFFFF',
  encre: '#14202E',
  ardoise: '#4A5568',
  brume: '#E8EDE9',
  erreur: '#A04434',
}

type Etape = 'numero' | 'code'

export default function PortailEntree() {
  const naviguer = useNavigate()
  const [etape, setEtape] = useState<Etape>('numero')
  const [numero, setNumero] = useState('')
  const [code, setCode] = useState('')
  const [info, setInfo] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  // Neuf chiffres commençant par 0, comme partout ailleurs dans Tonji.
  const numeroValide = /^0\d{8}$/.test(numero.replace(/\s/g, ''))

  async function envoyerNumero(e: React.FormEvent) {
    e.preventDefault()
    if (!numeroValide || enCours) return
    setEnCours(true)
    setErreur(null)
    try {
      const message = await demanderCode(numero.replace(/\s/g, ''))
      setInfo(message)
      setEtape('code')
    } catch (err) {
      setErreur(err instanceof ErreurPortail ? err.message : 'Impossible de joindre Tonji.')
    } finally {
      setEnCours(false)
    }
  }

  async function envoyerCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6 || enCours) return
    setEnCours(true)
    setErreur(null)
    try {
      await ouvrirSession(numero.replace(/\s/g, ''), code)
      naviguer('/marchand/suivi', { replace: true })
    } catch (err) {
      setErreur(err instanceof ErreurPortail ? err.message : 'Impossible de joindre Tonji.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: P.surface, padding: '32px 16px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: P.primary, letterSpacing: -0.4 }}>
            Tonji — Suivi marchand
          </div>
          <p style={{ color: P.ardoise, fontSize: 14, margin: '6px 0 0' }}>
            Consultez ce que votre numéro a encaissé.
          </p>
        </div>

        <div style={{
          background: P.carte, border: `1px solid ${P.brume}`,
          borderRadius: 18, padding: 22,
        }}>
          {etape === 'numero' ? (
            <form onSubmit={envoyerNumero}>
              <label style={etiquette}>Votre numéro Airtel Money</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="077 60 77 52"
                maxLength={14}
                style={champ}
              />
              <p style={aide}>
                Un code à 6 chiffres sera envoyé à l'adresse e-mail enregistrée
                sur votre fiche. Aucun compte à créer.
              </p>
              <button type="submit" disabled={!numeroValide || enCours} style={bouton(!numeroValide || enCours)}>
                {enCours ? 'Envoi…' : 'Recevoir mon code'}
              </button>
            </form>
          ) : (
            <form onSubmit={envoyerCode}>
              {/* Le message vient du serveur et reste volontairement
                  conditionnel — il ne dit pas si le numéro est enregistré. */}
              {info && <p style={{ ...aide, marginTop: 0 }}>{info}</p>}
              <label style={etiquette}>Code reçu par e-mail</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                style={{ ...champ, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
              />
              <button type="submit" disabled={code.length !== 6 || enCours} style={bouton(code.length !== 6 || enCours)}>
                {enCours ? 'Vérification…' : 'Entrer'}
              </button>
              <button
                type="button"
                onClick={() => { setEtape('numero'); setCode(''); setErreur(null) }}
                style={lienSecondaire}
              >
                Changer de numéro
              </button>
            </form>
          )}

          {erreur && (
            <p style={{ color: P.erreur, fontSize: 14, fontWeight: 600, marginTop: 14 }}>
              {erreur}
            </p>
          )}
        </div>

        <p style={{ color: P.ardoise, fontSize: 12, textAlign: 'center', marginTop: 18 }}>
          Tonji — service édité par Paynala.
        </p>
      </div>
    </div>
  )
}

const etiquette: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700, color: P.encre, marginBottom: 6,
}

const champ: React.CSSProperties = {
  width: '100%', padding: '13px 14px', fontSize: 16, fontWeight: 600,
  color: P.encre, background: P.surface,
  border: `1.5px solid ${P.brume}`, borderRadius: 12, outline: 'none',
}

const aide: React.CSSProperties = {
  color: P.ardoise, fontSize: 13, margin: '10px 0 0', lineHeight: 1.45,
}

const lienSecondaire: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 10, padding: 10,
  background: 'none', border: 'none', color: P.ardoise,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

function bouton(desactive: boolean): React.CSSProperties {
  return {
    width: '100%', marginTop: 16, padding: '14px 16px',
    background: desactive ? P.brume : P.primary,
    color: desactive ? P.ardoise : '#fff',
    border: 'none', borderRadius: 13,
    fontSize: 15, fontWeight: 800,
    cursor: desactive ? 'default' : 'pointer',
  }
}
