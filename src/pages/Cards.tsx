import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import {
  ACHIEVEMENT_FOR_BONUS,
  CARD_DEFS,
  STAT_LABELS,
  WEIGHTS,
  cardKey,
  displayName,
  featuredCard,
  photoFor,
  rating,
  unlockedCards,
  type Rating,
} from '../logic/stats'
import type { AchievementKind, Member } from '../types'

// Carta "misteriosa" per ensenyar el disseny de les que ningú té
const MYSTERY: Member = { id: 'mystery', slug: 'mystery', name: '???', nickname: null, photo_url: null, is_admin: false, active: true }
const MYSTERY_RATING: Rating = { overall: 0, ent: 0, fora: 0, mvp: 0, com: 0, tier: 'bronze' }
import { FifaCard } from '../components/FifaCard'
import { CardZoom, unlockProps } from '../components/CardZoom'
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
          <p className="muted small center">Toca una carta per veure-la en gran.</p>
          {[
            { title: '⚙️ Automàtiques', sub: "Es desbloquegen soles quan es compleix el repte.", defs: CARD_DEFS.filter((d) => d.auto) },
            { title: '🏅 Èxits esportius', sub: "Manuals: l'admin les dona a qui ho aconsegueix. Pugen FOR durant 12 mesos.", defs: CARD_DEFS.filter((d) => !d.auto) },
          ].map((group) => (
            <div key={group.title} className="stack">
              <div className="group-head">
                <h2>{group.title}</h2>
                <p className="muted small">{group.sub}</p>
              </div>
              {group.defs.map((def) => {
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
                      {!def.auto && <b> (+{ACHIEVEMENT_FOR_BONUS[def.id.replace('exit-', '') as AchievementKind]} a FOR)</b>}
                    </p>
                    <div className="cards-row scroll">
                      {got.length === 0 && (
                        <div className="locked-preview">
                          <FifaCard member={MYSTERY} rating={MYSTERY_RATING} variant={def.variant} title={def.name} emoji={def.emoji} size="sm" photo={null} />
                          <span className="locked-badge">🔒 Ningú l'ha aconseguit</span>
                        </div>
                      )}
                      {got.map((u) => (
                        <CardZoom key={cardKey(u) + u.memberId} card={unlockProps(db, u)} def={def}>
                          <FifaCard {...unlockProps(db, u)} size="sm" />
                        </CardZoom>
                      ))}
                    </div>
                  </Section>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'how' && (
        <Section title="Com es calcula la mitjana">
          <p>Cada carta té 4 estadístiques (de 20 a 99) que s'actualitzen soles cada mes:</p>
          <ul className="how">
            {STAT_LABELS.map(([k, l, d]) => (
              <li key={k}>
                <b>{l}</b> ({Math.round(WEIGHTS[k as keyof typeof WEIGHTS] * 100)}%) · {d}
              </li>
            ))}
          </ul>
          <p>
            <b>Mitjana</b> = 40% ENT + 10% FOR + 25% MVP + 25% COM. El que més pesa és anar al gym.
          </p>
          <ul className="how">
            <li>🥉 Bronze: menys de 65</li>
            <li>🥈 Plata: de 65 a 74</li>
            <li>🥇 Or: 75 o més</li>
          </ul>
          <p>
            Les <b>cartes especials</b> es desbloquegen complint reptes i sumen (o resten) punts a la mitjana. Els <b>èxits esportius</b> (mitja, marató,
            Hyrox, ascens) els dona l'admin i pugen molt l'estadística FOR durant 12 mesos.
          </p>
          <p className="muted small">Líder actual: {squad[0] ? `${displayName(squad[0].m)} (${squad[0].r.overall + squad[0].f.boost})` : '-'}</p>
        </Section>
      )}
    </div>
  )
}
