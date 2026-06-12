import { useState } from "react";

const COLORS = {
  forest: "#0A6847",
  forestLight: "#0D7C5F",
  forestDark: "#064D34",
  gold: "#E8A830",
  goldLight: "#F5D078",
  goldDark: "#C48A1A",
  coral: "#D94F3D",
  coralLight: "#E8715F",
  ink: "#14202E",
  slate: "#4A5568",
  mist: "#E8EDE9",
  ivory: "#F6F7F4",
  white: "#FFFFFF",
};

const sections = ["Histoire", "Couleurs", "Typographie", "Logo", "Voix", "Application"];

function ColorSwatch({ name, hex, desc, dark }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 140px", minWidth: 140 }}>
      <div
        style={{
          background: hex,
          borderRadius: 12,
          height: 80,
          display: "flex",
          alignItems: "flex-end",
          padding: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: dark ? "#fff" : COLORS.ink, opacity: 0.9 }}>
          {hex}
        </span>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.ink }}>{name}</div>
        <div style={{ fontSize: 11, color: COLORS.slate, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}

function LogoConcept({ title, desc, children }) {
  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 16,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        flex: "1 1 280px",
        minWidth: 260,
      }}
    >
      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.ink, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: COLORS.slate, lineHeight: 1.5, maxWidth: 240 }}>{desc}</div>
      </div>
    </div>
  );
}

