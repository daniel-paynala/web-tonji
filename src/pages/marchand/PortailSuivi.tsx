/**
 * Suivi des encaissements — `/marchand/suivi`.
 *
 * Ce que le marchand vient chercher est un RAPPROCHEMENT : il a son solde
 * Airtel d'un côté, et veut savoir ce que Tonji lui a envoyé de l'autre. D'où
 * trois partis pris :
 *  - le total encaissé de la période est la première chose à l'écran ;
 *  - les échecs et les paiements en cours sont montrés, parce que c'est
 *    justement l'écart qui intéresse ;
 *  - l'export emporte la période entière, pas la page affichée.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  session, fermerSession, suivi, ErreurPortail,
  type Suivi, type Transaction,
} from '@/lib/marchandApi'
import { toutesLesTransactions, versCsv, versPdf } from '@/lib/exportSuivi'

const P = {
  primary: '#0A6847', accent: '#E8A830', surface: '#F6F7F4', carte: '#FFFFFF',
  encre: '#14202E', ardoise: '#4A5568', gris: '#8A94A0', brume: '#E8EDE9',
  erreur: '#A04434', succes: '#0A6847',
}

const STATUTS: Record<string, { libelle: string; couleur: string }> = {
  succes:   { libelle: 'Reçu',      couleur: P.succes },
  echec:    { libelle: 'Échoué',    couleur: P.erreur },
  en_cours: { libelle: 'En cours',  couleur: P.accent },
  initie:   { libelle: 'En cours',  couleur: P.accent },
}

/** `150000` devient `150 000`. */
const montant = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

export default function PortailSuivi() {
  const naviguer = useNavigate()
  const s = session()

  const [donnees, setDonnees] = useState<Suivi | null>(null)
  const [statut, setStatut] = useState('tous')
  const [depuis, setDepuis] = useState('')
  const [jusqua, setJusqua] = useState('')
  const [page, setPage] = useState(1)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(true)
  const [exportEnCours, setExportEnCours] = useState<'csv' | 'pdf' | null>(null)

  const charger = useCallback(async () => {
    setEnCours(true)
    setErreur(null)
    try {
      setDonnees(await suivi({ statut, depuis, jusqua, page }))
    } catch (err) {
      if (err instanceof ErreurPortail && err.statut === 401) {
        naviguer('/marchand', { replace: true })
        return
      }
      setErreur(err instanceof ErreurPortail ? err.message : 'Impossible de joindre Tonji.')
    } finally {
      setEnCours(false)
    }
  }, [statut, depuis, jusqua, page, naviguer])

  useEffect(() => {
    if (!s) { naviguer('/marchand', { replace: true }); return }
    charger()
  }, [charger]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return null

  /**
   * Exporte la PÉRIODE ENTIÈRE, pas la page affichée.
   *
   * L'API pagine à cinquante : un export limité à la page donnerait un total
   * faux à qui rapproche son solde Airtel, sans rien pour s'en apercevoir.
   */
  async function exporter(format: 'csv' | 'pdf') {
    if (exportEnCours) return
    setExportEnCours(format)
    setErreur(null)
    try {
      const { donnees: d, lignes, tronque } = await toutesLesTransactions({ statut, depuis, jusqua })
      if (format === 'csv') {
        versCsv(d, lignes)
      } else {
        await versPdf(d, lignes, {
          numero: s!.numero,
          etablissements: s!.etablissements.map((e) => e.nom).join(' · '),
        })
      }
      if (tronque) {
        setErreur('Export limité aux 2 000 premières lignes. Resserrez la période pour tout obtenir.')
      }
    } catch (err) {
      setErreur(err instanceof ErreurPortail ? err.message : 'Export impossible.')
    } finally {
      setExportEnCours(null)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: P.surface, paddingBottom: 40 }}>
      <header style={{
        background: P.carte, borderBottom: `1px solid ${P.brume}`,
        padding: '14px 16px',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: P.primary, fontSize: 16 }}>Suivi marchand</div>
            <div style={{ color: P.ardoise, fontSize: 13, overflowWrap: 'anywhere' }}>
              {s.etablissements.map((e) => e.nom).join(' · ') || s.numero}
            </div>
          </div>
          <button
            onClick={() => { fermerSession(); naviguer('/marchand', { replace: true }) }}
            style={{ background: 'none', border: 'none', color: P.ardoise, fontWeight: 600, cursor: 'pointer' }}
          >
            Quitter
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '18px 16px' }}>

        {donnees && (
          <div style={{
            background: P.carte, border: `1px solid ${P.brume}`, borderRadius: 18,
            padding: 20, marginBottom: 16,
          }}>
            <div style={{ color: P.ardoise, fontSize: 13 }}>Encaissé sur la période</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: P.primary, letterSpacing: -0.6 }}>
              {montant(donnees.totaux.encaisse)} <span style={{ fontSize: 16 }}>FCFA</span>
            </div>
            <div style={{ color: P.ardoise, fontSize: 13, marginTop: 4 }}>
              {donnees.totaux.nb_succes} reçu{donnees.totaux.nb_succes > 1 ? 's' : ''}
              {donnees.totaux.nb_echec > 0 && ` · ${donnees.totaux.nb_echec} échoué${donnees.totaux.nb_echec > 1 ? 's' : ''}`}
              {donnees.totaux.nb_encours > 0 && ` · ${donnees.totaux.nb_encours} en cours`}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'end' }}>
          <Filtre libelle="Du"><input type="date" value={depuis}
            onChange={(e) => { setDepuis(e.target.value); setPage(1) }} style={champ} /></Filtre>
          <Filtre libelle="Au"><input type="date" value={jusqua}
            onChange={(e) => { setJusqua(e.target.value); setPage(1) }} style={champ} /></Filtre>
          <Filtre libelle="Statut">
            <select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1) }} style={champ}>
              <option value="tous">Tous</option>
              <option value="succes">Reçus</option>
              <option value="en_cours">En cours</option>
              <option value="echec">Échoués</option>
            </select>
          </Filtre>
          <button onClick={() => exporter('pdf')}
            disabled={!donnees?.transactions.length || exportEnCours !== null}
            style={boutonExport(!donnees?.transactions.length || exportEnCours !== null)}>
            {exportEnCours === 'pdf' ? 'Préparation…' : 'Exporter en PDF'}
          </button>
          <button onClick={() => exporter('csv')}
            disabled={!donnees?.transactions.length || exportEnCours !== null}
            style={boutonExport(!donnees?.transactions.length || exportEnCours !== null)}>
            {exportEnCours === 'csv' ? 'Préparation…' : 'Exporter en CSV'}
          </button>
        </div>

        {erreur && <p style={{ color: P.erreur, fontWeight: 600 }}>{erreur}</p>}
        {enCours && <p style={{ color: P.ardoise }}>Chargement…</p>}

        {donnees && !enCours && donnees.transactions.length === 0 && (
          <p style={{ color: P.ardoise }}>Aucun paiement sur cette période.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {donnees?.transactions.map((t) => <Ligne key={t.trans_id} t={t} />)}
        </div>

        {donnees && donnees.pagination.pages > 1 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={donnees.pagination.page <= 1} style={pagination}>Précédent</button>
            <span style={{ color: P.ardoise, fontSize: 14, alignSelf: 'center' }}>
              {donnees.pagination.page} / {donnees.pagination.pages}
            </span>
            <button onClick={() => setPage((p) => p + 1)}
              disabled={donnees.pagination.page >= donnees.pagination.pages} style={pagination}>Suivant</button>
          </div>
        )}
      </main>
    </div>
  )
}

