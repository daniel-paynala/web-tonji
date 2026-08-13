import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/tokens'
import { useMobile } from '@/hooks/useMobile'
import MobilePostCreationTontine from '@/pages/mobile/MobilePostCreationTontine'
import { chargerCagnotte, type CagnotteDetail } from '@/lib/cagnottesApi'
import { urlRejoindre, waRejoindre } from '@/lib/deeplink'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// ─────────────────────────────────────────────────────────────────────────────
// PostCreationTontinePage (desktop) — écran de confirmation après création de
// tontine. Même contenu et mêmes actions que MobilePostCreationTontine (numéro
// de tontine, partage du lien d'invitation App/WhatsApp, enregistrement des
// membres), présenté en panneau centré desktop avec une modale d'invitation.
// ─────────────────────────────────────────────────────────────────────────────

// ── Icônes ───────────────────────────────────────────────────────────────────
const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
)
const IconCheckSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const IconLink = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
)
const IconGroupAdd = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
)
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
)
const IconChat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
)
const IconChevron = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
)
const IconCloseModal = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

// ── Carte action ─────────────────────────────────────────────────────────────
function CarteAction({ icon, titre, sous, filled, onClick }: {
  icon: React.ReactNode; titre: string; sous: string; filled: boolean; onClick: () => void
}) {
  const bg = filled ? T.primary : T.surfaceEl
  const fg = filled ? T.surfaceEl : T.textStrong
  const iconBg = filled ? 'rgba(255,255,255,0.20)' : 'rgba(10,104,71,0.08)'
  const iconFg = filled ? T.surfaceEl : T.primary
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left transition-transform hover:-translate-y-0.5"
      style={{ background: bg, border: filled ? 'none' : `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconFg }}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[15px] font-bold" style={{ color: fg }}>{titre}</p>
        <p className="text-[13px] leading-snug mt-0.5" style={{ color: filled ? 'rgba(255,255,255,0.70)' : T.textSec }}>{sous}</p>
      </div>
      <span style={{ color: filled ? 'rgba(255,255,255,0.50)' : T.textTert }}><IconArrow /></span>
    </button>
  )
}

// ── Tuile de canal d'invitation ───────────────────────────────────────────────
function OptionTuile({ icon, iconColor, titre, sous, onClick }: {
  icon: React.ReactNode; iconColor: string; titre: string; sous: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left transition-colors"
      style={{ background: T.surface, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${iconColor}1F`, color: iconColor }}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[15px] font-bold" style={{ color: T.textStrong }}>{titre}</p>
        <p className="text-[13px] leading-snug mt-0.5" style={{ color: T.textSec }}>{sous}</p>
      </div>
      <span style={{ color: T.textTert }}><IconChevron /></span>
    </button>
  )
}

