import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { CARD_DEFS, STAT_LABELS, cardKey, displayName, featuredCard, memberById, photoFor, rating, unlockedCards } from '../logic/stats'
import { FifaCard } from '../components/FifaCard'
import { Section } from '../components/ui'

export default function Cards() {
  const { db } = useStore()
  const [tab, setTab] = useState<'squad' | 'collection' | 'how'>('squad')
  const unlocks = unlockedCards(db)
  const squad = db.members
    .filter((m) => m.active)
    .map((m) => ({ m, r: rating(db, m.id), f: featuredCard(db, m, unlocks) }))
    .sort((a, b) => b.r.overall + b.f.boost - (a.r.overall + a.f.boost))

  return (
    <div className="stack">
      <div className="tabs">
        <button className={tab === 'squad' ? 'on' : ''} onClick={() => setTab('squad')}>
          Plantilla
        </button>
        <button className={tab === 'collection' ? 'on' : ''} onClick={() => setTab('collection')}>
          Col·lecció ({new Set(unlocks.map((u) => u.def.id)).size}/{CARD_DEFS.length})
        </button>
        <button className={tab === 'how' ? 'on' : ''} onClick={() => setTab('how')}>
          Com funciona
        </button>
      </div>

      {tab === 'squad' && (
        <div className="cards-grid">
          {squad.map(({ m, r, f }) => (
            <Link key={m.id} to={`/jugador/${m.slug}`}>
              <FifaCard member={m} rating={r} variant={f.variant} boost={f.boost} label={f.label} title={f.title} size="sm" photo={photoFor(db, m, f.key)} />
            </Link>
          ))}
        </div>
      )}

      {tab === 'collection' && (
        <div className="stack">
          {CARD_DEFS.map((def) => {
            const got = unlocks.filter((u) => u.def.id === def.id)
            return (
              <Section
                key={def.id}
                title={
                  <>
                    {def.emoji} {def.name} <span className={`rarity rarity-${def.rarity}`}>{def.rarity}</span>
                  </>
                }
              >
                <p className="muted small">
                  {def.how} {def.boost !== 0 && <b>({def.boost > 0 ? '+' : ''}{def.boost} a la mitjana)</b>}
                </p>
                {got.length === 0 ? (
                  <div className="locked-card">
                    <span>🔒</span>
                    <small>Ningú l'ha aconseguit encara</small>
                  </div>
                ) : (
                  <div className="cards-row scroll">
                    {got.map((u) => {
                      const m = memberById(db, u.memberId)!
                      return (
                        <Link key={u.memberId + u.sortKey} to={`/jugador/${m.slug}`}>
                          <FifaCard
                            member={m}
                            rating={rating(db, m.id, u.sortKey.length === 7 ? u.sortKey : undefined)}
                            variant={def.variant}
                            boost={def.boost}
                            label={u.label}
                            title={def.name}
                            emoji={def.emoji}
                            size="sm"
                            photo={photoFor(db, m, cardKey(u))}
                          />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </Section>
            )
          })}
        </div>
      )}

      {tab === 'how' && (
        <Section title="Com es calcula la mitjana">
          <p>Cada carta té 6 estadístiques (de 20 a 99) que s'actualitzen soles cada mes:</p>
          <ul className="how">
            {STAT_LABELS.map(([k, l, d]) => (
              <li key={k}>
                <b>{l}</b> · {d}
              </li>
            ))}
          </ul>
          <p>
            <b>Mitjana</b> = 30% ENT + 10% FOR + 20% MVP + 20% COM + 10% VOT + 10% CAR.
          </p>
          <ul className="how">
            <li>🥉 Bronze: menys de 65</li>
            <li>🥈 Plata: de 65 a 74</li>
            <li>🥇 Or: 75 o més (sense MVPs és gairebé impossible)</li>
          </ul>
          <p>
            Les <b>cartes especials</b> (TOTM, Icona, Pilota d'Or…) només es desbloquegen complint reptes i sumen (o resten) punts a la mitjana. Mira-les
            a la pestanya Col·lecció.
          </p>
          <p className="muted small">Líder actual: {squad[0] ? `${displayName(squad[0].m)} (${squad[0].r.overall + squad[0].f.boost})` : '-'}</p>
        </Section>
      )}
    </div>
  )
}
