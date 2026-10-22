import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import {
  ACHIEVEMENT_FOR_BONUS,
  CARD_DEFS,
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
            { title: '🏅 Èxits esportius', sub: "Manuals: l'admin les dona a qui ho aconsegueix. Pugen FOR durant l'any de l'èxit.", defs: CARD_DEFS.filter((d) => !d.auto) },
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
        <div className="stack how-page">
          <Section title="📅 Tot és per any natural">
            <p>
              Totes les estadístiques es calculen <b>de l'1 de gener al 31 de desembre</b>. El dia 1 de gener tothom torna a començar de zero: entrenos, MVPs,
              antis, constància i èxits. Les cartes especials que ja tens es queden a l'àlbum per sempre.
            </p>
            <p className="muted small">Cada estadística va de 20 a 99 i s'arrodoneix a l'enter.</p>
          </Section>

          <Section title="💪 ENT · Entrenos al gym (35%)">
            <pre className="formula">ENT = 40 + entrenos de gym de l'any ÷ 4</pre>
            <ul className="how">
              <li>
                Es va <b>omplint durant tot l'any</b>, com una barra de progrés: cada entreno de gym suma +0,25. Un mes fort (24 entrenos) suma uns +6.
              </li>
              <li>
                El 99 arriba amb <b>236 entrenos de gym</b> a l'any (uns 20 al mes de gener a desembre). Per tenir-la alta cal ser constant, no fer un mes bèstia.
              </li>
              <li>Inclou el recompte inicial i tot el que s'apunta a l'app. L'1 de gener torna a 40.</li>
            </ul>
          </Section>

          <Section title="🏃 FOR · Entrenos fora del gym (10%)">
            <pre className="formula">FOR = 35 + entrenos fora de l'any ÷ 3 + bonus d'èxits</pre>
            <ul className="how">
              <li>També s'omple durant l'any: el 99 arriba amb 192 entrenos fora.</li>
              <li>
                Bonus d'èxits esportius de l'any: Ascens +{ACHIEVEMENT_FOR_BONUS.ascens}, Mitja +{ACHIEVEMENT_FOR_BONUS.mitja}, Hyrox +{ACHIEVEMENT_FOR_BONUS.hyrox},
                Marató +{ACHIEVEMENT_FOR_BONUS.marato}. Se sumen entre ells.
              </li>
            </ul>
          </Section>

          <Section title="🏆 MVP · Palmarès de l'any (20%)">
            <pre className="formula">MVP = 55 + 11 × MVPs de l'any</pre>
            <table className="table small center-cells">
              <tbody>
                <tr>
                  <th>MVPs</th>
                  <td>0</td>
                  <td>1</td>
                  <td>2</td>
                  <td>3</td>
                  <td>4+</td>
                </tr>
                <tr>
                  <th>MVP</th>
                  <td>55</td>
                  <td>66</td>
                  <td>77</td>
                  <td>88</td>
                  <td>99</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="😇 COM · Comportament (20%)">
            <pre className="formula">COM = 88 − 13 × antis de l'any</pre>
            <table className="table small center-cells">
              <tbody>
                <tr>
                  <th>Antis</th>
                  <td>0</td>
                  <td>1</td>
                  <td>2</td>
                  <td>3</td>
                  <td>4</td>
                  <td>5+</td>
                </tr>
                <tr>
                  <th>COM</th>
                  <td>88</td>
                  <td>75</td>
                  <td>62</td>
                  <td>49</td>
                  <td>36</td>
                  <td>20</td>
                </tr>
              </tbody>
            </table>
            <p className="muted small">Sense cap anti el màxim és 88: ningú és perfecte.</p>
          </Section>

          <Section title="📈 CON · Constància (15%)">
            <pre className="formula">CON = 40 + 59 × (setmanes bones + 6) ÷ (setmanes totals + 12)</pre>
            <ul className="how">
              <li>
                <b>Setmana bona:</b> de dilluns a diumenge amb <b>2 entrenos o més</b> (gym o fora).
              </li>
              <li>
                <b>Setmanes totals:</b> les setmanes senceres de l'any (des que es fa servir l'app). La setmana en curs no compta fins que acaba.
              </li>
              <li>
                El <b>+6 / +12</b> la fa progressiva: és com començar amb 12 setmanes virtuals a mitges. Amb poques setmanes no es pot tenir nota alta.
              </li>
              <li>Sense cap setmana sencera encara: 70.</li>
            </ul>
            <table className="table small center-cells">
              <tbody>
                <tr>
                  <th>Bones/totals</th>
                  <td>2/3</td>
                  <td>3/3</td>
                  <td>10/10</td>
                  <td>20/30</td>
                  <td>30/30</td>
                  <td>0/10</td>
                </tr>
                <tr>
                  <th>CON</th>
                  <td>71</td>
                  <td>75</td>
                  <td>83</td>
                  <td>77</td>
                  <td>91</td>
                  <td>56</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="⭐ Mitjana total">
            <pre className="formula">MITJANA = 0,35·ENT + 0,15·CON + 0,20·MVP + 0,20·COM + 0,10·FOR</pre>
            <p className="muted small">El gym (ENT + CON) pesa el 50%.</p>
            <ul className="how">
              {[...TIERS].reverse().map(([t, min], i, arr) => (
                <li key={t}>
                  {TIER_ICON[t]} {TIERS.find(([x]) => x === t)![2]}:{' '}
                  {i === 0 ? `menys de ${arr[1][1]}` : i === arr.length - 1 ? `${min} o més` : `de ${min} a ${arr[i + 1][1] - 1}`}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="🃏 Cartes especials">
            <pre className="formula">Mitjana de la carta = mitjana a final del mes de la carta + bonus de la carta</pre>
            <ul className="how">
              <li>El bonus depèn de la carta (TOTM +3, Icona +6, Pilota d'Or +12, Anti-MVP −3…). Sempre entre 1 i 99.</li>
              <li>Les cartes anuals i les d'abans que hi hagi dades a l'app fan servir la mitjana d'avui.</li>
              <li>Les 5 estadístiques de la carta no porten bonus: només el número gran.</li>
            </ul>
          </Section>

          <p className="muted small center">Líder actual: {squad[0] ? `${displayName(squad[0].m)} (${squad[0].r.overall + squad[0].f.boost})` : '-'}</p>
        </div>
      )}
    </div>
  )
}