export default function PostCreationTontinePage() {
  const isMobile = useMobile()

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cagnotte, setCagnotte] = useState<CagnotteDetail | null>(null)
  const [erreur, setErreur] = useState('')
  const [copied, setCopied] = useState(false)
  const [modaleOuverte, setModaleOuverte] = useState(false)

  useEffect(() => {
    if (!id) return
    chargerCagnotte(id)
      .then(c => c ? setCagnotte(c) : setErreur('Cagnotte introuvable'))
      .catch(e => setErreur(`${e}`))
  }, [id])

  const copierCode = async () => {
    const txt = cagnotte?.id ?? id ?? ''
    try { await navigator.clipboard.writeText(txt) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const partagerLienApp = () => {
    if (!cagnotte) return
    const lien = urlRejoindre(cagnotte.id)
    const texte = `Je t'invite à rejoindre la tontine « ${cagnotte.titre} » (réf. ${cagnotte.id}) sur Tonji.\n\n📱 ${lien}`
    setModaleOuverte(false)
    if (navigator.share) navigator.share({ title: `Invitation Tonji — ${cagnotte.titre}`, text: texte }).catch(() => {})
    else navigator.clipboard.writeText(texte).catch(() => {})
  }

  const partagerLienWhatsApp = () => {
    if (!cagnotte) return
    const waLien = waRejoindre(cagnotte.id)
    setModaleOuverte(false)
    if (!waLien) return
    const texte = `Je t'invite à rejoindre la tontine « ${cagnotte.titre} » sur Tonji.\n\n💬 ${waLien}`
    if (navigator.share) navigator.share({ title: `Invitation Tonji — ${cagnotte.titre}`, text: texte }).catch(() => {})
    else window.open(waLien, '_blank')
  }

  if (isMobile) return <MobilePostCreationTontine />

  // ── Chargement ───────────────────────────────────────────────────────────────
  if (!cagnotte && !erreur) {
    return (
      <div className="max-w-lg mx-auto flex justify-center py-24">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: `3px solid ${T.primary}`, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── Erreur ───────────────────────────────────────────────────────────────────
  if (erreur) {
    return (
      <div className="max-w-lg mx-auto">
        <Card elevated className="flex flex-col items-center text-center py-10 px-8">
          <p className="text-base mb-4" style={{ color: T.textStrong }}>{erreur}</p>
          <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>Retour à l'accueil</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}>

        {/* Badge succès + titre */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(10,104,71,0.12)', border: '2px solid rgba(10,104,71,0.30)' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          </motion.div>
          <h1 className="mt-5 font-display font-extrabold text-3xl tracking-tight" style={{ color: T.textStrong }}>Tontine créée !</h1>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: T.textSec }}>
            «&nbsp;{cagnotte?.titre}&nbsp;» est prête à accueillir ses membres.
          </p>
        </div>

        {/* Carte NUMÉRO DE TONTINE (or) */}
        <Card elevated className="mt-7 text-center" style={{ boxShadow: '0 4px 16px rgba(232,168,48,0.10)' }}>
          <p className="text-[11px] font-bold tracking-[1.4px]" style={{ color: T.textTert }}>NUMÉRO DE TONTINE</p>
          <p className="mt-3 text-[40px] font-extrabold leading-none font-mono" style={{ color: T.accent }}>{cagnotte?.id ?? id}</p>
          <p className="mt-2 text-[13px] leading-snug" style={{ color: T.textSec }}>
            Partagez ce numéro pour que vos membres rejoignent la tontine.
          </p>
          <button
            onClick={copierCode}
            className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: copied ? T.accent : 'rgba(232,168,48,0.12)', color: copied ? T.surfaceEl : T.accent, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {copied ? <IconCheckSmall /> : <IconCopy />}
            {copied ? 'Copié !' : 'Copier le numéro'}
          </button>
        </Card>

        {/* Actions */}
        <p className="mt-7 mb-3 pl-1 text-[11px] font-bold uppercase tracking-[1.4px]" style={{ color: T.textTert }}>
          Comment voulez-vous continuer ?
        </p>
        <div className="flex flex-col gap-3">
          <CarteAction
            icon={<IconLink />}
            titre="Partager le lien d'invitation"
            sous="Chaque personne s'inscrit elle-même via un mini-formulaire."
            filled
            onClick={() => setModaleOuverte(true)}
          />
          <CarteAction
            icon={<IconGroupAdd />}
            titre="Enregistrer les membres"
            sous="Ajoutez vous-même chaque membre, un à un ou par lot."
            filled={false}
            onClick={() => navigate(`/cagnottes/${cagnotte?.id ?? id}/participants`, {
              state: { titre: cagnotte?.titre, type: 'tontine_periodique', max: cagnotte?.nombreParticipants, inscrits: cagnotte?.nombreInscrits },
            })}
          />
        </div>

        {/* Plus tard */}
        <div className="text-center mt-8">
          <button onClick={() => navigate('/dashboard')} className="text-[15px] font-semibold px-4 py-3" style={{ color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Plus tard
          </button>
        </div>
      </motion.div>

      {/* ── Modale « Inviter via… » ─────────────────────────────────────────── */}
      <AnimatePresence>
        {modaleOuverte && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(20,32,46,0.45)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModaleOuverte(false)}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6"
              style={{ background: T.surfaceEl }}
              initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="flex items-center justify-between mb-5">
                <p className="text-[17px] font-bold" style={{ color: T.textStrong }}>Inviter via…</p>
                <button onClick={() => setModaleOuverte(false)} className="p-1 flex" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textTert }}>
                  <IconCloseModal />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <OptionTuile icon={<IconLink />} iconColor={T.primary} titre="Application / Web" sous="Lien valable sur iOS, Android et navigateur" onClick={partagerLienApp} />
                <OptionTuile icon={<IconChat />} iconColor="#25D366" titre="WhatsApp" sous="Ouvre WhatsApp avec le bot Tonji pré-rempli" onClick={partagerLienWhatsApp} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
