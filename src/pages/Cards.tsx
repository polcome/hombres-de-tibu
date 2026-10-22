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
  TIERS,
  type Rating,
  type Tier,
} from '../logic/stats'
import type { AchievementKind, Member } from '../types'

const TIER_ICON: Record<Tier, string> = { bronze: '🥉', silver: '🥈', silvershiny: '✨🥈', gold: '🥇', goldshiny: '✨🥇' }

// Carta "misteriosa" per ensenyar el disseny de les que ningú té
const MYSTERY: Member = { id: 'mystery', slug: 'mystery', name: '???', nickname: null, photo_url: null, is_admin: false, active: true }
const MYSTERY_RATING: Rating = { overall: 0, ent: 0, fora: 0, mvp: 0, com: 0, con: 0, tier: 'bronze' }
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
            { title: '⚙️ Automàtiques', sub: "Es desbloquegen soles quan es compleix el repte.", defs: CARD_DEFS.filter((d) => d.auto && !d.level) },
            { title: '🏅 Èxits esportius', sub: "Manuals: l'admin les dona a qui ho aconsegueix. Pugen FOR durant 12 mesos.", defs: CARD_DEFS.filter((d) => !d.auto) },
          ].map((group) => (
            <div key={group.title} className="stack">
              <div className="group-head">
                <h2>{group.title}</h2>
                <p className="muted small">{group.sub}</p>
              </div>
              {group.defs.map((def) => {
                const tiers = CARD_DEFS.filter((d) => d.id === def.id || (def.family && d.family === def.family && d.level))
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
                    {tiers.length > 1 && (
                      <div className="level-rules small">
                        {tiers
                          .filter((t) => t.level)
                          .map((t) => (
                            <div key={t.id} className={`level-rule level-${t.level}`}>
                              <b>{t.level === 'plus' ? '★ PLUS' : '🔥 ULTRA'}</b> {t.how}
                              {t.boost !== 0 && ` (${t.boost > 0 ? '+' : ''}${t.boost})`}
                            </div>
                          ))}
                      </div>
                    )}
                    <div className="cards-row scroll">
                      {tiers.flatMap((t) => {
                        const got = unlocks.filter((u) => u.def.id === t.id)
                        if (got.length === 0)
                          return [
                            <div key={t.id} className="locked-preview">
                              <FifaCard
                                member={MYSTERY}
                                rating={MYSTERY_RATING}
                                variant={t.variant}
                                level={t.level}
                                title={t.name}
                                emoji={t.emoji}
                                size="sm"
                                photo={null}
                              />
                              <span className="locked-badge">🔒 {t.level ? t.level.toUpperCase() : "Ningú l'ha aconseguit"}</span>
                            </div>,
                          ]
                        return got.map((u) => (
                          <CardZoom key={cardKey(u) + u.memberId} card={unlockProps(db, u)} def={t}>
                            <FifaCard {...unlockProps(db, u)} size="sm" />
                          </CardZoom>
                        ))
                      })}
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
          <p>Cada carta té 5 estadístiques (de 20 a 99) que s'actualitzen soles:</p>
          <ul className="how">
            {STAT_LABELS.map(([k, l, d]) => (
              <li key={k}>
                <b>{l}</b> ({Math.round(WEIGHTS[k as keyof typeof WEIGHTS] * 100)}%) · {d}
              </li>
            ))}
          </ul>
          <p>
            <b>Mitjana</b> = 35% ENT + 15% CON + 20% MVP + 20% COM + 10% FOR. El que més pesa és anar al gym, i anar-hi sovint.
          </p>
          <ul className="how">
            {[...TIERS].reverse().map(([t, min], i, arr) => (
              <li key={t}>
                {TIER_ICON[t]} {TIERS.find(([x]) => x === t)![2]}: {i === 0 ? `menys de ${arr[1][1]}` : i === arr.length - 1 ? `${min} o més` : `de ${min} a ${arr[i + 1][1] - 1}`}
              </li>
            ))}
          </ul>
          <p>
            Les <b>cartes especials</b> es desbloquegen complint reptes i sumen (o resten) punts a la mitjana. Els <b>èxits esportius</b> (mitja, marató,
            Hyrox, ascens) els dona l'admin i pugen molt l'estadística FOR durant 12 mesos.
          </p>
          <p className="muted small">
            <b>CON</b> és progressiva: per tenir-la alta cal mantenir-ho moltes setmanes. Ex: 3 de 3 setmanes bones → 75; 10 de 10 → 83; 30 de 30 → 91. I un 2 de 3 (71) no val el mateix que un 20 de 30 (77).
          </p>
          <p className="muted small">Líder actual: {squad[0] ? `${displayName(squad[0].m)} (${squad[0].r.overall + squad[0].f.boost})` : '-'}</p>
        </Section>
      )}
    </div>
  )
}
