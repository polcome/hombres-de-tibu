// KINGS: torneig de futsal (no és dels Tibus, però hi juguen molts). De moment, pantalla de "properament".
const TEASERS: [string, string][] = [
  ['⚽', 'Pachangues: qui hi va, gols, assistències i qui guanya'],
  ['⭐', 'Notes dels companys de l\'1 al 10 després de cada partit'],
  ['📊', 'Stats pròpies i rànquing dels Tibus de la Kings'],
  ['🃏', 'Carta Kings i cartes noves per guanyar'],
  ['🔒', 'Cartes ocultes només per als més cracks'],
  ['🎯', 'Draft i el gran dia de la competició'],
]

export default function Kings() {
  return (
    <div className="kings">
      <div className="kings-glow" />
      <div className="kings-crown">👑</div>
      <h1 className="kings-title">KINGS</h1>
      <div className="kings-sub">Torneig de futsal · Els Tibus de la Kings</div>
      <div className="kings-soon">PROPERAMENT…</div>
      <ul className="kings-list">
        {TEASERS.map(([e, t], i) => (
          <li key={t} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
            <span>{e}</span> {t}
          </li>
        ))}
      </ul>
      <p className="muted small center">Aneu escalfant les cames. 🦵</p>
    </div>
  )
}