function AppMockup() {
  return (
    <div
      style={{
        width: 220,
        height: 440,
        background: COLORS.ivory,
        borderRadius: 28,
        border: `3px solid ${COLORS.ink}`,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        flexShrink: 0,
      }}
    >
      <div style={{ background: COLORS.forest, padding: "8px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#fff", fontSize: 10, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 12, height: 8, background: "rgba(255,255,255,0.5)", borderRadius: 2 }} />
          <div style={{ width: 8, height: 8, background: "rgba(255,255,255,0.5)", borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ background: COLORS.forest, padding: "12px 16px 20px" }}>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginBottom: 2 }}>Bonjour Mapenda</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke={COLORS.gold} strokeWidth="2" fill="none" />
            <circle cx="16" cy="16" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
            <circle cx="16" cy="16" r="2.5" fill={COLORS.gold} />
          </svg>
          <span style={{ color: "#fff", fontSize: 17, fontWeight: 800, fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: -0.3 }}>
            Tonji
          </span>
        </div>
      </div>
      <div style={{ padding: "0 14px", marginTop: -12 }}>
        <div
          style={{
            background: COLORS.gold,
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "0 3px 10px rgba(232,168,48,0.3)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke={COLORS.ink} strokeWidth="1.5" />
            <line x1="8" y1="4.5" x2="8" y2="11.5" stroke={COLORS.ink} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="4.5" y1="8" x2="11.5" y2="8" stroke={COLORS.ink} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 12, color: COLORS.ink }}>Nouvelle tontine</span>
        </div>
      </div>
      <div style={{ padding: "14px 14px 8px" }}>
        <div style={{ fontSize: 10, color: COLORS.slate, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Mes tontines
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink }}>Tontine Famille</div>
              <div style={{ fontSize: 9, color: COLORS.slate, marginTop: 2 }}>8/10 membres · Mensuelle</div>
            </div>
            <div
              style={{
                background: COLORS.mist,
                borderRadius: 6,
                padding: "3px 6px",
                fontSize: 8,
                fontWeight: 600,
                color: COLORS.forest,
              }}
            >
              Tour 3/10
            </div>
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.forest, fontFamily: "'JetBrains Mono', monospace" }}>
              80 000 <span style={{ fontSize: 9, fontWeight: 500 }}>FCFA</span>
            </div>
            <div style={{ width: 50, height: 4, background: COLORS.mist, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "80%", height: "100%", background: COLORS.forest, borderRadius: 2 }} />
            </div>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink }}>Anniv. Maman</div>
              <div style={{ fontSize: 9, color: COLORS.slate, marginTop: 2 }}>15 contributeurs</div>
            </div>
            <div
              style={{
                background: "#FFF3E0",
                borderRadius: 6,
                padding: "3px 6px",
                fontSize: 8,
                fontWeight: 600,
                color: COLORS.goldDark,
              }}
            >
              Cagnotte
            </div>
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.forest, fontFamily: "'JetBrains Mono', monospace" }}>
              125 500 <span style={{ fontSize: 9, fontWeight: 500 }}>FCFA</span>
            </div>
            <div style={{ fontSize: 9, color: COLORS.coral, fontWeight: 600 }}>J-5</div>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink }}>Cotisation Bureau</div>
              <div style={{ fontSize: 9, color: COLORS.slate, marginTop: 2 }}>5 membres · Hebdo</div>
            </div>
            <div style={{ background: COLORS.mist, borderRadius: 6, padding: "3px 6px", fontSize: 8, fontWeight: 600, color: COLORS.forest }}>
              Tour 2/5
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.forest, fontFamily: "'JetBrains Mono', monospace" }}>
              25 000 <span style={{ fontSize: 9, fontWeight: 500 }}>FCFA</span>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: `1px solid ${COLORS.mist}`,
          padding: "8px 0 14px",
          display: "flex",
          justifyContent: "space-around",
        }}
      >
        {["Accueil", "Historique", "Profil"].map((label, i) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: i === 0 ? 4 : 10,
                background: i === 0 ? COLORS.forest : "transparent",
                border: i === 0 ? "none" : `1.5px solid ${COLORS.slate}`,
                margin: "0 auto 3px",
                opacity: i === 0 ? 1 : 0.4,
              }}
            />
            <span style={{ fontSize: 8, color: i === 0 ? COLORS.forest : COLORS.slate, fontWeight: i === 0 ? 700 : 400 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TonjiBrandBoard() {
  const [activeSection, setActiveSection] = useState(0);

  return (
    <div style={{ background: COLORS.ivory, minHeight: "100vh", fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: COLORS.ink, padding: "40px 32px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="16" fill={COLORS.forest} />
              <circle cx="18" cy="18" r="9" stroke={COLORS.gold} strokeWidth="2" fill="none" strokeDasharray="5 3" />
              <circle cx="18" cy="18" r="3.5" fill={COLORS.gold} />
            </svg>
            <span style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
              Ton<span style={{ color: COLORS.gold }}>ji</span>
            </span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0, maxWidth: 400 }}>
            Brand Identity Guide — Version 1.0
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.mist}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            gap: 0,
            overflowX: "auto",
            padding: "0 32px",
          }}
        >
          {sections.map((s, i) => (
            <button
              key={s}
              onClick={() => setActiveSection(i)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeSection === i ? `2px solid ${COLORS.forest}` : "2px solid transparent",
                padding: "14px 16px",
                fontSize: 13,
                fontWeight: activeSection === i ? 700 : 400,
                color: activeSection === i ? COLORS.forest : COLORS.slate,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px 60px" }}>

        {/* HISTOIRE */}
        {activeSection === 0 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink, marginBottom: 6, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              L'histoire de Tonji
            </h2>
            <p style={{ color: COLORS.slate, fontSize: 14, lineHeight: 1.7, maxWidth: 640, marginBottom: 28 }}>
              Tonji porte en lui l'écho de la <em>tontine</em> — cette tradition centenaire où des proches mettent en commun pour s'entraider tour à tour. Le nom ne le dit pas frontalement, il l'évoque. C'est la tontine réinventée pour l'ère du mobile : plus rapide, plus sûre, plus simple. Deux syllabes, un ancrage culturel, une promesse de modernité.
            </p>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 32 }}>
              {[
                { label: "Positionnement", text: "La plateforme de confiance pour les tontines et cagnottes au Gabon — la tradition, version digitale." },
                { label: "Promesse", text: "Cotisez en un geste. Recevez 100%. Zéro surprise, zéro complication." },
                { label: "Personnalité", text: "L'assurance d'un système éprouvé, la fluidité d'une app moderne, la chaleur d'un cercle de confiance." },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    flex: "1 1 240px",
                    background: COLORS.white,
                    borderRadius: 14,
                    padding: 22,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    borderLeft: `3px solid ${COLORS.forest}`,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.6 }}>{item.text}</div>
                </div>
              ))}
            </div>

            <div style={{ background: COLORS.forest, borderRadius: 16, padding: 28, color: "#fff" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6, marginBottom: 12 }}>
                Taglines
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.3, fontFamily: "'DM Serif Display', Georgia, serif" }}>
                La tontine, réinventée.
              </div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 12, lineHeight: 1.6 }}>
                Variantes : "Cotisons ensemble." · "Votre cercle de confiance." · "Ensemble, c'est plus simple."
              </div>
            </div>
          </div>
        )}

        {/* COULEURS */}
        {activeSection === 1 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink, marginBottom: 6, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Palette de couleurs
            </h2>
            <p style={{ color: COLORS.slate, fontSize: 14, lineHeight: 1.7, maxWidth: 580, marginBottom: 28 }}>
              Deux couleurs portent la marque : le vert forêt pour la confiance et l'enracinement gabonais, l'or pour la valeur et la prospérité. Le corail intervient uniquement pour les actions urgentes et les alertes.
            </p>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                Couleurs principales
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorSwatch name="Forêt" hex="#0A6847" desc="Couleur principale. Confiance, ancrage gabonais, croissance." dark />
                <ColorSwatch name="Or" hex="#E8A830" desc="Secondaire. Valeur, prospérité, chaleur humaine." />
                <ColorSwatch name="Corail" hex="#D94F3D" desc="Accent. Boutons d'action, alertes, retards." dark />
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                Neutres
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <ColorSwatch name="Encre" hex="#14202E" desc="Texte principal, titres." dark />
                <ColorSwatch name="Ardoise" hex="#4A5568" desc="Texte secondaire, descriptions." dark />
                <ColorSwatch name="Brume" hex="#E8EDE9" desc="Bordures, séparateurs, fonds légers." />
                <ColorSwatch name="Ivoire" hex="#F6F7F4" desc="Fond d'écran principal de l'app." />
              </div>
            </div>

            <div style={{ background: COLORS.white, borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Règles d'usage
              </div>
              <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.7 }}>
                Le vert Forêt est toujours dominant — il représente Tonji. L'Or ne dépasse jamais 30% de la surface visible et sert à mettre en valeur les actions clés (bouton de création, montants reçus). Le Corail est strictement réservé aux boutons d'action secondaires, badges de retard de paiement et notifications d'erreur — jamais en fond plein. Sur fond sombre, le texte passe en blanc pur. Les montants en FCFA sont toujours en Forêt ou en Encre, jamais en couleur d'accent.
              </div>
            </div>
          </div>
        )}

        {/* TYPOGRAPHIE */}
        {activeSection === 2 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink, marginBottom: 6, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Typographie
            </h2>
            <p style={{ color: COLORS.slate, fontSize: 14, lineHeight: 1.7, maxWidth: 580, marginBottom: 28 }}>
              Deux familles suffisent. Un serif d'affichage pour les moments de marque, un sans-serif pour tout le contenu de l'interface. Les montants financiers utilisent une police mono pour aligner les chiffres proprement.
            </p>

            <div style={{ background: COLORS.white, borderRadius: 14, padding: 28, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Affichage — DM Serif Display
                  </div>
                  <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 36, color: COLORS.ink, lineHeight: 1.2 }}>
                    La tontine, réinventée.
                  </div>
                </div>
                <div style={{ fontSize: 11, color: COLORS.slate, lineHeight: 1.6, maxWidth: 200 }}>
                  Titres de pages, taglines, moments de marque. Utilisé avec parcimonie pour garder tout son impact.
                </div>
              </div>
            </div>

            <div style={{ background: COLORS.white, borderRadius: 14, padding: 28, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Corps — Inter
                  </div>
                  <div style={{ fontSize: 15, color: COLORS.ink, lineHeight: 1.6, maxWidth: 400 }}>
                    <span style={{ fontWeight: 400 }}>Regular 400 — </span>
                    Votre tontine a été créée. Partagez le lien d'invitation à vos membres.
                  </div>
                  <div style={{ fontSize: 15, color: COLORS.ink, lineHeight: 1.6, marginTop: 8 }}>
                    <span style={{ fontWeight: 600 }}>Semibold 600 — </span>
                    <span style={{ fontWeight: 600 }}>C'est le tour de Marie ce mois-ci !</span>
                  </div>
                  <div style={{ fontSize: 15, color: COLORS.ink, lineHeight: 1.6, marginTop: 8 }}>
                    <span style={{ fontWeight: 700 }}>Bold 700 — </span>
                    <span style={{ fontWeight: 700 }}>Nouvelle tontine</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: COLORS.slate, lineHeight: 1.6, maxWidth: 200 }}>
                  Tout le contenu de l'app : labels, descriptions, boutons, messages. Poids 400 par défaut, 600 pour l'emphase, 700 pour les boutons.
                </div>
              </div>
            </div>

            <div style={{ background: COLORS.white, borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Montants — JetBrains Mono
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontSize: 32, color: COLORS.forest, fontWeight: 700 }}>
                    125 500 <span style={{ fontSize: 14, fontWeight: 400, color: COLORS.slate }}>FCFA</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: COLORS.slate, lineHeight: 1.6, maxWidth: 200 }}>
                  Exclusivement pour les montants financiers. Le mono aligne les chiffres et renforce la lisibilité des sommes.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOGO */}
        {activeSection === 3 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink, marginBottom: 6, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Directions de logo
            </h2>
            <p style={{ color: COLORS.slate, fontSize: 14, lineHeight: 1.7, maxWidth: 580, marginBottom: 28 }}>
              Trois pistes à explorer avec un designer. Le logo doit fonctionner à 16px (icône app) comme en grand, en couleur comme en monochrome. Le motif du cercle — rotation de la tontine, cercle de confiance — est le fil conducteur.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              <LogoConcept
                title="Piste 1 — Le Cercle"
                desc="Cercle brisé en segments comme les tours d'une tontine. Un point doré marque le bénéficiaire du tour en cours. Évoque la rotation et la progression."
              >
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <path d="M40 6 A34 34 0 0 1 74 40" stroke={COLORS.forest} strokeWidth="4" strokeLinecap="round" />
                  <path d="M74 40 A34 34 0 0 1 40 74" stroke={COLORS.forest} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                  <path d="M40 74 A34 34 0 0 1 6 40" stroke={COLORS.forest} strokeWidth="4" strokeLinecap="round" opacity="0.35" />
                  <path d="M6 40 A34 34 0 0 1 40 6" stroke={COLORS.forest} strokeWidth="4" strokeLinecap="round" opacity="0.15" />
                  <circle cx="40" cy="6" r="5" fill={COLORS.gold} />
                </svg>
              </LogoConcept>

              <LogoConcept
                title="Piste 2 — Wordmark"
                desc="Le mot Tonji avec le 'j' prolongé en arc de cercle sous le mot, formant un trait qui unit les lettres — comme le lien entre les membres."
              >
                <div style={{ position: "relative" }}>
                  <span style={{ fontSize: 34, fontWeight: 800, color: COLORS.forest, letterSpacing: -1 }}>
                    Ton<span style={{ color: COLORS.gold }}>ji</span>
                  </span>
                  <svg width="90" height="12" viewBox="0 0 90 12" fill="none" style={{ display: "block", marginTop: -4, marginLeft: 2 }}>
                    <path d="M5 2 Q45 14 85 2" stroke={COLORS.gold} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
              </LogoConcept>

              <LogoConcept
                title="Piste 3 — Monogramme T"
                desc="Un T inscrit dans un cercle. La barre du T est un arc qui épouse la courbe du cercle — tradition (le cercle) et modernité (la géométrie nette)."
              >
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="4" y="4" width="72" height="72" rx="18" fill={COLORS.forest} />
                  <line x1="40" y1="28" x2="40" y2="58" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
                  <path d="M24 28 Q40 22 56 28" stroke={COLORS.gold} strokeWidth="4" strokeLinecap="round" fill="none" />
                  <circle cx="24" cy="28" r="3" fill={COLORS.gold} />
                  <circle cx="56" cy="28" r="3" fill={COLORS.gold} />
                </svg>
              </LogoConcept>
            </div>

            <div style={{ background: COLORS.ink, borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Contraintes techniques
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
                L'icône app (1024×1024 natif) doit être lisible à 48×48px. Prévoir une version monochrome pour le filigrane sur les reçus de paiement. Le logo complet (icône + wordmark) et l'icône seule doivent être déclinés sur fond clair, fond sombre et fond vert. Pas de dégradés complexes — l'icône sera aussi utilisée dans les visuels WhatsApp en basse résolution et en USSD sous forme de texte.
              </div>
            </div>
          </div>
        )}

        {/* VOIX */}
        {activeSection === 4 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink, marginBottom: 6, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Voix et ton
            </h2>
            <p style={{ color: COLORS.slate, fontSize: 14, lineHeight: 1.7, maxWidth: 580, marginBottom: 28 }}>
              Tonji parle comme le membre le plus organisé de votre tontine — celui en qui tout le monde a confiance. Direct, chaleureux, jamais bureaucratique.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              {[
                {
                  title: "Direct, pas bureaucratique",
                  good: "Ibrahim a cotisé. Il reste 2 membres.",
                  bad: "La cotisation de M. Ibrahim a été enregistrée avec succès dans le système.",
                },
                {
                  title: "Rassurant, pas anxiogène",
                  good: "Le montant sera versé sur le numéro enregistré à la création.",
                  bad: "ATTENTION : le numéro de retrait ne pourra plus être modifié !",
                },
                {
                  title: "Humain, pas robotique",
                  good: "C'est le tour de Marie ce mois-ci !",
                  bad: "Le bénéficiaire du cycle en cours est : NGUEMA Marie.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    flex: "1 1 260px",
                    background: COLORS.white,
                    borderRadius: 14,
                    padding: 22,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.ink, marginBottom: 14 }}>{item.title}</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ color: COLORS.forest, fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.forest }}>OUI</span>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.ink, lineHeight: 1.5, background: COLORS.mist, padding: "8px 10px", borderRadius: 8 }}>
                      {item.good}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ color: COLORS.coral, fontSize: 14 }}>✗</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.coral }}>NON</span>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.slate, lineHeight: 1.5, background: "#FFF5F5", padding: "8px 10px", borderRadius: 8 }}>
                      {item.bad}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: COLORS.white, borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Vocabulaire Tonji
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12, color: COLORS.ink, lineHeight: 1.8 }}>
                <div style={{ flex: "1 1 200px" }}>
                  <div><span style={{ fontWeight: 600 }}>Cotiser</span> (jamais "payer")</div>
                  <div><span style={{ fontWeight: 600 }}>Membre</span> (jamais "utilisateur")</div>
                  <div><span style={{ fontWeight: 600 }}>Tour</span> (jamais "cycle")</div>
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <div><span style={{ fontWeight: 600 }}>Cagnotte</span> (jamais "pot" ou "pool")</div>
                  <div><span style={{ fontWeight: 600 }}>Créateur</span> (jamais "administrateur")</div>
                  <div><span style={{ fontWeight: 600 }}>Frais</span> (jamais "commission")</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APPLICATION */}
        {activeSection === 5 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.ink, marginBottom: 6, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Application
            </h2>
            <p style={{ color: COLORS.slate, fontSize: 14, lineHeight: 1.7, maxWidth: 580, marginBottom: 28 }}>
              Aperçu de l'identité Tonji appliquée à l'écran d'accueil. Le vert forêt ancre le header, l'or marque le CTA principal, les cartes blanches assurent la lisibilité des montants.
            </p>

            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
              <AppMockup />
              <div style={{ flex: "1 1 300px", minWidth: 260 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.forest, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                  Principes d'interface
                </div>
                {[
                  { title: "Montants toujours visibles", desc: "Le solde de chaque cagnotte est la première info que l'œil doit trouver. Police mono, taille généreuse, couleur Forêt." },
                  { title: "Un seul CTA par écran", desc: "Sur l'accueil : 'Nouvelle tontine'. Dans une tontine : 'Cotiser'. Jamais deux actions primaires en concurrence." },
                  { title: "Badges de statut clairs", desc: "Vert = tontine active (avec numéro de tour). Or = cagnotte ouverte. Corail = retard de paiement. Pas de codes ambigus." },
                  { title: "Navigation minimale", desc: "Trois onglets : Accueil, Historique, Profil. Le créateur gère sa tontine depuis la carte, pas depuis un menu séparé." },
                  { title: "Vocabulaire Tonji partout", desc: "'Tour' au lieu de 'Cycle'. 'Membre' au lieu de 'Utilisateur'. 'Cotiser' au lieu de 'Payer'. La voix de marque vit dans chaque label." },
                  { title: "Optimisé pour le partage", desc: "Chaque tontine génère une carte Open Graph (nom + montant + lien) pour un rendu propre quand le lien est partagé sur WhatsApp." },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.ink, marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: COLORS.slate, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