function Ligne({ t }: { t: Transaction }) {
  const st = STATUTS[t.statut] ?? { libelle: t.statut, couleur: P.gris }
  return (
    <div style={{
      background: P.carte, border: `1px solid ${P.brume}`, borderRadius: 14,
      padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: P.encre }}>
          {montant(t.montant)} FCFA
          <span style={{ color: st.couleur, fontSize: 12, fontWeight: 700, marginLeft: 8 }}>
            {st.libelle}
          </span>
        </div>
        <div style={{ color: P.ardoise, fontSize: 13, overflowWrap: 'anywhere' }}>
          {t.date} · {t.etablissement}
        </div>
        <div style={{ color: P.gris, fontSize: 12, overflowWrap: 'anywhere' }}>
          {t.reference} · {t.payeur} · {t.cagnotte}
        </div>
      </div>
      {/* Le reçu n'existe que pour un paiement abouti : le serveur ne renvoie
          l'adresse que dans ce cas, l'interface n'a rien à décider. */}
      {t.recu_url && (
        <a href={t.recu_url} target="_blank" rel="noopener noreferrer"
          style={{ color: P.primary, fontWeight: 700, fontSize: 13, textDecoration: 'none', flexShrink: 0 }}>
          Reçu →
        </a>
      )}
    </div>
  )
}

function Filtre({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: P.ardoise }}>{libelle}</span>
      {children}
    </label>
  )
}

const champ: React.CSSProperties = {
  padding: '9px 11px', fontSize: 14, color: P.encre, background: P.carte,
  border: `1.5px solid ${P.brume}`, borderRadius: 11, outline: 'none',
}

function boutonExport(desactive: boolean): React.CSSProperties {
  return {
    padding: '10px 14px', borderRadius: 11, fontWeight: 700, fontSize: 14,
    border: `1.5px solid ${P.primary}`, background: 'none', color: P.primary,
    cursor: desactive ? 'default' : 'pointer',
    opacity: desactive ? 0.4 : 1,
  }
}

const pagination: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${P.brume}`,
  background: P.carte, color: P.encre, fontWeight: 600, cursor: 'pointer',
}
